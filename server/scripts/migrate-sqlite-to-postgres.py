"""One-time, idempotent migration from ASTRA SQLite to PostgreSQL."""
from __future__ import annotations

import os
import sqlite3
from pathlib import Path

import psycopg

from app.auth import init_auth_db
from app.main import init_db

SOURCE = Path(os.getenv("SQLITE_PATH", "/app/data/astroy.db"))
DATABASE_URL = os.environ["DATABASE_URL"]
TABLES = (
    "devices",
    "telemetry_samples",
    "telemetry_latest",
    "commands",
    "users",
    "verification_codes",
    "auth_sessions",
)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"SQLite source not found: {SOURCE}")
    init_db()
    init_auth_db()
    source = sqlite3.connect(SOURCE)
    source.row_factory = sqlite3.Row
    migrated: dict[str, int] = {}
    with psycopg.connect(DATABASE_URL) as target:
        for table in TABLES:
            rows = source.execute(f"select * from {table}").fetchall()
            if not rows:
                migrated[table] = 0
                continue
            columns = rows[0].keys()
            names = ",".join(columns)
            placeholders = ",".join(["%s"] * len(columns))
            statement = f"insert into {table} ({names}) values ({placeholders}) on conflict do nothing"
            with target.cursor() as cursor:
                cursor.executemany(statement, [tuple(row[column] for column in columns) for row in rows])
            migrated[table] = len(rows)
        with target.cursor() as cursor:
            cursor.execute("select setval(pg_get_serial_sequence('telemetry_samples','id'), greatest(coalesce(max(id),1),1), true) from telemetry_samples")
    source.close()
    for table, count in migrated.items():
        print(f"{table}: {count}")


if __name__ == "__main__":
    main()
