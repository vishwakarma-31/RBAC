# Kubernetes Deployment

Production-ready Kubernetes manifests for the Authorization Platform.

## Architecture Overview

### Namespace Organization
```
rbac-platform/
├── authz-engine/          # Authorization decision service
├── management-api/        # Management REST API
├── audit-service/         # Compliance audit logging
├── shared/               # Shared infrastructure
│   ├── postgres/         # PostgreSQL database
│   ├── redis/            # Redis cache cluster
│   └── nginx/            # Ingress controller
└── monitoring/           # Observability stack
```

### Service Mesh Integration
- **Istio** for service-to-service communication
- **Mutual TLS** for service authentication
- **Traffic management** for canary deployments
- **Observability** through distributed tracing

## Core Services Deployment

### Authorization Engine Deployment
```yaml
# authz-engine/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: authz-engine
  namespace: rbac-platform
  labels:
    app: authz-engine
    version: v1.0.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: authz-engine
  template:
    metadata:
      labels:
        app: authz-engine
        version: v1.0.0
    spec:
      containers:
      - name: authz-engine
        image: rbacplatform/authz-engine:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: authz-engine
  namespace: rbac-platform
spec:
  selector:
    app: authz-engine
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### Management API Deployment
```yaml
# management-api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: management-api
  namespace: rbac-platform
spec:
  replicas: 2
  selector:
    matchLabels:
      app: management-api
  template:
    metadata:
      labels:
        app: management-api
    spec:
      containers:
      - name: management-api
        image: rbacplatform/management-api:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        - name: AUTHZ_ENGINE_URL
          value: "http://authz-engine.rbac-platform.svc.cluster.local"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: management-api
  namespace: rbac-platform
spec:
  selector:
    app: management-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: ClusterIP
```

### Audit Service Deployment
```yaml
# audit-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: audit-service
  namespace: rbac-platform
spec:
  replicas: 2
  selector:
    matchLabels:
      app: audit-service
  template:
    metadata:
      labels:
        app: audit-service
    spec:
      containers:
      - name: audit-service
        image: rbacplatform/audit-service:latest
        ports:
        - containerPort: 3002
        volumeMounts:
        - name: audit-storage
          mountPath: /var/log/audit
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: audit-database-credentials
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "400m"
      volumes:
      - name: audit-storage
        persistentVolumeClaim:
          claimName: audit-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: audit-service
  namespace: rbac-platform
spec:
  selector:
    app: audit-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3002
  type: ClusterIP
```

## Database Infrastructure

### PostgreSQL StatefulSet
```yaml
# postgres/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: rbac-platform
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "rbac_platform"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: rbac-platform
spec:
  selector:
    app: postgres
  ports:
  - protocol: TCP
    port: 5432
    targetPort: 5432
  clusterIP: None
```

### Redis Deployment
```yaml
# redis/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: rbac-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command: ["redis-server"]
        args: [
          "--maxmemory", "2gb",
          "--maxmemory-policy", "allkeys-lru",
          "--save", "\"\"",
          "--appendonly", "no"
        ]
        resources:
          requests:
            memory: "1Gi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: rbac-platform
spec:
  selector:
    app: redis
  ports:
  - protocol: TCP
    port: 6379
    targetPort: 6379
```

## Ingress Configuration

### NGINX Ingress Controller
```yaml
# ingress/nginx-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rbac-platform-ingress
  namespace: rbac-platform
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "1000"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.rbac-platform.com
    - admin.rbac-platform.com
    secretName: rbac-platform-tls
  rules:
  - host: api.rbac-platform.com
    http:
      paths:
      - path: /authorize
        pathType: Prefix
        backend:
          service:
            name: authz-engine
            port:
              number: 80
      - path: /
        pathType: Prefix
        backend:
          service:
            name: management-api
            port:
              number: 80
  - host: admin.rbac-platform.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-dashboard
            port:
              number: 80
```

## Secrets Management

### External Secrets Operator
```yaml
# secrets/database-credentials.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: rbac-platform
spec:
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: database-credentials
  data:
  - secretKey: url
    remoteRef:
      key: rbac-platform/database-url
  - secretKey: username
    remoteRef:
      key: rbac-platform/database-username
  - secretKey: password
    remoteRef:
      key: rbac-platform/database-password
```

## Horizontal Pod Autoscaling

### CPU/Memory Based Scaling
```yaml
# hpa/authz-engine-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: authz-engine-hpa
  namespace: rbac-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: authz-engine
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

## Monitoring & Observability

### Prometheus ServiceMonitor
```yaml
# monitoring/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rbac-platform-monitor
  namespace: rbac-platform
spec:
  selector:
    matchLabels:
      app: authz-engine
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
  - port: http
    path: /health
    interval: 10s
```

### Grafana Dashboard
```yaml
# monitoring/grafana-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rbac-platform-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  rbac-platform.json: |
    {
      "dashboard": {
        "title": "RBAC Platform Metrics",
        "panels": [
          {
            "title": "Authorization Requests/sec",
            "type": "graph",
            "targets": [
              {
                "expr": "rate(authz_requests_total[5m])",
                "legendFormat": "{{tenant}}"
              }
            ]
          },
          {
            "title": "Cache Hit Ratio",
            "type": "gauge",
            "targets": [
              {
                "expr": "authz_cache_hits_total / (authz_cache_hits_total + authz_cache_misses_total)"
              }
            ]
          }
        ]
      }
    }
```

## Backup & Disaster Recovery

### Velero Backup Configuration
```yaml
# backup/velero-schedule.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-rbac-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  template:
    ttl: "168h"  # 7 days
    includedNamespaces:
    - rbac-platform
    includedResources:
    - deployments
    - services
    - configmaps
    - secrets
    - persistentvolumeclaims
    labelSelector:
      matchLabels:
        backup: "enabled"
```

## Security Policies

### Network Policies
```yaml
# security/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: authz-engine-network-policy
  namespace: rbac-platform
spec:
  podSelector:
    matchLabels:
      app: authz-engine
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: istio-system
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yaml
name: Deploy to Kubernetes
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up kubectl
      uses: azure/setup-kubectl@v3
    - name: Deploy to cluster
      run: |
        kubectl set image deployment/authz-engine \
          authz-engine=rbacplatform/authz-engine:${GITHUB_SHA}
        kubectl rollout status deployment/authz-engine
```

## Environment-Specific Configurations

### Production Values
```yaml
# values-production.yaml
replicaCount:
  authzEngine: 5
  managementApi: 3
  auditService: 3

resources:
  authzEngine:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "1000m"
      memory: "2Gi"

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 30
```

### Staging Values
```yaml
# values-staging.yaml
replicaCount:
  authzEngine: 2
  managementApi: 2
  auditService: 2

resources:
  authzEngine:
    requests:
      cpu: "100m"
      memory: "256Mi"
    limits:
      cpu: "250m"
      memory: "512Mi"

autoscaling:
  enabled: false
```