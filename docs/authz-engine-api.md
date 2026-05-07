# Authorization Engine API Documentation

## Overview

The Authorization Engine is the core component of the RBAC Platform that evaluates access control decisions. It implements a layered authorization approach combining **Role-Based Access Control (RBAC)**, **Attribute-Based Access Control (ABAC)**, and **Policy-Based Access Control (PBAC)**.

**Base URL**: `http://localhost:3003/api/v1`

**Authentication**: Bearer token in the `Authorization` header
```
Authorization: Bearer <jwt_token>
```

---

## Endpoints

### 1. Evaluate Authorization

Evaluates a single authorization request against RBAC, ABAC, and Policy rules.

**Endpoint**: `POST /authorize`

**Headers**:
| Header | Value | Required |
|--------|-------|----------|
| Content-Type | application/json | Yes |
| Authorization | Bearer <token> | Yes |

#### Request Body

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "document.read",
  "resource": {
    "type": "document",
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "attributes": {
      "owner_id": "660e8400-e29b-41d4-a716-446655440001",
      "department": "finance",
      "sensitivity": 2
    }
  },
  "principal": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "attributes": {
      "department": "finance",
      "clearance_level": 3,
      "ip_address": "192.168.1.100"
    }
  },
  "context": {
    "time_of_day": "14:30",
    "day_of_week": "monday",
    "request_origin": "web"
  }
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tenantId` | string (UUID) | Yes | Unique identifier for the tenant organization |
| `principalId` | string (UUID) | Yes | Unique identifier for the user/service account |
| `action` | string | Yes | Action to perform (e.g., `document.read`, `user.delete`) |
| `resource.type` | string | Yes | Type of resource being accessed |
| `resource.id` | string (UUID/numeric) | Yes | Unique identifier for the resource |
| `resource.attributes` | object | No | Additional resource attributes for ABAC |
| `principal.attributes` | object | No | Additional principal attributes for ABAC |
| `context` | object | No | Additional context for policy evaluation |

#### Response (200 OK)

```json
{
  "allowed": true,
  "reason": "Granted by role \"document-reader\" (Level 2)",
  "explanation": "Granted by role \"document-reader\" (Level 2)",
  "policy_evaluated": null,
  "failed_conditions": null,
  "evaluated_at": "2026-05-07T14:30:00.000Z",
  "cache_hit": false
}
```

#### Response (400 Bad Request)

```json
{
  "error": "Invalid request",
  "message": "Missing required field: tenantId"
}
```

#### Response (401 Unauthorized)

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

#### Response (429 Too Many Requests)

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many authorization requests"
}
```

#### Response (500 Internal Server Error)

```json
{
  "error": "Authorization evaluation failed",
  "message": "Database connection error"
}
```

---

### 2. Batch Authorization

Evaluates multiple authorization requests in a single call for efficiency.

**Endpoint**: `POST /authorize/batch`

#### Request Body

```json
{
  "requests": [
    {
      "tenantId": "550e8400-e29b-41d4-a716-446655440000",
      "principalId": "660e8400-e29b-41d4-a716-446655440001",
      "action": "document.read",
      "resource": {
        "type": "document",
        "id": "doc-001"
      }
    },
    {
      "tenantId": "550e8400-e29b-41d4-a716-446655440000",
      "principalId": "660e8400-e29b-41d4-a716-446655440001",
      "action": "document.write",
      "resource": {
        "type": "document",
        "id": "doc-002"
      }
    }
  ]
}
```

#### Response (200 OK)

```json
{
  "results": [
    {
      "allowed": true,
      "reason": "Granted by role \"document-reader\" (Level 2)",
      "explanation": "Granted by role \"document-reader\" (Level 2)",
      "evaluated_at": "2026-05-07T14:30:00.000Z"
    },
    {
      "allowed": false,
      "reason": "Missing required permission: document.write",
      "explanation": "Missing required permission: document.write. Principal has roles: [document-reader]",
      "failed_conditions": ["Missing required permission: document.write"],
      "evaluated_at": "2026-05-07T14:30:00.000Z"
    }
  ]
}
```

---

### 3. Invalidate Cache

Invalidates cached authorization decisions for a principal (used after role/permission changes).

**Endpoint**: `DELETE /authorize/cache`

#### Request Body

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Cache invalidated for principal 660e8400-e29b-41d4-a716-446655440001"
}
```

---

### 4. Get Cache Statistics

Retrieves cache performance metrics for monitoring and debugging.

**Endpoint**: `GET /authorize/cache/stats`

#### Response (200 OK)

```json
{
  "hits": 1523,
  "misses": 487,
  "hitRate": 0.7578,
  "errors": 5
}
```

---

### 5. Health Check

Returns the health status of the authorization engine service.

**Endpoint**: `GET /health`

#### Response (200 OK)

```json
{
  "status": "healthy",
  "service": "authorization-engine",
  "version": "1.0.0",
  "uptime": 3600000,
  "timestamp": "2026-05-07T14:30:00.000Z"
}
```

---

### 6. Metrics

Returns Prometheus-compatible metrics for monitoring.

**Endpoint**: `GET /metrics`

#### Response (200 OK)

```
# HELP authz_requests_total Total authorization requests
# TYPE authz_requests_total counter
authz_requests_total{result="allowed"} 1523
authz_requests_total{result="denied"} 487

# HELP authz_cache_hits_total Total cache hits
# TYPE authz_cache_hits_total counter
authz_cache_hits_total 1523

# HELP authz_duration_seconds Authorization evaluation duration
# TYPE authz_duration_seconds summary
authz_duration_seconds{method="rbac"} 0.023
authz_duration_seconds{method="abac"} 0.015
authz_duration_seconds{method="policy"} 0.018
```

---

## Authorization Flow

The authorization engine evaluates requests in the following order:

```
┌─────────────────────────┐
│   Rate Limiting Check  │
│  (Token Bucket Algorithm)│
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│    Cache Lookup         │
│  (Redis-based Caching)  │
└────────────┬────────────┘
             │ Cache Hit
             ▼ (or continue)
┌─────────────────────────┐
│   Request Validation   │
│ (UUID format, required │
│        fields)          │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   RBAC Evaluation       │
│  (Role-Permission Map)  │
│  - Hierarchical Roles   │
│  - Inheritance Chain    │
└────────────┬────────────┘
             │ Deny
             ▼ (or continue)
┌─────────────────────────┐
│   ABAC Evaluation       │
│  (Attribute-Based)       │
│  - Resource Ownership   │
│  - Department Match     │
│  - Clearance Levels     │
└────────────┬────────────┘
             │ Deny
             ▼ (or continue)
┌─────────────────────────┐
│  Policy Evaluation      │
│  (JSON Policy Rules)    │
│  - Condition Groups     │
│  - Priority Ordering    │
│  - Effect: Allow/Deny   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Cache Decision        │
│   (If not from cache)   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Audit Logging         │
│  (Compliance Tracking) │
└─────────────────────────┘
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| AUTH_001 | 400 | Invalid request format |
| AUTH_002 | 401 | Missing or invalid token |
| AUTH_003 | 403 | Access denied |
| AUTH_004 | 429 | Rate limit exceeded |
| AUTH_005 | 500 | Internal server error |
| AUTH_006 | 503 | Service unavailable |

---

## Rate Limiting

The authorization engine implements rate limiting using a token bucket algorithm:

- **Default**: 1000 requests per minute per tenant
- **Burst**: 100 tokens
- **Configuration**: Via `config/rateLimit` in environment

---

## Caching Strategy

Authorization decisions are cached in Redis with the following key format:
```
authz:{tenantId}:{principalId}:{action}:{resourceType}:{resourceId}
```

**TTL**: 300 seconds (5 minutes)

Cache is invalidated when:
- Role assignments change
- Permission definitions update
- Policy rules are modified
- Explicit cache invalidation request

---

## Example Use Cases

### Example 1: Simple RBAC Authorization

**Request**:
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "document.read",
  "resource": {
    "type": "document",
    "id": "doc-123"
  }
}
```

**Response**:
```json
{
  "allowed": true,
  "reason": "Granted by role \"document-reader\" (Level 2)",
  "explanation": "Granted by role \"document-reader\" (Level 2)",
  "evaluated_at": "2026-05-07T14:30:00.000Z"
}
```

---

### Example 2: ABAC Resource Ownership

**Request**:
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "document.delete",
  "resource": {
    "type": "document",
    "id": "doc-456",
    "attributes": {
      "owner_id": "660e8400-e29b-41d4-a716-446655440001"
    }
  }
}
```

**Response**:
```json
{
  "allowed": true,
  "reason": "Resource ownership verified",
  "explanation": "Resource ownership verified",
  "evaluated_at": "2026-05-07T14:30:00.000Z"
}
```

---

### Example 3: Policy-Based Deny

**Request**:
```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "principalId": "660e8400-e29b-41d4-a716-446655440001",
  "action": "document.export",
  "resource": {
    "type": "document",
    "id": "doc-789",
    "attributes": {
      "classification": "confidential"
    }
  },
  "principal": {
    "attributes": {
      "clearance_level": 1
    }
  }
}
```

**Response**:
```json
{
  "allowed": false,
  "reason": "Security policy: No export of confidential documents without level 3 clearance",
  "explanation": "Security policy: No export of confidential documents without level 3 clearance",
  "policy_evaluated": "policy-security-export-001",
  "failed_conditions": ["principal.clearance_level < resource.classification.min_clearance"],
  "evaluated_at": "2026-05-07T14:30:00.000Z"
}
```

---

## SDK Usage

### Node.js SDK

```typescript
import { AuthorizationClient } from '@rbac-platform/sdk';

const client = new AuthorizationClient({
  baseUrl: 'http://localhost:3003/api/v1',
  apiKey: 'your-api-key'
});

const result = await client.authorize({
  tenantId: '550e8400-e29b-41d4-a716-446655440000',
  principalId: '660e8400-e29b-41d4-a716-446655440001',
  action: 'document.read',
  resource: {
    type: 'document',
    id: 'doc-123'
  }
});

if (result.allowed) {
  console.log('Access granted:', result.reason);
} else {
  console.log('Access denied:', result.reason);
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-05-07 | Initial release with RBAC, ABAC, Policy evaluation |