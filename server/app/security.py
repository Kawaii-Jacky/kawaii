"""Browser-facing request security shared by the API and admin console."""
from __future__ import annotations

from collections.abc import Iterable
from urllib.parse import urlsplit

from starlette.responses import JSONResponse


SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


def normalized_origin(value: str) -> str | None:
    """Return a canonical http(s) origin, never a path-bearing URL."""
    try:
        parsed = urlsplit(value.strip())
    except ValueError:
        return None
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"


def validated_cors_origins(values: Iterable[str]) -> list[str]:
    '''Validate credentialed CORS origins and return canonical values.'''
    origins: list[str] = []
    for value in values:
        raw = value.strip()
        if not raw:
            continue
        if raw == '*':
            raise RuntimeError('CORS_ORIGINS cannot contain a wildcard when credentials are enabled')
        origin = normalized_origin(raw)
        if origin is None:
            raise RuntimeError(f'CORS_ORIGINS contains an invalid HTTP origin: {raw!r}')
        if origin not in origins:
            origins.append(origin)
    if not origins:
        raise RuntimeError('CORS_ORIGINS must contain at least one trusted HTTP origin')
    return origins


class CookieCSRFMiddleware:
    """Reject cross-origin state changes that authenticate with a cookie.

    Bearer-token and unauthenticated clients are unaffected. Browsers send an
    Origin header for unsafe fetch/form requests; Referer is accepted as a
    compatibility fallback. Sec-Fetch-Site is only trusted for same-origin or
    user-initiated requests, never for merely same-site sibling subdomains.
    """

    def __init__(self, app, cookie_name: str, allowed_origins: Iterable[str]):
        self.app = app
        self.cookie_name = cookie_name.encode("latin-1")
        self.allowed_origins = set(validated_cors_origins(allowed_origins))

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http" or scope.get("method", "GET").upper() in SAFE_METHODS:
            await self.app(scope, receive, send)
            return

        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        cookie = headers.get(b"cookie", b"")
        has_session_cookie = any(
            part.strip().split(b"=", 1)[0] == self.cookie_name
            for part in cookie.split(b";")
            if b"=" in part
        )
        if not has_session_cookie:
            await self.app(scope, receive, send)
            return

        supplied_origin = headers.get(b"origin", b"").decode("latin-1")
        supplied_referer = headers.get(b"referer", b"").decode("latin-1")
        request_origin = normalized_origin(supplied_origin) or normalized_origin(supplied_referer)
        fetch_site = headers.get(b"sec-fetch-site", b"").decode("latin-1").lower()
        allowed = request_origin in self.allowed_origins if request_origin else fetch_site in {"same-origin", "none"}
        if not allowed:
            response = JSONResponse({"detail": "Cross-origin state change rejected"}, status_code=403)
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)
