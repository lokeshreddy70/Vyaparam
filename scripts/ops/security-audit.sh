#!/usr/bin/env bash
set -euo pipefail

npm audit --audit-level=high
npm --prefix backend audit --audit-level=high
npm --prefix frontend audit --audit-level=high

echo "Dependency security audit completed."
