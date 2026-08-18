#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
chmod 700 backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
output="backups/postgres-$stamp.sql.gz"
temporary="$output.tmp"
trap 'rm -f "$temporary"' EXIT
docker compose -f docker-compose.release.yml exec -T postgres \
  sh -ec 'pg_dump --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip -9 > "$temporary"
gzip -t "$temporary"
mv "$temporary" "$output"
chmod 600 "$output"
trap - EXIT
echo "$output"
