#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
command -v docker >/dev/null || { echo 'Docker Engine is required' >&2; exit 1; }
docker compose version >/dev/null || { echo 'Docker Compose v2 is required' >&2; exit 1; }
if [[ ! -f .env ]]; then
  cp .env.example .env
  python3 - <<'PY'
from pathlib import Path
import re
import secrets
p=Path('.env'); s=p.read_text()
s=re.sub(r'(?m)^POSTGRES_PASSWORD=.*$', 'POSTGRES_PASSWORD='+secrets.token_hex(24), s)
s=re.sub(r'(?m)^MQTT_PASSWORD=.*$', 'MQTT_PASSWORD='+secrets.token_hex(24), s)
s=re.sub(r'(?m)^AUTH_SECRET=.*$', 'AUTH_SECRET='+secrets.token_hex(32), s)
p.write_text(s)
PY
fi
mkdir -p .secrets
set -a; source .env; set +a
if [[ -z "${MQTT_PASSWORD:-}" || "$MQTT_PASSWORD" == CHANGE_ME* ]]; then echo 'MQTT_PASSWORD must be configured' >&2; exit 1; fi
if [[ ! -s .secrets/mosquitto.passwd ]]; then
  docker run --rm -v "$PWD/.secrets:/out" eclipse-mosquitto:2 sh -c "mosquitto_passwd -b -c /out/mosquitto.passwd backend-controller '$MQTT_PASSWORD' && mosquitto_passwd -b /out/mosquitto.passwd mppt-001 '$(python3 -c 'import secrets; print(secrets.token_hex(18))')' && mosquitto_passwd -b /out/mosquitto.passwd esp32-001 '$(python3 -c 'import secrets; print(secrets.token_hex(18))')' && mosquitto_passwd -b /out/mosquitto.passwd ef-001 '$(python3 -c 'import secrets; print(secrets.token_hex(18))')'"
  chmod 600 .secrets/mosquitto.passwd
fi
compose_args=()
for arg in "$@"; do
  if [[ "$arg" == "--build-local" ]]; then compose_args+=(--build); else compose_args+=("$arg"); fi
done
docker compose -f docker-compose.release.yml up -d --remove-orphans "${compose_args[@]}"
docker compose -f docker-compose.release.yml ps
