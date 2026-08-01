# Database Backup Directory Baseline

This directory stores generated database backups.

## Backup command

Use:

- `database/scripts/backup.sh`

Required variables:

- `DATABASE_URL`
- `BACKUP_DIR` (optional; defaults to this directory)

## File naming convention

- `smartbiz_YYYYMMDD_HHMMSS.dump`

## Restore command

Use:

- `database/scripts/restore.sh`

Required variables:

- `DATABASE_URL`
- `BACKUP_FILE`

## Restore validation

Use:

- `database/scripts/validate-restore.sh`

Validation checks that the `Business` table is readable and returns a count.

## Retention recommendation

- Keep daily backups for 30 days.
- Keep weekly backups for 12 weeks.
- Keep monthly backups for 12 months.

Retention execution can be implemented with external storage lifecycle policies or scheduled cleanup scripts.
