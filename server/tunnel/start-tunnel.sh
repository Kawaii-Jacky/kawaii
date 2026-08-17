#!/usr/bin/env bash
set -euo pipefail
TOKEN_FILE="${CLOUDFLARED_TOKEN_FILE:-/root/.cloudflared/home-iot.token}"
PID_FILE="${CLOUDFLARED_PID_FILE:-/tmp/astroy-cloudflared.pid}"
LOG_FILE="${CLOUDFLARED_LOG_FILE:-/tmp/cloudflared-mqtt.log}"
if [[ ! -r "$TOKEN_FILE" ]]; then echo "Missing tunnel token: $TOKEN_FILE" >&2; exit 1; fi
if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then echo "Tunnel already running (pid $(cat "$PID_FILE"))"; exit 0; fi
if pgrep -x cloudflared >/dev/null 2>&1; then echo "Tunnel already running (unmanaged pid $(pgrep -xo cloudflared))"; exit 0; fi
rm -f "$LOG_FILE"
nohup cloudflared tunnel --no-autoupdate run --token-file "$TOKEN_FILE" >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"
sleep 2
if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then echo "Tunnel failed to start; see $LOG_FILE" >&2; exit 1; fi
echo "Tunnel started (pid $(cat "$PID_FILE"))"
