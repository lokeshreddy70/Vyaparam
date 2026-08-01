# Database Baseline Documentation

## Prisma schema consistency

- Canonical schema: `backend/prisma/schema.prisma`
- Validation command:
	- `cd backend && npx prisma validate --schema prisma/schema.prisma`

## Migration operations

- Deploy migrations:
	- `database/scripts/migrate.sh`
- Workflow automation:
	- `.github/workflows/database-ops.yml`

## Backup and restore

- Backup script: `database/scripts/backup.sh`
- Restore script: `database/scripts/restore.sh`
- Restore validation: `database/scripts/validate-restore.sh`

## Required environment variables

- `DATABASE_URL` (required for all database scripts)
- `BACKUP_DIR` (optional, defaults to `./database/backups` for backup script)
- `BACKUP_FILE` (required for restore script)

## Baseline safeguards

- Backup format uses `pg_dump -Fc` for compressed/custom format.
- Restore uses `pg_restore --clean --if-exists` to avoid duplicate objects.
- Validation script ensures `Business` table is queryable after restore.
