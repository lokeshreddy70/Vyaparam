#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

BACKUP_DIR="${BACKUP_DIR:-./database/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/smartbiz_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

pg_dump "${DATABASE_URL}" -Fc -f "${OUTPUT_FILE}"

echo "Backup created: ${OUTPUT_FILE}"
