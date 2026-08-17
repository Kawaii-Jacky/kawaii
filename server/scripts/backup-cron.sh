#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASSPHRASE_FILE="${ASTROY_BACKUP_PASSPHRASE_FILE:-/root/.astroy-backup-passphrase}"
RESTORE_DIR="/tmp/astroy-cron-restore-$$"
POSTGRES_CONTAINER="${ASTROY_POSTGRES_CONTAINER:-server-postgres-1}"
VERIFY_DATABASE="astroy_verify_$$"
REMOTE_DUMP="/tmp/astroy-verify-$$.dump"

if [[ ! -r "$PASSPHRASE_FILE" ]]; then
  echo "ASTRA backup passphrase file is missing or unreadable." >&2
  exit 2
fi

export ASTROY_BACKUP_PASSPHRASE="$(<"$PASSPHRASE_FILE")"
if [[ ${#ASTROY_BACKUP_PASSPHRASE} -lt 24 ]]; then
  echo "ASTRA backup passphrase is too short." >&2
  exit 2
fi

cleanup() {
  docker exec "$POSTGRES_CONTAINER" sh -c 'dropdb -U "$POSTGRES_USER" --if-exists --force "$1"' sh "$VERIFY_DATABASE" >/dev/null 2>&1 || true
  docker exec "$POSTGRES_CONTAINER" rm -f "$REMOTE_DUMP" >/dev/null 2>&1 || true
  unset ASTROY_BACKUP_PASSPHRASE
  rm -rf "$RESTORE_DIR"
}
trap cleanup EXIT
BACKUP_FILE="$("$ROOT_DIR/scripts/backup.sh")"
"$ROOT_DIR/scripts/restore-backup.sh" "$BACKUP_FILE" "$RESTORE_DIR" >/dev/null
INTEGRITY="$(python3 -c "import sqlite3; print(sqlite3.connect('$RESTORE_DIR/astroy.db').execute('pragma integrity_check').fetchone()[0])")"
if [[ "$INTEGRITY" != "ok" ]]; then
  echo "SQLite backup integrity check failed." >&2
  exit 1
fi

POSTGRES_DUMP="not-present"
if [[ -f "$RESTORE_DIR/astroy-postgres.dump" ]]; then
  docker cp "$RESTORE_DIR/astroy-postgres.dump" "$POSTGRES_CONTAINER:$REMOTE_DUMP" >/dev/null
  docker exec "$POSTGRES_CONTAINER" sh -c 'createdb -U "$POSTGRES_USER" "$1"' sh "$VERIFY_DATABASE"
  docker exec "$POSTGRES_CONTAINER" sh -c 'pg_restore -U "$POSTGRES_USER" --no-owner --exit-on-error -d "$1" "$2"' sh "$VERIFY_DATABASE" "$REMOTE_DUMP" >/dev/null
  TABLES_OK="$(docker exec "$POSTGRES_CONTAINER" sh -c \
    'psql -U "$POSTGRES_USER" -d "$1" -Atqc "select (to_regclass('\''public.users'\'') is not null and to_regclass('\''public.auth_sessions'\'') is not null and to_regclass('\''public.telemetry_samples'\'') is not null and to_regclass('\''public.commands'\'') is not null)"' \
    sh "$VERIFY_DATABASE")"
  [[ "$TABLES_OK" == "t" ]] || { echo "PostgreSQL restore verification is missing required tables." >&2; exit 1; }
  docker exec "$POSTGRES_CONTAINER" sh -c \
    'psql -U "$POSTGRES_USER" -d "$1" -v ON_ERROR_STOP=1 -Atqc "select count(*) from users; select count(*) from devices; select count(*) from commands"' \
    sh "$VERIFY_DATABASE" >/dev/null
  docker exec "$POSTGRES_CONTAINER" sh -c 'dropdb -U "$POSTGRES_USER" --if-exists --force "$1"' sh "$VERIFY_DATABASE" >/dev/null
  docker exec "$POSTGRES_CONTAINER" rm -f "$REMOTE_DUMP"
  POSTGRES_DUMP="restored-and-queried"
fi

BACKUP_NAME="$(basename "$BACKUP_FILE")"
BACKUP_SIZE="$(stat -c %s "$BACKUP_FILE")"
RETENTION_DAYS="${ASTROY_BACKUP_RETENTION_DAYS:-14}"
MIN_FREE_GB="${ASTROY_BACKUP_MIN_FREE_GB:-5}"
FREE_BYTES="$(df -Pk "$ROOT_DIR/backups" | awk 'NR==2 {print $4 * 1024}')"
MIN_FREE_BYTES="$(awk -v gb="$MIN_FREE_GB" 'BEGIN {printf "%d", gb * 1024 * 1024 * 1024}')"
STATUS_FILE="$ROOT_DIR/backups/last-backup-status.json"
printf '{\n  "ok": true,\n  "completedAt": "%s",\n  "backup": "%s",\n  "sizeBytes": %s,\n  "sqliteIntegrity": "ok",\n  "postgresDump": "%s",\n  "scheduler": "wsl-cron"\n}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$BACKUP_NAME" "$BACKUP_SIZE" "$POSTGRES_DUMP" > "$STATUS_FILE.tmp"
python3 - "$STATUS_FILE.tmp" "$RETENTION_DAYS" "$FREE_BYTES" "$MIN_FREE_BYTES" <<'PY'
import json, sys
path, retention, free_bytes, min_free_bytes = sys.argv[1:]
with open(path, encoding="utf-8") as handle:
    payload = json.load(handle)
payload.update(retentionDays=int(retention), freeBytes=int(float(free_bytes or 0)), minFreeBytes=int(min_free_bytes))
with open(path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle, ensure_ascii=False, indent=2)
    handle.write("\n")
PY
mv "$STATUS_FILE.tmp" "$STATUS_FILE"
chmod 600 "$STATUS_FILE"
echo "ASTRA encrypted backup verified: $BACKUP_NAME"
