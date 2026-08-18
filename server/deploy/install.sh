#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
cd "$(dirname "$0")/.."

usage() {
  cat <<'EOF'
Usage: ./deploy/install.sh [--build-local] [--with-cloudflared]

Environment variables for unattended installation:
  ASTRA_DOMAIN                 Public domain or HTTPS origin
  ADMIN_EMAIL                  Initial administrator email
  ADMIN_PASSWORD               Initial administrator password (9+ characters)
  CLOUDFLARE_TUNNEL_TOKEN      Optional Cloudflare Tunnel token
EOF
}

build_local=0
force_cloudflared=0
while (($#)); do
  case "$1" in
    --build-local) build_local=1 ;;
    --with-cloudflared) force_cloudflared=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

command -v docker >/dev/null || { echo 'Docker Engine is required' >&2; exit 1; }
command -v python3 >/dev/null || { echo 'Python 3 is required' >&2; exit 1; }
DOCKER_BIN=${DOCKER_BIN:-docker}
if [[ "$DOCKER_BIN" != */* ]]; then
  DOCKER_BIN=$(command -v "$DOCKER_BIN")
fi
docker() { "$DOCKER_BIN" "$@"; }
docker compose version >/dev/null || { echo 'Docker Compose v2 is required' >&2; exit 1; }

first_install=0
if [[ ! -f .env ]]; then
  first_install=1
  cp .env.example .env
  python3 - <<'PY'
from pathlib import Path
import re
import secrets

p = Path('.env')
s = p.read_text(encoding='utf-8')
values = {
    'POSTGRES_PASSWORD': secrets.token_hex(24),
    'MQTT_PASSWORD': secrets.token_hex(24),
    'AUTH_SECRET': secrets.token_hex(32),
    'SMS_WEBHOOK_TOKEN': secrets.token_hex(32),
}
for key, value in values.items():
    pattern = rf'(?m)^{re.escape(key)}=.*$'
    replacement = f'{key}={value}'
    s = re.sub(pattern, lambda _match, line=replacement: line, s)
p.write_text(s, encoding='utf-8')
PY
fi
chmod 600 .env
mkdir -p .secrets backups
chmod 700 .secrets backups

read_env_value() {
  python3 - "$1" <<'PY'
from pathlib import Path
import sys

key = sys.argv[1]
for line in Path('.env').read_text(encoding='utf-8').splitlines():
    if not line.startswith(key + '='):
        continue
    value = line.split('=', 1)[1].strip()
    if len(value) >= 2 and value[0] == value[-1] == "'":
        value = value[1:-1].replace("\\'", "'").replace('\\\\', '\\')
    elif len(value) >= 2 and value[0] == value[-1] == '"':
        value = bytes(value[1:-1], 'utf-8').decode('unicode_escape')
    print(value)
    break
PY
}

write_env_values() {
  python3 - "$@" <<'PY'
from pathlib import Path
import os
import re
import sys

def quote(value: str) -> str:
    if any(ch in value for ch in '\r\n\0'):
        raise SystemExit('Environment values must not contain line breaks or NUL bytes')
    if re.fullmatch(r'[A-Za-z0-9_./:@,+-]*', value):
        return value
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"

p = Path('.env')
s = p.read_text(encoding='utf-8')
for key in sys.argv[1:]:
    value = os.environ[key]
    replacement = f'{key}={quote(value)}'
    pattern = rf'(?m)^{re.escape(key)}=.*$'
    if re.search(pattern, s):
        s = re.sub(pattern, lambda _match, line=replacement: line, s)
    else:
        s = s.rstrip() + '\n' + replacement + '\n'
p.write_text(s, encoding='utf-8')
PY
}

MQTT_PASSWORD=${MQTT_PASSWORD:-$(read_env_value MQTT_PASSWORD)}
ADMIN_EMAIL=${ADMIN_EMAIL:-$(read_env_value ADMIN_EMAIL)}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-$(read_env_value ADMIN_PASSWORD)}
if [[ -z "${MQTT_PASSWORD:-}" || "$MQTT_PASSWORD" == CHANGE_ME* ]]; then
  echo 'MQTT_PASSWORD must be configured' >&2
  exit 1
fi

if [[ -z "${ADMIN_EMAIL:-}" ]]; then
  if [[ -t 0 ]]; then
    read -r -p 'Administrator email: ' ADMIN_EMAIL
  else
    echo 'Set ADMIN_EMAIL for non-interactive installation' >&2
    exit 1
  fi
fi
if [[ "$ADMIN_EMAIL" != *@*.* ]]; then
  echo 'ADMIN_EMAIL must be a valid email address' >&2
  exit 1
fi

if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
  if [[ -t 0 ]]; then
    read -r -s -p 'Administrator password (9+ characters): ' ADMIN_PASSWORD
    echo
  else
    echo 'Set ADMIN_PASSWORD for non-interactive installation' >&2
    exit 1
  fi
fi
if (( ${#ADMIN_PASSWORD} < 9 )); then
  echo 'ADMIN_PASSWORD must contain at least 9 characters' >&2
  exit 1
fi

ASTRA_DOMAIN=${ASTRA_DOMAIN:-}
if [[ -z "$ASTRA_DOMAIN" && $first_install -eq 0 ]]; then
  ASTRA_DOMAIN=$(read_env_value ASTRA_PUBLIC_ORIGIN)
fi
if [[ -z "$ASTRA_DOMAIN" ]]; then
  if [[ -t 0 ]]; then
    read -r -p 'Public domain or HTTPS origin [astroy.xyz]: ' ASTRA_DOMAIN
    ASTRA_DOMAIN=${ASTRA_DOMAIN:-astroy.xyz}
  else
    echo 'Set ASTRA_DOMAIN for non-interactive installation' >&2
    exit 1
  fi
fi
ASTRA_PUBLIC_ORIGIN=$(ASTRA_DOMAIN="$ASTRA_DOMAIN" python3 - <<'PY'
from urllib.parse import urlsplit
import os

raw = os.environ['ASTRA_DOMAIN'].strip()
if '://' not in raw:
    raw = 'https://' + raw
parsed = urlsplit(raw)
if parsed.scheme not in {'http', 'https'} or not parsed.hostname:
    raise SystemExit('ASTRA_DOMAIN must be a domain name or an HTTP(S) origin')
if parsed.path not in {'', '/'} or parsed.query or parsed.fragment or parsed.username or parsed.password:
    raise SystemExit('ASTRA_DOMAIN must not contain credentials, a path, query, or fragment')
port = f':{parsed.port}' if parsed.port else ''
print(f'{parsed.scheme}://{parsed.hostname}{port}')
PY
)
CORS_ORIGINS="$ASTRA_PUBLIC_ORIGIN"
CSRF_TRUSTED_ORIGINS="$ASTRA_PUBLIC_ORIGIN"
if [[ "$ASTRA_PUBLIC_ORIGIN" == https://* ]]; then AUTH_COOKIE_SECURE=1; else AUTH_COOKIE_SECURE=0; fi
export ADMIN_EMAIL ADMIN_PASSWORD ASTRA_PUBLIC_ORIGIN CORS_ORIGINS CSRF_TRUSTED_ORIGINS AUTH_COOKIE_SECURE
write_env_values ADMIN_EMAIL ADMIN_PASSWORD ASTRA_PUBLIC_ORIGIN CORS_ORIGINS CSRF_TRUSTED_ORIGINS AUTH_COOKIE_SECURE

if [[ ! -s .secrets/credential-vault.key ]]; then
  python3 - <<'PY'
from pathlib import Path
import base64
import secrets

p = Path('.secrets/credential-vault.key')
p.write_text(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('ascii') + '\n', encoding='ascii')
p.chmod(0o600)
PY
fi

if [[ ! -s .secrets/mosquitto.passwd ]]; then
  MPPT_PASSWORD=$(python3 -c 'import secrets; print(secrets.token_hex(18))')
  ESP32_PASSWORD=$(python3 -c 'import secrets; print(secrets.token_hex(18))')
  EF_PASSWORD=$(python3 -c 'import secrets; print(secrets.token_hex(18))')
  docker run --rm -v "$PWD/.secrets:/out" eclipse-mosquitto:2 mosquitto_passwd -b -c /out/mosquitto.passwd backend-controller "$MQTT_PASSWORD"
  docker run --rm -v "$PWD/.secrets:/out" eclipse-mosquitto:2 mosquitto_passwd -b /out/mosquitto.passwd mppt-001 "$MPPT_PASSWORD"
  docker run --rm -v "$PWD/.secrets:/out" eclipse-mosquitto:2 mosquitto_passwd -b /out/mosquitto.passwd esp32-001 "$ESP32_PASSWORD"
  docker run --rm -v "$PWD/.secrets:/out" eclipse-mosquitto:2 mosquitto_passwd -b /out/mosquitto.passwd ef-001 "$EF_PASSWORD"
  {
    printf 'mppt-001=%s\n' "$MPPT_PASSWORD"
    printf 'esp32-001=%s\n' "$ESP32_PASSWORD"
    printf 'ef-001=%s\n' "$EF_PASSWORD"
  } > .secrets/initial-device-credentials.txt
  chmod 600 .secrets/mosquitto.passwd .secrets/initial-device-credentials.txt
  unset MPPT_PASSWORD ESP32_PASSWORD EF_PASSWORD
  echo 'Initial device credentials were written to .secrets/initial-device-credentials.txt'
fi

if [[ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]]; then
  printf '%s\n' "$CLOUDFLARE_TUNNEL_TOKEN" > .secrets/cloudflared.token
  chmod 600 .secrets/cloudflared.token
fi
if [[ $force_cloudflared -eq 1 && ! -s .secrets/cloudflared.token ]]; then
  if [[ -t 0 ]]; then
    read -r -s -p 'Cloudflare Tunnel token: ' CLOUDFLARE_TUNNEL_TOKEN
    echo
    [[ -n "$CLOUDFLARE_TUNNEL_TOKEN" ]] || { echo 'Cloudflare Tunnel token cannot be empty' >&2; exit 1; }
    printf '%s\n' "$CLOUDFLARE_TUNNEL_TOKEN" > .secrets/cloudflared.token
    chmod 600 .secrets/cloudflared.token
  else
    echo 'Set CLOUDFLARE_TUNNEL_TOKEN with --with-cloudflared in non-interactive mode' >&2
    exit 1
  fi
fi

compose=(docker compose -f docker-compose.release.yml)
if [[ -s .secrets/cloudflared.token ]]; then
  compose+=(--profile cloudflared)
fi

if [[ $first_install -eq 0 ]] && [[ -n "$("${compose[@]}" ps --status running -q postgres 2>/dev/null || true)" ]]; then
  "$PWD/deploy/backup.sh"
fi

if [[ $build_local -eq 1 ]]; then
  "${compose[@]}" up -d --build --remove-orphans
else
  "${compose[@]}" pull
  "${compose[@]}" up -d --remove-orphans
fi

required_services=(postgres mosquitto sms-gateway service-control api admin-console web)
if [[ -s .secrets/cloudflared.token ]]; then required_services+=(cloudflared); fi
deadline=$((SECONDS + 180))
while ((SECONDS < deadline)); do
  pending=0
  failed=0
  for service in "${required_services[@]}"; do
    container_id=$("${compose[@]}" ps -q "$service")
    if [[ -z "$container_id" ]]; then pending=1; continue; fi
    state=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")
    case "$state" in
      healthy|running) ;;
      unhealthy|exited|dead) echo "$service entered state $state" >&2; failed=1 ;;
      *) pending=1 ;;
    esac
  done
  if [[ $failed -eq 1 ]]; then
    "${compose[@]}" ps >&2
    exit 1
  fi
  if [[ $pending -eq 0 ]]; then
    "${compose[@]}" ps
    echo "ASTRA is ready at $ASTRA_PUBLIC_ORIGIN"
    exit 0
  fi
  sleep 3
done

"${compose[@]}" ps >&2
echo 'Timed out waiting for ASTRA services to become healthy' >&2
exit 1
