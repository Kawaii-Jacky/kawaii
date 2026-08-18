#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
command -v docker >/dev/null || { echo 'Docker Engine is required' >&2; exit 1; }
docker compose version >/dev/null || { echo 'Docker Compose v2 is required' >&2; exit 1; }
if [[ ! -f .env ]]; then
  cp .env.example .env
  python3 - <<'PY'
from pathlib import Path
import secrets
p=Path('.env'); s=p.read_text()
s=s.replace('POSTGRES_PASSWORD=CHANGE_ME', 'POSTGRES_PASSWORD='+secrets.token_urlsafe(24))
s=s.replace('MQTT_PASSWORD=CHANGE_ME', 'MQTT_PASSWORD='+secrets.token_urlsafe(24))
s=s.replace('AUTH_SECRET=CHANGE_ME', 'AUTH_SECRET='+secrets.token_urlsafe(32))
p.write_text(s)
PY
fi
docker compose -f docker-compose.release.yml up -d --remove-orphans "$@"
docker compose -f docker-compose.release.yml ps
