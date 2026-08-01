# SMARTBIZ Production Baseline v1.0

## 1. Architecture Overview

SmartBiz is a production monorepo with a web frontend, NestJS backend API, Prisma ORM, and PostgreSQL as the system of record. Redis is used as a runtime cache/infra dependency. CI/CD and operational runbooks are GitHub Actions driven.

High-level layers:

- Presentation: React + Vite frontend (`frontend`)
- Application/API: NestJS backend (`backend`)
- Persistence: PostgreSQL with Prisma schema (`backend/prisma/schema.prisma`)
- Cache/infra: Redis + containerized runtime (Docker/Kubernetes/Vercel workflows)

## 2. Frontend

Stack:

- React 18
- TypeScript
- Vite 5
- Tailwind CSS

Key deployment/runtime files:

- `frontend/vercel.json`
- `frontend/Dockerfile`
- `frontend/nginx.conf`

Verification baseline:

- `npm run lint`
- `npm run typecheck --prefix frontend`
- `npm run build --prefix frontend`

## 3. Backend

Stack:

- NestJS 10
- TypeScript
- Prisma 5
- PostgreSQL

Key runtime/deploy files:

- `backend/api/index.ts` (serverless entry)
- `backend/vercel.json`
- `backend/Dockerfile`

Verification baseline:

- `npm run lint --prefix backend`
- `npm run typecheck --prefix backend`
- `npm run build --prefix backend`
- `npm run test:ci --prefix backend`

## 4. Database

Primary schema:

- `backend/prisma/schema.prisma`

Integrity checks:

- `cd backend && npx prisma validate --schema prisma/schema.prisma`
- `cd backend && npx prisma generate`

Operational scripts:

- Migrate: `database/scripts/migrate.sh`
- Backup: `database/scripts/backup.sh`
- Restore: `database/scripts/restore.sh`
- Restore validation: `database/scripts/validate-restore.sh`

## 5. Storage

Current production baseline:

- PostgreSQL persistent data volume
- Redis append-only storage
- File/object storage env placeholders exist in `backend/.env.example` for S3-compatible providers

## 6. Environment Variables

Mandatory environment contract is enforced by `scripts/ops/validate-env.mjs`.

Required variables:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ALLOWED_ORIGINS`

Security rule:

- JWT secrets must be at least 24 characters.

## 7. Build Steps

From repository root:

```bash
npm run lint
npm run typecheck
npm run build
```

Prisma consistency:

```bash
cd backend
npx prisma validate --schema prisma/schema.prisma
```

## 8. Deployment Steps

1. Push to `main`.
2. Ensure CI workflow success (`.github/workflows/ci.yml`).
3. Use release workflow (`.github/workflows/release.yml`) for production image publish and release orchestration.
4. Validate post-deploy service health (backend health endpoint and frontend/API proxy checks).

References:

- `docs/deployment/README.md`
- `docs/deployment/production-engineering.md`

## 9. Rollback Steps

Rollback workflow:

- `.github/workflows/rollback.yml`

Required inputs:

- `backend_tag`
- `frontend_tag`

Operational intent:

- Re-point deployed images to known-good tags and apply deployment via Helm command path documented in workflow.

## 10. Backup Strategy

Baseline backup flow:

1. Run `database/scripts/backup.sh` with `DATABASE_URL`.
2. Store output dump in configured `BACKUP_DIR` (defaults to `database/backups`).
3. Validate restore path with `database/scripts/validate-restore.sh` after restore exercises.

Naming pattern:

- `smartbiz_YYYYMMDD_HHMMSS.dump`

## 11. Disaster Recovery Notes

- Keep frequent DB backups and verify restore regularly.
- Keep rollback tags for backend and frontend images.
- Use health checks and controlled rollout workflows before declaring recovery complete.
- Treat `database/scripts/restore.sh` + `validate-restore.sh` as required DR verification steps.

## 12. Monitoring Requirements

Minimum baseline monitoring:

- Backend health endpoint monitoring
- Frontend availability monitoring
- CI workflow status monitoring
- Error rate and auth failure trend monitoring

Optional stack references:

- `docker-compose.monitoring.yml`
- Kubernetes observability manifests under `infrastructure/monitoring` and `infrastructure/kubernetes`

## 13. Known Limitations

- Backend has no standalone `backend/package-lock.json`; backend dependency graph is tracked by root lockfile (`package-lock.json`) via npm workspaces.
- Frontend lockfile is maintained independently (`frontend/package-lock.json`).
- Some non-critical/non-breaking upgrade vulnerabilities remain due to major-version upgrade constraints.

## 14. Future Roadmap

- Incremental dependency modernization with controlled major upgrades.
- Deeper observability and SLO alerting standardization.
- Expanded automated DR drills and recovery time measurements.
- Design-system driven UI unification in subsequent product phases.

## 15. Verification Summary (Baseline Snapshot)

Repository and build baseline checks completed:

- Git status clean at head commit during baseline validation.
- Lint passed.
- Typecheck passed.
- Build passed.
- Prisma schema validation passed.
- Deployment, rollback, backup, and security docs are now documented and linked.
