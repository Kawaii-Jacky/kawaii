from __future__ import annotations

import importlib
import os
import sys
import tempfile
import unittest
import uuid

from starlette.requests import Request
from starlette.responses import Response


class SafariSessionCompatibilityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temp = tempfile.TemporaryDirectory()
        os.environ.update({
            "DATABASE_URL": "",
            "SQLITE_PATH": os.path.join(cls.temp.name, "auth.db"),
            "AUTH_SECRET": "test-secret-with-enough-entropy",
            "AUTH_COOKIE_SECURE": "1",
            "AUTH_COOKIE_SAMESITE": "lax",
        })
        for name in ("app.auth", "app.db"):
            sys.modules.pop(name, None)
        cls.db = importlib.import_module("app.db")
        cls.auth = importlib.import_module("app.auth")
        cls.auth.init_auth_db()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temp.cleanup()

    def setUp(self) -> None:
        with self.db.connection() as connection:
            connection.execute("delete from auth_sessions")
            connection.execute("delete from users")

    @staticmethod
    def request(cookie: str = "") -> Request:
        headers = [(b"cookie", cookie.encode("latin-1"))] if cookie else []
        return Request({"type": "http", "method": "GET", "path": "/api/v1/auth/me", "headers": headers, "client": ("192.0.2.30", 12345)})

    def create_user(self) -> str:
        user_id, now = str(uuid.uuid4()), self.auth.iso()
        with self.db.connection() as connection:
            connection.execute(
                """insert into users(id,display_name,email,password_hash,email_verified,created_at,updated_at)
                   values(?,?,?,?,1,?,?)""",
                (user_id, "Safari Test", "safari@example.test", "unused", now, now),
            )
        return user_id

    def test_login_response_sets_only_the_canonical_cookie(self) -> None:
        response = Response()
        self.auth.set_session_cookie(response, "new-session-token")
        cookies = [value.decode("latin-1") for name, value in response.raw_headers if name.lower() == b"set-cookie"]
        self.assertEqual(len(cookies), 1)
        self.assertIn("astra_session=new-session-token", cookies[0])
        self.assertIn("Path=/", cookies[0])
        self.assertNotIn("Domain=", cookies[0])

    def test_valid_cookie_wins_over_a_stale_duplicate(self) -> None:
        user_id = self.create_user()
        valid = self.auth.create_session(user_id, self.request())
        request = self.request(f"astra_session=stale-token; astra_session={valid}")
        user = self.auth.current_user(request, astra_session="stale-token", authorization=None)
        self.assertEqual(user["id"], user_id)


if __name__ == "__main__":
    unittest.main()
