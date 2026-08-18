#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
docker compose -f docker-compose.release.yml logs -f --tail=200 "$@"
