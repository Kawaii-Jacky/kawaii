#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
if [[ "${1:-}" == "--purge-data" ]]; then docker compose -f docker-compose.release.yml down -v; else docker compose -f docker-compose.release.yml down; fi
