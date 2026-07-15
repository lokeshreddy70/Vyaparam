SmartBiz Monitoring Stack

This monitoring profile provides Prometheus and Grafana for operational visibility.

Run
1. docker compose -f docker-compose.monitoring.yml up -d

Services
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

Prometheus
- Scrape target configured for backend metrics endpoint:
	/api/v1/monitoring/metrics

Production recommendation
- Store Grafana and Prometheus data on persistent volumes.
- Integrate alertmanager and managed notification channels.
