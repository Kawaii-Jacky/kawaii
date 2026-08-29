from __future__ import annotations

import asyncio
import unittest

from app.security import CookieCSRFMiddleware, normalized_origin, validated_cors_origins


class CookieCSRFMiddlewareTest(unittest.TestCase):
    def setUp(self):
        async def app(_scope, _receive, send):
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": b'{"ok":true}'})

        self.app = CookieCSRFMiddleware(
            app,
            cookie_name="test_session",
            allowed_origins=["https://astroy.example", "http://localhost:8000/"],
        )

    def request(self, method: str, *, cookie: bool = False, headers: dict[str, str] | None = None) -> int:
        raw_headers = [(key.lower().encode("latin-1"), value.encode("latin-1")) for key, value in (headers or {}).items()]
        if cookie:
            raw_headers.append((b"cookie", b"test_session=secret"))
        sent: list[dict] = []

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message):
            sent.append(message)

        scope = {"type": "http", "method": method, "path": "/state", "headers": raw_headers}
        asyncio.run(self.app(scope, receive, send))
        return next(message["status"] for message in sent if message["type"] == "http.response.start")

    def test_normalizes_origin_without_accepting_non_http_urls(self):
        self.assertEqual(normalized_origin("https://ASTROY.example/path"), "https://astroy.example")
        self.assertIsNone(normalized_origin("javascript:alert(1)"))

    def test_credentialed_cors_rejects_wildcard_and_invalid_origins(self):
        with self.assertRaises(RuntimeError):
            validated_cors_origins(['*'])
        with self.assertRaises(RuntimeError):
            validated_cors_origins(['javascript:alert(1)'])
        self.assertEqual(validated_cors_origins(['https://ASTROY.example/']), ['https://astroy.example'])

    def test_cookie_authenticated_state_change_requires_trusted_origin(self):
        self.assertEqual(self.request("POST", cookie=True), 403)
        self.assertEqual(self.request("POST", cookie=True, headers={"Origin": "https://evil.example"}), 403)
        self.assertEqual(self.request("POST", cookie=True, headers={"Origin": "https://astroy.example"}), 200)

    def test_bearer_clients_and_safe_cookie_requests_are_unchanged(self):
        self.assertEqual(self.request("POST", headers={"Authorization": "Bearer test"}), 200)
        self.assertEqual(self.request("GET", cookie=True), 200)

    def test_same_origin_fetch_metadata_is_valid_fallback(self):
        self.assertEqual(self.request("POST", cookie=True, headers={"Sec-Fetch-Site": "same-origin"}), 200)


if __name__ == "__main__":
    unittest.main()
