SmartBiz Workflow Overview

ci.yml
- Build backend and frontend
- Run backend tests
- Run dependency security audit

cd-staging.yml
- Build and push container images
- Deploy to staging via Helm

release.yml
- Version-tagged production release pipeline
- Build, push, and publish release notes

rollback.yml
- Manual rollback to selected backend/frontend image tags

database-ops.yml
- Scheduled and manual migration/backup automation

load-test.yml
- Manual performance validation pipeline
