#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
file=${1:?usage: restore.sh backups/postgres.sql.gz}
[[ -f "$file" ]] || { echo "Backup not found: $file" >&2; exit 1; }
gzip -t "$file"
gzip -dc "$file" | docker compose -f docker-compose.release.yml exec -T postgres \
  sh -ec 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" "$POSTGRES_DB"'
