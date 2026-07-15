#!/usr/bin/env bash
set -euo pipefail

npm --prefix backend run prisma:migrate

echo "Prisma migration deploy complete."
