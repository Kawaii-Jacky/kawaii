#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOSQUITTO_UID="${MOSQUITTO_UID:-1883}"
MOSQUITTO_GID="${MOSQUITTO_GID:-1883}"
PASSWORD_FILE="$ROOT_DIR/mosquitto/passwd"
ACL_FILE="$ROOT_DIR/mosquitto/acl.conf"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run with sudo on the production Linux host." >&2
  exit 2
fi
if [[ ! -f "$PASSWORD_FILE" || ! -f "$ACL_FILE" ]]; then
  echo "Mosquitto passwd or ACL file is missing." >&2
  exit 2
fi

chown "$MOSQUITTO_UID:$MOSQUITTO_GID" "$PASSWORD_FILE" "$ACL_FILE"
chmod 600 "$PASSWORD_FILE"
chmod 640 "$ACL_FILE"

echo "Mosquitto authentication files are owned by ${MOSQUITTO_UID}:${MOSQUITTO_GID}."
