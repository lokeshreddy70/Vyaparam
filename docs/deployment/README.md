# Deployment Documentation

This directory contains deployment baseline documentation for SmartBiz.

## Primary documents

- `production-engineering.md`: engineering runbook covering environments, CI/CD, containers, observability, security, and DR.

## Production deployment sequence

1. Validate environment contract:
	- `npm run env:validate`
2. Run quality gates:
	- `npm run lint`
	- `npm run typecheck`
	- `npm run build`
3. Push changes to `main`.
4. Ensure `CI` workflow passes.
5. Trigger `Release` workflow for tagged builds or use `workflow_dispatch`.
6. Confirm health endpoints after deployment.

## Workflow mapping

- CI: `.github/workflows/ci.yml`
- Release: `.github/workflows/release.yml`
- CD Staging: `.github/workflows/cd-staging.yml`
- Rollback: `.github/workflows/rollback.yml`
- Database Operations: `.github/workflows/database-ops.yml`

## Configuration references

- Frontend runtime/deploy config: `frontend/vercel.json`
- Backend runtime/deploy config: `backend/vercel.json`
- Docker production composition: `docker-compose.prod.yml`
- Backend production container: `backend/Dockerfile`
- Frontend production container: `frontend/Dockerfile`
