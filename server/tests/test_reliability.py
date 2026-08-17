from __future__ import annotations

import importlib
import json
import os
import sys
import tempfile
import unittest
import uuid
import queue
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import HTTPException
from starlette.requests import Request


class ReliabilityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        os.environ.update({
            "DATABASE_URL": "",
            "SQLITE_PATH": os.path.join(cls.temp.name, "test.db"),
            "AUTH_SECRET": "test-secret-with-enough-entropy",
            "AUTH_DEBUG_CODES": "1",
            "MQTT_DISABLED": "1",
            "OPERATIONAL_EMAIL_ALERTS": "0",
            "AUTH_LOGIN_FAILURE_LIMIT": "3",
            "AUTH_LOGIN_FAILURE_IP_LIMIT": "6",
        })
        for name in ("app.main", "app.auth", "app.alerts", "app.controller_access", "app.db"):
            sys.modules.pop(name, None)
        cls.db = importlib.import_module("app.db")
        cls.auth = importlib.import_module("app.auth")
        cls.main = importlib.import_module("app.main")
        cls.main.init_db()
        cls.auth.init_auth_db()
        cls.main.init_controller_access_db([
            {"id": "default", "name": "Default", "host": "127.0.0.1", "port": 1883, "username": "backend-controller", "password": ""},
            {"id": "remote-b", "name": "Remote B", "host": "127.0.0.1", "port": 1884, "username": "backend-controller-b", "password": ""},
        ])

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        with self.db.connection() as connection:
            connection.execute("delete from user_controller_access")
            connection.execute("delete from auth_rate_limits")
            connection.execute("delete from verification_codes")
            connection.execute("delete from commands")
            connection.execute("delete from device_alerts")
            connection.execute("delete from telemetry_samples")
            connection.execute("delete from telemetry_latest")
        with self.main.mqtt_rate_lock:
            self.main.mqtt_rate.clear()

    @staticmethod
    def request(ip: str = "192.0.2.10") -> Request:
        return Request({"type": "http", "method": "POST", "path": "/", "headers": [], "client": (ip, 12345)})

    def create_user(self, role: str = "user") -> dict[str, str]:
        now = self.auth.iso()
        user_id = str(uuid.uuid4())
        with self.db.connection() as connection:
            connection.execute(
                """insert into users(id,display_name,email,password_hash,email_verified,role,created_at,updated_at)
                   values(?,?,?,?,1,?,?,?)""",
                (user_id, "Access Test", f"{user_id}@example.test", "unused", role, now, now),
            )
        return {"id": user_id, "role": role, "session_id": str(uuid.uuid4())}

    def grant(self, user_id: str, controller_id: str = "default") -> None:
        with self.db.connection() as connection:
            connection.execute(
                "insert into user_controller_access(user_id,controller_id,created_at) values(?,?,?)",
                (user_id, controller_id, self.auth.iso()),
            )

    def test_fixed_window_rate_limit_blocks_after_limit(self):
        for _ in range(3):
            self.auth.record_rate_event("login-identifier", "user@example.test", 900)
        with self.assertRaises(HTTPException) as raised:
            self.auth.check_rate_limit("login-identifier", "user@example.test", 3, 900)
        self.assertEqual(raised.exception.status_code, 429)
        self.assertIn("Retry-After", raised.exception.headers)

    def test_failed_verification_attempt_is_committed(self):
        target = "user@example.test"
        now = datetime.now(timezone.utc)
        code_id = str(uuid.uuid4())
        with self.db.connection() as connection:
            connection.execute(
                """insert into verification_codes
                   (id,channel,target,purpose,code_hash,expires_at,created_at)
                   values(?,?,?,?,?,?,?)""",
                (
                    code_id,
                    "email",
                    target,
                    "register",
                    self.auth.code_digest("email", target, "register", "123456"),
                    self.auth.iso(now + timedelta(minutes=10)),
                    self.auth.iso(now),
                ),
            )
        with self.assertRaises(HTTPException) as raised:
            self.auth.verify_code("email", target, "register", "000000", self.request())
        self.assertEqual(raised.exception.status_code, 400)
        with self.db.connection() as connection:
            attempts = connection.execute("select attempts from verification_codes where id=?", (code_id,)).fetchone()["attempts"]
        self.assertEqual(attempts, 1)

    def test_due_command_exhaustion_becomes_failed(self):
        command_id = str(uuid.uuid4())
        now = self.main.now_iso()
        with self.db.connection() as connection:
            connection.execute(
                """insert into commands
                   (id,device_id,command,payload,status,created_at,mqtt_payload,attempt_count,max_attempts,last_attempt_at,next_retry_at)
                   values(?,?,?,?,?,?,?,?,?,?,?)""",
                (command_id, "esp32-001", "fan", "{}", "sent", now, "{}", 3, 3, now, now),
            )
        self.main.retry_due_commands(type("Worker", (), {"publish": lambda *_: True})())
        with self.db.connection() as connection:
            row = connection.execute("select status,result from commands where id=?", (command_id,)).fetchone()
        self.assertEqual(row["status"], "failed")
        self.assertEqual(json.loads(row["result"])["error"], "ack_timeout")

    def test_stale_device_creates_offline_alert(self):
        stale = (datetime.now(timezone.utc) - timedelta(seconds=self.main.DEVICE_OFFLINE_SECONDS + 10)).isoformat().replace("+00:00", "Z")
        with self.db.connection() as connection:
            connection.execute("update devices set last_seen=?,last_status='online' where device_id='esp32-001'", (stale,))
        self.main.monitor_offline_devices()
        with self.db.connection() as connection:
            device = connection.execute("select last_status from devices where device_id='esp32-001'").fetchone()
            alert = connection.execute("select status from device_alerts where device_id='esp32-001' order by opened_at desc limit 1").fetchone()
        self.assertEqual(device["last_status"], "offline")
        self.assertEqual(alert["status"], "open")

    def test_event_hub_broadcasts_to_each_session(self):
        hub = self.main.EventHub(queue_size=2)
        allowed_user = self.create_user()
        denied_user = self.create_user()
        self.grant(allowed_user["id"])
        self.grant(denied_user["id"], "remote-b")
        first_id, first = hub.subscribe("session-a", allowed_user["id"], "user", "default")
        second_id, second = hub.subscribe("session-b", denied_user["id"], "user", "remote-b")
        admin_id, admin = hub.subscribe("session-admin", "admin-user", "admin", "default")
        event = {"topic": "devices/esp32-001/status", "controller_id": "default", "payload": {"status": "online"}}
        hub.publish(event)
        self.assertEqual(first.get_nowait(), event)
        self.assertEqual(admin.get_nowait(), event)
        with self.assertRaises(queue.Empty):
            second.get_nowait()
        hub.unsubscribe(first_id)
        hub.unsubscribe(second_id)
        hub.unsubscribe(admin_id)
        self.assertEqual(hub.subscribers, {})

    def test_controller_bundle_default_deny_and_grants_all_three_devices(self):
        user = self.create_user()
        self.assertEqual(self.main.devices(user), [])
        with self.assertRaises(HTTPException) as denied:
            self.main.latest("esp32-001", user)
        self.assertEqual(denied.exception.status_code, 404)

        self.grant(user["id"])
        now = self.main.now_iso()
        with self.db.connection() as connection:
            connection.execute(
                "insert into telemetry_latest(device_id,ts,payload) values(?,?,?)",
                ("esp32-001", now, '{"dht_temperature":21.5}'),
            )
            connection.execute(
                "insert into device_alerts(id,device_id,alert_type,status,opened_at,detail) values(?,?,?,?,?,?)",
                (str(uuid.uuid4()), "esp32-001", "offline", "open", now, "{}"),
            )
            connection.execute(
                "insert into device_alerts(id,device_id,alert_type,status,opened_at,detail) values(?,?,?,?,?,?)",
                (str(uuid.uuid4()), "remote-b:mppt-001", "offline", "open", now, "{}"),
            )
        self.assertEqual({row["device_id"] for row in self.main.devices(user)}, set(self.main.DEVICE_IDS))
        self.assertEqual(self.main.latest("esp32-001", user)["payload"]["dht_temperature"], 21.5)
        visible_alerts = self.main.alerts(None, 100, user)
        self.assertEqual({row["device_id"] for row in visible_alerts}, {"esp32-001"})

    def test_operator_without_bundle_cannot_command_and_cannot_read_other_bundle_command(self):
        operator = self.create_user("operator")
        with self.assertRaises(HTTPException) as denied:
            self.main.command("mppt-001", self.main.CommandIn(command="debug"), operator)
        self.assertEqual(denied.exception.status_code, 404)

        self.grant(operator["id"])

        command_id = str(uuid.uuid4())
        now = self.main.now_iso()
        with self.db.connection() as connection:
            connection.execute(
                """insert into commands
                   (id,device_id,command,payload,status,created_at,mqtt_payload,attempt_count,max_attempts,next_retry_at)
                   values(?,?,?,?,?,?,?,?,?,?)""",
                (command_id, "remote-b:mppt-001", "debug", "{}", "sent", now, "{}", 1, 3, now),
            )
        with self.assertRaises(HTTPException) as hidden:
            self.main.command_status(command_id, operator)
        self.assertEqual(hidden.exception.status_code, 404)

    def test_admin_cannot_bypass_controller_assignment(self):
        admin = self.create_user("admin")
        self.assertEqual(self.main.devices(admin), [])
        with self.assertRaises(HTTPException) as denied:
            self.main.latest("esp32-001", admin)
        self.assertEqual(denied.exception.status_code, 404)
        self.grant(admin["id"])
        self.assertEqual({row["device_id"] for row in self.main.devices(admin)}, set(self.main.DEVICE_IDS))

    def test_controller_bundle_has_one_non_admin_owner(self):
        first = self.create_user()
        second = self.create_user()
        self.grant(first["id"], "default")
        with self.assertRaises(self.db.INTEGRITY_ERRORS):
            self.grant(second["id"], "default")

    def test_custom_database_device_is_not_exposed_to_bundle_user(self):
        user = self.create_user()
        self.grant(user["id"])
        with self.db.connection() as connection:
            connection.execute(
                """insert into devices(device_id,device_type,name,controller_id,logical_device_id)
                   values(?,?,?,?,?)""",
                ("custom-001", "other", "Custom", "default", "custom-001"),
            )
        self.assertEqual({row["device_id"] for row in self.main.devices(user)}, set(self.main.DEVICE_IDS))
        with self.assertRaises(HTTPException) as denied:
            self.main.latest("custom-001", user)
        self.assertEqual(denied.exception.status_code, 404)

    def test_controller_secret_file_rejects_shared_endpoint_and_weak_password(self):
        config_path = Path(self.temp.name) / "controllers.json"
        previous = os.environ.get("MQTT_CONTROLLERS_FILE")
        try:
            os.environ["MQTT_CONTROLLERS_FILE"] = str(config_path)
            config_path.write_text(json.dumps({"controllers": [
                {"id": "a", "host": "mqtt.local", "port": 1883, "username": "backend-a", "password": "short"},
            ]}), encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "at least 12"):
                self.main.load_controller_configs()
            config_path.write_text(json.dumps({"controllers": [
                {"id": "a", "host": "mqtt.local", "port": 1883, "username": "backend-a", "password": "long-password-a"},
                {"id": "b", "host": "mqtt.local", "port": 1883, "username": "backend-b", "password": "long-password-b"},
            ]}), encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "more than one controller"):
                self.main.load_controller_configs()
        finally:
            if previous is None:
                os.environ.pop("MQTT_CONTROLLERS_FILE", None)
            else:
                os.environ["MQTT_CONTROLLERS_FILE"] = previous

    def test_public_health_does_not_expose_controller_identifiers(self):
        health = self.main.health()
        self.assertNotIn("mqtt_controllers", health)
        self.assertEqual(health["mqtt_controller_count"], 1)

    def test_same_logical_device_ids_are_isolated_between_controller_ports(self):
        first = self.create_user()
        second = self.create_user()
        self.grant(first["id"], "default")
        self.grant(second["id"], "remote-b")
        now = self.main.now_iso()
        self.main.ingest(
            "remote-b",
            "devices/esp32-001/telemetry",
            json.dumps({"device": "esp32-001", "ts": now, "dht_temperature": 9.5}),
        )
        self.assertEqual(self.main.latest("esp32-001", second)["payload"]["dht_temperature"], 9.5)
        with self.assertRaises(HTTPException):
            self.main.latest("esp32-001", first)

    def test_unknown_and_disabled_devices_cannot_ingest(self):
        payload = json.dumps({"schema": 1, "device": "unknown-001", "ts": self.main.now_iso(), "value": 1})
        self.main.ingest("devices/unknown-001/telemetry", payload)
        with self.db.connection() as connection:
            self.assertEqual(connection.execute("select count(*) as count from telemetry_samples").fetchone()["count"], 0)
            connection.execute("update devices set enabled=0 where device_id='esp32-001'")
        payload = json.dumps({"schema": 1, "device": "esp32-001", "ts": self.main.now_iso(), "value": 1})
        self.main.ingest("devices/esp32-001/telemetry", payload)
        with self.db.connection() as connection:
            self.assertEqual(connection.execute("select count(*) as count from telemetry_samples").fetchone()["count"], 0)
            connection.execute("update devices set enabled=1 where device_id='esp32-001'")

    def test_cross_device_ack_is_ignored(self):
        command_id = str(uuid.uuid4())
        now = self.main.now_iso()
        with self.db.connection() as connection:
            connection.execute(
                """insert into commands
                   (id,device_id,command,payload,status,created_at,mqtt_payload,attempt_count,max_attempts,last_attempt_at,next_retry_at)
                   values(?,?,?,?,?,?,?,?,?,?,?)""",
                (command_id, "esp32-001", "fan", "{}", "sent", now, "{}", 1, 3, now, now),
            )
        self.main.ingest(
            "devices/mppt-001/reported",
            json.dumps({"schema": 1, "device": "mppt-001", "id": command_id, "ok": True, "ts": now}),
        )
        with self.db.connection() as connection:
            status_value = connection.execute("select status from commands where id=?", (command_id,)).fetchone()["status"]
        self.assertEqual(status_value, "sent")

    def test_oversized_and_stale_telemetry_are_rejected(self):
        oversized = json.dumps({"device": "esp32-001", "padding": "x" * self.main.MQTT_MAX_PAYLOAD_BYTES})
        self.main.ingest("devices/esp32-001/telemetry", oversized)
        stale = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat().replace("+00:00", "Z")
        self.main.ingest("devices/esp32-001/telemetry", json.dumps({"device": "esp32-001", "ts": stale}))
        with self.db.connection() as connection:
            count = connection.execute("select count(*) as count from telemetry_samples").fetchone()["count"]
        self.assertEqual(count, 0)

    def test_non_operator_is_rejected(self):
        with self.assertRaises(HTTPException) as raised:
            self.auth.require_operator({"role": "user"})
        self.assertEqual(raised.exception.status_code, 403)

    def test_prune_telemetry_removes_expired_rows(self):
        stale = (datetime.now(timezone.utc) - timedelta(days=self.main.TELEMETRY_RETENTION_DAYS + 1)).isoformat().replace("+00:00", "Z")
        with self.db.connection() as connection:
            connection.execute(
                "insert into telemetry_samples(device_id,ts,seq,payload) values(?,?,?,?)",
                ("esp32-001", stale, 1, "{}"),
            )
        self.assertEqual(self.main.prune_telemetry(), 1)

    def test_revoked_session_is_not_active(self):
        now = datetime.now(timezone.utc)
        user_id = str(uuid.uuid4())
        session_id = str(uuid.uuid4())
        with self.db.connection() as connection:
            connection.execute(
                """insert into users(id,display_name,email,password_hash,email_verified,role,created_at,updated_at)
                   values(?,?,?,?,1,'user',?,?)""",
                (user_id, "Session Test", f"{user_id}@example.test", "unused", self.auth.iso(now), self.auth.iso(now)),
            )
            connection.execute(
                """insert into auth_sessions(id,user_id,token_hash,expires_at,created_at,last_seen_at)
                   values(?,?,?,?,?,?)""",
                (session_id, user_id, self.auth.token_digest(str(uuid.uuid4())), self.auth.iso(now + timedelta(hours=1)), self.auth.iso(now), self.auth.iso(now)),
            )
        self.assertTrue(self.auth.session_is_active(session_id))
        with self.db.connection() as connection:
            connection.execute("update auth_sessions set revoked_at=? where id=?", (self.auth.iso(now), session_id))
        self.assertFalse(self.auth.session_is_active(session_id))


if __name__ == "__main__":
    unittest.main()
