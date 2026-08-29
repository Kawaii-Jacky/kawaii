from __future__ import annotations

import importlib
import json
import os
import sys
import tempfile
import unittest
import uuid
import queue
import asyncio
import base64
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

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
            {"id": "remote-b", "name": "Remote B", "host": "127.0.0.1", "port": 1883, "username": "backend-controller-b", "password": ""},
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
            connection.execute("update devices set enabled=1,last_seen=null,last_status='offline'")
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

    def mark_online(self, logical_device_id: str, controller_id: str = "default", telemetry: dict | None = None) -> None:
        storage_id = logical_device_id if controller_id == "default" else f"{controller_id}:{logical_device_id}"
        now = self.main.now_iso()
        with self.db.connection() as connection:
            connection.execute(
                "update devices set last_seen=?,last_status='online' where device_id=?",
                (now, storage_id),
            )
            if telemetry is not None:
                payload = {"schema": 1, "device": logical_device_id, "ts": now, **telemetry}
                connection.execute(
                    "insert into telemetry_latest(device_id,ts,payload) values(?,?,?)",
                    (storage_id, now, json.dumps(payload)),
                )

    def test_fixed_window_rate_limit_blocks_after_limit(self):
        for _ in range(3):
            self.auth.record_rate_event("login-identifier", "user@example.test", 900)
        with self.assertRaises(HTTPException) as raised:
            self.auth.check_rate_limit("login-identifier", "user@example.test", 3, 900)
        self.assertEqual(raised.exception.status_code, 429)
        self.assertIn("Retry-After", raised.exception.headers)

    def test_avatar_is_persisted_in_account_payload(self):
        user = self.create_user()
        png = b"\x89PNG\r\n\x1a\n" + b"avatar-test"
        avatar_data = "data:image/png;base64," + base64.b64encode(png).decode()
        result = self.auth.update_avatar(self.auth.AvatarPatch(avatar_data=avatar_data), user)
        self.assertEqual(result["user"]["avatar_data"], avatar_data)
        with self.db.connection() as connection:
            row = connection.execute("select * from users where id=?", (user["id"],)).fetchone()
        self.assertEqual(self.auth.user_payload(row)["avatar_data"], avatar_data)

    def test_avatar_rejects_mismatched_image_content(self):
        user = self.create_user()
        invalid = "data:image/png;base64," + base64.b64encode(b"not-a-png").decode()
        with self.assertRaises(HTTPException) as raised:
            self.auth.update_avatar(self.auth.AvatarPatch(avatar_data=invalid), user)
        self.assertEqual(raised.exception.status_code, 422)

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

    def test_controller_secret_file_allows_shared_endpoint_with_isolated_accounts(self):
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
            configs = self.main.load_controller_configs()
            self.assertEqual([row["topic_prefix"] for row in configs], ["controllers/a", "controllers/b"])
            config_path.write_text(json.dumps({"controllers": [
                {"id": "a", "host": "mqtt.local", "port": 1883, "username": "backend-a", "password": "long-password-a"},
                {"id": "b", "host": "mqtt.local", "port": 1883, "username": "backend-a", "password": "long-password-b"},
            ]}), encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "more than one controller"):
                self.main.load_controller_configs()
        finally:
            if previous is None:
                os.environ.pop("MQTT_CONTROLLERS_FILE", None)
            else:
                os.environ["MQTT_CONTROLLERS_FILE"] = previous

    def test_loopback_controller_host_uses_container_internal_override(self):
        config_path = Path(self.temp.name) / 'controllers-loopback.json'
        previous_file = os.environ.get('MQTT_CONTROLLERS_FILE')
        previous_host = os.environ.get('MQTT_INTERNAL_HOST')
        try:
            os.environ['MQTT_CONTROLLERS_FILE'] = str(config_path)
            os.environ['MQTT_INTERNAL_HOST'] = 'mosquitto'
            config_path.write_text(json.dumps({'controllers': [
                {'id': 'a', 'host': '127.0.0.1', 'port': 1883, 'username': 'backend-a', 'password': 'long-password-a'},
            ]}), encoding='utf-8')
            self.assertEqual(self.main.load_controller_configs()[0]['host'], 'mosquitto')
        finally:
            if previous_file is None:
                os.environ.pop('MQTT_CONTROLLERS_FILE', None)
            else:
                os.environ['MQTT_CONTROLLERS_FILE'] = previous_file
            if previous_host is None:
                os.environ.pop('MQTT_INTERNAL_HOST', None)
            else:
                os.environ['MQTT_INTERNAL_HOST'] = previous_host

    def test_compose_controller_host_uses_wsl_internal_override(self):
        config_path = Path(self.temp.name) / "controllers-compose.json"
        previous_file = os.environ.get("MQTT_CONTROLLERS_FILE")
        previous_host = os.environ.get("MQTT_INTERNAL_HOST")
        try:
            os.environ["MQTT_CONTROLLERS_FILE"] = str(config_path)
            os.environ["MQTT_INTERNAL_HOST"] = "127.0.0.1"
            config_path.write_text(json.dumps({"controllers": [
                {"id": "a", "host": "mosquitto", "port": 1883, "username": "backend-a", "password": "long-password-a"},
            ]}), encoding="utf-8")
            self.assertEqual(self.main.load_controller_configs()[0]["host"], "127.0.0.1")
        finally:
            if previous_file is None:
                os.environ.pop("MQTT_CONTROLLERS_FILE", None)
            else:
                os.environ["MQTT_CONTROLLERS_FILE"] = previous_file
            if previous_host is None:
                os.environ.pop("MQTT_INTERNAL_HOST", None)
            else:
                os.environ["MQTT_INTERNAL_HOST"] = previous_host

    def test_public_health_does_not_expose_controller_identifiers(self):
        health = self.main.health()
        self.assertNotIn("mqtt_controllers", health)
        self.assertEqual(health["mqtt_controller_count"], 1)

    def test_same_logical_device_ids_are_isolated_between_controller_namespaces(self):
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

    def test_mqtt_worker_uses_controller_topic_namespace(self):
        mqtt_worker = self.main.MQTTWorker({
            "id": "remote-b",
            "name": "Remote B",
            "host": "127.0.0.1",
            "port": 1883,
            "username": "backend-controller-b",
            "password": "",
            "topic_prefix": "controllers/remote-b",
        })
        self.assertEqual(
            mqtt_worker.topic("esp32-001", "telemetry"),
            "controllers/remote-b/devices/esp32-001/telemetry",
        )

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

    def test_nested_and_unknown_telemetry_fields_are_rejected(self):
        now = self.main.now_iso()
        self.main.ingest(
            "devices/esp32-001/telemetry",
            json.dumps({"schema": 1, "device": "esp32-001", "ts": now, "data": {"dht_temperature": 22.0}}),
        )
        self.main.ingest(
            "devices/esp32-001/telemetry",
            json.dumps({"schema": 1, "device": "esp32-001", "ts": now, "dht_temperature": float("nan")}),
        )
        with self.db.connection() as connection:
            count = connection.execute("select count(*) as count from telemetry_samples").fetchone()["count"]
        self.assertEqual(count, 0)

    def test_protocol_command_whitelist_and_normalization(self):
        protocol = importlib.import_module("app.device_protocol")
        self.assertEqual(
            protocol.normalize_command("esp32-001", "heater_mode", {"mode": "auto"}),
            {"enabled": True},
        )
        self.assertEqual(
            protocol.normalize_command("mppt-001", "mode", {"value": 0}),
            {"value": 0},
        )
        self.assertEqual(
            protocol.normalize_command("ef-001", "servo", {"state": True, "angle": 300}),
            {"state": True, "angle": 300},
        )
        for device_id, command, args in (
            ("esp32-001", "fan_threshold", {"value": 200}),
            ("esp32-001", "terminal", {"value": "REBOOT"}),
            ("mppt-001", "settings", {"voltage_battery_min": 14.2, "voltage_battery_max": 14.4, "current_charging": 2, "temperature_fan": 60}),
            ("ef-001", "erase_flash", {}),
        ):
            with self.subTest(device=device_id, command=command):
                with self.assertRaises(protocol.ProtocolError):
                    protocol.normalize_command(device_id, command, args)

    def test_mppt_command_keeps_correlation_envelope(self):
        user = self.create_user("user")
        self.grant(user["id"])
        self.mark_online("mppt-001")
        result = self.main.command(
            "mppt-001",
            self.main.CommandIn(command="fan", args={"state": True}),
            user,
        )
        with self.db.connection() as connection:
            row = connection.execute("select mqtt_payload from commands where id=?", (result["id"],)).fetchone()
        published = json.loads(row["mqtt_payload"])
        self.assertEqual(published["id"], result["id"])
        self.assertEqual(published["device"], "mppt-001")
        self.assertEqual(published["command"], "fan")
        self.assertIs(published["fan"], True)

    def test_user_with_bundle_can_command(self):
        user = self.create_user("user")
        self.grant(user["id"])
        self.mark_online("esp32-001")
        result = self.main.command(
            "esp32-001",
            self.main.CommandIn(command="fan", args={"state": True}),
            self.auth.require_operator(user),
        )
        self.assertEqual(result["status"], "queued")
        with self.db.connection() as connection:
            row = connection.execute(
                "select device_id,command,status from commands where id=?",
                (result["id"],),
            ).fetchone()
        self.assertEqual(dict(row), {"device_id": "esp32-001", "command": "fan", "status": "queued"})

    def test_offline_devices_reject_new_commands(self):
        user = self.create_user("user")
        self.grant(user["id"])
        with self.assertRaises(HTTPException) as raised:
            self.main.command("esp32-001", self.main.CommandIn(command="fan", args={"state": True}), user)
        self.assertEqual(raised.exception.status_code, 409)

    def test_roof_open_requires_fresh_no_rain_telemetry(self):
        user = self.create_user("user")
        self.grant(user["id"])
        self.mark_online("esp32-001", telemetry={"rain_detected": True})
        with self.assertRaises(HTTPException) as raised:
            self.main.command("esp32-001", self.main.CommandIn(command="motor_forward"), user)
        self.assertEqual(raised.exception.status_code, 409)
        with self.db.connection() as connection:
            now = self.main.now_iso()
            connection.execute(
                "update telemetry_latest set ts=?,payload=? where device_id='esp32-001'",
                (now, json.dumps({"schema": 1, "device": "esp32-001", "ts": now, "rain_detected": False})),
            )
        result = self.main.command("esp32-001", self.main.CommandIn(command="motor_forward"), user)
        self.assertEqual(result["status"], "queued")

    def test_unknown_role_cannot_control_devices(self):
        with self.assertRaises(HTTPException) as raised:
            self.auth.require_operator({"role": "viewer"})
        self.assertEqual(raised.exception.status_code, 403)

    def test_console_role_boundary(self):
        try:
            admin = importlib.import_module("app.admin_console")
        except ModuleNotFoundError as exc:
            self.skipTest(f"admin console dependencies are unavailable on this host: {exc}")
        self.assertFalse(admin.console_role_allowed("user"))
        self.assertTrue(admin.console_role_allowed("operator"))
        self.assertTrue(admin.console_role_allowed("admin"))
        with patch.object(admin, "current_console_user", return_value={"role": "operator"}):
            with self.assertRaises(HTTPException) as raised:
                admin.current_admin("operator-token")
        self.assertEqual(raised.exception.status_code, 403)
        self.assertTrue(admin.is_reserved_super_admin(" 123@QQ.COM "))
        self.assertFalse(admin.is_reserved_super_admin("operator@example.test"))

    def test_bootstrap_admin_sync_recovers_role_and_configured_password(self):
        email = f"recovery-{uuid.uuid4()}@example.test"
        user = self.create_user("user")
        now = self.auth.iso()
        with self.db.connection() as connection:
            connection.execute(
                "update users set email=?,disabled=1,email_verified=0,password_hash=? where id=?",
                (email, self.auth.password_hasher.hash("old-password"), user["id"]),
            )
            connection.execute(
                """insert into auth_sessions(id,user_id,token_hash,expires_at,created_at,last_seen_at)
                   values(?,?,?,?,?,?)""",
                (user["session_id"], user["id"], self.auth.token_digest("old-session"), self.auth.iso(datetime.now(timezone.utc) + timedelta(days=1)), now, now),
            )
        with patch.dict(os.environ, {"ADMIN_EMAIL": email, "ADMIN_PASSWORD": "recovery-password", "SUPER_ADMIN_PASSWORD": "super-recovery-password"}), patch.object(self.auth, "ADMIN_PASSWORD_SYNC", True):
            self.auth.bootstrap_admin()
        with self.db.connection() as connection:
            row = connection.execute("select role,disabled,email_verified,password_hash from users where id=?", (user["id"],)).fetchone()
            session = connection.execute("select revoked_at from auth_sessions where id=?", (user["session_id"],)).fetchone()
        self.assertEqual(row["role"], "admin")
        self.assertFalse(row["disabled"])
        self.assertTrue(row["email_verified"])
        self.assertTrue(self.auth.password_hasher.verify(row["password_hash"], "recovery-password"))
        self.assertIsNotNone(session["revoked_at"])
        with self.db.connection() as connection:
            super_admin = connection.execute("select role,disabled,password_hash from users where email=?", (self.auth.SUPER_ADMIN_EMAIL,)).fetchone()
        self.assertEqual(super_admin["role"], "admin")
        self.assertFalse(super_admin["disabled"])
        self.assertTrue(self.auth.password_hasher.verify(super_admin["password_hash"], "super-recovery-password"))

    def test_database_import_accepts_only_safe_export_shape(self):
        try:
            admin = importlib.import_module("app.admin_console")
        except ModuleNotFoundError as exc:
            self.skipTest(f"admin console dependencies are unavailable on this host: {exc}")
        document = {
            "format": admin.SAFE_EXPORT_FORMAT,
            "scope": "operational",
            "tables": {"telemetry_latest": []},
        }
        self.assertEqual(admin.validate_import_document(json.dumps(document).encode()), document)
        document["tables"]["users"] = []
        with self.assertRaises(HTTPException) as raised:
            admin.validate_import_document(json.dumps(document).encode())
        self.assertEqual(raised.exception.status_code, 422)

    def test_database_import_rejects_unknown_row_columns(self):
        try:
            admin = importlib.import_module("app.admin_console")
        except ModuleNotFoundError as exc:
            self.skipTest(f"admin console dependencies are unavailable on this host: {exc}")
        document = {
            "format": admin.SAFE_EXPORT_FORMAT,
            "scope": "operational",
            "tables": {"telemetry_latest": [{"device_id": "esp32-001", "ts": "now", "payload": "{}", "password_hash": "no"}]},
        }
        with self.assertRaises(HTTPException) as raised:
            admin.validate_import_document(json.dumps(document).encode())
        self.assertEqual(raised.exception.status_code, 422)

    def test_database_import_stream_enforces_limit_without_content_length(self):
        try:
            admin = importlib.import_module("app.admin_console")
        except ModuleNotFoundError as exc:
            self.skipTest(f"admin console dependencies are unavailable on this host: {exc}")
        messages = iter((
            {"type": "http.request", "body": b"123", "more_body": True},
            {"type": "http.request", "body": b"456", "more_body": False},
        ))

        async def receive():
            return next(messages)

        request = Request({"type": "http", "method": "POST", "headers": []}, receive)
        with self.assertRaises(HTTPException) as raised:
            asyncio.run(admin.read_limited_request_body(request, max_bytes=5))
        self.assertEqual(raised.exception.status_code, 413)

    def test_every_admin_console_mutation_requires_admin_dependency(self):
        try:
            admin = importlib.import_module("app.admin_console")
        except ModuleNotFoundError as exc:
            self.skipTest(f"admin console dependencies are unavailable on this host: {exc}")
        public_mutations = {("/admin-api/login", "POST"), ("/admin-api/logout", "POST")}
        checked = []
        for route in admin.app.routes:
            path = getattr(route, "path", "")
            if not path.startswith("/admin-api/"):
                continue
            for method in set(getattr(route, "methods", set())) & {"POST", "PUT", "PATCH", "DELETE"}:
                if (path, method) in public_mutations:
                    continue
                dependencies = {dependency.call for dependency in route.dependant.dependencies}
                self.assertIn(admin.current_admin, dependencies, f"{method} {path} is not admin-only")
                checked.append((method, path))
        self.assertGreaterEqual(len(checked), 10)

    def test_password_recovery_revokes_every_existing_session(self):
        user = self.create_user("user")
        now = datetime.now(timezone.utc)
        session_ids = [str(uuid.uuid4()), str(uuid.uuid4())]
        with self.db.connection() as connection:
            for session_id in session_ids:
                connection.execute(
                    """insert into auth_sessions(id,user_id,token_hash,expires_at,created_at,last_seen_at)
                       values(?,?,?,?,?,?)""",
                    (
                        session_id,
                        user["id"],
                        self.auth.token_digest(str(uuid.uuid4())),
                        self.auth.iso(now + timedelta(days=1)),
                        self.auth.iso(now),
                        self.auth.iso(now),
                    ),
                )
        self.assertTrue(all(self.auth.session_is_active(session_id) for session_id in session_ids))
        request = self.request()
        body = self.auth.RecoverRequest(
            channel="email",
            target=f"{user['id']}@example.test",
            code="123456",
            password="new-password-9",
        )
        with patch.object(self.auth, "verify_code"):
            self.assertEqual(self.auth.recover_password(body, request), {"ok": True})
        self.assertTrue(all(not self.auth.session_is_active(session_id) for session_id in session_ids))
        with self.db.connection() as connection:
            row = connection.execute("select password_hash from users where id=?", (user["id"],)).fetchone()
        self.assertTrue(self.auth.password_hasher.verify(row["password_hash"], "new-password-9"))

    def test_prune_telemetry_removes_expired_rows(self):
        stale = (datetime.now(timezone.utc) - timedelta(days=self.main.TELEMETRY_RETENTION_DAYS + 1)).isoformat().replace("+00:00", "Z")
        with self.db.connection() as connection:
            connection.execute(
                "insert into telemetry_samples(device_id,ts,seq,payload) values(?,?,?,?)",
                ("esp32-001", stale, 1, "{}"),
            )
        self.assertEqual(self.main.prune_telemetry(), 1)

    def test_prune_telemetry_uses_persisted_retention_setting(self):
        with self.db.connection() as connection:
            connection.execute(
                "update runtime_settings set value=? where key=?",
                ("7", "telemetry_retention_days"),
            )
            stale = (datetime.now(timezone.utc) - timedelta(days=8)).isoformat().replace("+00:00", "Z")
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
