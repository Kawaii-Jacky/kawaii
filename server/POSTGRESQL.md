# PostgreSQL deployment

Compose runs PostgreSQL 17 with the persistent `postgres-data` volume. The API
receives `DATABASE_URL` from Compose and reports `"database":"postgresql"` in
`/health` after a successful switch.

The one-time migration is idempotent and leaves the SQLite source untouched:

```bash
cd '/mnt/d/h2o/remote astro/server'
docker compose -f docker-compose.yml -f docker-compose.wsl.yml run --rm \
  --no-deps -e PYTHONPATH=/app -v './scripts:/app/scripts:ro' \
  api python /app/scripts/migrate-sqlite-to-postgres.py
```

Encrypted backups contain both `astroy-postgres.dump` and the retained SQLite
rollback source. The backup verifier runs `pg_restore --list` and SQLite
`pragma integrity_check` before marking a backup successful.

Restore PostgreSQL only during a maintenance window. Decrypt the archive with
`restore-backup.sh`, stop API writes, and use `pg_restore --clean --if-exists`
against a reviewed target database.
