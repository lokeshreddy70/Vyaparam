SmartBiz Performance Testing

Script
- node tests/performance/enterprise-stress.mjs

Environment variables
- STRESS_BASE_URL (default: http://localhost:3000/api/v1)
- STRESS_PATH (default: /monitoring/health)
- STRESS_LEVELS (default: 100,500,1000)
- STRESS_TIMEOUT_MS (default: 12000)
- STRESS_WARMUP_REQUESTS (default: 20)

Example
- STRESS_PATH=/monitoring/health STRESS_LEVELS=100,500,1000 npm run stress:test

Covered load dimensions
- API stress
- POS path stress
- Billing path stress
- Authentication endpoint reachability under load profile
