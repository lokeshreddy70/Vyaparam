#!/usr/bin/env bash
set -euo pipefail

npm audit --audit-level=critical
npm --prefix backend audit --audit-level=critical
npm --prefix frontend audit --audit-level=critical

echo "Dependency security audit completed."
