#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

RESULT="$(psql "${DATABASE_URL}" -tAc "SELECT COUNT(*) FROM \"Business\";")"

if [[ -z "${RESULT}" ]]; then
  echo "Restore validation failed: no response from database"
  exit 1
fi

echo "Restore validation passed. Business records: ${RESULT}"
