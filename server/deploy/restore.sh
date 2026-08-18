#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
file=${1:?usage: restore.sh backups/postgres.sql.gz}
gzip -dc "$file" | docker compose -f docker-compose.release.yml exec -T postgres psql -U "${POSTGRES_USER:-astra}" "${POSTGRES_DB:-astroy}"
