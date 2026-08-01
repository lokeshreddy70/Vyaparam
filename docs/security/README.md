# Security and Environment Contract

## Environment contract enforcement

Environment validation script: `scripts/ops/validate-env.mjs`

Required keys:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ALLOWED_ORIGINS`

Additional requirement:

- JWT secrets must be at least 24 characters.

## Dependency audit policy

- Audit script: `scripts/ops/security-audit.sh`
- Baseline enforcement level: `critical`
- Script behavior: skips package scopes without a `package-lock.json`.

## Deployment security references

- Backend headers/security middleware implemented in backend runtime.
- Production workflow secrets are consumed by GitHub Actions and deployment providers.
- Review deployment runbooks in `docs/deployment/` before release.
