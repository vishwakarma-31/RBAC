# Anomaly Detection Service

Machine learning service for detecting anomalous access patterns in the RBAC authorization engine.

## Overview

This service provides real-time anomaly scoring for authorization requests using an ensemble of **Isolation Forest** and **Local Outlier Factor** algorithms. It serves as a pre-authorization filter that identifies suspicious access patterns without blocking legitimate access.

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Authorization  │─────▶│  Anomaly Detector│─────▶│   Authorization  │
│     Engine      │      │  (This Service)  │      │     Response    │
└─────────────────┘      └────────┬─────────┘      └─────────────────┘
                                  │
                                  ▼
                          ┌──────────────────┐
                          │  ML Model        │
                          │  (Isolation      │
                          │   Forest + LOF)  │
                          └──────────────────┘
```

## Quick Start

### Installation

```bash
cd services/anomaly-detector
pip install -r requirements.txt
```

### Training the Model

```bash
# Option 1: Train from sample data
python model_trainer.py

# Option 2: Train from database
python -c "
from model_trainer import train_model_from_database
result = train_model_from_database('postgresql://user:pass@localhost/rbac')
print(result)
"
```

### Running the API

```bash
# Development
uvicorn api:app --reload --port 8000

# Production
uvicorn api:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker

```bash
docker build -t anomaly-detector .
docker run -p 8000:8000 anomaly-detector
```

## API Endpoints

### Score Request

```bash
curl -X POST http://localhost:8000/api/v1/anomaly/score \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "principal_id": "660e8400-e29b-41d4-a716-446655440001",
    "action": "document.export",
    "resource_type": "document",
    "resource_id": "doc-001",
    "ip_address": "192.168.1.100",
    "timestamp": "2026-05-07T14:30:00"
  }'
```

**Response:**
```json
{
  "anomaly_score": 0.75,
  "risk_level": "high",
  "factors": [
    {
      "feature": "requests_per_minute",
      "value": 45.0,
      "contribution": 0.35
    }
  ],
  "recommended_action": "flag_for_review",
  "model_version": "1.0.0",
  "timestamp": "2026-05-07T14:30:00"
}
```

### Batch Score

```bash
curl -X POST http://localhost:8000/api/v1/anomaly/score/batch \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      { ... },
      { ... }
    ]
  }'
```

### Health Check

```bash
curl http://localhost:8000/health
```

## Integration with Authorization Engine

### Pre-Authorization Filter

Modify the authorization engine to call the anomaly detector before making an authorization decision:

```typescript
// In AuthorizationEngine.ts
async evaluate(request: AuthorizationRequest): Promise<AuthorizationResponse> {
  // ... existing RBAC/ABAC/Policy evaluation ...

  // Pre-authorization anomaly check
  const anomalyScore = await this.anomalyDetector.score({
    tenant_id: request.tenantId,
    principal_id: request.principalId,
    action: request.action,
    resource_type: request.resource.type,
    resource_id: request.resource.id,
    ip_address: request.context?.ip_address
  });

  // Add anomaly score to response
  response.anomaly_score = anomalyScore.anomaly_score;
  response.anomaly_risk_level = anomalyScore.risk_level;

  // Log high-risk requests for security review
  if (anomalyScore.risk_level === 'high') {
    await this.securityAlert.send({
      type: 'high_risk_access',
      principal_id: request.principalId,
      anomaly_score: anomalyScore.anomaly_score,
      request: request
    });
  }

  return response;
}
```

### Environment Variables

```bash
# API Server
PORT=8000
MODEL_PATH=models/anomaly_detector.joblib

# Database
DATABASE_URL=postgresql://user:pass@localhost/rbac

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

## Feature Engineering

The service extracts 31 features from each authorization request:

| Category | Features |
|----------|----------|
| Temporal | hour_sin, hour_cos, dow_sin, dow_cos, is_business_hour, is_weekend, is_night |
| Frequency | requests_per_minute, unique_resources, unique_actions, resource_diversity |
| Resource | is_new_resource, resource_type_entropy, resource_type_count |
| Action | is_write_action, write_ratio, action_diversity |
| Behavioral | time_deviation, denied_ratio, ip_count, is_new_ip |
| Historical | hour_deviation, day_deviation |

## Model Performance

| Metric | Value |
|--------|-------|
| Latency | <50ms |
| Throughput | 1000 requests/second |
| Model Size | ~50MB |
| Training Time | <30 minutes (30 days data) |

## Risk Levels

| Level | Score Range | Action |
|-------|-------------|--------|
| Low | 0.0 - 0.3 | Allow, no logging |
| Medium | 0.3 - 0.6 | Allow, log for review |
| High | 0.6 - 0.8 | Allow, trigger alert |
| Critical | 0.8 - 1.0 | Require verification |

## Testing

```bash
# Run unit tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html
```

## Future Enhancements

1. **Sequence Modeling**: LSTM for temporal attack chain detection
2. **User Embedding**: Similarity-based detection for compromised accounts
3. **AutoML**: Automatic feature selection and hyperparameter tuning