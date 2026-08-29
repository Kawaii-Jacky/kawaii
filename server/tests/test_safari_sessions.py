from __future__ import annotations

import importlib
import asyncio
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

    def test_browser_handoff_is_single_use(self) -> None:
        user_id = self.create_user()
        handoff = self.auth.create_session(user_id, self.request())
        self.assertEqual(self.auth.consume_browser_handoff(handoff), user_id)
        with self.assertRaises(Exception) as reused:
            self.auth.consume_browser_handoff(handoff)
        self.assertEqual(getattr(reused.exception, "status_code", None), 401)

    def test_top_level_handoff_rotates_and_sets_cookie(self) -> None:
        user_id = self.create_user()
        handoff = self.auth.create_session(user_id, self.request())
        encoded = f"handoff={handoff}".encode("ascii")
        sent = False

        async def receive():
            nonlocal sent
            if sent:
                return {"type": "http.request", "body": b"", "more_body": False}
            sent = True
            return {"type": "http.request", "body": encoded, "more_body": False}

        request = Request({
            "type": "http", "method": "POST", "path": "/api/v1/auth/browser/session/commit",
            "headers": [(b"host", b"astroy.xyz"), (b"origin", b"https://astroy.xyz")],
            "client": ("192.0.2.30", 12345),
        }, receive)
        response = asyncio.run(self.auth.commit_browser_session(request))
        cookies = [value for name, value in response.raw_headers if name.lower() == b"set-cookie"]
        self.assertEqual(response.status_code, 303)
        self.assertEqual(response.headers["location"], "/#profile")
        self.assertEqual(len(cookies), 1)
        with self.assertRaises(Exception):
            self.auth.consume_browser_handoff(handoff)


if __name__ == "__main__":
    unittest.main()
