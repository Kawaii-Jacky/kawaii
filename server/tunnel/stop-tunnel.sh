#!/usr/bin/env bash
set -euo pipefail
PID_FILE="${CLOUDFLARED_PID_FILE:-/tmp/astroy-cloudflared.pid}"
if [[ ! -f "$PID_FILE" ]]; then
  pkill -x cloudflared 2>/dev/null || true
  echo "Tunnel stopped (or no tunnel was running)"
  exit 0
fi
pid="$(cat "$PID_FILE")"
if kill -0 "$pid" 2>/dev/null; then kill "$pid"; fi
rm -f "$PID_FILE"
echo "Tunnel stopped"
