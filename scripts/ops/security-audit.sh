#!/usr/bin/env bash
set -euo pipefail

run_audit_if_lockfile_exists() {
	local target_dir="$1"
	local lockfile_path="${target_dir}/package-lock.json"

	if [[ "$target_dir" == "." ]]; then
		lockfile_path="package-lock.json"
	fi

	if [[ -f "$lockfile_path" ]]; then
		if [[ "$target_dir" == "." ]]; then
			npm audit --audit-level=critical
		else
			npm --prefix "$target_dir" audit --audit-level=critical
		fi
	else
		echo "Skipping npm audit for '$target_dir' (no package-lock.json found)."
	fi
}

run_audit_if_lockfile_exists "."
run_audit_if_lockfile_exists "backend"
run_audit_if_lockfile_exists "frontend"

echo "Dependency security audit completed."
