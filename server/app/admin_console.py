"""Local ASTRA operations console on a dedicated port."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import pty
import re
import secrets
import select
import socket
import subprocess
import threading
import time
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

import psycopg
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import FileResponse
from psycopg.rows import dict_row
from pydantic import BaseModel, Field

try:
    import paho.mqtt.client as mqtt
except Exception:
    mqtt = None

DATABASE_URL = os.environ["DATABASE_URL"]
PASSWORD_FILE = Path(os.getenv("MOSQUITTO_PASSWORD_FILE", "/config/passwd"))
ACL_FILE = Path(os.getenv("MOSQUITTO_ACL_FILE", "/config/acl.conf"))
HTML_FILE = Path(__file__).with_name("admin_console.html")
COOKIE_NAME = "astra_admin_console"
DEVICE_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{2,47}$")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)
metrics_lock = threading.Lock()
last_network_sample: tuple[float, int, int] | None = None
traffic_stop = threading.Event()
traffic_sampler_thread: threading.Thread | None = None
MQTT_HOST = os.getenv("MQTT_HOST", "127.0.0.1")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "backend-controller")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")
AUTH_SECRET = os.getenv("AUTH_SECRET", "")
CLOUDFLARED_METRICS_URL = os.getenv("CLOUDFLARED_METRICS_URL", "http://127.0.0.1:20241/metrics")
SERVICE_CONTROL_SOCKET = Path(os.getenv("SERVICE_CONTROL_SOCKET", "/run/service-control/control.sock"))
CLIENT_RECENT_SECONDS = max(300, int(os.getenv("AUTH_CLIENT_RECENT_SECONDS", "300")))
ADMIN_SESSION_DAYS = max(1, int(os.getenv("ADMIN_SESSION_DAYS", "30")))
ADMIN_LOGIN_LIMIT = max(3, int(os.getenv("ADMIN_LOGIN_FAILURE_LIMIT", "5")))
ADMIN_LOGIN_IP_LIMIT = max(ADMIN_LOGIN_LIMIT, int(os.getenv("ADMIN_LOGIN_FAILURE_IP_LIMIT", "15")))
ADMIN_LOGIN_WINDOW_SECONDS = max(60, int(os.getenv("ADMIN_LOGIN_FAILURE_WINDOW_SECONDS", "900")))
RESTARTABLE_SERVICES = {"postgres", "mqtt", "api", "sms"}
restart_lock = threading.Lock()
restart_requested_at: dict[str, float] = {}
TRAFFIC_RANGES = {
    "10m": (600, 5),
    "30m": (1800, 15),
    "1h": (3600, 30),
    "6h": (21600, 180),
    "24h": (86400, 720),
    "1w": (604800, 3600),
    "1mo": (2678400, 14400),
}
TRAFFIC_SOURCES = {
    "api": {"label": "API", "source": "HTTP 请求/响应体", "rx_label": "请求", "tx_label": "响应"},
    "mqtt": {"label": "MQTT", "source": "Mosquitto $SYS 网络字节", "rx_label": "接收", "tx_label": "发送"},
    "postgres": {"label": "PostgreSQL", "source": "缓存/磁盘块与 WAL/临时写入", "rx_label": "读取", "tx_label": "写入"},
    "tunnel": {"label": "公网隧道", "source": "cloudflared 进程网络字节", "rx_label": "接收", "tx_label": "发送"},
}

FIRMWARE_TARGETS = {
    "mppt-001": (Path(os.getenv("MPPT_CONFIG_PATH", "/firmware/mppt_config.h")), "MPPT_MQTT_PASSWORD"),
    "esp32-001": (Path(os.getenv("ESP32_CONFIG_PATH", "/firmware/device_config.h")), "DEVICE_MQTT_PASSWORD"),
    "ef-001": (Path(os.getenv("EF_CONFIG_PATH", "/firmware/ef_config.h")), "MQTT_PASSWORD"),
}

app = FastAPI(title="ASTRA Operations Console", docs_url=None, redoc_url=None, openapi_url=None)


def db_connection():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_utc(value: Any) -> datetime:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return datetime.min.replace(tzinfo=timezone.utc)


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def client_address(request: Request) -> str:
    trusted = request.headers.get("x-real-ip", "").strip()
    return (trusted or (request.client.host if request.client else "unknown"))[:128]


def admin_rate_subject(scope: str, subject: str) -> str:
    return hmac.new(AUTH_SECRET.encode(), f"admin|{scope}|{subject}".encode(), hashlib.sha256).hexdigest()


def check_admin_rate_limit(scope: str, subject: str, limit: int) -> None:
    digest = admin_rate_subject(scope, subject)
    now = datetime.now(timezone.utc)
    with db_connection() as db:
        row = db.execute(
            "select window_started_at,hits from auth_rate_limits where scope=%s and subject_hash=%s",
            (f"admin-{scope}", digest),
        ).fetchone()
    if not row:
        return
    elapsed = (now - parse_utc(row["window_started_at"])).total_seconds()
    if elapsed < ADMIN_LOGIN_WINDOW_SECONDS and int(row["hits"]) >= limit:
        retry = max(1, int(ADMIN_LOGIN_WINDOW_SECONDS - elapsed))
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many administrator login attempts", headers={"Retry-After": str(retry)})


def record_admin_rate_event(scope: str, subject: str) -> None:
    digest = admin_rate_subject(scope, subject)
    now = datetime.now(timezone.utc)
    now_text = now.isoformat().replace("+00:00", "Z")
    with db_connection() as db:
        row = db.execute(
            "select window_started_at,hits from auth_rate_limits where scope=%s and subject_hash=%s",
            (f"admin-{scope}", digest),
        ).fetchone()
        if row and (now - parse_utc(row["window_started_at"])).total_seconds() < ADMIN_LOGIN_WINDOW_SECONDS:
            db.execute(
                "update auth_rate_limits set hits=%s,updated_at=%s where scope=%s and subject_hash=%s",
                (int(row["hits"]) + 1, now_text, f"admin-{scope}", digest),
            )
            return
        db.execute(
            """insert into auth_rate_limits(scope,subject_hash,window_started_at,hits,updated_at)
               values(%s,%s,%s,1,%s) on conflict(scope,subject_hash) do update set
               window_started_at=excluded.window_started_at,hits=1,updated_at=excluded.updated_at""",
            (f"admin-{scope}", digest, now_text, now_text),
        )


def clear_admin_rate_limit(scope: str, subject: str) -> None:
    with db_connection() as db:
        db.execute(
            "delete from auth_rate_limits where scope=%s and subject_hash=%s",
            (f"admin-{scope}", admin_rate_subject(scope, subject)),
        )


def initialize() -> None:
    normalized_secret = AUTH_SECRET.strip()
    if len(normalized_secret) < 24 or normalized_secret.upper().startswith(("CHANGE_ME", "REPLACE_ME", "YOUR_")) or len(set(normalized_secret)) == 1:
        raise RuntimeError("AUTH_SECRET must be a non-placeholder secret with at least 24 characters")
    with db_connection() as db:
        db.execute("""
        create table if not exists admin_audit (
          id bigserial primary key,
          actor_id text not null,
          action text not null,
          target text not null,
          detail text not null default '{}',
          ip_address text,
          created_at text not null
        )
        """)
        db.execute("create index if not exists admin_audit_created on admin_audit(created_at desc)")
        db.execute("""
        create table if not exists service_traffic_totals (
          service text primary key,
          rx_bytes bigint not null default 0,
          tx_bytes bigint not null default 0,
          updated_at text not null
        )
        """)
        db.execute("""
        create table if not exists service_traffic_samples (
          id bigserial primary key,
          ts text not null,
          service text not null,
          rx_bytes bigint not null,
          tx_bytes bigint not null,
          interval_seconds double precision not null,
          source text not null
        )
        """)
        db.execute("create index if not exists service_traffic_samples_lookup on service_traffic_samples(service,ts desc)")
        db.execute("""create table if not exists auth_rate_limits (
          scope text not null, subject_hash text not null, window_started_at text not null,
          hits integer not null default 0, updated_at text not null,
          primary key(scope, subject_hash))""")
        db.execute("""create table if not exists user_controller_access (
          user_id text primary key references users(id) on delete cascade,
          controller_id text not null references controllers(controller_id) on delete cascade,
          created_at text not null,
          created_by text)""")
        db.execute("drop index if exists user_controller_access_controller")
        db.execute("create unique index if not exists user_controller_access_single_owner on user_controller_access(controller_id)")


@app.on_event("startup")
def startup() -> None:
    initialize()
    broker_traffic_probe.start()
    start_traffic_sampler()


@app.on_event("shutdown")
def shutdown() -> None:
    traffic_stop.set()
    broker_traffic_probe.stop()


class LoginIn(BaseModel):
    identifier: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class DeviceIn(BaseModel):
    device_id: str = Field(min_length=3, max_length=48)
    device_type: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=1, max_length=80)
    mqtt_password: str | None = Field(default=None, min_length=12, max_length=128)


class DevicePatch(BaseModel):
    enabled: bool


class PasswordIn(BaseModel):
    password: str = Field(min_length=12, max_length=128)
    sync_firmware: bool = True


class AccountPatch(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, max_length=32)
    password: str | None = Field(default=None, min_length=9, max_length=128)


class PermissionPatch(BaseModel):
    role: Literal["user", "operator", "admin"]
    disabled: bool


class ControllerAccessPatch(BaseModel):
    controller_id: str | None = Field(default=None, max_length=32)


def current_admin(token: str | None = Cookie(default=None, alias=COOKIE_NAME)) -> dict[str, Any]:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Administrator login required")
    digest = token_hash(token)
    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat().replace("+00:00", "Z")
    with db_connection() as db:
        session = db.execute("""
        select s.id as session_id,s.expires_at,u.id as user_id,u.display_name,u.role,u.disabled
        from auth_sessions s join users u on u.id=s.user_id
        where s.token_hash=%s and s.revoked_at is null
        """, (digest,)).fetchone()
        expired = bool(session) and parse_utc(session["expires_at"]) <= now_dt
        if not session or bool(session["disabled"]) or session["role"] != "admin" or expired:
            if session and expired:
                db.execute("update auth_sessions set revoked_at=%s where id=%s and revoked_at is null", (now, session["session_id"]))
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Administrator session expired")
        db.execute("update auth_sessions set last_seen_at=%s where id=%s", (now, session["session_id"]))
    return dict(session)


def read_access(
    request: Request,
    token: str | None = Cookie(default=None, alias=COOKIE_NAME),
    preview: str | None = Header(default=None, alias="X-ASTRA-Preview"),
    real_ip: str | None = Header(default=None, alias="X-Real-IP"),
) -> dict[str, Any]:
    client = request.client.host if request.client else ""
    local_preview = preview == "1" and client in ("127.0.0.1", "::1") and not real_ip
    if token:
        try:
            return current_admin(token)
        except HTTPException:
            if not local_preview:
                raise
    if local_preview:
        return {"user_id": "local-preview", "display_name": "只读预览", "preview": True}
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Administrator login required")


def audit(actor: dict[str, Any], action: str, target: str, detail: dict[str, Any], request: Request) -> None:
    ip = client_address(request)
    with db_connection() as db:
        db.execute(
            "insert into admin_audit(actor_id,action,target,detail,ip_address,created_at) values(%s,%s,%s,%s,%s,%s)",
            (actor["user_id"], action, target, json.dumps(detail, ensure_ascii=False), ip[:64], utc_iso()),
        )


def revoke_console_sessions(user_id: str) -> None:
    with db_connection() as db:
        db.execute(
            "update auth_sessions set revoked_at=%s where user_id=%s and revoked_at is null",
            (utc_iso(), user_id),
        )


def masked_email(value: str | None) -> str | None:
    if not value or "@" not in value:
        return value
    local, domain = value.split("@", 1)
    return f"{local[:2]}***@{domain}"


def masked_phone(value: str | None) -> str | None:
    if not value:
        return value
    return value if len(value) < 7 else f"{value[:3]}****{value[-2:]}"


def client_label(user_agent: str | None) -> str:
    value = user_agent or ""
    if "MQTTX" in value:
        return "MQTTX"
    if "Edg/" in value:
        return "Microsoft Edge"
    if "Chrome/" in value:
        return "Google Chrome"
    if "Firefox/" in value:
        return "Firefox"
    if "Safari/" in value:
        return "Safari"
    if "curl/" in value:
        return "curl"
    if "Windows NT" in value:
        return "Windows 浏览器"
    if "Android" in value:
        return "Android 设备"
    if "iPhone" in value or "iPad" in value:
        return "iPhone / iPad"
    if "Macintosh" in value:
        return "macOS 浏览器"
    return "未知客户端"


class BrokerTrafficProbe:
    def __init__(self) -> None:
        self.client = None
        self.lock = threading.Lock()
        self.values: dict[str, int] = {}

    def _on_connect(self, client, _userdata, _flags, reason_code, _properties) -> None:
        if reason_code == 0:
            client.subscribe("$SYS/broker/bytes/#", qos=0)

    def _on_message(self, _client, _userdata, message) -> None:
        key = message.topic.rsplit("/", 1)[-1]
        if key not in ("received", "sent"):
            return
        try:
            value = int(message.payload.decode("ascii", "strict"))
        except (UnicodeDecodeError, ValueError):
            return
        with self.lock:
            self.values[key] = value

    def start(self) -> None:
        if mqtt is None or not MQTT_PASSWORD:
            return
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="astra-traffic-probe")
        self.client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        try:
            self.client.connect(MQTT_HOST, MQTT_PORT, 60)
            self.client.loop_start()
        except Exception:
            self.client = None

    def stop(self) -> None:
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()

    def counters(self) -> tuple[int, int] | None:
        with self.lock:
            if "received" not in self.values or "sent" not in self.values:
                return None
            return self.values["received"], self.values["sent"]


broker_traffic_probe = BrokerTrafficProbe()


def cloudflared_counters() -> tuple[int, int] | None:
    try:
        with urllib.request.urlopen(CLOUDFLARED_METRICS_URL, timeout=2) as response:
            body = response.read().decode("utf-8", "replace")
    except Exception:
        return None
    values: dict[str, int] = {}
    names = {
        "process_network_receive_bytes_total": "rx",
        "process_network_transmit_bytes_total": "tx",
    }
    for line in body.splitlines():
        for metric, key in names.items():
            if line.startswith(metric + " "):
                try:
                    values[key] = int(float(line.split()[-1]))
                except (ValueError, IndexError):
                    pass
    return (values["rx"], values["tx"]) if "rx" in values and "tx" in values else None


def collect_traffic_counters() -> dict[str, tuple[int, int]]:
    counters: dict[str, tuple[int, int]] = {}
    with db_connection() as db:
        api_row = db.execute(
            "select rx_bytes,tx_bytes from service_traffic_totals where service='api'"
        ).fetchone()
        if api_row:
            counters["api"] = (int(api_row["rx_bytes"]), int(api_row["tx_bytes"]))
        postgres_row = db.execute("""
        select
          ((blks_read+blks_hit)*current_setting('block_size')::bigint)::bigint as read_bytes,
          (temp_bytes+coalesce((select wal_bytes::numeric::bigint from pg_stat_wal),0))::bigint as write_bytes
        from pg_stat_database where datname=current_database()
        """).fetchone()
        if postgres_row:
            counters["postgres"] = (int(postgres_row["read_bytes"]), int(postgres_row["write_bytes"]))
    mqtt_values = broker_traffic_probe.counters()
    if mqtt_values:
        counters["mqtt"] = mqtt_values
    tunnel_values = cloudflared_counters()
    if tunnel_values:
        counters["tunnel"] = tunnel_values
    return counters


def traffic_sampler() -> None:
    previous: dict[str, tuple[float, int, int]] = {}
    last_cleanup = 0.0
    while not traffic_stop.is_set():
        cycle_started = time.monotonic()
        try:
            current = collect_traffic_counters()
            now_mono = time.monotonic()
            rows = []
            for service, (rx_total, tx_total) in current.items():
                prior = previous.get(service)
                previous[service] = (now_mono, rx_total, tx_total)
                if not prior:
                    continue
                interval = max(now_mono - prior[0], 0.001)
                rx_delta = max(0, rx_total - prior[1])
                tx_delta = max(0, tx_total - prior[2])
                rows.append((utc_iso(), service, rx_delta, tx_delta, interval, TRAFFIC_SOURCES[service]["source"]))
            with db_connection() as db:
                for row in rows:
                    db.execute("""
                    insert into service_traffic_samples(ts,service,rx_bytes,tx_bytes,interval_seconds,source)
                    values(%s,%s,%s,%s,%s,%s)
                    """, row)
                if time.monotonic() - last_cleanup > 3600:
                    db.execute("delete from service_traffic_samples where ts::timestamptz < now()-interval '40 days'")
                    last_cleanup = time.monotonic()
        except Exception:
            pass
        traffic_stop.wait(max(0.5, 5.0 - (time.monotonic() - cycle_started)))


def start_traffic_sampler() -> None:
    global traffic_sampler_thread
    traffic_stop.clear()
    if traffic_sampler_thread and traffic_sampler_thread.is_alive():
        return
    traffic_sampler_thread = threading.Thread(target=traffic_sampler, name="astra-traffic-sampler", daemon=True)
    traffic_sampler_thread.start()


def service_control_request(payload: dict[str, Any]) -> dict[str, Any]:
    client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    client.settimeout(25)
    try:
        client.connect(str(SERVICE_CONTROL_SOCKET))
        client.sendall(json.dumps(payload).encode("utf-8") + b"\n")
        response = b""
        while b"\n" not in response and len(response) < 8192:
            chunk = client.recv(2048)
            if not chunk:
                break
            response += chunk
        if not response:
            raise RuntimeError("Service controller returned no response")
        return json.loads(response.split(b"\n", 1)[0])
    finally:
        client.close()


@app.get("/")
def index() -> FileResponse:
    return FileResponse(HTML_FILE)


@app.get("/admin-health")
def admin_health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/admin-api/login")
def login(body: LoginIn, request: Request, response: Response) -> dict[str, Any]:
    identifier = body.identifier.strip().lower()
    phone = re.sub(r"[\s()-]", "", identifier)
    ip = client_address(request)
    check_admin_rate_limit("identifier", identifier, ADMIN_LOGIN_LIMIT)
    check_admin_rate_limit("ip", ip, ADMIN_LOGIN_IP_LIMIT)
    with db_connection() as db:
        row = db.execute(
            "select id,display_name,email,phone,password_hash,role,disabled from users where lower(email)=%s or phone=%s",
            (identifier, phone),
        ).fetchone()
    if not row or row["disabled"] or row["role"] != "admin":
        record_admin_rate_event("identifier", identifier)
        record_admin_rate_event("ip", ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid administrator credentials")
    try:
        password_hasher.verify(row["password_hash"], body.password)
    except VerifyMismatchError as exc:
        record_admin_rate_event("identifier", identifier)
        record_admin_rate_event("ip", ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid administrator credentials") from exc
    clear_admin_rate_limit("identifier", identifier)
    token = secrets.token_urlsafe(48)
    created_dt = datetime.now(timezone.utc)
    created = created_dt.isoformat().replace("+00:00", "Z")
    expires = (created_dt + timedelta(days=ADMIN_SESSION_DAYS)).isoformat().replace("+00:00", "Z")
    client_ip = ip
    with db_connection() as db:
        db.execute("""
        insert into auth_sessions(id,user_id,token_hash,expires_at,created_at,last_seen_at,user_agent,ip_address)
        values(%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            str(uuid.uuid4()), row["id"], token_hash(token), expires, created, created,
            request.headers.get("user-agent", "")[:300], client_ip[:64],
        ))
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower()
    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        secure=forwarded_proto == "https" or request.url.scheme == "https",
        samesite="strict",
        max_age=ADMIN_SESSION_DAYS * 86400,
        path="/",
    )
    return {"ok": True, "user": {"display_name": row["display_name"], "role": row["role"]}}


@app.post("/admin-api/logout", status_code=204)
def logout(response: Response, token: str | None = Cookie(default=None, alias=COOKIE_NAME)) -> Response:
    if token:
        with db_connection() as db:
            db.execute(
                "update auth_sessions set revoked_at=%s where token_hash=%s and revoked_at is null",
                (utc_iso(), token_hash(token)),
            )
    response.delete_cookie(COOKIE_NAME, path="/")
    response.status_code = 204
    return response


def network_totals() -> tuple[int, int]:
    rx = tx = 0
    for line in Path("/proc/net/dev").read_text().splitlines()[2:]:
        name, values = line.split(":", 1)
        if name.strip() == "lo":
            continue
        fields = values.split()
        rx += int(fields[0])
        tx += int(fields[8])
    return rx, tx


def network_rates() -> dict[str, float | int | None]:
    global last_network_sample
    now = time.monotonic()
    rx, tx = network_totals()
    with metrics_lock:
        previous = last_network_sample
        last_network_sample = (now, rx, tx)
    if not previous:
        return {"rx_total": rx, "tx_total": tx, "rx_rate": None, "tx_rate": None}
    elapsed = max(now - previous[0], 0.001)
    return {
        "rx_total": rx,
        "tx_total": tx,
        "rx_rate": max(0.0, (rx - previous[1]) / elapsed),
        "tx_rate": max(0.0, (tx - previous[2]) / elapsed),
    }


def port_open(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.35):
            return True
    except OSError:
        return False


def system_metrics() -> dict[str, float | int | None]:
    memory: dict[str, int] = {}
    for line in Path("/proc/meminfo").read_text().splitlines():
        key, value = line.split(":", 1)
        memory[key] = int(value.strip().split()[0]) * 1024
    uptime = float(Path("/proc/uptime").read_text().split()[0])
    load1, load5, load15 = os.getloadavg()
    return {
        "memory_total": memory.get("MemTotal"),
        "memory_available": memory.get("MemAvailable"),
        "uptime": uptime,
        "load1": load1,
        "load5": load5,
        "load15": load15,
    }


@app.get("/admin-api/metrics")
def metrics(_admin: dict[str, Any] = Depends(read_access)) -> dict[str, Any]:
    with db_connection() as db:
        row = db.execute("""
        select
          pg_database_size(current_database()) as database_bytes,
          (select count(*) from pg_stat_activity where datname=current_database()) as connections,
          (select count(*) from devices) as devices,
          (select count(*) from telemetry_samples) as telemetry,
          (select count(*) from commands) as commands,
          (select count(*) from users) as users,
          (select count(*) from auth_sessions where revoked_at is null) as sessions
        """).fetchone()
    return {
        "time": utc_iso(),
        "database": dict(row),
        "network": network_rates(),
        "system": system_metrics(),
        "services": {
            "postgres": port_open(5432),
            "mqtt": port_open(1883),
            "api": port_open(8080),
            "sms": port_open(8090),
        },
    }


@app.get("/admin-api/traffic/history")
def traffic_history(
    window: str = Query("10m", alias="range"),
    services: str = Query("api,mqtt,postgres,tunnel"),
    _admin: dict[str, Any] = Depends(read_access),
) -> dict[str, Any]:
    if window not in TRAFFIC_RANGES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unsupported traffic range")
    requested = [item.strip() for item in services.split(",") if item.strip()]
    invalid = [item for item in requested if item not in TRAFFIC_SOURCES]
    if invalid or not requested:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unsupported traffic service")
    seconds, bucket = TRAFFIC_RANGES[window]
    with db_connection() as db:
        rows = db.execute("""
        select service,
          (floor(extract(epoch from ts::timestamptz)/%s)*%s)::bigint as bucket_epoch,
          sum(rx_bytes)::double precision/nullif(sum(interval_seconds),0) as rx_rate,
          sum(tx_bytes)::double precision/nullif(sum(interval_seconds),0) as tx_rate,
          sum(rx_bytes+tx_bytes)::double precision/nullif(sum(interval_seconds),0) as total_rate
        from service_traffic_samples
        where ts::timestamptz >= now()-(%s*interval '1 second') and service=any(%s)
        group by service,bucket_epoch order by bucket_epoch,service
        """, (bucket, bucket, seconds, requested)).fetchall()
        oldest = db.execute(
            "select min(ts) as oldest from service_traffic_samples where service=any(%s)",
            (requested,),
        ).fetchone()["oldest"]
    series: dict[str, list[dict[str, Any]]] = {service: [] for service in requested}
    for row in rows:
        series[row["service"]].append({
            "ts": int(row["bucket_epoch"]),
            "rx": float(row["rx_rate"]) if row["rx_rate"] is not None else None,
            "tx": float(row["tx_rate"]) if row["tx_rate"] is not None else None,
            "total": float(row["total_rate"]) if row["total_rate"] is not None else None,
        })
    return {
        "generated_at": utc_iso(),
        "range": window,
        "range_seconds": seconds,
        "bucket_seconds": bucket,
        "oldest_sample": oldest,
        "sources": {service: TRAFFIC_SOURCES[service] for service in requested},
        "series": series,
    }


@app.post("/admin-api/services/{service}/restart")
def restart_service(
    service: str,
    request: Request,
    admin: dict[str, Any] = Depends(current_admin),
) -> dict[str, Any]:
    if service not in RESTARTABLE_SERVICES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Service is not restartable")
    with restart_lock:
        remaining = 30 - (time.monotonic() - restart_requested_at.get(service, 0))
        if remaining > 0:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, f"Restart cooldown: {int(remaining) + 1}s")
        restart_requested_at[service] = time.monotonic()
    audit(admin, "service.restart.requested", service, {}, request)
    try:
        result = service_control_request({"action": "restart", "service": service})
    except (OSError, RuntimeError, json.JSONDecodeError) as exc:
        with restart_lock:
            restart_requested_at.pop(service, None)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Service controller unavailable: {exc}") from exc
    if not result.get("ok"):
        with restart_lock:
            restart_requested_at.pop(service, None)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, result.get("error", "Service restart failed"))
    return {
        "ok": True,
        "service": service,
        "message": "Restart completed; health checks are recovering",
    }


@app.get("/admin-api/users")
def user_accounts(access: dict[str, Any] = Depends(read_access)) -> list[dict[str, Any]]:
    now = utc_iso()
    with db_connection() as db:
        rows = db.execute("""
        select u.id,u.display_name,u.email,u.phone,u.email_verified,u.phone_verified,
          u.role,u.disabled,u.created_at,u.updated_at,
          case when u.role='admin' then 3
            when (select count(*) from user_controller_access a where a.user_id=u.id)>0 then 3
            else 0 end as device_count,
          coalesce((select a.controller_id from user_controller_access a where a.user_id=u.id),
                   case when u.role='admin' then coalesce(
                     (select controller_id from controllers where controller_id='default' and enabled=1),
                     (select controller_id from controllers where enabled=1 order by controller_id limit 1)) else null end) as controller_id,
          coalesce((select c.name from user_controller_access a join controllers c
                    on c.controller_id=a.controller_id where a.user_id=u.id),
                   case when u.role='admin' then coalesce(
                     (select name from controllers where controller_id='default' and enabled=1),
                     (select name from controllers where enabled=1 order by controller_id limit 1)) else null end) as controller_name,
          (select count(*) from auth_sessions s
             where s.user_id=u.id and s.revoked_at is null and s.expires_at>%s) as active_sessions,
          (select max(s.last_seen_at) from auth_sessions s where s.user_id=u.id) as last_seen_at
        from users u order by u.created_at,u.id
        """, (now,)).fetchall()
    preview = bool(access.get("preview"))
    result = []
    for row in rows:
        item = dict(row)
        if preview:
            item["email"] = masked_email(item["email"])
            item["phone"] = masked_phone(item["phone"])
        item["email_verified"] = bool(item["email_verified"])
        item["phone_verified"] = bool(item["phone_verified"])
        item["disabled"] = bool(item["disabled"])
        item["self"] = item["id"] == access["user_id"]
        item["editable"] = not preview
        result.append(item)
    return result


@app.patch("/admin-api/users/{user_id}")
def update_account(
    user_id: str,
    body: AccountPatch,
    request: Request,
    admin: dict[str, Any] = Depends(current_admin),
) -> dict[str, Any]:
    provided = body.model_dump(exclude_unset=True)
    with db_connection() as db:
        existing = db.execute(
            "select id,display_name,email,phone,email_verified,phone_verified from users where id=%s",
            (user_id,),
        ).fetchone()
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")

    changes: dict[str, Any] = {}
    public_changes: list[str] = []
    if "display_name" in provided:
        changes["display_name"] = (body.display_name or "").strip()
        public_changes.append("display_name")
    if "email" in provided:
        email = (body.email or "").strip().lower() or None
        if email and not EMAIL_RE.fullmatch(email):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid email address")
        changes["email"] = email
        if email != existing["email"]:
            changes["email_verified"] = 0
        public_changes.append("email")
    if "phone" in provided:
        phone = re.sub(r"[\s()-]", "", body.phone or "") or None
        if phone and not re.fullmatch(r"\+?\d{7,20}", phone):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid phone number")
        changes["phone"] = phone
        if phone != existing["phone"]:
            changes["phone_verified"] = 0
        public_changes.append("phone")
    final_email = changes.get("email", existing["email"])
    final_phone = changes.get("phone", existing["phone"])
    if not final_email and not final_phone:
        raise HTTPException(status.HTTP_409_CONFLICT, "Account must keep an email address or phone number")
    password_changed = bool(body.password)
    if password_changed:
        changes["password_hash"] = password_hasher.hash(body.password)
        public_changes.append("password")
    if not changes:
        return {"ok": True, "changed": []}
    changes["updated_at"] = utc_iso()
    assignments = ",".join(f"{column}=%s" for column in changes)
    try:
        with db_connection() as db:
            db.execute(
                f"update users set {assignments} where id=%s",
                (*changes.values(), user_id),
            )
            if password_changed:
                db.execute(
                    "update auth_sessions set revoked_at=%s where user_id=%s and revoked_at is null",
                    (utc_iso(), user_id),
                )
    except psycopg.IntegrityError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email address or phone number is already in use") from exc
    audit(admin, "account.update", user_id, {"fields": public_changes}, request)
    if password_changed:
        revoke_console_sessions(user_id)
    return {"ok": True, "changed": public_changes, "reauthenticate": password_changed and user_id == admin["user_id"]}


@app.patch("/admin-api/users/{user_id}/permissions")
def update_permissions(
    user_id: str,
    body: PermissionPatch,
    request: Request,
    admin: dict[str, Any] = Depends(current_admin),
) -> dict[str, Any]:
    with db_connection() as db:
        target = db.execute("select id,role,disabled from users where id=%s", (user_id,)).fetchone()
        if not target:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
        current_disabled = bool(target["disabled"])
        if user_id == admin["user_id"] and (body.role != "admin" or body.disabled):
            raise HTTPException(status.HTTP_409_CONFLICT, "You cannot demote or disable your own account")
        removing_admin = target["role"] == "admin" and not current_disabled and (body.role != "admin" or body.disabled)
        if removing_admin:
            active_admins = db.execute(
                "select count(*) as count from users where role='admin' and disabled=0"
            ).fetchone()["count"]
            if active_admins <= 1:
                raise HTTPException(status.HTTP_409_CONFLICT, "The last active administrator cannot be removed")
        db.execute(
            "update users set role=%s,disabled=%s,updated_at=%s where id=%s",
            (body.role, 1 if body.disabled else 0, utc_iso(), user_id),
        )
        if body.disabled or body.role != target["role"]:
            db.execute(
                "update auth_sessions set revoked_at=%s where user_id=%s and revoked_at is null",
                (utc_iso(), user_id),
            )
    audit(
        admin,
        "account.permissions",
        user_id,
        {"role": body.role, "disabled": body.disabled},
        request,
    )
    if body.disabled or body.role != target["role"]:
        revoke_console_sessions(user_id)
    return {"ok": True, "role": body.role, "disabled": body.disabled}


@app.get("/admin-api/users/{user_id}/controller")
def user_controller_access(
    user_id: str,
    _access: dict[str, Any] = Depends(read_access),
) -> dict[str, Any]:
    with db_connection() as db:
        user = db.execute("select id,display_name,role from users where id=%s", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
        rows = db.execute(
            """select c.controller_id,c.name,c.mqtt_host,c.mqtt_port,c.mqtt_username,c.enabled,
               case when a.user_id is null then false else true end as granted
               from controllers c left join user_controller_access a
                 on a.controller_id=c.controller_id and a.user_id=%s
               where c.enabled=1 order by c.controller_id""",
            (user_id,),
        ).fetchall()
    implicit_controller = None
    if user["role"] == "admin":
        implicit_controller = next(
            (row["controller_id"] for row in rows if row["controller_id"] == "default"),
            rows[0]["controller_id"] if rows else None,
        )
    controllers = []
    for row in rows:
        item = dict(row)
        item["enabled"] = bool(item["enabled"])
        item["granted"] = bool(item["granted"]) or item["controller_id"] == implicit_controller
        controllers.append(item)
    return {
        "user": {"id": user["id"], "display_name": user["display_name"], "role": user["role"]},
        "implicit_controller": implicit_controller,
        "controllers": controllers,
    }


@app.put("/admin-api/users/{user_id}/controller")
def replace_user_controller_access(
    user_id: str,
    body: ControllerAccessPatch,
    request: Request,
    admin: dict[str, Any] = Depends(current_admin),
) -> dict[str, Any]:
    requested = body.controller_id.strip().lower() if body.controller_id else None
    if requested and not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,31}", requested):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid controller id")
    with db_connection() as db:
        target = db.execute("select id,role from users where id=%s", (user_id,)).fetchone()
        if not target:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Account not found")
        if target["role"] == "admin":
            raise HTTPException(status.HTTP_409_CONFLICT, "Administrator uses the default controller")
        if requested and not db.execute(
            "select 1 from controllers where controller_id=%s and enabled=1",
            (requested,),
        ).fetchone():
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown controller id")
        owner = db.execute(
            "select user_id from user_controller_access where controller_id=%s and user_id<>%s",
            (requested, user_id),
        ).fetchone() if requested else None
        if owner:
            raise HTTPException(status.HTTP_409_CONFLICT, "Controller is already assigned to another account")
        previous_row = db.execute(
            "select controller_id from user_controller_access where user_id=%s",
            (user_id,),
        ).fetchone()
        previous = previous_row["controller_id"] if previous_row else None
        if previous == requested:
            return {"ok": True, "controller_id": requested, "sessions_revoked": False}
        db.execute("delete from user_controller_access where user_id=%s", (user_id,))
        created_at = utc_iso()
        if requested:
            db.execute(
                "insert into user_controller_access(user_id,controller_id,created_at,created_by) values(%s,%s,%s,%s)",
                (user_id, requested, created_at, admin["user_id"]),
            )
        db.execute(
            "update auth_sessions set revoked_at=%s where user_id=%s and revoked_at is null",
            (created_at, user_id),
        )
    audit(admin, "account.controller", user_id, {"previous": previous, "current": requested}, request)
    return {"ok": True, "controller_id": requested, "sessions_revoked": True}


@app.get("/admin-api/clients")
def client_sessions(
    limit: int = Query(100, ge=1, le=500),
    access: dict[str, Any] = Depends(read_access),
) -> list[dict[str, Any]]:
    now_dt = datetime.now(timezone.utc)
    with db_connection() as db:
        rows = db.execute("""
        select s.id,s.user_id,u.display_name,u.email,u.phone,s.created_at,s.last_seen_at,
          s.expires_at,s.revoked_at,s.user_agent,s.ip_address
        from auth_sessions s join users u on u.id=s.user_id
        order by s.last_seen_at desc limit %s
        """, (limit,)).fetchall()
    preview = bool(access.get("preview"))
    result = []
    for row in rows:
        item = dict(row)
        item["valid"] = item["revoked_at"] is None and parse_utc(item["expires_at"]) > now_dt
        item["active"] = item["valid"] and (now_dt - parse_utc(item["last_seen_at"])).total_seconds() <= CLIENT_RECENT_SECONDS
        item["client"] = client_label(item["user_agent"])
        item["identifier"] = item["email"] or item["phone"] or item["user_id"]
        if preview:
            item["identifier"] = masked_email(item["email"]) or masked_phone(item["phone"]) or "已授权账户"
            item["ip_address"] = "本机/已隐藏"
            item["user_agent"] = None
        item.pop("email", None)
        item.pop("phone", None)
        result.append(item)
    return result


@app.delete("/admin-api/clients/{session_id}")
def revoke_client_session(
    session_id: str,
    request: Request,
    admin: dict[str, Any] = Depends(current_admin),
) -> dict[str, bool]:
    with db_connection() as db:
        row = db.execute("select user_id,revoked_at from auth_sessions where id=%s", (session_id,)).fetchone()
        if not row:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Client session not found")
        if row["revoked_at"] is None:
            db.execute("update auth_sessions set revoked_at=%s where id=%s", (utc_iso(), session_id))
    audit(admin, "client.revoke", session_id, {"user_id": row["user_id"]}, request)
    return {"ok": True}


@app.get("/admin-api/export")
def export_database(
    request: Request,
    scope: Literal["operational", "accounts", "audit", "all"] = Query("all"),
    admin: dict[str, Any] = Depends(current_admin),
) -> Response:
    table_queries = {
        "devices": "select * from devices order by device_id",
        "telemetry_latest": "select * from telemetry_latest order by device_id",
        "telemetry_samples": "select * from telemetry_samples order by ts,id",
        "commands": "select * from commands order by created_at,id",
        "service_traffic_totals": "select * from service_traffic_totals order by service",
        "service_traffic_samples": "select * from service_traffic_samples order by ts,service,id",
        "users": """select id,display_name,email,phone,email_verified,phone_verified,role,disabled,
                    created_at,updated_at from users order by created_at,id""",
        "auth_sessions": """select id,user_id,expires_at,created_at,last_seen_at,revoked_at,user_agent,ip_address
                           from auth_sessions order by created_at,id""",
        "controllers": "select controller_id,name,mqtt_host,mqtt_port,mqtt_username,enabled,updated_at from controllers order by controller_id",
        "user_controller_access": "select user_id,controller_id,created_at,created_by from user_controller_access order by user_id",
        "admin_audit": "select * from admin_audit order by id",
    }
    groups = {
        "operational": ["devices", "telemetry_latest", "telemetry_samples", "commands", "service_traffic_totals", "service_traffic_samples"],
        "accounts": ["users", "auth_sessions", "controllers", "user_controller_access"],
        "audit": ["admin_audit"],
        "all": list(table_queries),
    }
    audit(admin, "database.export", scope, {"tables": groups[scope]}, request)
    exported: dict[str, list[dict[str, Any]]] = {}
    with db_connection() as db:
        for table in groups[scope]:
            exported[table] = [dict(row) for row in db.execute(table_queries[table]).fetchall()]
    document = {
        "format": "ASTRA safe database export v1",
        "exported_at": utc_iso(),
        "scope": scope,
        "excluded_secrets": ["password_hash", "token_hash", "verification_code", "environment_secrets"],
        "tables": exported,
    }
    filename = f"astra-{scope}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    return Response(
        content=json.dumps(document, ensure_ascii=False, indent=2, default=str).encode("utf-8"),
        media_type="application/json; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Content-Type-Options": "nosniff",
        },
    )


@app.get("/admin-api/devices")
def devices(_admin: dict[str, Any] = Depends(read_access)) -> list[dict[str, Any]]:
    with db_connection() as db:
        rows = db.execute("""
        select d.device_id,d.device_type,d.name,d.enabled,d.last_seen,d.last_status,d.firmware_version,
          coalesce((select count(*) from telemetry_samples t where t.device_id=d.device_id),0) as telemetry_count
        from devices d order by d.device_id
        """).fetchall()
    return [dict(row) for row in rows]


def mqtt_accounts() -> list[str]:
    if not PASSWORD_FILE.exists():
        return []
    return sorted(line.split(":", 1)[0] for line in PASSWORD_FILE.read_text().splitlines() if ":" in line)


def managed_acl_block(device_id: str) -> str:
    return "\n".join([
        f"# ASTRA ADMIN BEGIN {device_id}",
        f"user {device_id}",
        f"topic write devices/{device_id}/telemetry",
        f"topic write devices/{device_id}/status",
        f"topic write devices/{device_id}/reported",
        f"topic read  devices/{device_id}/command",
        f"topic read  devices/{device_id}/desired",
        f"# ASTRA ADMIN END {device_id}",
    ])


def ensure_managed_acl(device_id: str) -> None:
    text = ACL_FILE.read_text()
    if f"user {device_id}" in text:
        return
    ACL_FILE.write_text(text.rstrip() + "\n\n" + managed_acl_block(device_id) + "\n")


def remove_managed_acl(device_id: str) -> bool:
    text = ACL_FILE.read_text()
    pattern = re.compile(
        rf"\n?# ASTRA ADMIN BEGIN {re.escape(device_id)}\n.*?# ASTRA ADMIN END {re.escape(device_id)}\n?",
        re.DOTALL,
    )
    updated, count = pattern.subn("\n", text)
    if count:
        ACL_FILE.write_text(updated.rstrip() + "\n")
    return bool(count)


def reload_mosquitto() -> None:
    result = service_control_request({"action": "signal", "service": "mqtt", "signal": "SIGHUP"})
    if not result.get("ok"):
        raise RuntimeError(result.get("error", "Mosquitto reload failed"))


def set_mqtt_password(username: str, password: str, create: bool = False) -> None:
    command = ["mosquitto_passwd"]
    if create and not PASSWORD_FILE.exists():
        command.append("-c")
    command.extend([str(PASSWORD_FILE), username])
    master, slave = pty.openpty()
    process = subprocess.Popen(command, stdin=slave, stdout=slave, stderr=slave, close_fds=True)
    os.close(slave)
    output = bytearray()

    def wait_for_prompt(marker: bytes) -> None:
        deadline = time.monotonic() + 10
        while marker not in output:
            if time.monotonic() >= deadline or process.poll() is not None:
                raise RuntimeError("mosquitto_passwd did not request a password")
            readable, _, _ = select.select([master], [], [], 0.25)
            if readable:
                output.extend(os.read(master, 4096))

    try:
        wait_for_prompt(b"Password:")
        os.write(master, password.encode() + b"\n")
        wait_for_prompt(b"Reenter password:")
        os.write(master, password.encode() + b"\n")
        process.wait(timeout=10)
        if process.returncode:
            raise subprocess.CalledProcessError(process.returncode, command, output=bytes(output))
    finally:
        if process.poll() is None:
            process.kill()
        os.close(master)
    reload_mosquitto()


def sync_firmware_password(username: str, password: str) -> bool:
    target = FIRMWARE_TARGETS.get(username)
    if not target or not target[0].exists():
        return False
    path, macro = target
    text = path.read_text()
    escaped = password.replace("\\", "\\\\").replace('"', '\\"')
    updated, count = re.subn(
        rf'(^\s*#define\s+{re.escape(macro)}\s+")[^"]*(")',
        rf'\g<1>{escaped}\g<2>',
        text,
        count=1,
        flags=re.MULTILINE,
    )
    if count != 1:
        raise RuntimeError(f"Firmware macro not found: {macro}")
    # The firmware headers are mounted into this container as individual files.
    # Replacing a single-file bind mount with os.rename() fails with EBUSY, so
    # update the mounted inode in place instead.
    path.write_text(updated)
    return True


@app.get("/admin-api/mqtt/accounts")
def accounts(_admin: dict[str, Any] = Depends(read_access)) -> list[dict[str, Any]]:
    known = set(FIRMWARE_TARGETS)
    return [
        {"username": username, "firmware_sync": username in known, "protected": username == "backend-controller"}
        for username in mqtt_accounts()
    ]


@app.post("/admin-api/mqtt/accounts/{username}/password")
def change_mqtt_password(
    username: str,
    body: PasswordIn,
    request: Request,
    admin: dict[str, Any] = Depends(current_admin),
) -> dict[str, Any]:
    if username not in mqtt_accounts():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "MQTT account not found")
    if username == "backend-controller":
        raise HTTPException(status.HTTP_409_CONFLICT, "Backend account must be rotated through server secrets")
    try:
        set_mqtt_password(username, body.password)
        synced = sync_firmware_password(username, body.password) if body.sync_firmware else False
    except (subprocess.CalledProcessError, RuntimeError) as exc:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"MQTT password update failed: {exc}") from exc
    audit(admin, "mqtt.password", username, {"firmware_synced": synced}, request)
    return {"ok": True, "firmware_synced": synced}


@app.post("/admin-api/devices", status_code=201)
def create_device(
    body: DeviceIn,
    request: Request,
    admin: dict[str, Any] = Depends(current_admin),
) -> dict[str, Any]:
    device_id = body.device_id.strip().lower()
    if not DEVICE_ID_RE.fullmatch(device_id):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid device id")
    try:
        with db_connection() as db:
            db.execute(
                """insert into devices(device_id,device_type,name,enabled,controller_id,logical_device_id)
                   values(%s,%s,%s,1,'default',%s)""",
                (device_id, body.device_type.strip(), body.name.strip(), device_id),
            )
    except psycopg.IntegrityError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "Device already exists") from exc
    mqtt_created = False
    if body.mqtt_password:
        try:
            set_mqtt_password(device_id, body.mqtt_password)
            ensure_managed_acl(device_id)
            mqtt_created = True
        except Exception as exc:
            with db_connection() as db:
                db.execute("delete from devices where device_id=%s", (device_id,))
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"MQTT account creation failed: {exc}") from exc
    audit(admin, "device.create", device_id, {"mqtt_created": mqtt_created}, request)
    return {"ok": True, "device_id": device_id, "mqtt_created": mqtt_created}


@app.patch("/admin-api/devices/{device_id}")
def patch_device(
    device_id: str,
    body: DevicePatch,
    request: Request,
    admin: dict[str, Any] = Depends(current_admin),
) -> dict[str, Any]:
    with db_connection() as db:
        result = db.execute("update devices set enabled=%s where device_id=%s", (1 if body.enabled else 0, device_id))
        if result.rowcount != 1:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Device not found")
    audit(admin, "device.enable" if body.enabled else "device.disable", device_id, {}, request)
    return {"ok": True, "enabled": body.enabled}


@app.delete("/admin-api/devices/{device_id}")
def delete_device(
    device_id: str,
    request: Request,
    purge: bool = Query(False),
    admin: dict[str, Any] = Depends(current_admin),
) -> dict[str, Any]:
    with db_connection() as db:
        if not db.execute("select 1 from devices where device_id=%s", (device_id,)).fetchone():
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Device not found")
        db.execute("delete from telemetry_latest where device_id=%s", (device_id,))
        if purge:
            db.execute("delete from telemetry_samples where device_id=%s", (device_id,))
            db.execute("delete from commands where device_id=%s", (device_id,))
        db.execute("delete from devices where device_id=%s", (device_id,))
    mqtt_removed = False
    if remove_managed_acl(device_id) and device_id in mqtt_accounts():
        subprocess.run(["mosquitto_passwd", "-D", str(PASSWORD_FILE), device_id], check=True, capture_output=True, text=True)
        reload_mosquitto()
        mqtt_removed = True
    audit(admin, "device.delete", device_id, {"purge": purge, "mqtt_removed": mqtt_removed}, request)
    return {"ok": True, "mqtt_removed": mqtt_removed}


@app.get("/admin-api/audit")
def audit_log(limit: int = Query(30, ge=1, le=200), _admin: dict[str, Any] = Depends(read_access)) -> list[dict[str, Any]]:
    with db_connection() as db:
        rows = db.execute(
            "select action,target,detail,ip_address,created_at from admin_audit order by id desc limit %s",
            (limit,),
        ).fetchall()
    result = []
    for row in rows:
        item = dict(row)
        item["detail"] = json.loads(item["detail"])
        result.append(item)
    return result
