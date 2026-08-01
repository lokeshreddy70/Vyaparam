# SmartBiz / Vyaparam

Production baseline for the SmartBiz platform monorepo.

## Current scope

- Backend API: NestJS + Prisma + PostgreSQL
- Frontend web app: React + TypeScript + Vite
- Production workflows: CI, Release, CD Staging, Rollback, Database Operations, Load Test

## Canonical baseline document

- `PRODUCTION_BASELINE.md` is the primary source of truth for:
  - architecture overview
  - environment variables
  - build and deployment flow
  - rollback and backup procedures
  - monitoring and disaster recovery notes

## Production runbooks

- Deployment runbook: `docs/deployment/README.md`
- Production engineering notes: `docs/deployment/production-engineering.md`
- Database operations and backup policy: `docs/database/README.md`
- Backup directory policy: `database/backups/README.md`
- Security and env contract: `docs/security/README.md`
- Enterprise design system: `docs/ui/SMARTBIZ_DESIGN_SYSTEM.md`

## Baseline validation commands

```bash
npm run lint
npm run typecheck
npm run build
cd backend && npx prisma validate --schema prisma/schema.prisma
```

## Environment contract

Minimum required variables are validated by:

- `scripts/ops/validate-env.mjs`

Required keys:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ALLOWED_ORIGINS`

## Notes

- The root lockfile (`package-lock.json`) tracks root and backend workspace dependencies.
- Frontend dependencies are tracked in `frontend/package-lock.json`.
