#!/usr/bin/env bash
set -u
PID_FILE="${CLOUDFLARED_PID_FILE:-/tmp/astroy-cloudflared.pid}"
LOG_FILE="${CLOUDFLARED_LOG_FILE:-/tmp/cloudflared-mqtt.log}"
ok=1
if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then echo "process: running (pid $(cat "$PID_FILE"))"; elif pgrep -x cloudflared >/dev/null 2>&1; then echo "process: running (unmanaged pid $(pgrep -xo cloudflared))"; else echo "process: stopped"; ok=0; fi
if ss -ltn 2>/dev/null | grep -q ':9001 '; then echo "origin 9001: listening"; else echo "origin 9001: not listening"; ok=0; fi
if [[ -f "$LOG_FILE" ]] && grep -q 'Registered tunnel connection' "$LOG_FILE"; then echo "cloudflare: registered"; else echo "cloudflare: registration not observed"; ok=0; fi
if [[ "$ok" -eq 1 ]]; then echo "status: ready"; exit 0; else echo "status: not ready"; exit 1; fi
