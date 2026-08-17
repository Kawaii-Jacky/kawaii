#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT_DIR/wsl-start-docker.sh"

if ! pgrep -x cron >/dev/null 2>&1; then
  cron
fi

# Install the repository-owned daily backup schedule idempotently on every
# WSL startup. The job performs retention, disk checks and restore verification.
crontab "$ROOT_DIR/scripts/astroy.crontab"

cd "$ROOT_DIR"
docker compose -f docker-compose.yml -f docker-compose.wsl.yml up -d
docker compose -f docker-compose.yml -f docker-compose.wsl.yml ps

LATEST_BACKUP_EPOCH="$(find "$ROOT_DIR/backups" -maxdepth 1 -type f -name 'astroy-*.tar.gz.enc' -printf '%T@\n' 2>/dev/null | sort -nr | head -n 1)"
NOW_EPOCH="$(date +%s)"
if [[ -z "$LATEST_BACKUP_EPOCH" ]] || (( NOW_EPOCH - ${LATEST_BACKUP_EPOCH%.*} >= 86400 )); then
  "$ROOT_DIR/scripts/backup-cron.sh"
fi
