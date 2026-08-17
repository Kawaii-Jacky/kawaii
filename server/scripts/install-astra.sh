#!/usr/bin/env bash
set -euo pipefail

SERVER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="$(cd "$SERVER_ROOT/.." && pwd)"
ENV_EXAMPLE="$SERVER_ROOT/.env.example"
ENV_FILE="$SERVER_ROOT/.env"

read_secret() {
  local label="$1" min="$2" safe="${3:-0}" first second
  while true; do
    read -rsp "$label（至少 ${min} 位）: " first; echo
    read -rsp "再次输入 $label: " second; echo
    [[ ${#first} -ge $min ]] || { echo "$label 长度不足。" >&2; continue; }
    [[ "$first" == "$second" ]] || { echo "两次输入不一致。" >&2; continue; }
    if [[ "$safe" == 1 && ! "$first" =~ ^[A-Za-z0-9._~-]+$ ]]; then
      echo "$label 只能使用字母、数字、点、下划线、波浪号和短横线。" >&2
      continue
    fi
    printf '%s' "$first"
    return
  done
}

set_env() {
  local key="$1" value="$2"
  python3 - "$ENV_FILE" "$key" "$value" <<'PY'
import pathlib, re, sys
path, key, value = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
text = path.read_text(encoding="utf-8")
line = f"{key}={value}"
pattern = re.compile(rf"^{re.escape(key)}=.*$", re.M)
text = pattern.sub(line, text) if pattern.search(text) else text.rstrip() + "\n" + line + "\n"
path.write_text(text, encoding="utf-8")
PY
}

set_macro() {
  local file="$1" macro="$2" value="$3"
  python3 - "$file" "$macro" "$value" <<'PY'
import pathlib, re, sys
path, macro, value = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
text = path.read_text(encoding="utf-8")
pattern = re.compile(rf'^\s*#define\s+{re.escape(macro)}\s+"[^"]*"', re.M)
if not pattern.search(text):
    raise SystemExit(f"missing firmware macro: {macro} ({path})")
path.write_text(pattern.sub(f'#define {macro} "{value}"', text), encoding="utf-8")
PY
}

set_macro_if_exists() {
  [[ -f "$1" ]] && set_macro "$@"
}

[[ -f "$ENV_EXAMPLE" ]] || { echo "缺少 $ENV_EXAMPLE" >&2; exit 2; }
if [[ -f "$ENV_FILE" ]]; then
  read -rp ".env 已存在，输入 YES 覆盖: " answer
  [[ "$answer" == YES ]] || { echo "安装已取消。"; exit 1; }
fi

echo "=== ASTRA 必要凭据配置 ==="
POSTGRES_PASSWORD="$(read_secret 'PostgreSQL 密码' 16 1)"
while true; do
  read -rp "管理员邮箱: " ADMIN_EMAIL
  [[ "$ADMIN_EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] && break
  echo "请输入有效邮箱地址。" >&2
done
ADMIN_PASSWORD="$(read_secret '管理员密码' 9 1)"
MQTT_PASSWORD="$(read_secret 'backend-controller MQTT 密码' 12 1)"
MPPT_PASSWORD="$(read_secret 'mppt-001 MQTT 密码' 12 1)"
ESP_PASSWORD="$(read_secret 'esp32-001 MQTT 密码' 12 1)"
EF_PASSWORD="$(read_secret 'ef-001 MQTT 密码' 12 1)"
BACKUP_PASSWORD="$(read_secret '数据库备份加密口令' 24 0)"
read -rp "管理员显示名称 [ASTRA 管理员]: " ADMIN_DISPLAY_NAME
ADMIN_DISPLAY_NAME="${ADMIN_DISPLAY_NAME:-ASTRA 管理员}"
read -rp "CORS 域名 [https://astroy.xyz,https://www.astroy.xyz]: " CORS_ORIGINS
CORS_ORIGINS="${CORS_ORIGINS:-https://astroy.xyz,https://www.astroy.xyz}"
WIFI_SSID=""
WIFI_PASSWORD=""
if [[ -f "$PROJECT_ROOT/ESP32_MPPT/mppt_config.h" || -f "$PROJECT_ROOT/loT/loT/device_config.h" || -f "$PROJECT_ROOT/EF/config.h" ]]; then
  read -rp "Shared device Wi-Fi SSID: " WIFI_SSID
  [[ "$WIFI_SSID" =~ ^[A-Za-z0-9._~-]+$ ]] || { echo "Wi-Fi SSID is required and must use firmware-safe characters." >&2; exit 2; }
  WIFI_PASSWORD="$(read_secret 'Shared device Wi-Fi password' 8 1)"
fi

cp "$ENV_EXAMPLE" "$ENV_FILE"
chmod 600 "$ENV_FILE"
set_env POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
set_env AUTH_SECRET "$(openssl rand -base64 48 | tr '+/' '-_' | tr -d '=\n')"
set_env AUTH_COOKIE_SECURE 1
set_env AUTH_DEBUG_CODES 0
set_env ADMIN_EMAIL "${ADMIN_EMAIL,,}"
set_env ADMIN_PASSWORD "$ADMIN_PASSWORD"
set_env ADMIN_DISPLAY_NAME "$ADMIN_DISPLAY_NAME"
set_env MQTT_PASSWORD "$MQTT_PASSWORD"
set_env SMS_WEBHOOK_TOKEN "$(openssl rand -hex 32)"
set_env CORS_ORIGINS "$CORS_ORIGINS"

set_macro_if_exists "$PROJECT_ROOT/ESP32_MPPT/mppt_config.h" MPPT_MQTT_PASSWORD "$MPPT_PASSWORD"
set_macro_if_exists "$PROJECT_ROOT/ESP32_MPPT/mppt_config.h" MPPT_WIFI_SSID "$WIFI_SSID"
set_macro_if_exists "$PROJECT_ROOT/ESP32_MPPT/mppt_config.h" MPPT_WIFI_PASSWORD "$WIFI_PASSWORD"
set_macro_if_exists "$PROJECT_ROOT/loT/loT/device_config.h" DEVICE_MQTT_PASSWORD "$ESP_PASSWORD"
set_macro_if_exists "$PROJECT_ROOT/loT/loT/device_config.h" DEVICE_WIFI_SSID "$WIFI_SSID"
set_macro_if_exists "$PROJECT_ROOT/loT/loT/device_config.h" DEVICE_WIFI_PASSWORD "$WIFI_PASSWORD"
set_macro_if_exists "$PROJECT_ROOT/EF/config.h" MQTT_PASSWORD "$EF_PASSWORD"
set_macro_if_exists "$PROJECT_ROOT/EF/config.h" WIFI_SSID "$WIFI_SSID"
set_macro_if_exists "$PROJECT_ROOT/EF/config.h" WIFI_PASSWORD "$WIFI_PASSWORD"
set_macro_if_exists "$PROJECT_ROOT/CameraWebServer/CameraWebServer/camera_config.h" CAMERA_WIFI_SSID "$WIFI_SSID"
set_macro_if_exists "$PROJECT_ROOT/CameraWebServer/CameraWebServer/camera_config.h" CAMERA_WIFI_PASS "$WIFI_PASSWORD"
set_macro_if_exists "$PROJECT_ROOT/电动平场板控制/电动平场板控制.ino" WIFI_SSID "$WIFI_SSID"
set_macro_if_exists "$PROJECT_ROOT/电动平场板控制/电动平场板控制.ino" WIFI_PASSWORD "$WIFI_PASSWORD"

PASSWD_TMP="$SERVER_ROOT/mosquitto/passwd.install"
trap 'rm -f "$PASSWD_TMP"; unset POSTGRES_PASSWORD ADMIN_PASSWORD MQTT_PASSWORD MPPT_PASSWORD ESP_PASSWORD EF_PASSWORD BACKUP_PASSWORD WIFI_PASSWORD' EXIT
umask 077
if ! docker info >/dev/null 2>&1; then
  if grep -qi microsoft /proc/version; then
    sudo "$SERVER_ROOT/wsl-start-docker.sh"
  else
    sudo systemctl start docker
  fi
fi
printf '%s\n' \
  "backend-controller:$MQTT_PASSWORD" \
  "mppt-001:$MPPT_PASSWORD" \
  "esp32-001:$ESP_PASSWORD" \
  "ef-001:$EF_PASSWORD" > "$PASSWD_TMP"
docker run --rm -v "$SERVER_ROOT/mosquitto:/mosquitto/config" \
  eclipse-mosquitto:2 mosquitto_passwd -U /mosquitto/config/passwd.install
mv "$PASSWD_TMP" "$SERVER_ROOT/mosquitto/passwd"

printf '%s\n' "$BACKUP_PASSWORD" | sudo "$SERVER_ROOT/scripts/install-backup-secret.sh"

if grep -qi microsoft /proc/version; then
  COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.wsl.yml)
else
  COMPOSE=(docker compose -f docker-compose.yml)
  sudo "$SERVER_ROOT/scripts/prepare-mosquitto-permissions.sh"
fi

read -rp "启用 Cloudflare Tunnel？[y/N]: " ENABLE_CF
SERVICES=(postgres mosquitto sms-gateway service-control api admin-console web intro-web)
if [[ "$ENABLE_CF" =~ ^[Yy]$ ]]; then
  read -rp "Cloudflare token 文件路径 [/root/.cloudflared/home-iot.token]: " CF_PATH
  CF_PATH="${CF_PATH:-/root/.cloudflared/home-iot.token}"
  [[ -f "$CF_PATH" ]] || { echo "Cloudflare token 文件不存在: $CF_PATH" >&2; exit 2; }
  set_env CLOUDFLARED_TOKEN_FILE "$CF_PATH"
  SERVICES+=(cloudflared)
fi

cd "$SERVER_ROOT"
"${COMPOSE[@]}" up -d --build "${SERVICES[@]}"

for _ in $(seq 1 30); do
  HEALTH="$(curl -fsS http://127.0.0.1:8000/health 2>/dev/null || true)"
  if grep -q '"ok":true' <<<"$HEALTH" && grep -q '"database":"postgresql"' <<<"$HEALTH" && grep -q '"mqtt":true' <<<"$HEALTH"; then
    break
  fi
  sleep 2
done
grep -q '"ok":true' <<<"${HEALTH:-}" || { echo "服务健康检查失败。" >&2; exit 3; }
curl -fsS http://127.0.0.1:8080/openapi.json | grep -q '/api/v1/auth/profile' || { echo "认证 API 验证失败。" >&2; exit 3; }

unset POSTGRES_PASSWORD ADMIN_PASSWORD MQTT_PASSWORD MPPT_PASSWORD ESP_PASSWORD EF_PASSWORD BACKUP_PASSWORD WIFI_PASSWORD
echo "ASTRA 安装和配置验证完成。"
echo "前端：http://127.0.0.1:8000/"
echo "后台：http://127.0.0.1:8100/"
