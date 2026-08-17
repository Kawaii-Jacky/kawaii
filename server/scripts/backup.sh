#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${ASTROY_BACKUP_DIR:-$ROOT_DIR/backups}"
API_CONTAINER="${ASTROY_API_CONTAINER:-server-api-1}"
POSTGRES_CONTAINER="${ASTROY_POSTGRES_CONTAINER:-server-postgres-1}"
PASSPHRASE="${ASTROY_BACKUP_PASSPHRASE:-}"
RETENTION_DAYS="${ASTROY_BACKUP_RETENTION_DAYS:-14}"
MIN_FREE_GB="${ASTROY_BACKUP_MIN_FREE_GB:-5}"
STATUS_FILE="$BACKUP_DIR/last-backup-status.json"

if [[ -z "$PASSPHRASE" ]]; then
  echo "ASTROY_BACKUP_PASSPHRASE is required." >&2
  exit 2
fi

umask 077
mkdir -p "$BACKUP_DIR"
if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] || (( RETENTION_DAYS < 1 )); then
  echo "ASTROY_BACKUP_RETENTION_DAYS must be a positive integer." >&2
  exit 2
fi
if ! [[ "$MIN_FREE_GB" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  echo "ASTROY_BACKUP_MIN_FREE_GB must be a non-negative number." >&2
  exit 2
fi
FREE_KB="$(df -Pk "$BACKUP_DIR" | awk 'NR==2 {print $4}')"
MIN_FREE_KB="$(awk -v gb="$MIN_FREE_GB" 'BEGIN {printf "%d", gb * 1024 * 1024}')"
if [[ -z "$FREE_KB" ]] || (( FREE_KB < MIN_FREE_KB )); then
  printf '{"ok":false,"reason":"low_disk_space","freeBytes":%s,"minimumBytes":%s}\n' \
    "$(( ${FREE_KB:-0} * 1024 ))" "$(( ${MIN_FREE_KB:-0} * 1024 ))" > "$STATUS_FILE"
  chmod 600 "$STATUS_FILE"
  if docker inspect "$API_CONTAINER" >/dev/null 2>&1; then
    docker exec "$API_CONTAINER" python -m app.alerts \
      low-disk "备份磁盘空间不足" \
      "ASTRA 备份目录可用空间低于 ${MIN_FREE_GB} GB，已停止本次备份。" >/dev/null 2>&1 || true
  fi
  echo "Not enough free disk space for ASTRA backup (need ${MIN_FREE_GB} GB)." >&2
  exit 3
fi
WORK_DIR="$(mktemp -d)"
REMOTE_DB="/tmp/astroy-backup-$$.db"
REMOTE_PG="/tmp/astroy-postgres-backup-$$.dump"
trap 'docker exec "$API_CONTAINER" rm -f "$REMOTE_DB" >/dev/null 2>&1 || true; docker exec "$POSTGRES_CONTAINER" rm -f "$REMOTE_PG" >/dev/null 2>&1 || true; rm -rf "$WORK_DIR"' EXIT

docker exec "$API_CONTAINER" python -c \
  "import sqlite3; src=sqlite3.connect('/app/data/astroy.db'); dst=sqlite3.connect('$REMOTE_DB'); src.backup(dst); dst.close(); src.close()"
docker cp "$API_CONTAINER:$REMOTE_DB" "$WORK_DIR/astroy.db" >/dev/null
docker exec "$API_CONTAINER" rm -f "$REMOTE_DB"

CONTENTS="astroy.db"
if docker inspect "$POSTGRES_CONTAINER" >/dev/null 2>&1; then
  docker exec "$POSTGRES_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$1"' sh "$REMOTE_PG"
  docker cp "$POSTGRES_CONTAINER:$REMOTE_PG" "$WORK_DIR/astroy-postgres.dump" >/dev/null
  docker exec "$POSTGRES_CONTAINER" rm -f "$REMOTE_PG"
  CONTENTS="$CONTENTS,astroy-postgres.dump"
fi

docker cp "${ASTROY_MQTT_CONTAINER:-server-mosquitto-1}:/mosquitto/dynamic-config/passwd" "$WORK_DIR/mosquitto-passwd" >/dev/null
docker cp "${ASTROY_MQTT_CONTAINER:-server-mosquitto-1}:/mosquitto/dynamic-config/acl.conf" "$WORK_DIR/mosquitto-acl.conf" >/dev/null
chmod 600 "$WORK_DIR/mosquitto-passwd" "$WORK_DIR/mosquitto-acl.conf"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
cat > "$WORK_DIR/manifest.txt" <<EOF
created_utc=$TIMESTAMP
contents=$CONTENTS,mosquitto-passwd,mosquitto-acl.conf
excluded=.env,cloudflare-token,plaintext-secrets
EOF

OUTPUT="$BACKUP_DIR/astroy-$TIMESTAMP.tar.gz.enc"
tar -C "$WORK_DIR" -czf - . | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 250000 \
  -pass env:ASTROY_BACKUP_PASSPHRASE -out "$OUTPUT.tmp"
mv "$OUTPUT.tmp" "$OUTPUT"
chmod 600 "$OUTPUT"

# Keep recent encrypted archives only; this is safe because each file is
# independently restorable and the passphrase is never stored in the archive.
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'astroy-*.tar.gz.enc' \
  -mtime +"$RETENTION_DAYS" -delete

BACKUP_SIZE="$(stat -c %s "$OUTPUT")"
printf '{"ok":true,"completedAt":"%s","backup":"%s","sizeBytes":%s,"retentionDays":%s,"freeBytes":%s}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(basename "$OUTPUT")" "$BACKUP_SIZE" "$RETENTION_DAYS" "$((FREE_KB * 1024))" > "$STATUS_FILE"
chmod 600 "$STATUS_FILE"

echo "$OUTPUT"
