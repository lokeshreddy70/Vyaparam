#!/usr/bin/env bash
set -euo pipefail

export STRESS_BASE_URL="${STRESS_BASE_URL:-http://localhost:3000/api/v1}"

echo "Running API stress"
STRESS_PATH="/monitoring/health" STRESS_LEVELS="100,500,1000" npm run stress:test

echo "Running auth stress"
STRESS_PATH="/auth/login" STRESS_LEVELS="50,100,200" npm run stress:test || true

echo "Running billing stress"
STRESS_PATH="/billing-pos/documents" STRESS_LEVELS="50,100,250" npm run stress:test || true

echo "Running POS stress"
STRESS_PATH="/orders" STRESS_LEVELS="50,100,250" npm run stress:test || true

echo "Load test workflow finished."
