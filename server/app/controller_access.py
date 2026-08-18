"""Per-account controller bundles and MQTT connection configuration."""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from app.db import connection, db_lock, is_postgres


LOGICAL_DEVICES = ("esp32-001", "mppt-001", "ef-001")
CONTROLLER_ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,31}$")


def load_controller_configs() -> list[dict[str, Any]]:
    path = os.getenv("MQTT_CONTROLLERS_FILE", "").strip()
    secret_path = Path(path) if path else None
    from_secret_file = bool(secret_path and secret_path.is_file())
    if from_secret_file:
        document = json.loads(secret_path.read_text(encoding="utf-8"))
        rows = document.get("controllers", document) if isinstance(document, dict) else document
        if not isinstance(rows, list) or not rows:
            raise RuntimeError("MQTT_CONTROLLERS_FILE must contain a non-empty controllers array")
    else:
        rows = [{
            "id": "default",
            "name": "默认天文台",
            "host": os.getenv("MQTT_HOST", "127.0.0.1"),
            "port": int(os.getenv("MQTT_PORT", "1883")),
            "username": os.getenv("MQTT_USERNAME", "backend-controller"),
            "password": os.getenv("MQTT_PASSWORD", ""),
        }]
    configs: list[dict[str, Any]] = []
    seen: set[str] = set()
    usernames: set[str] = set()
    for raw in rows:
        if not isinstance(raw, dict):
            raise RuntimeError("Each MQTT controller entry must be an object")
        controller_id = str(raw.get("id", "")).strip().lower()
        if not CONTROLLER_ID_RE.fullmatch(controller_id) or controller_id in seen:
            raise RuntimeError(f"Invalid or duplicate MQTT controller id: {controller_id!r}")
        port = int(raw.get("port", 1883))
        if not 1 <= port <= 65535:
            raise RuntimeError(f"Invalid MQTT port for controller {controller_id}")
        host = str(raw.get("host", "")).strip()
        username = str(raw.get("username", "")).strip()
        password = str(raw.get("password", ""))
        if not host or not username:
            raise RuntimeError(f"MQTT host and username are required for controller {controller_id}")
        if username.lower() in usernames:
            raise RuntimeError(f"MQTT username is assigned to more than one controller: {username}")
        password_required = from_secret_file or os.getenv("MQTT_DISABLED", "0") != "1"
        if password_required and len(password) < 12:
            raise RuntimeError(f"MQTT password must contain at least 12 characters for controller {controller_id}")
        configs.append({
            "id": controller_id,
            "name": str(raw.get("name") or controller_id).strip()[:80],
            "host": host,
            "port": port,
            "username": username,
            "password": password,
            "topic_prefix": "" if controller_id == "default" else f"controllers/{controller_id}",
        })
        seen.add(controller_id)
        usernames.add(username.lower())
    return configs


def storage_device_id(controller_id: str, logical_device_id: str) -> str:
    return logical_device_id if controller_id == "default" else f"{controller_id}:{logical_device_id}"


def init_controller_access_db(configs: list[dict[str, Any]]) -> None:
    with db_lock, connection() as db:
        db.executescript("""
        create table if not exists controllers (
          controller_id text primary key,
          name text not null,
          mqtt_host text not null,
          mqtt_port integer not null,
          mqtt_username text not null,
          enabled integer not null default 1,
          updated_at text not null
        );
        create table if not exists user_controller_access (
          user_id text primary key,
          controller_id text not null,
          created_at text not null,
          created_by text,
          foreign key(user_id) references users(id) on delete cascade,
          foreign key(controller_id) references controllers(controller_id) on delete cascade
        );
        """)
        db.execute("drop index if exists user_controller_access_controller")
        db.execute("create unique index if not exists user_controller_access_single_owner on user_controller_access(controller_id)")
        if is_postgres():
            db.execute("alter table devices add column if not exists controller_id text")
            db.execute("alter table devices add column if not exists logical_device_id text")
        else:
            columns = {row["name"] for row in db.execute("pragma table_info(devices)").fetchall()}
            if "controller_id" not in columns:
                db.execute("alter table devices add column controller_id text")
            if "logical_device_id" not in columns:
                db.execute("alter table devices add column logical_device_id text")
        db.execute("update devices set controller_id='default' where controller_id is null or controller_id=''")
        db.execute("update devices set logical_device_id=device_id where logical_device_id is null or logical_device_id=''")
        db.execute("create unique index if not exists devices_controller_logical on devices(controller_id,logical_device_id)")
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        configured_ids = []
        for config in configs:
            configured_ids.append(config["id"])
            db.execute(
                """insert into controllers(controller_id,name,mqtt_host,mqtt_port,mqtt_username,enabled,updated_at)
                   values(?,?,?,?,?,1,?) on conflict(controller_id) do update set
                   name=excluded.name,mqtt_host=excluded.mqtt_host,mqtt_port=excluded.mqtt_port,
                   mqtt_username=excluded.mqtt_username,enabled=1,updated_at=excluded.updated_at""",
                (config["id"], config["name"], config["host"], config["port"], config["username"], now),
            )
            for logical_id in LOGICAL_DEVICES:
                dtype = "environment" if logical_id == "esp32-001" else ("mppt" if logical_id == "mppt-001" else "flat-field")
                db.execute(
                    """insert into devices(device_id,device_type,name,controller_id,logical_device_id)
                       values(?,?,?,?,?) on conflict(device_id) do update set
                       controller_id=excluded.controller_id,logical_device_id=excluded.logical_device_id""",
                    (storage_device_id(config["id"], logical_id), dtype, logical_id, config["id"], logical_id),
                )
        placeholders = ",".join("?" for _ in configured_ids)
        db.execute(f"update controllers set enabled=0 where controller_id not in ({placeholders})", tuple(configured_ids))


def controller_for_user(user: dict[str, Any]) -> str | None:
    with connection() as db:
        row = db.execute(
            """select a.controller_id from user_controller_access a join controllers c
               on c.controller_id=a.controller_id where a.user_id=? and c.enabled=1""",
            (user["id"],),
        ).fetchone()
        if row:
            return str(row["controller_id"])
    return None


def require_controller(user: dict[str, Any]) -> str:
    controller_id = controller_for_user(user)
    if not controller_id:
        raise HTTPException(404, "no controller assigned")
    return controller_id


def require_device_access(user: dict[str, Any], logical_device_id: str) -> dict[str, Any]:
    if logical_device_id not in LOGICAL_DEVICES:
        raise HTTPException(404, "unknown device")
    controller_id = require_controller(user)
    with connection() as db:
        row = db.execute(
            """select * from devices where controller_id=? and logical_device_id=?""",
            (controller_id, logical_device_id),
        ).fetchone()
    if not row:
        raise HTTPException(404, "unknown device")
    return dict(row)
