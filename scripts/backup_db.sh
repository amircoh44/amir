#!/usr/bin/env bash
# Nightly PostgreSQL backup with rotation. Wire into cron on the VPS:
#   0 3 * * *  /opt/greenbulk/scripts/backup_db.sh >> /var/log/greenbulk-backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/greenbulk}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
# DATABASE_URL is read from the app environment; pg_dump understands libpq URLs.
DB_URL="${DATABASE_URL:?DATABASE_URL must be set}"
# pg_dump needs a sync-style URL (strip the +asyncpg driver suffix).
DB_URL="${DB_URL/+asyncpg/}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/greenbulk-$STAMP.sql.gz"

echo "[$(date)] Backing up to $OUT"
pg_dump "$DB_URL" | gzip > "$OUT"

# Rotate out old dumps.
find "$BACKUP_DIR" -name 'greenbulk-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
echo "[$(date)] Backup complete; pruned backups older than ${RETENTION_DAYS}d."
