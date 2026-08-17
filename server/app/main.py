"""Astroy control-plane API and MQTT ingestion worker.

Runs with SQLite by default so MQTTX simulation can be used immediately. Set
DATABASE_URL and MQTT_* environment variables for production PostgreSQL and
Mosquitto. The API keeps the complete MQTT JSON payload, exposes latest state,
and streams updates over Server-Sent Events.
"""
from __future__ import annotations

import asyncio, copy, json, os, queue, threading, time, uuid
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict, deque
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.auth import router as auth_router, init_auth_db, current_user, require_operator, session_is_active
from app.alerts import notify_alert
from app.db import connection as conn, database_label, db_lock, is_postgres

try:
    import paho.mqtt.client as mqtt
except Exception:  # optional for API-only development
    mqtt = None

DEVICE_IDS = ("mppt-001", "esp32-001", "ef-001")
MQTT_HOST = os.getenv("MQTT_HOST", "127.0.0.1")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USER = os.getenv("MQTT_USERNAME", "backend-controller")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")
DEVICE_OFFLINE_SECONDS = max(30, int(os.getenv("DEVICE_OFFLINE_SECONDS", "120")))
DEVICE_MONITOR_INTERVAL_SECONDS = max(5, int(os.getenv("DEVICE_MONITOR_INTERVAL_SECONDS", "15")))
COMMAND_RETRY_SECONDS = max(2, int(os.getenv("COMMAND_RETRY_SECONDS", "5")))
COMMAND_MAX_ATTEMPTS = max(1, int(os.getenv("COMMAND_MAX_ATTEMPTS", "3")))
MQTT_MAX_PAYLOAD_BYTES = max(1024, int(os.getenv("MQTT_MAX_PAYLOAD_BYTES", "65536")))
MQTT_MAX_MESSAGES_PER_SECOND = max(1, int(os.getenv("MQTT_MAX_MESSAGES_PER_SECOND", "30")))
TELEMETRY_RETENTION_DAYS = max(1, int(os.getenv("TELEMETRY_RETENTION_DAYS", "30")))
WEATHER_CACHE_MAX_ENTRIES = max(16, int(os.getenv("WEATHER_CACHE_MAX_ENTRIES", "256")))
WEATHER_RATE_LIMIT = max(10, int(os.getenv("WEATHER_RATE_LIMIT", "120")))
WEATHER_RATE_WINDOW_SECONDS = max(60, int(os.getenv("WEATHER_RATE_WINDOW_SECONDS", "300")))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    init_auth_db()
    worker.start()
    try:
        yield
    finally:
        worker.stop_event.set()
        if worker.client:
            worker.client.loop_stop()
            worker.client.disconnect()


class APITrafficMiddleware:
    """Count real HTTP payload bytes without buffering streaming responses."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return
        received = 0
        transmitted = 0

        async def counted_receive():
            nonlocal received
            message = await receive()
            received += len(message.get("body", b""))
            return message

        async def counted_send(message):
            nonlocal transmitted
            if message.get("type") == "http.response.body":
                transmitted += len(message.get("body", b""))
            await send(message)

        try:
            await self.app(scope, counted_receive, counted_send)
        finally:
            if received or transmitted:
                await asyncio.to_thread(record_api_traffic, received, transmitted)


app = FastAPI(title="Astroy Control API", version="1.1.0", lifespan=lifespan)
cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(APITrafficMiddleware)
app.include_router(auth_router)


class EventHub:
    """Broadcast operational events to isolated per-session subscriber queues."""

    def __init__(self, queue_size: int = 1000) -> None:
        self.queue_size = queue_size
        self.lock = threading.Lock()
        self.subscribers: dict[str, queue.Queue[dict[str, Any]]] = {}

    def subscribe(self, session_id: str) -> tuple[str, queue.Queue[dict[str, Any]]]:
        subscription_id = f"{session_id}:{uuid.uuid4()}"
        subscriber: queue.Queue[dict[str, Any]] = queue.Queue(maxsize=self.queue_size)
        with self.lock:
            self.subscribers[subscription_id] = subscriber
        return subscription_id, subscriber

    def unsubscribe(self, subscription_id: str) -> None:
        with self.lock:
            self.subscribers.pop(subscription_id, None)

    def publish(self, item: dict[str, Any]) -> None:
        with self.lock:
            subscribers = list(self.subscribers.values())
        for subscriber in subscribers:
            try:
                subscriber.put_nowait(item)
            except queue.Full:
                try:
                    subscriber.get_nowait()
                    subscriber.put_nowait(item)
                except queue.Empty:
                    pass


events = EventHub()
weather_cache_lock = threading.Lock()
weather_cache: OrderedDict[str, tuple[float, dict[str, Any]]] = OrderedDict()
weather_rate_lock = threading.Lock()
weather_rate: OrderedDict[str, tuple[float, int]] = OrderedDict()
mqtt_rate_lock = threading.Lock()
mqtt_rate: dict[str, deque[float]] = {}

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def record_api_traffic(received: int, transmitted: int) -> None:
    try:
        with db_lock, conn() as c:
            c.execute("""
            insert into service_traffic_totals(service,rx_bytes,tx_bytes,updated_at)
            values('api',?,?,?)
            on conflict(service) do update set
              rx_bytes=service_traffic_totals.rx_bytes+excluded.rx_bytes,
              tx_bytes=service_traffic_totals.tx_bytes+excluded.tx_bytes,
              updated_at=excluded.updated_at
            """, (received, transmitted, now_iso()))
    except Exception:
        # Traffic accounting must never make a control API request fail.
        pass

def fetch_json(url: str) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            request = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "ASTRA-control-api/1.1"})
            with urllib.request.urlopen(request, timeout=15) as response:
                raw = response.read(2 * 1024 * 1024 + 1)
            if len(raw) > 2 * 1024 * 1024:
                raise ValueError("Upstream response exceeded 2 MiB")
            payload = json.loads(raw.decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("Upstream returned a non-object payload")
            return payload
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            if attempt == 0:
                time.sleep(0.4)
    assert last_error is not None
    raise last_error

def fetch_json_cached(url: str, ttl_seconds: int) -> dict[str, Any]:
    now = time.monotonic()
    with weather_cache_lock:
        hit = weather_cache.get(url)
        if hit and hit[0] > now:
            weather_cache.move_to_end(url)
            return copy.deepcopy(hit[1])
    payload = fetch_json(url)
    with weather_cache_lock:
        for key in [key for key, value in weather_cache.items() if value[0] <= now]:
            weather_cache.pop(key, None)
        weather_cache[url] = (now + ttl_seconds, copy.deepcopy(payload))
        weather_cache.move_to_end(url)
        while len(weather_cache) > WEATHER_CACHE_MAX_ENTRIES:
            weather_cache.popitem(last=False)
    return payload


def request_ip(request: Request) -> str:
    return (request.headers.get("x-real-ip", "").strip() or (request.client.host if request.client else "unknown"))[:128]


def check_weather_rate(request: Request, scope: str) -> None:
    now = time.monotonic()
    key = f"{scope}:{request_ip(request)}"
    with weather_rate_lock:
        started, hits = weather_rate.get(key, (now, 0))
        if now - started >= WEATHER_RATE_WINDOW_SECONDS:
            started, hits = now, 0
        if hits >= WEATHER_RATE_LIMIT:
            retry = max(1, int(WEATHER_RATE_WINDOW_SECONDS - (now - started)))
            raise HTTPException(429, "Too many weather requests", headers={"Retry-After": str(retry)})
        weather_rate[key] = (started, hits + 1)
        weather_rate.move_to_end(key)
        while len(weather_rate) > 2048:
            weather_rate.popitem(last=False)


def mqtt_message_allowed(device_id: str) -> bool:
    now = time.monotonic()
    with mqtt_rate_lock:
        samples = mqtt_rate.setdefault(device_id, deque())
        while samples and now - samples[0] >= 1.0:
            samples.popleft()
        if len(samples) >= MQTT_MAX_MESSAGES_PER_SECOND:
            return False
        samples.append(now)
        return True


def ensure_column(c, table: str, name: str, definition: str) -> None:
    if is_postgres():
        c.execute(f"alter table {table} add column if not exists {name} {definition}")
        return
    columns = {row["name"] for row in c.execute(f"pragma table_info({table})").fetchall()}
    if name not in columns:
        c.execute(f"alter table {table} add column {name} {definition}")

def init_db() -> None:
    sample_id = "bigserial primary key" if is_postgres() else "integer primary key autoincrement"
    with conn() as c:
        c.executescript(f"""
        create table if not exists devices (
          device_id text primary key, device_type text not null, name text not null,
          enabled integer not null default 1, last_seen text, last_status text,
          firmware_version text, metadata text not null default '{{}}');
        create table if not exists telemetry_samples (
          id {sample_id}, device_id text not null,
          ts text not null, seq integer, payload text not null);
        create index if not exists telemetry_device_ts on telemetry_samples(device_id, ts desc);
        create table if not exists telemetry_latest (
          device_id text primary key, ts text not null, payload text not null);
        create table if not exists commands (
          id text primary key, device_id text not null, command text not null,
          payload text not null, status text not null default 'pending',
          created_at text not null, acknowledged_at text, result text,
          mqtt_payload text, attempt_count integer not null default 0,
          max_attempts integer not null default 3, last_attempt_at text,
          next_retry_at text);
        create table if not exists device_alerts (
          id text primary key, device_id text not null, alert_type text not null,
          status text not null default 'open', opened_at text not null,
          resolved_at text, detail text not null default '{{}}');
        create index if not exists device_alert_status on device_alerts(device_id,status,opened_at desc);
        create table if not exists service_traffic_totals (
          service text primary key, rx_bytes bigint not null default 0,
          tx_bytes bigint not null default 0, updated_at text not null);
        """)
        ensure_column(c, "commands", "mqtt_payload", "text")
        ensure_column(c, "commands", "attempt_count", "integer not null default 0")
        ensure_column(c, "commands", "max_attempts", "integer not null default 3")
        ensure_column(c, "commands", "last_attempt_at", "text")
        ensure_column(c, "commands", "next_retry_at", "text")
        # Commands created by older builds could remain pending forever because
        # they had no retry metadata. Do not replay days-old hardware actions;
        # close them explicitly while allowing a just-created command to be
        # recovered by the retry worker after a crash.
        legacy_cutoff = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat().replace("+00:00", "Z")
        legacy_result = json.dumps({"ok": False, "error": "legacy_pending_migrated"}, separators=(",", ":"))
        c.execute(
            """update commands set status='failed',result=?,acknowledged_at=?,next_retry_at=null
               where status='pending' and created_at<?""",
            (legacy_result, now_iso(), legacy_cutoff),
        )
        c.execute("""insert into service_traffic_totals(service,rx_bytes,tx_bytes,updated_at)
          values('api',0,0,?) on conflict(service) do nothing""", (now_iso(),))
        for did in DEVICE_IDS:
            dtype = "mppt" if did.startswith("mppt") else ("environment" if did.startswith("esp32") else "flat-field")
            c.execute("insert into devices(device_id,device_type,name) values(?,?,?) on conflict(device_id) do nothing", (did, dtype, did))

def publish_event(item: dict[str, Any]) -> None:
    events.publish(item)


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def iso_after(seconds: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(seconds=seconds)).isoformat().replace("+00:00", "Z")


def notify_async(kind: str, subject: str, body: str) -> None:
    if os.getenv("OPERATIONAL_EMAIL_ALERTS", "1") != "1":
        return
    def deliver() -> None:
        try:
            notify_alert(kind, subject, body)
        except Exception:
            # Alert delivery failures must not block MQTT ingestion or retries.
            pass
    threading.Thread(target=deliver, name=f"alert-{kind}", daemon=True).start()


def open_device_alert(device_id: str, detail: dict[str, Any]) -> None:
    opened = now_iso()
    with db_lock, conn() as c:
        existing = c.execute(
            "select id from device_alerts where device_id=? and alert_type='offline' and status='open' order by opened_at desc limit 1",
            (device_id,),
        ).fetchone()
        if existing:
            return
        alert_id = str(uuid.uuid4())
        c.execute(
            "insert into device_alerts(id,device_id,alert_type,status,opened_at,detail) values(?,?,?,'open',?,?)",
            (alert_id, device_id, "offline", opened, json.dumps(detail, separators=(",", ":"))),
        )
    publish_event({"type": "device_alert", "alert": "offline", "device_id": device_id, "status": "open", "ts": opened})
    notify_async("device-offline", f"设备 {device_id} 已离线", f"设备 {device_id} 超过 {DEVICE_OFFLINE_SECONDS} 秒没有遥测或状态心跳。\n时间：{opened}")


def resolve_device_alert(device_id: str) -> None:
    resolved = now_iso()
    with db_lock, conn() as c:
        rows = c.execute(
            "select id from device_alerts where device_id=? and alert_type='offline' and status='open'",
            (device_id,),
        ).fetchall()
        if not rows:
            return
        c.execute(
            "update device_alerts set status='resolved',resolved_at=? where device_id=? and alert_type='offline' and status='open'",
            (resolved, device_id),
        )
    publish_event({"type": "device_alert", "alert": "offline", "device_id": device_id, "status": "resolved", "ts": resolved})


def command_failed_alert(command_id: str, device_id: str, reason: str) -> None:
    failed = now_iso()
    publish_event({"type": "command_failed", "command_id": command_id, "device_id": device_id, "reason": reason, "ts": failed})
    notify_async("command-failed", f"设备 {device_id} 命令失败", f"命令 {command_id} 在重试后仍未成功。\n原因：{reason}\n时间：{failed}")

def ingest(topic: str, payload: str) -> None:
    if len(payload.encode("utf-8")) > MQTT_MAX_PAYLOAD_BYTES:
        return
    parts = topic.split("/")
    if len(parts) != 3 or parts[0] != "devices": return
    did, kind = parts[1], parts[2]
    if kind not in {"telemetry", "status", "reported"} or not mqtt_message_allowed(did):
        return
    try: body = json.loads(payload)
    except json.JSONDecodeError: return
    if not isinstance(body, dict):
        return
    # Validate topic/device identity and basic protocol envelope. Legacy flat
    # payloads remain accepted for MQTTX and existing firmware simulation.
    if body.get("device") and body["device"] != did:
        return
    if body.get("schema") not in (None, 1):
        return
    ts = body.get("ts") or now_iso()
    if body.get("ts"):
        try:
            parsed_ts = parse_iso(str(ts))
            if parsed_ts.tzinfo is None:
                parsed_ts = parsed_ts.replace(tzinfo=timezone.utc)
            age = datetime.now(timezone.utc) - parsed_ts
            if age > timedelta(days=1) or age < -timedelta(minutes=10):
                return
        except (TypeError, ValueError):
            return
    device_online = False
    device_offline = False
    failed_command: tuple[str, str] | None = None
    with db_lock, conn() as c:
        device = c.execute("select enabled from devices where device_id=?", (did,)).fetchone()
        if not device or not bool(device["enabled"]):
            return
        if kind == "telemetry":
            c.execute("insert into telemetry_samples(device_id,ts,seq,payload) values(?,?,?,?)", (did, ts, body.get("seq"), payload))
            c.execute("insert into telemetry_latest(device_id,ts,payload) values(?,?,?) on conflict(device_id) do update set ts=excluded.ts,payload=excluded.payload", (did, ts, payload))
            c.execute("update devices set last_seen=?,last_status='online' where device_id=?", (ts, did))
            device_online = True
        elif kind == "status":
            reported_status = body.get("status", "unknown")
            if reported_status not in {"online", "offline"}:
                return
            c.execute("update devices set last_seen=?,last_status=? where device_id=?", (ts, reported_status, did))
            device_online = reported_status == "online"
            device_offline = reported_status == "offline"
        elif kind == "reported" and body.get("id"):
            command_row = c.execute("select device_id,attempt_count,max_attempts from commands where id=?", (body["id"],)).fetchone()
            if command_row and command_row["device_id"] == did:
                if body.get("ok", True):
                    c.execute("update commands set status='acknowledged',acknowledged_at=?,result=?,next_retry_at=null where id=?", (ts, payload, body["id"]))
                elif int(command_row["attempt_count"]) < int(command_row["max_attempts"]):
                    c.execute("update commands set status='retrying',result=?,next_retry_at=? where id=?", (payload, iso_after(COMMAND_RETRY_SECONDS), body["id"]))
                else:
                    c.execute("update commands set status='failed',acknowledged_at=?,result=?,next_retry_at=null where id=?", (ts, payload, body["id"]))
                    failed_command = (body["id"], command_row["device_id"])
    if device_online:
        resolve_device_alert(did)
    elif device_offline:
        open_device_alert(did, {"source": "device-status", "last_seen": ts})
    if failed_command:
        command_failed_alert(failed_command[0], failed_command[1], "device returned a negative acknowledgement")
    publish_event({"topic": topic, "payload": body})

class CommandIn(BaseModel):
    command: str = Field(min_length=1, max_length=64)
    args: dict[str, Any] = Field(default_factory=dict)

class MQTTWorker:
    client = None
    connected = False
    subscribed = False
    message_count = 0
    last_error = ""
    reliability_thread = None
    stop_event = threading.Event()

    def _on_connect(self, client, _userdata, _flags, reason_code, _properties) -> None:
        self.connected = reason_code == 0
        if self.connected:
            client.subscribe([
                ("devices/+/telemetry", 1),
                ("devices/+/status", 1),
                ("devices/+/reported", 1),
            ])

    def _on_subscribe(self, _client, _userdata, _mid, reason_codes, _properties) -> None:
        self.subscribed = bool(reason_codes) and all(not code.is_failure for code in reason_codes)

    def _on_disconnect(self, _client, _userdata, _disconnect_flags, _reason_code, _properties) -> None:
        self.connected = False
        self.subscribed = False

    def _on_message(self, _client, _userdata, message) -> None:
        try:
            if len(message.payload) > MQTT_MAX_PAYLOAD_BYTES:
                self.last_error = "MQTT payload exceeded configured limit"
                return
            ingest(message.topic, message.payload.decode("utf-8", "strict"))
            self.message_count += 1
            self.last_error = ""
        except Exception as exc:
            self.last_error = f"{type(exc).__name__}: {exc}"

    def start(self) -> None:
        self.stop_event.clear()
        if mqtt is not None and os.getenv("MQTT_DISABLED", "0") != "1":
            self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="astroy-api")
            if MQTT_USER: self.client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
            self.client.on_connect = self._on_connect
            self.client.on_subscribe = self._on_subscribe
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message
            try:
                self.client.reconnect_delay_set(min_delay=1, max_delay=30)
                self.client.connect_async(MQTT_HOST, MQTT_PORT, 60)
                self.client.loop_start()
            except Exception as exc:
                self.last_error = f"connect {type(exc).__name__}: {exc}"
        self.reliability_thread = threading.Thread(target=self._reliability_loop, name="mqtt-reliability", daemon=True)
        self.reliability_thread.start()

    def _reliability_loop(self) -> None:
        next_retention_run = 0.0
        while not self.stop_event.is_set():
            try:
                monitor_offline_devices()
                retry_due_commands(self)
                if time.monotonic() >= next_retention_run:
                    prune_telemetry()
                    next_retention_run = time.monotonic() + 3600
                self.last_error = "" if self.connected else self.last_error
            except Exception as exc:
                self.last_error = f"reliability {type(exc).__name__}: {exc}"
            self.stop_event.wait(min(DEVICE_MONITOR_INTERVAL_SECONDS, COMMAND_RETRY_SECONDS))

    def publish(self, topic: str, payload: str) -> bool:
        return bool(self.client and self.connected and self.subscribed and self.client.publish(topic, payload, qos=1, retain=topic.endswith("/desired")).rc == 0)


def monitor_offline_devices() -> None:
    now = datetime.now(timezone.utc)
    newly_offline: list[tuple[str, str, int]] = []
    with db_lock, conn() as c:
        rows = c.execute("select device_id,last_seen,last_status from devices where enabled=1 and last_seen is not null").fetchall()
        for row in rows:
            try:
                age = int((now - parse_iso(row["last_seen"])).total_seconds())
            except (TypeError, ValueError):
                continue
            if age > DEVICE_OFFLINE_SECONDS and row["last_status"] != "offline":
                c.execute("update devices set last_status='offline' where device_id=?", (row["device_id"],))
                newly_offline.append((row["device_id"], row["last_seen"], age))
    for device_id, last_seen, age in newly_offline:
        open_device_alert(device_id, {"source": "offline-monitor", "last_seen": last_seen, "age_seconds": age})


def prune_telemetry() -> int:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=TELEMETRY_RETENTION_DAYS)).isoformat().replace("+00:00", "Z")
    with db_lock, conn() as c:
        return c.execute("delete from telemetry_samples where ts<?", (cutoff,)).rowcount


def retry_due_commands(mqtt_worker: MQTTWorker) -> None:
    now = now_iso()
    with db_lock, conn() as c:
        rows = c.execute(
            """select id,device_id,mqtt_payload,payload,attempt_count,max_attempts
               from commands where status in ('pending','sent','queued','retrying')
               and next_retry_at is not null and next_retry_at<=? order by next_retry_at limit 50""",
            (now,),
        ).fetchall()
    for row in rows:
        attempts = int(row["attempt_count"] or 0)
        maximum = int(row["max_attempts"] or COMMAND_MAX_ATTEMPTS)
        if attempts >= maximum:
            result = json.dumps({"ok": False, "error": "ack_timeout", "attempts": attempts}, separators=(",", ":"))
            with db_lock, conn() as c:
                updated = c.execute(
                    "update commands set status='failed',result=?,next_retry_at=null where id=? and status in ('pending','sent','queued','retrying')",
                    (result, row["id"]),
                ).rowcount
            if updated:
                command_failed_alert(row["id"], row["device_id"], f"no ACK after {attempts} attempts")
            continue
        mqtt_payload = row["mqtt_payload"] or row["payload"]
        sent = mqtt_worker.publish(f"devices/{row['device_id']}/command", mqtt_payload)
        attempted_at = now_iso()
        with db_lock, conn() as c:
            c.execute(
                """update commands set status=?,attempt_count=?,last_attempt_at=?,next_retry_at=?
                   where id=? and status in ('pending','sent','queued','retrying')""",
                ("sent" if sent else "queued", attempts + 1, attempted_at, iso_after(COMMAND_RETRY_SECONDS), row["id"]),
            )

worker = MQTTWorker()

@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "mqtt": worker.connected,
        "mqtt_subscribed": worker.subscribed,
        "mqtt_messages": worker.message_count,
        "mqtt_error": worker.last_error or None,
        "database": database_label(),
        "device_offline_seconds": DEVICE_OFFLINE_SECONDS,
        "command_max_attempts": COMMAND_MAX_ATTEMPTS,
    }

@app.get("/api/astro", tags=["Weather"])
async def astro_proxy(
    request: Request,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
) -> dict[str, Any]:
    """Same-origin 7Timer proxy used by the static ASTRA frontend."""
    check_weather_rate(request, "astro")
    params = urllib.parse.urlencode({
        "lon": f"{lon:.4f}", "lat": f"{lat:.4f}", "ac": "0",
        "unit": "metric", "output": "json", "tzshift": "0",
    })
    upstream_url = f"https://www.7timer.info/bin/astro.php?{params}"

    def fetch_upstream() -> dict[str, Any]:
        payload = fetch_json_cached(upstream_url, 1800)
        if not isinstance(payload.get("dataseries"), list):
            raise ValueError("Invalid 7Timer payload")
        return {**payload, "proxy": {"source": "7Timer", "latitude": lat, "longitude": lon, "fetchedAt": now_iso()}}

    try:
        return await asyncio.to_thread(fetch_upstream)
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(502, f"7Timer unavailable: {exc}") from exc

@app.get("/api/weather/forecast", tags=["Weather"])
async def open_meteo_forecast(
    request: Request,
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    timezone: str = Query("auto", min_length=1, max_length=64),
    forecast_days: int = Query(7, ge=1, le=16),
    hourly: str = Query("temperature_2m,relative_humidity_2m,cloud_cover,precipitation,visibility,wind_speed_10m", min_length=1, max_length=512),
) -> dict[str, Any]:
    """Same-origin Open-Meteo forecast proxy used by the static frontend."""
    check_weather_rate(request, "forecast")
    params = urllib.parse.urlencode({
        "latitude": f"{latitude:.5f}", "longitude": f"{longitude:.5f}",
        "timezone": timezone, "forecast_days": forecast_days, "hourly": hourly,
    })
    try:
        payload = await asyncio.to_thread(fetch_json_cached, f"{OPEN_METEO_FORECAST_URL}?{params}", 300)
        payload["proxy"] = {"source": "Open-Meteo", "latitude": latitude, "longitude": longitude, "fetchedAt": now_iso()}
        return payload
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(502, f"Open-Meteo forecast unavailable: {exc}") from exc

@app.get("/api/weather/geocoding", tags=["Weather"])
async def open_meteo_geocoding(
    request: Request,
    name: str = Query(..., min_length=1, max_length=120),
    count: int = Query(7, ge=1, le=10),
    language: str = Query("zh", min_length=2, max_length=8),
) -> dict[str, Any]:
    """Same-origin Open-Meteo geocoding proxy used by the location search."""
    check_weather_rate(request, "geocoding")
    params = urllib.parse.urlencode({"name": name, "count": count, "language": language, "format": "json"})
    try:
        return await asyncio.to_thread(fetch_json_cached, f"{OPEN_METEO_GEOCODING_URL}?{params}", 3600)
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(502, f"Open-Meteo geocoding unavailable: {exc}") from exc

@app.get("/api/v1/devices", tags=["Devices"])
def devices(_user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    with conn() as c: return [dict(r) for r in c.execute("select * from devices order by device_id")]

@app.get("/api/v1/devices/{device_id}/latest", tags=["Devices"])
def latest(device_id: str, _user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with conn() as c: r = c.execute("select * from telemetry_latest where device_id=?", (device_id,)).fetchone()
    if not r: raise HTTPException(404, "no telemetry")
    return {"device_id": device_id, "ts": r["ts"], "payload": json.loads(r["payload"])}

@app.get("/api/v1/devices/{device_id}/telemetry", tags=["Devices"])
def telemetry(device_id: str, limit: int = Query(100, ge=1, le=2000), _user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    with conn() as c: rows = c.execute("select ts,seq,payload from telemetry_samples where device_id=? order by ts desc limit ?", (device_id, limit)).fetchall()
    return [{"ts": r["ts"], "seq": r["seq"], "payload": json.loads(r["payload"])} for r in rows]

@app.post("/api/v1/devices/{device_id}/commands", tags=["Commands"])
def command(device_id: str, req: CommandIn, _user: dict[str, Any] = Depends(require_operator)) -> dict[str, Any]:
    with conn() as c:
        device = c.execute("select enabled from devices where device_id=?", (device_id,)).fetchone()
    if not device: raise HTTPException(404, "unknown device")
    if not device["enabled"]: raise HTTPException(409, "device is disabled")
    cid = str(uuid.uuid4()); ts = now_iso(); payload = {"schema": 1, "id": cid, "device": device_id, "ts": ts, "command": req.command, **req.args}
    # The current MPPT firmware predates the common command envelope and uses
    # top-level key/string matching. Do not include schema:1 there: its parser
    # would otherwise mistake that value for mode=1 or state=true.
    mqtt_payload = payload
    if device_id == "mppt-001":
        if req.command == "fan": mqtt_payload = {"fan": bool(req.args.get("state", False))}
        elif req.command == "mode": mqtt_payload = {"mode": int(req.args.get("value", req.args.get("state", 0)))}
        elif req.command == "enable_fan": mqtt_payload = {"enable_fan": bool(req.args.get("state", req.args.get("enabled", False)))}
        elif req.command in ("voltage_battery_min", "voltage_battery_max", "current_charging", "temperature_fan"):
            value = req.args.get("value")
            if not isinstance(value, (int, float)):
                raise HTTPException(422, "MPPT setting requires a numeric value")
            limits = {"voltage_battery_min": (8.0, 20.0), "voltage_battery_max": (12.0, 48.0), "current_charging": (0.1, 20.0), "temperature_fan": (20.0, 80.0)}
            low, high = limits[req.command]
            if not low <= float(value) <= high:
                raise HTTPException(422, f"{req.command} must be between {low} and {high}")
            mqtt_payload = {req.command: value}
        elif req.command == "debug": mqtt_payload = {"debug": True}
        elif req.command == "settings":
            limits = {
                "voltage_battery_min": (8.0, 20.0),
                "voltage_battery_max": (12.0, 48.0),
                "current_charging": (0.1, 20.0),
                "temperature_fan": (20.0, 80.0),
            }
            mqtt_payload = {}
            for key, (low, high) in limits.items():
                value = req.args.get(key)
                if not isinstance(value, (int, float)) or not low <= float(value) <= high:
                    raise HTTPException(422, f"{key} must be between {low} and {high}")
                mqtt_payload[key] = value
    raw = json.dumps(payload, separators=(",", ":"))
    mqtt_raw = json.dumps(mqtt_payload, separators=(",", ":"))
    with db_lock, conn() as c:
        c.execute(
            """insert into commands
               (id,device_id,command,payload,status,created_at,mqtt_payload,attempt_count,max_attempts,last_attempt_at,next_retry_at)
               values(?,?,?,?,?,?,?,?,?,?,?)""",
            (cid, device_id, req.command, raw, "pending", ts, mqtt_raw, 0, COMMAND_MAX_ATTEMPTS, None, ts),
        )
    sent = worker.publish(f"devices/{device_id}/command", mqtt_raw)
    command_state = "sent" if sent else "queued"
    with db_lock, conn() as c:
        c.execute(
            """update commands set status=?,attempt_count=1,last_attempt_at=?,next_retry_at=?
               where id=? and status='pending'""",
            (command_state, ts, iso_after(COMMAND_RETRY_SECONDS), cid),
        )
    return {"id": cid, "status": "sent" if sent else "queued", "payload": payload}

@app.get("/api/v1/commands/{command_id}", tags=["Commands"])
def command_status(command_id: str, _user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with conn() as c: r = c.execute("select * from commands where id=?", (command_id,)).fetchone()
    if not r: raise HTTPException(404, "unknown command")
    result = dict(r); result["payload"] = json.loads(result["payload"]); result["result"] = json.loads(result["result"]) if result["result"] else None
    result.pop("mqtt_payload", None)
    return result


@app.get("/api/v1/alerts", tags=["Alerts"])
def alerts(
    status_filter: str | None = Query(None, alias="status", pattern="^(open|resolved)$"),
    limit: int = Query(100, ge=1, le=500),
    _user: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
    sql = "select * from device_alerts"
    params: tuple[Any, ...] = ()
    if status_filter:
        sql += " where status=?"
        params = (status_filter,)
    sql += " order by opened_at desc limit ?"
    params += (limit,)
    with conn() as c:
        rows = c.execute(sql, params).fetchall()
    result = []
    for row in rows:
        item = dict(row)
        item["detail"] = json.loads(item["detail"] or "{}")
        result.append(item)
    return result

@app.get("/api/v1/events/stream", tags=["Events"])
def stream(user: dict[str, Any] = Depends(current_user)):
    subscription_id, subscriber = events.subscribe(user["session_id"])

    def gen():
        try:
            yield ": connected\n\n"
            next_auth_check = time.monotonic() + 20
            while True:
                if time.monotonic() >= next_auth_check:
                    if not session_is_active(user["session_id"]):
                        return
                    next_auth_check = time.monotonic() + 20
                try:
                    item = subscriber.get(timeout=max(1, next_auth_check - time.monotonic()))
                    yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"
                except queue.Empty:
                    yield ": keepalive\n\n"
        finally:
            events.unsubscribe(subscription_id)

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control":"no-cache", "X-Accel-Buffering":"no"})
