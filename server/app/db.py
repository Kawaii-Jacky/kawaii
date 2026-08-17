"""Small database compatibility layer for SQLite and PostgreSQL."""
from __future__ import annotations

import os
import sqlite3
import threading
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
SQLITE_PATH = Path(os.getenv("SQLITE_PATH", str(ROOT / "data" / "astroy.db")))
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
POSTGRESQL = DATABASE_URL.startswith(("postgresql://", "postgres://"))
db_lock = threading.RLock()
if POSTGRESQL:
    import psycopg
    from psycopg.rows import dict_row
    INTEGRITY_ERRORS = (sqlite3.IntegrityError, psycopg.IntegrityError)
else:
    psycopg = None
    dict_row = None
    INTEGRITY_ERRORS = (sqlite3.IntegrityError,)


def is_postgres() -> bool:
    return POSTGRESQL


def database_label() -> str:
    return "postgresql" if POSTGRESQL else str(SQLITE_PATH)


def _postgres_sql(sql: str) -> str:
    # ASTRA queries use DB-API qmark placeholders. None of the current SQL
    # statements contains a literal question mark, so this conversion is
    # intentionally small and auditable.
    return sql.replace("?", "%s")


class Connection:
    def __init__(self) -> None:
        if POSTGRESQL:
            assert psycopg is not None and dict_row is not None
            self.raw = psycopg.connect(DATABASE_URL, row_factory=dict_row)
        else:
            SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
            self.raw = sqlite3.connect(SQLITE_PATH, check_same_thread=False)
            self.raw.row_factory = sqlite3.Row

    def execute(self, sql: str, params: Iterable[Any] = ()):
        return self.raw.execute(_postgres_sql(sql) if POSTGRESQL else sql, tuple(params))

    def executescript(self, script: str) -> None:
        if not POSTGRESQL:
            self.raw.executescript(script)
            return
        for statement in script.split(";"):
            if statement.strip():
                self.raw.execute(statement)

    def __enter__(self) -> "Connection":
        return self

    def __exit__(self, exc_type, exc, _traceback) -> None:
        try:
            self.raw.rollback() if exc_type else self.raw.commit()
        finally:
            self.raw.close()


def connection() -> Connection:
    return Connection()
