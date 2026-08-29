#!/usr/bin/env bash
set -euo pipefail

if command -v update-alternatives >/dev/null 2>&1; then
  update-alternatives --set iptables /usr/sbin/iptables-legacy >/dev/null 2>&1 || true
  update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy >/dev/null 2>&1 || true
fi

if ! pgrep -x dockerd >/dev/null 2>&1; then
  # Keep Docker away from WSL's dynamically assigned 172.x DNS/gateway
  # ranges. Docker's iptables rules must remain enabled: disabling them also
  # breaks the embedded 127.0.0.11 service-name resolver used by Compose.
  nohup dockerd --bip=10.88.0.1/24 --default-address-pool=base=10.89.0.0/16,size=24 >/var/log/dockerd.log 2>&1 &
fi
for _ in $(seq 1 30); do
  docker info >/dev/null 2>&1 && exit 0
  sleep 1
done
echo "Docker daemon did not become ready; see /var/log/dockerd.log" >&2
exit 1
