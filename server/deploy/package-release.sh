#!/usr/bin/env bash
set -Eeuo pipefail
root=$(cd "$(dirname "$0")/../.." && pwd)
version=${1:-$(date -u +%Y%m%d.%H%M%S)}
out=${2:-"$root/astra-server-$version.tar.gz"}
mkdir -p "$(dirname "$out")"
tar -czf "$out" -C "$root" \
  --exclude='./.git' --exclude='./.secrets' --exclude='./server/data' \
  --exclude='./server/backups' --exclude='*/__pycache__' --exclude='*/node_modules' \
  --exclude='*/target' --exclude='*/gen' --exclude='*.env' --exclude='*.pem' \
  --exclude='*.key' --exclude='*.token' --exclude='*/passwd*' \
  server/docker-compose.release.yml server/docker-compose.server-only.yml \
  server/Dockerfile server/Dockerfile.admin \
  server/Dockerfile.web server/nginx.release.conf server/mosquitto \
  server/app server/requirements.txt server/.env.example server/deploy \
  server/wsl-start-docker.sh \
  server/scripts/install-autostart.ps1 \
  server/scripts/start-astra-on-boot.ps1 \
  server/scripts/start-astra-server-wsl.sh \
  remote-observatory-frontend ASTRA_RELEASE.md
(
  cd "$(dirname "$out")"
  sha256sum "$(basename "$out")"
) > "$out.sha256"
echo "$out"
echo "$out.sha256"
