# SmartBiz Production Engineering Runbook

## Environments
- Development: docker-compose.dev.yml
- Testing/Staging: Kubernetes via Helm with staging values
- Production: Kubernetes via Helm release pipeline

## CI/CD
- CI: .github/workflows/ci.yml
- Staging Deploy: .github/workflows/cd-staging.yml
- Release: .github/workflows/release.yml
- Rollback: .github/workflows/rollback.yml

## Containerization
- Backend production image: backend/Dockerfile
- Frontend production image: frontend/Dockerfile
- Dev containers: backend/Dockerfile.dev, frontend/Dockerfile.dev

## Database Operations
- Migration automation: database/scripts/migrate.sh
- Backup automation: database/scripts/backup.sh
- Restore: database/scripts/restore.sh
- Restore validation: database/scripts/validate-restore.sh

## Observability
- Prometheus + Grafana compose profile available in docker-compose.monitoring.yml
- ServiceMonitor manifest for backend metrics in infrastructure/kubernetes/base/obs/servicemonitor-backend.yaml

## Security
- Helmet + strict validation enabled in backend runtime
- Secrets templating via Kubernetes Secret manifest and GitHub Actions secrets
- Dependency audit via scripts/ops/security-audit.sh and CI pipeline

## Disaster Recovery
- Scheduled database operations workflow in .github/workflows/database-ops.yml
- Rollback workflow in .github/workflows/rollback.yml
- Health checks and readiness probes in kubernetes manifests for controlled failover and rolling deployments
