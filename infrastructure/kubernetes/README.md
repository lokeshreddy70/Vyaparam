SmartBiz Kubernetes Deployment

This directory contains production-ready Kubernetes assets for SmartBiz SaaS.

Structure
- base/: kustomize resources (namespace, app deployments/services, data services, ingress, HPA, PDB, ServiceMonitor)
- helm/smartbiz/: Helm chart for environment-specific rollouts

Apply with Kustomize
1. kubectl apply -k infrastructure/kubernetes/base

Deploy with Helm
1. helm upgrade --install smartbiz infrastructure/kubernetes/helm/smartbiz

Scaling and Rollouts
- Backend uses rolling updates with health probes.
- Horizontal scaling configured via HPA in base/apps/hpa-backend.yaml.
- Pod disruption budget in base/apps/pdb-backend.yaml.

Secrets
- Copy backend-secret.template.yaml to backend-secret.yaml and replace values.
- Apply secrets before deployment.

TLS and Ingress
- Update host and tls secret in ingress resources for your environment.
