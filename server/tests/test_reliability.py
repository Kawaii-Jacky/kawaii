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
        for name in ("app.main", "app.auth", "app.alerts", "app.db"):
            sys.modules.pop(name, None)
        cls.db = importlib.import_module("app.db")
        cls.auth = importlib.import_module("app.auth")
        cls.main = importlib.import_module("app.main")
        cls.main.init_db()
        cls.auth.init_auth_db()

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def setUp(self):
        with self.db.connection() as connection:
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
        first_id, first = hub.subscribe("session-a")
        second_id, second = hub.subscribe("session-b")
        event = {"topic": "devices/esp32-001/status", "payload": {"status": "online"}}
        hub.publish(event)
        self.assertEqual(first.get_nowait(), event)
        self.assertEqual(second.get_nowait(), event)
        hub.unsubscribe(first_id)
        hub.unsubscribe(second_id)
        self.assertEqual(hub.subscribers, {})

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
