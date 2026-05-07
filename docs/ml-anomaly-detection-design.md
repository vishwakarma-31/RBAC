# ML Anomaly Detection for Authorization Engine

## Overview

This document describes the design for a machine learning component that detects anomalous access patterns in the RBAC authorization engine. The system identifies unusual access behaviors that may indicate security threats such as privilege escalation, data exfiltration, or compromised accounts.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Authorization Platform                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐      ┌─────────────────┐      ┌────────────────────┐  │
│  │   Client     │─────▶│ Authorization   │─────▶│ Anomaly Detector   │  │
│  │  (Request)   │      │     Engine      │      │  (Python Service)  │  │
│  └──────────────┘      └────────┬────────┘      └─────────┬──────────┘  │
│                                  │                        │               │
│                                  │                        ▼               │
│                                  │               ┌────────────────────┐    │
│                                  │               │  Isolation Forest │    │
│                                  │               │  + Feature Store  │    │
│                                  │               └────────────────────┘    │
│                                  │                        │               │
│                                  ▼                        ▼               │
│                        ┌─────────────────┐      ┌────────────────────┐    │
│                        │   Audit Log     │◀─────│  Anomaly Score    │    │
│                        │   (PostgreSQL)  │      │  + Alerting       │    │
│                        └─────────────────┘      └────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Feature Extraction Pipeline

The system extracts features from authorization requests to build a behavioral profile for each principal.

#### Feature Categories

| Category | Features | Description |
|----------|---------|-------------|
| **Temporal** | `hour_of_day`, `day_of_week`, `is_business_hour` | When the request occurred |
| **Frequency** | `requests_per_minute`, `requests_per_hour`, `unique_resources_per_hour` | Request rate patterns |
| **Resource** | `resource_type_count`, `new_resources_accessed` | What resources are accessed |
| **Action** | `action_diversity`, `write_operations_ratio` | What actions are performed |
| **Geographic** | `ip_country`, `ip_city`, `distance_from_previous` | Where requests originate |
| **Behavioral** | `role_consistency`, `time_deviation_from_normal` | Deviation from normal patterns |

#### Feature Vector Structure

```python
feature_vector = {
    "principal_id": "660e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2026-05-07T14:30:00Z",
    "features": {
        # Temporal (normalized 0-1)
        "hour_sin": 0.707,      # sin(2π * hour/24)
        "hour_cos": 0.707,      # cos(2π * hour/24)
        "day_of_week_sin": 0.0, # sin(2π * day/7)
        "day_of_week_cos": 1.0,
        "is_business_hour": 1.0,

        # Frequency (per rolling window)
        "requests_per_minute": 2.5,
        "requests_per_hour": 45.0,
        "unique_resources_per_hour": 12.0,

        # Resource patterns
        "resource_type_entropy": 1.2,
        "new_resource_ratio": 0.15,

        # Action patterns
        "action_diversity": 0.75,
        "write_ops_ratio": 0.2,

        # Historical comparison
        "role_behavior_deviation": 0.15,
        "time_pattern_deviation": 0.08,
    }
}
```

---

## Algorithm Selection

### Primary Algorithm: Isolation Forest

**Rationale**:
- Unsupervised - doesn't require labeled anomaly data
- Efficient for high-dimensional feature spaces
- Works well with authorization data which has many edge cases
- Fast inference suitable for real-time scoring

**Configuration**:
```python
from sklearn.ensemble import IsolationForest

model = IsolationForest(
    n_estimators=200,
    contamination=0.05,  # Expected proportion of anomalies
    max_samples='auto',
    max_features=1.0,
    bootstrap=False,
    random_state=42,
    n_jobs=-1
)
```

### Secondary Algorithm: Local Outlier Factor (LOF)

Used for density-based anomaly detection to catch context-specific anomalies.

```python
from sklearn.neighbors import LocalOutlierFactor

lof_model = LocalOutlierFactor(
    n_neighbors=20,
    contamination=0.05,
    novelty=True
)
```

### Ensemble Approach

Combine both algorithms with weighted voting:
- **Isolation Forest**: 60% weight (primary)
- **Local Outlier Factor**: 40% weight (contextual)

---

## Data Collection

### Event Stream Integration

The anomaly detector receives authorization events from the AuditLogger:

```json
{
  "event_type": "authorization_decision",
  "timestamp": "2026-05-07T14:30:00Z",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "principal_id": "660e8400-e29b-41d4-a716-446655440001",
  "action": "document.read",
  "resource_type": "document",
  "resource_id": "doc-001",
  "decision": "allowed",
  "decision_reason": "Granted by role document-reader",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "anomaly_score": null
}
```

### Training Data Window

- **Short-term**: Last 24 hours (real-time scoring)
- **Medium-term**: Last 30 days (pattern learning)
- **Long-term**: Last 90 days (seasonal patterns)

---

## Pre-Authorization Filter Integration

### Request Flow

```
Client Request
      │
      ▼
┌─────────────────┐
│ Authorization   │
│    Engine       │
└────────┬────────┘
         │ (evaluate RBAC/ABAC/Policy)
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Anomaly        │────▶│  Add anomaly    │
│  Detector       │     │  score to       │
│  (Pre-filter)   │     │  response       │
└────────┬────────┘     └─────────────────┘
         │
         ▼ (anomaly_score > threshold)
┌─────────────────┐
│   Alert         │
│   (if needed)   │
└─────────────────┘
```

### Scoring Endpoint

**Request**:
```json
POST /api/v1/anomaly/score
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "principal_id": "660e8400-e29b-41d4-a716-446655440001",
  "action": "document.export",
  "resource_type": "document",
  "resource_id": "doc-001",
  "ip_address": "192.168.1.100",
  "timestamp": "2026-05-07T14:30:00Z",
  "context": {
    "hour": 14,
    "day": "monday"
  }
}
```

**Response**:
```json
{
  "anomaly_score": 0.85,
  "risk_level": "high",
  "factors": [
    {
      "feature": "requests_per_minute",
      "value": 45.0,
      "threshold": 20.0,
      "contribution": 0.35
    },
    {
      "feature": "new_resource_ratio",
      "value": 0.85,
      "threshold": 0.3,
      "contribution": 0.30
    },
    {
      "feature": "time_deviation",
      "value": 0.12,
      "threshold": 0.15,
      "contribution": 0.10
    }
  ],
  "recommended_action": "flag_for_review"
}
```

### Threshold Configuration

| Risk Level | Score Range | Action |
|------------|-------------|--------|
| **Low** | 0.0 - 0.3 | Allow, no logging |
| **Medium** | 0.3 - 0.6 | Allow, log for review |
| **High** | 0.6 - 0.8 | Allow, trigger alert |
| **Critical** | 0.8 - 1.0 | Deny or require additional verification |

---

## Model Training Pipeline

### Training Schedule

- **Incremental**: Every 15 minutes (update rolling statistics)
- **Full Retrain**: Daily at 02:00 UTC
- **Manual Retrain**: On-demand after security incidents

### Training Data Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Raw Events  │───▶│  Feature    │───▶│   Model     │───▶│  Anomaly    │
│ (PostgreSQL)│    │  Extraction │    │  Training   │    │  Detection  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Model Versioning

Models are stored with version metadata:
```python
model_metadata = {
    "version": "1.0.0",
    "trained_at": "2026-05-07T02:00:00Z",
    "training_data_size": 1500000,
    "features": ["hour_sin", "hour_cos", "requests_per_minute", ...],
    "algorithm": "IsolationForest",
    "hyperparameters": {
        "n_estimators": 200,
        "contamination": 0.05
    }
}
```

---

## Alerting System

### Alert Triggers

| Trigger | Condition | Severity |
|---------|-----------|----------|
| **Anomaly Spike** | >5 high-score requests in 5 minutes | High |
| **New Pattern** | Significant shift in user behavior | Medium |
| **Role Drift** | Access patterns diverge from role norms | High |
| **Time Anomaly** | Access at unusual hours | Low |
| **Resource Spike** | Access to >50 new resources/hour | Medium |

### Alert Format

```json
{
  "alert_id": "alert-2026-05-07-001",
  "type": "anomaly_spike",
  "severity": "high",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "principal_id": "660e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2026-05-07T14:35:00Z",
  "description": "Principal made 12 high-risk requests in 5 minutes",
  "request_count": 12,
  "avg_anomaly_score": 0.82,
  "recommended_actions": [
    "temporarily_suspend_principal",
    "notify_security_team"
  ]
}
```

---

## API Endpoints

### 1. Score Request

```
POST /api/v1/anomaly/score
```

Evaluates a single request for anomalies.

### 2. Batch Score

```
POST /api/v1/anomaly/score/batch
```

Scores multiple requests.

### 3. Get Principal Profile

```
GET /api/v1/anomaly/profile/{tenant_id}/{principal_id}
```

Returns behavioral profile and recent anomaly scores.

### 4. Get Anomalies

```
GET /api/v1/anomaly/events?tenant_id={id}&start={date}&end={date}
```

Returns detected anomalies in a time window.

### 5. Retrain Model

```
POST /api/v1/anomaly/train
```

Triggers model retraining.

---

## Performance Requirements

| Metric | Target |
|--------|--------|
| **Latency** | <50ms per scoring request |
| **Throughput** | 1000 requests/second |
| **Model Size** | <100MB |
| **Training Time** | <30 minutes (full retrain) |
| **Availability** | 99.9% |

---

## Security Considerations

1. **Input Validation**: Sanitize all features to prevent model manipulation
2. **Feature Engineering**: Use robust features resistant to adversarial attacks
3. **Rate Limiting**: Limit API calls to prevent probing attacks
4. **Audit Logging**: Log all anomaly detections for compliance
5. **Model Isolation**: Run ML service in isolated environment

---

## Future Enhancements

### Phase 2: Sequence Modeling
- Add LSTM/Transformer for temporal sequence patterns
- Detect multi-step attack chains

### Phase 3: User Embedding
- Learn principal embeddings for similarity-based detection
- Identify compromised accounts via behavioral similarity

### Phase 4: AutoML
- Automatic feature selection
- Dynamic threshold tuning