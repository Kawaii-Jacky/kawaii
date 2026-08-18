#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
docker compose -f docker-compose.release.yml exec -T postgres pg_dump -U "${POSTGRES_USER:-astra}" "${POSTGRES_DB:-astroy}" | gzip > "backups/postgres-$stamp.sql.gz"
echo "backups/postgres-$stamp.sql.gz"
