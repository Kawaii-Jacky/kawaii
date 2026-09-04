#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_SERVICES=(postgres mosquitto sms-gateway service-control api admin-console)

if [[ -f "$ROOT_DIR/docker-compose.yml" && -f "$ROOT_DIR/docker-compose.wsl.yml" ]]; then
  COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.wsl.yml)
  SOURCE_LAYOUT=1
elif [[ -f "$ROOT_DIR/docker-compose.release.yml" && -f "$ROOT_DIR/docker-compose.server-only.yml" ]]; then
  COMPOSE=(docker compose -f docker-compose.release.yml -f docker-compose.server-only.yml)
  SOURCE_LAYOUT=0
else
  echo "No supported ASTRA Compose configuration was found." >&2
  exit 2
fi

"$ROOT_DIR/wsl-start-docker.sh"

if [[ $SOURCE_LAYOUT -eq 1 ]]; then
  if ! pgrep -x cron >/dev/null 2>&1; then
    cron
  fi
  # Keep the repository-owned backup schedule active with the source deployment.
  crontab "$ROOT_DIR/scripts/astroy.crontab"
fi

cd "$ROOT_DIR"
"${COMPOSE[@]}" up -d "${SERVER_SERVICES[@]}"
"${COMPOSE[@]}" ps "${SERVER_SERVICES[@]}"

if [[ $SOURCE_LAYOUT -eq 1 ]]; then
  LATEST_BACKUP_EPOCH="$(find "$ROOT_DIR/backups" -maxdepth 1 -type f -name 'astroy-*.tar.gz.enc' -printf '%T@\n' 2>/dev/null | sort -nr | head -n 1)"
  NOW_EPOCH="$(date +%s)"
  BACKUP_PASSPHRASE_FILE="${ASTROY_BACKUP_PASSPHRASE_FILE:-/root/.astroy-backup-passphrase}"
  if [[ ! -r "$BACKUP_PASSPHRASE_FILE" ]]; then
    echo "ASTRA server is running; startup backup skipped because the backup passphrase file is missing." >&2
  elif [[ -z "$LATEST_BACKUP_EPOCH" ]] || (( NOW_EPOCH - ${LATEST_BACKUP_EPOCH%.*} >= 86400 )); then
    "$ROOT_DIR/scripts/backup-cron.sh"
  fi
fi
