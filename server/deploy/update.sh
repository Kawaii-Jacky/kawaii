#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
"$PWD/deploy/backup.sh"
docker compose -f docker-compose.release.yml pull
docker compose -f docker-compose.release.yml up -d --remove-orphans
