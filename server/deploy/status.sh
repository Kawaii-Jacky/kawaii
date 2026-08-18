#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
docker compose -f docker-compose.release.yml ps
docker compose -f docker-compose.release.yml exec -T api python -c 'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:8080/health", timeout=5).read().decode())' || true
