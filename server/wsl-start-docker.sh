#!/usr/bin/env bash
set -euo pipefail

if ! pgrep -x dockerd >/dev/null 2>&1; then
  nohup dockerd --iptables=false --ip-masq=false --bridge=none >/var/log/dockerd.log 2>&1 &
fi
for _ in $(seq 1 30); do
  docker info >/dev/null 2>&1 && exit 0
  sleep 1
done
echo "Docker daemon did not become ready; see /var/log/dockerd.log" >&2
exit 1
