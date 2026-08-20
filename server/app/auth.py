"""Account, verification-code and cookie-session API for ASTRA.

Email delivery uses SMTP. Phone delivery uses an operator-provided HTTPS webhook
so deployments can connect Aliyun, Tencent Cloud or another SMS provider without
putting vendor credentials in the browser.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import smtplib
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Any, Literal

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from app.db import INTEGRITY_ERRORS, connection, db_lock

AUTH_SECRET = os.getenv("AUTH_SECRET", "")
AUTH_DEBUG_CODES = os.getenv("AUTH_DEBUG_CODES", "0") == "1"
SESSION_DAYS = max(1, int(os.getenv("AUTH_SESSION_DAYS", "7")))
COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "astra_session")
COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "0") == "1"
COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", "lax").lower()
CODE_TTL_MINUTES = max(2, int(os.getenv("AUTH_CODE_TTL_MINUTES", "10")))
CODE_COOLDOWN_SECONDS = max(30, int(os.getenv("AUTH_CODE_COOLDOWN_SECONDS", "60")))
LOGIN_FAILURE_LIMIT = max(3, int(os.getenv("AUTH_LOGIN_FAILURE_LIMIT", "5")))
LOGIN_FAILURE_IP_LIMIT = max(LOGIN_FAILURE_LIMIT, int(os.getenv("AUTH_LOGIN_FAILURE_IP_LIMIT", "20")))
LOGIN_FAILURE_WINDOW_SECONDS = max(60, int(os.getenv("AUTH_LOGIN_FAILURE_WINDOW_SECONDS", "900")))
VERIFICATION_SEND_TARGET_LIMIT = max(2, int(os.getenv("AUTH_VERIFICATION_SEND_TARGET_LIMIT", "5")))
VERIFICATION_SEND_IP_LIMIT = max(5, int(os.getenv("AUTH_VERIFICATION_SEND_IP_LIMIT", "20")))
VERIFICATION_SEND_WINDOW_SECONDS = max(300, int(os.getenv("AUTH_VERIFICATION_SEND_WINDOW_SECONDS", "3600")))
VERIFICATION_CHECK_TARGET_LIMIT = max(5, int(os.getenv("AUTH_VERIFICATION_CHECK_TARGET_LIMIT", "10")))
VERIFICATION_CHECK_IP_LIMIT = max(10, int(os.getenv("AUTH_VERIFICATION_CHECK_IP_LIMIT", "30")))
VERIFICATION_CHECK_WINDOW_SECONDS = max(60, int(os.getenv("AUTH_VERIFICATION_CHECK_WINDOW_SECONDS", "900")))

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_RE = re.compile(r"^\+?[1-9]\d{7,14}$")
password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)
router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(value: datetime | None = None) -> str:
    return (value or utcnow()).isoformat().replace("+00:00", "Z")


def init_auth_db() -> None:
    validate_auth_secret()
    with db_lock, connection() as db:
        db.executescript("""
        create table if not exists users (
          id text primary key,
          display_name text not null,
          email text unique,
          phone text unique,
          password_hash text not null,
          email_verified integer not null default 0,
          phone_verified integer not null default 0,
          role text not null default 'user',
          disabled integer not null default 0,
          created_at text not null,
          updated_at text not null
        );
        create table if not exists verification_codes (
          id text primary key,
          channel text not null,
          target text not null,
          purpose text not null,
          code_hash text not null,
          expires_at text not null,
          attempts integer not null default 0,
          consumed_at text,
          created_at text not null
        );
        create index if not exists verification_target_created
          on verification_codes(target, purpose, created_at desc);
        create table if not exists auth_sessions (
          id text primary key,
          user_id text not null,
          token_hash text not null unique,
          expires_at text not null,
          created_at text not null,
          last_seen_at text not null,
          revoked_at text,
          user_agent text,
          ip_address text,
          foreign key(user_id) references users(id)
        );
        create index if not exists auth_session_token on auth_sessions(token_hash);
        create index if not exists auth_session_user on auth_sessions(user_id, created_at desc);
        create table if not exists auth_rate_limits (
          scope text not null,
          subject_hash text not null,
          window_started_at text not null,
          hits integer not null default 0,
          updated_at text not null,
          primary key(scope, subject_hash)
        );
        """)
        db.execute("delete from auth_rate_limits where updated_at<?", (iso(utcnow() - timedelta(days=7)),))
    bootstrap_admin()


def normalize_target(channel: str, target: str) -> str:
    normalized = target.strip().lower() if channel == "email" else re.sub(r"[\s()-]", "", target)
    valid = EMAIL_RE.fullmatch(normalized) if channel == "email" else PHONE_RE.fullmatch(normalized)
    if not valid:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Invalid {channel}")
    return normalized


def validate_auth_secret() -> None:
    normalized = AUTH_SECRET.strip()
    placeholder = normalized.upper().startswith(("CHANGE_ME", "REPLACE_ME", "YOUR_"))
    repeated = bool(normalized) and len(set(normalized)) == 1
    if AUTH_DEBUG_CODES and not normalized:
        return
    if len(normalized) < 24 or placeholder or repeated:
        raise RuntimeError("AUTH_SECRET must be a non-placeholder secret with at least 24 characters")


def client_ip(request: Request) -> str:
    trusted = request.headers.get("x-real-ip", "").strip()
    return (trusted or (request.client.host if request.client else "unknown"))[:128]


def rate_subject(scope: str, subject: str) -> str:
    secret = AUTH_SECRET or "debug-only-secret"
    return hmac.new(secret.encode(), f"{scope}|{subject}".encode(), hashlib.sha256).hexdigest()


def check_rate_limit(scope: str, subject: str, limit: int, window_seconds: int) -> None:
    """Reject a fixed-window bucket without storing the raw account, phone or IP."""
    now = utcnow()
    digest = rate_subject(scope, subject)
    with db_lock, connection() as db:
        row = db.execute(
            "select window_started_at,hits from auth_rate_limits where scope=? and subject_hash=?",
            (scope, digest),
        ).fetchone()
    if not row:
        return
    started = datetime.fromisoformat(row["window_started_at"].replace("Z", "+00:00"))
    elapsed = (now - started).total_seconds()
    if elapsed < window_seconds and row["hits"] >= limit:
        retry_after = max(1, int(window_seconds - elapsed))
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many attempts. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )


def record_rate_event(scope: str, subject: str, window_seconds: int) -> int:
    now = utcnow()
    digest = rate_subject(scope, subject)
    with db_lock, connection() as db:
        row = db.execute(
            "select window_started_at,hits from auth_rate_limits where scope=? and subject_hash=?",
            (scope, digest),
        ).fetchone()
        if row:
            started = datetime.fromisoformat(row["window_started_at"].replace("Z", "+00:00"))
            if (now - started).total_seconds() < window_seconds:
                hits = int(row["hits"]) + 1
                db.execute(
                    "update auth_rate_limits set hits=?,updated_at=? where scope=? and subject_hash=?",
                    (hits, iso(now), scope, digest),
                )
                return hits
        db.execute(
            """insert into auth_rate_limits(scope,subject_hash,window_started_at,hits,updated_at)
               values(?,?,?,?,?) on conflict(scope,subject_hash) do update set
               window_started_at=excluded.window_started_at,hits=excluded.hits,updated_at=excluded.updated_at""",
            (scope, digest, iso(now), 1, iso(now)),
        )
    return 1


def clear_rate_limit(scope: str, subject: str) -> None:
    with db_lock, connection() as db:
        db.execute(
            "delete from auth_rate_limits where scope=? and subject_hash=?",
            (scope, rate_subject(scope, subject)),
        )


def code_digest(channel: str, target: str, purpose: str, code: str) -> str:
    secret = AUTH_SECRET or "debug-only-secret"
    value = f"{channel}|{target}|{purpose}|{code}".encode()
    return hmac.new(secret.encode(), value, hashlib.sha256).hexdigest()


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def user_payload(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"], "display_name": row["display_name"], "email": row["email"],
        "phone": row["phone"], "email_verified": bool(row["email_verified"]),
        "phone_verified": bool(row["phone_verified"]), "role": row["role"]
    }


def send_email_code(target: str, code: str, purpose: str) -> None:
    host = os.getenv("SMTP_HOST", "")
    sender = os.getenv("SMTP_FROM", os.getenv("SMTP_USERNAME", ""))
    if not host or not sender:
        raise RuntimeError("SMTP is not configured")
    port = int(os.getenv("SMTP_PORT", "587"))
    username, password = os.getenv("SMTP_USERNAME", ""), os.getenv("SMTP_PASSWORD", "")
    message = EmailMessage()
    message["Subject"] = "ASTRA 验证码"
    message["From"], message["To"] = sender, target
    message.set_content(f"你的 ASTRA 验证码是：{code}\n\n用途：{purpose}\n{CODE_TTL_MINUTES} 分钟内有效。请勿转发给其他人。")
    with smtplib.SMTP(host, port, timeout=15) as smtp:
        if os.getenv("SMTP_STARTTLS", "1") == "1": smtp.starttls()
        if username: smtp.login(username, password)
        smtp.send_message(message)


def send_sms_code(target: str, code: str, purpose: str) -> None:
    endpoint = os.getenv("SMS_WEBHOOK_URL", "")
    if not endpoint:
        raise RuntimeError("SMS webhook is not configured")
    body = json.dumps({"phone": target, "code": code, "purpose": purpose, "product": "ASTRA"}).encode()
    request = urllib.request.Request(endpoint, data=body, method="POST", headers={"Content-Type": "application/json"})
    token = os.getenv("SMS_WEBHOOK_TOKEN", "")
    if token: request.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(request, timeout=15) as response:
        if response.status >= 300: raise RuntimeError(f"SMS gateway returned HTTP {response.status}")


def ensure_delivery_available(channel: str) -> None:
    if AUTH_DEBUG_CODES: return
    configured = bool(os.getenv("SMTP_HOST") and (os.getenv("SMTP_FROM") or os.getenv("SMTP_USERNAME"))) if channel == "email" else bool(os.getenv("SMS_WEBHOOK_URL"))
    if not configured:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"{channel} verification provider is not configured")


def verify_code(channel: str, target: str, purpose: str, code: str, request: Request) -> None:
    target_subject = f"{channel}|{target}|{purpose}"
    ip = client_ip(request)
    check_rate_limit("verification-check-target", target_subject, VERIFICATION_CHECK_TARGET_LIMIT, VERIFICATION_CHECK_WINDOW_SECONDS)
    check_rate_limit("verification-check-ip", ip, VERIFICATION_CHECK_IP_LIMIT, VERIFICATION_CHECK_WINDOW_SECONDS)
    failure: tuple[int, str] | None = None
    with db_lock, connection() as db:
        row = db.execute("""select * from verification_codes
          where channel=? and target=? and purpose=? and consumed_at is null
          order by created_at desc limit 1""", (channel, target, purpose)).fetchone()
        if not row or datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00")) < utcnow():
            failure = (status.HTTP_400_BAD_REQUEST, "Verification code expired or missing")
        elif row["attempts"] >= 5:
            failure = (status.HTTP_429_TOO_MANY_REQUESTS, "Too many verification attempts")
        elif not hmac.compare_digest(row["code_hash"], code_digest(channel, target, purpose, code)):
            # Commit the per-code counter before raising. Raising inside the
            # connection context would roll this update back.
            db.execute("update verification_codes set attempts=attempts+1 where id=?", (row["id"],))
            failure = (status.HTTP_400_BAD_REQUEST, "Invalid verification code")
        else:
            db.execute("update verification_codes set consumed_at=? where id=?", (iso(), row["id"]))
    if failure:
        target_hits = record_rate_event("verification-check-target", target_subject, VERIFICATION_CHECK_WINDOW_SECONDS)
        ip_hits = record_rate_event("verification-check-ip", ip, VERIFICATION_CHECK_WINDOW_SECONDS)
        if failure[0] == status.HTTP_429_TOO_MANY_REQUESTS or target_hits >= VERIFICATION_CHECK_TARGET_LIMIT or ip_hits >= VERIFICATION_CHECK_IP_LIMIT:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Too many verification attempts. Try again later.",
                headers={"Retry-After": str(VERIFICATION_CHECK_WINDOW_SECONDS)},
            )
        raise HTTPException(failure[0], failure[1])
    clear_rate_limit("verification-check-target", target_subject)


def set_session_cookie(response: Response, token: str) -> None:
    same_site = COOKIE_SAMESITE if COOKIE_SAMESITE in ("lax", "strict", "none") else "lax"
    # Keep the login response to one canonical Set-Cookie header. Safari 18 can
    # discard the new cookie when the same response also expires legacy cookies
    # with the same name but different paths/domains. Duplicate legacy values
    # are handled safely by current_user instead.
    response.set_cookie(
        COOKIE_NAME, token, max_age=SESSION_DAYS * 86400, httponly=True,
        secure=COOKIE_SECURE, samesite=same_site,
        path="/"
    )
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"


def create_session(user_id: str, request: Request, response: Response | None = None) -> str:
    token, session_id = secrets.token_urlsafe(48), str(uuid.uuid4())
    created, expires = utcnow(), utcnow() + timedelta(days=SESSION_DAYS)
    ip_address = client_ip(request)
    with db_lock, connection() as db:
        db.execute("""insert into auth_sessions
          (id,user_id,token_hash,expires_at,created_at,last_seen_at,user_agent,ip_address)
          values(?,?,?,?,?,?,?,?)""", (session_id, user_id, token_digest(token), iso(expires), iso(created), iso(created), request.headers.get("user-agent", "")[:300], ip_address[:64]))
    if response is not None:
        set_session_cookie(response, token)
    return token


def session_token(cookie_token: str | None, authorization: str | None) -> str | None:
    if cookie_token: return cookie_token
    if authorization and authorization.lower().startswith("bearer "): return authorization[7:].strip()
    return None


def request_session_tokens(
    request: Request,
    cookie_token: str | None,
    authorization: str | None,
) -> list[str]:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        return [token] if token else []
    tokens: list[str] = []
    raw_cookie = request.headers.get("cookie", "")
    for part in raw_cookie.split(";"):
        name, separator, value = part.strip().partition("=")
        if separator and name == COOKIE_NAME and value and value not in tokens:
            tokens.append(value)
    if cookie_token and cookie_token not in tokens:
        tokens.append(cookie_token)
    return tokens


def current_user(
    request: Request,
    astra_session: str | None = Cookie(default=None, alias=COOKIE_NAME),
    authorization: str | None = Header(default=None)
) -> dict[str, Any]:
    tokens = request_session_tokens(request, astra_session, authorization)
    if not tokens: raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")
    with db_lock, connection() as db:
        now = utcnow()
        for token in tokens:
            row = db.execute("""select u.*,s.id as session_id,s.expires_at,s.last_seen_at from auth_sessions s
              join users u on u.id=s.user_id where s.token_hash=? and s.revoked_at is null""", (token_digest(token),)).fetchone()
            expired = bool(row) and datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00")) < now
            if row and expired:
                db.execute("update auth_sessions set revoked_at=? where id=? and revoked_at is null", (iso(now), row["session_id"]))
                continue
            if not row or row["disabled"]:
                continue
            db.execute("update auth_sessions set last_seen_at=? where id=?", (iso(now), row["session_id"]))
            result = user_payload(row); result["session_id"] = row["session_id"]
            return result
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")


def require_operator(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user["role"] not in ("user", "operator", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Device control permission required")
    return user


def session_is_active(session_id: str) -> bool:
    with db_lock, connection() as db:
        row = db.execute(
            """select s.expires_at,s.revoked_at,u.disabled from auth_sessions s
               join users u on u.id=s.user_id where s.id=?""",
            (session_id,),
        ).fetchone()
    return bool(
        row
        and not row["revoked_at"]
        and not bool(row["disabled"])
        and datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00")) > utcnow()
    )


def bootstrap_admin() -> None:
    email, password = os.getenv("ADMIN_EMAIL", "").strip().lower(), os.getenv("ADMIN_PASSWORD", "")
    if not email and not password: return
    if not email or not password: raise RuntimeError("ADMIN_EMAIL and ADMIN_PASSWORD must be configured together")
    if password.startswith("CHANGE_ME_"): raise RuntimeError("ADMIN_PASSWORD must be replaced with a real secret")
    if len(password) < 9: raise RuntimeError("ADMIN_PASSWORD must contain at least 9 characters")
    now = iso()
    with db_lock, connection() as db:
        if db.execute("select 1 from users where email=?", (email,)).fetchone(): return
        db.execute("""insert into users
          (id,display_name,email,password_hash,email_verified,role,created_at,updated_at)
          values(?,?,?,?,1,'admin',?,?)""", (str(uuid.uuid4()), os.getenv("ADMIN_DISPLAY_NAME", "ASTRA 管理员"), email, password_hasher.hash(password), now, now))


class VerificationRequest(BaseModel):
    channel: Literal["email", "phone"]
    target: str = Field(min_length=5, max_length=254)
    purpose: Literal["register", "recover"] = "register"


class RegisterRequest(BaseModel):
    channel: Literal["email", "phone"]
    target: str = Field(min_length=5, max_length=254)
    code: str = Field(pattern=r"^\d{6}$")
    password: str = Field(min_length=9, max_length=128)
    display_name: str = Field(min_length=1, max_length=40)


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class NativeLoginRequest(LoginRequest):
    """Password login used by Tauri clients; it never creates a browser cookie."""


class NativeRefreshRequest(BaseModel):
    refresh_token: str | None = Field(default=None, min_length=20, max_length=256)


class RecoverRequest(RegisterRequest):
    display_name: str = "recovery"


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=9, max_length=128)


class ProfilePatch(BaseModel):
    display_name: str = Field(min_length=1, max_length=40)


@router.post("/verification/request", status_code=202, summary="发送邮箱或手机验证码")
def request_verification(body: VerificationRequest, request: Request) -> dict[str, Any]:
    target = normalize_target(body.channel, body.target)
    ensure_delivery_available(body.channel)
    target_subject = f"{body.channel}|{target}|{body.purpose}"
    ip = client_ip(request)
    check_rate_limit("verification-send-target", target_subject, VERIFICATION_SEND_TARGET_LIMIT, VERIFICATION_SEND_WINDOW_SECONDS)
    check_rate_limit("verification-send-ip", ip, VERIFICATION_SEND_IP_LIMIT, VERIFICATION_SEND_WINDOW_SECONDS)
    now = utcnow()
    code = f"{secrets.randbelow(1_000_000):06d}"
    verification_id = str(uuid.uuid4())
    with db_lock, connection() as db:
        recent = db.execute("""select created_at from verification_codes
          where channel=? and target=? and purpose=? order by created_at desc limit 1""", (body.channel, target, body.purpose)).fetchone()
        if recent:
            elapsed = (now - datetime.fromisoformat(recent["created_at"].replace("Z", "+00:00"))).total_seconds()
            if elapsed < CODE_COOLDOWN_SECONDS:
                retry_after = max(1, int(CODE_COOLDOWN_SECONDS - elapsed))
                raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, f"Retry after {retry_after} seconds", headers={"Retry-After": str(retry_after)})
        db.execute("""insert into verification_codes
          (id,channel,target,purpose,code_hash,expires_at,created_at) values(?,?,?,?,?,?,?)""",
          (verification_id, body.channel, target, body.purpose, code_digest(body.channel, target, body.purpose, code), iso(now + timedelta(minutes=CODE_TTL_MINUTES)), iso(now)))
    if not AUTH_DEBUG_CODES:
        try:
            (send_email_code if body.channel == "email" else send_sms_code)(target, code, body.purpose)
        except Exception as exc:
            with db_lock, connection() as db:
                db.execute("delete from verification_codes where id=?", (verification_id,))
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Verification delivery failed: {exc}") from exc
    record_rate_event("verification-send-target", target_subject, VERIFICATION_SEND_WINDOW_SECONDS)
    record_rate_event("verification-send-ip", ip, VERIFICATION_SEND_WINDOW_SECONDS)
    result: dict[str, Any] = {"ok": True, "expires_in": CODE_TTL_MINUTES * 60, "channel": body.channel}
    if AUTH_DEBUG_CODES: result["debug_code"] = code
    return result


@router.post("/register", status_code=201, summary="使用验证码注册账户")
def register(body: RegisterRequest, request: Request, response: Response) -> dict[str, Any]:
    target = normalize_target(body.channel, body.target)
    verify_code(body.channel, target, "register", body.code, request)
    field = "email" if body.channel == "email" else "phone"
    verified_field = "email_verified" if body.channel == "email" else "phone_verified"
    user_id, now = str(uuid.uuid4()), iso()
    try:
        with db_lock, connection() as db:
            db.execute(f"""insert into users
              (id,display_name,{field},password_hash,{verified_field},created_at,updated_at)
              values(?,?,?,?,1,?,?)""", (user_id, body.display_name.strip(), target, password_hasher.hash(body.password), now, now))
    except INTEGRITY_ERRORS as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "Account already exists") from exc
    create_session(user_id, request, response)
    with connection() as db: row = db.execute("select * from users where id=?", (user_id,)).fetchone()
    return {"user": user_payload(row)}


@router.post("/login", summary="账号密码登录")
def login(body: LoginRequest, request: Request, response: Response) -> dict[str, Any]:
    identifier = body.identifier.strip().lower()
    ip = client_ip(request)
    check_rate_limit("login-identifier", identifier, LOGIN_FAILURE_LIMIT, LOGIN_FAILURE_WINDOW_SECONDS)
    check_rate_limit("login-ip", ip, LOGIN_FAILURE_IP_LIMIT, LOGIN_FAILURE_WINDOW_SECONDS)
    with connection() as db:
        row = db.execute("select * from users where lower(email)=? or phone=?", (identifier, re.sub(r"[\s()-]", "", identifier))).fetchone()
    if not row:
        identifier_hits = record_rate_event("login-identifier", identifier, LOGIN_FAILURE_WINDOW_SECONDS)
        ip_hits = record_rate_event("login-ip", ip, LOGIN_FAILURE_WINDOW_SECONDS)
        if identifier_hits >= LOGIN_FAILURE_LIMIT or ip_hits >= LOGIN_FAILURE_IP_LIMIT:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many login failures. Try again later.", headers={"Retry-After": str(LOGIN_FAILURE_WINDOW_SECONDS)})
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account does not exist")
    if row["disabled"]:
        record_rate_event("login-identifier", identifier, LOGIN_FAILURE_WINDOW_SECONDS)
        record_rate_event("login-ip", ip, LOGIN_FAILURE_WINDOW_SECONDS)
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")
    try:
        password_hasher.verify(row["password_hash"], body.password)
    except VerifyMismatchError as exc:
        identifier_hits = record_rate_event("login-identifier", identifier, LOGIN_FAILURE_WINDOW_SECONDS)
        ip_hits = record_rate_event("login-ip", ip, LOGIN_FAILURE_WINDOW_SECONDS)
        if identifier_hits >= LOGIN_FAILURE_LIMIT or ip_hits >= LOGIN_FAILURE_IP_LIMIT:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many login failures. Try again later.", headers={"Retry-After": str(LOGIN_FAILURE_WINDOW_SECONDS)}) from exc
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Password is incorrect") from exc
    clear_rate_limit("login-identifier", identifier)
    if password_hasher.check_needs_rehash(row["password_hash"]):
        with connection() as db: db.execute("update users set password_hash=?,updated_at=? where id=?", (password_hasher.hash(body.password), iso(), row["id"]))
    create_session(row["id"], request, response)
    return {"user": user_payload(row)}


@router.post("/native/login", summary="Native bearer-token login")
def native_login(body: NativeLoginRequest, request: Request) -> dict[str, Any]:
    """Authenticate a Tauri client without setting a browser cookie.

    The returned token is the same opaque, hashed-at-rest session credential
    accepted by the regular Bearer authentication dependency.
    """
    identifier = body.identifier.strip().lower()
    ip = client_ip(request)
    check_rate_limit("login-identifier", identifier, LOGIN_FAILURE_LIMIT, LOGIN_FAILURE_WINDOW_SECONDS)
    check_rate_limit("login-ip", ip, LOGIN_FAILURE_IP_LIMIT, LOGIN_FAILURE_WINDOW_SECONDS)
    with connection() as db:
        row = db.execute("select * from users where lower(email)=? or phone=?", (identifier, re.sub(r"[\s()-]", "", identifier))).fetchone()
    if not row:
        record_rate_event("login-identifier", identifier, LOGIN_FAILURE_WINDOW_SECONDS)
        record_rate_event("login-ip", ip, LOGIN_FAILURE_WINDOW_SECONDS)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account does not exist")
    if row["disabled"]:
        record_rate_event("login-identifier", identifier, LOGIN_FAILURE_WINDOW_SECONDS)
        record_rate_event("login-ip", ip, LOGIN_FAILURE_WINDOW_SECONDS)
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")
    try:
        password_hasher.verify(row["password_hash"], body.password)
    except VerifyMismatchError as exc:
        record_rate_event("login-identifier", identifier, LOGIN_FAILURE_WINDOW_SECONDS)
        record_rate_event("login-ip", ip, LOGIN_FAILURE_WINDOW_SECONDS)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Password is incorrect") from exc
    clear_rate_limit("login-identifier", identifier)
    token = create_session(row["id"], request)
    return {"access_token": token, "token_type": "Bearer", "expires_in": SESSION_DAYS * 86400, "user": user_payload(row)}


@router.get("/me", summary="获取当前账户")
def me(response: Response, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    user.pop("session_id", None)
    return {"user": user}


@router.post("/session/refresh", summary="轮换当前会话")
def refresh_session(request: Request, response: Response, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with db_lock, connection() as db: db.execute("update auth_sessions set revoked_at=? where id=?", (iso(), user["session_id"]))
    create_session(user["id"], request, response)
    user.pop("session_id", None)
    return {"user": user}


@router.post("/native/session/refresh", summary="Refresh native bearer session")
def native_refresh_session(request: Request, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    old_session = user["session_id"]
    with db_lock, connection() as db:
        db.execute("update auth_sessions set revoked_at=? where id=?", (iso(), old_session))
    token = create_session(user["id"], request)
    user.pop("session_id", None)
    return {"access_token": token, "token_type": "Bearer", "expires_in": SESSION_DAYS * 86400, "user": user}


@router.post("/logout", status_code=204, summary="退出当前会话")
def logout(
    response: Response,
    astra_session: str | None = Cookie(default=None, alias=COOKIE_NAME),
    authorization: str | None = Header(default=None),
) -> Response:
    """End the supplied session even when it has already expired or been revoked."""
    token = session_token(astra_session, authorization)
    if token:
        with db_lock, connection() as db:
            db.execute(
                "update auth_sessions set revoked_at=? where token_hash=? and revoked_at is null",
                (iso(), token_digest(token)),
            )
    response.delete_cookie(COOKIE_NAME, path="/")
    response.status_code = 204
    return response


@router.post("/logout-all", status_code=204, summary="Logout all sessions")
def logout_all(response: Response, user: dict[str, Any] = Depends(current_user)) -> Response:
    """Revoke every active session for the current account, including this browser."""
    with db_lock, connection() as db:
        db.execute(
            "update auth_sessions set revoked_at=? where user_id=? and revoked_at is null",
            (iso(), user["id"]),
        )
    response.delete_cookie(COOKIE_NAME, path="/")
    response.status_code = 204
    return response


@router.post("/password/recover", summary="验证码重置密码")
def recover_password(body: RecoverRequest, request: Request) -> dict[str, bool]:
    target = normalize_target(body.channel, body.target)
    verify_code(body.channel, target, "recover", body.code, request)
    field = "email" if body.channel == "email" else "phone"
    with db_lock, connection() as db:
        row = db.execute(f"select id from users where {field}=?", (target,)).fetchone()
        if row:
            changed_at = iso()
            db.execute(
                "update users set password_hash=?,updated_at=? where id=?",
                (password_hasher.hash(body.password), changed_at, row["id"]),
            )
            # Password recovery is an account-takeover boundary. Any token
            # issued before the recovery must stop working, including tokens
            # held by an attacker on another device.
            db.execute(
                "update auth_sessions set revoked_at=? where user_id=? and revoked_at is null",
                (changed_at, row["id"]),
            )
    return {"ok": True}


@router.post("/password/change", summary="修改当前账户密码")
def change_password(body: PasswordChangeRequest, user: dict[str, Any] = Depends(current_user)) -> dict[str, bool]:
    if user.get("role") == "admin" and len(body.new_password) < 9:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Administrator password must contain at least 9 characters")
    with connection() as db: row = db.execute("select password_hash from users where id=?", (user["id"],)).fetchone()
    try: password_hasher.verify(row["password_hash"], body.current_password)
    except VerifyMismatchError as exc: raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect") from exc
    with db_lock, connection() as db:
        db.execute("update users set password_hash=?,updated_at=? where id=?", (password_hasher.hash(body.new_password), iso(), user["id"]))
        db.execute("update auth_sessions set revoked_at=? where user_id=? and id<>? and revoked_at is null", (iso(), user["id"], user["session_id"]))
    return {"ok": True}


@router.patch("/profile", summary="修改当前账户显示名")
def update_profile(body: ProfilePatch, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    display_name = body.display_name.strip()
    if not display_name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Display name cannot be empty")
    with db_lock, connection() as db:
        db.execute("update users set display_name=?,updated_at=? where id=?", (display_name, iso(), user["id"]))
        row = db.execute("select * from users where id=?", (user["id"],)).fetchone()
    return {"user": user_payload(row)}
