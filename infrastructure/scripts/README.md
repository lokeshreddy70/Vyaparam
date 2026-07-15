SmartBiz Operations Scripts

Environment and security
- node scripts/ops/validate-env.mjs
- bash scripts/ops/security-audit.sh

Load testing
- bash scripts/ops/load-test.sh

Database automation
- bash database/scripts/migrate.sh
- bash database/scripts/backup.sh
- BACKUP_FILE=database/backups/<file>.dump bash database/scripts/restore.sh
- bash database/scripts/validate-restore.sh

These scripts are designed for CI and production runbooks.
