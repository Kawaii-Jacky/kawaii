from __future__ import annotations

import importlib
import os
import sys
import tempfile
import unittest
import uuid

from fastapi import HTTPException
from starlette.requests import Request
from starlette.responses import Response


class LoginErrorDetailTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temp = tempfile.TemporaryDirectory()
        os.environ.update({
            "DATABASE_URL": "",
            "SQLITE_PATH": os.path.join(cls.temp.name, "auth.db"),
            "AUTH_SECRET": "test-secret-with-enough-entropy",
            "AUTH_DEBUG_CODES": "1",
            "AUTH_LOGIN_FAILURE_LIMIT": "5",
            "AUTH_LOGIN_FAILURE_IP_LIMIT": "10",
        })
        for name in ("app.auth", "app.db"):
            sys.modules.pop(name, None)
        cls.db = importlib.import_module("app.db")
        cls.auth = importlib.import_module("app.auth")
        cls.auth.init_auth_db()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temp.cleanup()

    @staticmethod
    def request(ip: str = "192.0.2.20") -> Request:
        return Request({"type": "http", "method": "POST", "path": "/api/v1/auth/login", "headers": [], "client": (ip, 12345)})

    def setUp(self) -> None:
        with self.db.connection() as connection:
            connection.execute("delete from auth_rate_limits")
            connection.execute("delete from auth_sessions")
            connection.execute("delete from users")

    def test_missing_account_and_incorrect_password_have_distinct_errors(self) -> None:
        with self.assertRaises(HTTPException) as missing:
            self.auth.login(
                self.auth.LoginRequest(identifier="missing@example.test", password="anything"),
                self.request(),
                Response(),
            )
        self.assertEqual((missing.exception.status_code, missing.exception.detail), (401, "Account does not exist"))

        user_id = str(uuid.uuid4())
        now = self.auth.iso()
        with self.db.connection() as connection:
            connection.execute(
                """insert into users(id,display_name,email,password_hash,email_verified,created_at,updated_at)
                   values(?,?,?,?,1,?,?)""",
                (user_id, "Login Test", "known@example.test", self.auth.password_hasher.hash("correct-password"), now, now),
            )
        with self.assertRaises(HTTPException) as incorrect:
            self.auth.login(
                self.auth.LoginRequest(identifier="known@example.test", password="wrong-password"),
                self.request(),
                Response(),
            )
        self.assertEqual((incorrect.exception.status_code, incorrect.exception.detail), (401, "Password is incorrect"))


if __name__ == "__main__":
    unittest.main()
