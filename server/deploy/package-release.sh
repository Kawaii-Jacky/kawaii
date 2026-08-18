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
  server/docker-compose.release.yml server/Dockerfile server/Dockerfile.admin \
  server/Dockerfile.web server/nginx.release.conf server/mosquitto \
  server/app server/requirements.txt server/.env.example server/deploy \
  remote-observatory-frontend ASTRA_RELEASE.md
sha256sum "$out" > "$out.sha256"
echo "$out"
echo "$out.sha256"
