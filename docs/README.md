# Authorization Platform Documentation

Enterprise-grade documentation for the RBAC Authorization Platform.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Getting Started](#getting-started)
3. [Security Model](#security-model)
4. [Integration Guide](#integration-guide)
5. [API Reference](#api-reference)
6. [Examples](#examples)
7. [Troubleshooting](#troubleshooting)

## Architecture Overview

### System Components

The Authorization Platform consists of four core microservices:

#### 1. Authorization Engine (`authz-engine`)
- **Purpose**: Real-time authorization decision engine
- **Responsibilities**: 
  - Evaluate RBAC, ABAC, and policy-based access control
  - Provide sub-5ms decision latency
  - Generate explainable authorization responses
- **Performance**: <5ms cached decisions, <50ms uncached

#### 2. Management API (`management-api`)
- **Purpose**: Administrative REST API for platform management
- **Responsibilities**:
  - Tenant lifecycle management
  - Role and permission administration
  - Policy creation and versioning
  - Audit log querying

#### 3. Audit Service (`audit-service`)
- **Purpose**: Compliance-focused audit logging
- **Responsibilities**:
  - Immutable audit trail maintenance
  - Hash chaining for tamper detection
  - Compliance report generation
  - Real-time audit streaming

#### 4. Shared Infrastructure
- **Database**: PostgreSQL with Row Level Security
- **Cache**: Redis for performance optimization
- **Monitoring**: Prometheus metrics and Grafana dashboards

### Multi-Tenancy Implementation

Every component enforces strict tenant isolation:

```
Tenant A Data ←→ NO ACCESS ←→ Tenant B Data
     ↓                              ↓
Database RLS                    Database RLS
     ↓                              ↓
Cache Namespacing           Cache Namespacing
```

**Key Principles:**
- Tenant ID in every database query
- Cache keys namespaced by tenant
- Cross-tenant access strictly prohibited
- Automatic tenant context propagation

### Authorization Models

#### RBAC (Role-Based Access Control)
Implements NIST RBAC Levels 1-3:

**Level 1 - Flat RBAC**
- Direct role-permission assignments
- Simple many-to-many relationships

**Level 2 - Hierarchical RBAC**
- Role inheritance through parent-child relationships
- Recursive permission inheritance
- Example: `Admin` → `Manager` → `Employee`

**Level 3 - Constrained RBAC**
- Static Separation of Duties (SSoD)
- Dynamic Separation of Duties (DSoD)
- Mutual exclusion constraints

#### ABAC (Attribute-Based Access Control)
Fine-grained access based on attributes:

```json
{
  "condition": {
    "operator": "and",
    "operands": [
      {
        "attribute": "resource.owner_id",
        "operator": "=",
        "value": "principal.id"
      },
      {
        "attribute": "principal.department",
        "operator": "in",
        "value": ["finance", "accounting"]
      }
    ]
  }
}
```

#### Policy-Based Access Control
JSON-defined policies with versioning:

```json
{
  "name": "invoice-delete-policy",
  "version": "1.2.0",
  "priority": 100,
  "rules": [
    {
      "effect": "deny",
      "condition": {
        "attribute": "resource.amount",
        "operator": ">",
        "value": 10000
      },
      "explanation": "High-value invoices require additional approval"
    }
  ]
}
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Docker (recommended)
- Kubernetes (for production)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/rbac-platform/platform.git
cd platform

# Copy environment configuration
cp .env.example .env

# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs authz-engine
```

### Manual Installation

#### 1. Database Setup

```bash
# Create database
createdb rbac_platform

# Apply migrations
cd infrastructure/database
npm run migrate:up
```

#### 2. Redis Configuration

```bash
# Start Redis
redis-server --port 6379

# Test connection
redis-cli ping
```

#### 3. Service Deployment

```bash
# Install dependencies
cd services/authz-engine
npm install

# Build services
npm run build

# Start services
npm start
```

### Environment Variables

```bash
# .env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@localhost:5432/rbac_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=32-byte-encryption-key-here
LOG_LEVEL=info
ENABLE_AUDIT_LOGGING=true
```

## Security Model

### Authentication

**Service-to-Service Authentication:**
```typescript
// JWT-based authentication
const token = jwt.sign({
  service_id: 'authz-engine',
  tenant_id: 'tenant-123',
  permissions: ['authz.evaluate'],
  exp: Math.floor(Date.now() / 1000) + 3600
}, JWT_SECRET);
```

**Principal Authentication:**
- OAuth 2.0 integration
- SAML 2.0 support
- Custom authentication providers
- Multi-factor authentication

### Authorization Enforcement

**Zero-Trust Architecture:**
- Every request validates tenant context
- Defense-in-depth at API, service, and data layers
- Immutable audit trails for all decisions
- Cryptographic request hashing

**Tenant Isolation:**
```sql
-- Row Level Security policy
CREATE POLICY tenant_isolation ON roles
FOR ALL TO authz_app_user
USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

### Data Protection

**Encryption:**
- AES-256 for data at rest
- TLS 1.3 for data in transit
- Field-level encryption for PII
- Key rotation every 90 days

**Audit Integrity:**
- SHA-256 hashing of audit entries
- Hash chaining for tamper detection
- Merkle tree structures for batch verification
- Regular integrity audits

## Integration Guide

### Node.js Integration

```typescript
import { RBACClient } from '@rbac-platform/node';

const rbac = new RBACClient({
  baseUrl: 'https://api.rbac-platform.com',
  serviceToken: process.env.RBAC_SERVICE_TOKEN,
  tenantId: process.env.TENANT_ID
});

// Check authorization in your application
app.delete('/invoices/:id', async (req, res) => {
  const result = await rbac.can(
    req.user.id,
    'delete',
    {
      type: 'invoice',
      id: req.params.id,
      attributes: {
        owner_id: req.user.id,
        amount: req.invoice.amount
      }
    }
  );

  if (!result.allowed) {
    return res.status(403).json({
      error: 'Forbidden',
      reason: result.reason,
      explanation: result.explanation
    });
  }

  // Proceed with business logic
  await deleteInvoice(req.params.id);
  res.status(204).send();
});
```

### Express.js Middleware

```typescript
import { createAuthorizationMiddleware } from '@rbac-platform/node/express';

app.use(createAuthorizationMiddleware({
  rbacClient: rbac,
  extractPrincipal: (req) => req.user?.id,
  extractResource: (req) => ({
    type: req.params.resourceType,
    id: req.params.resourceId,
    attributes: getResourceAttributes(req)
  })
}));

// Route automatically protected
app.put('/documents/:id', (req, res) => {
  // Authorization already enforced
  if (!req.authorization.allowed) {
    return res.status(403).json(req.authorization);
  }
  
  updateDocument(req.params.id, req.body);
  res.json({ success: true });
});
```

### Policy Definition

```json
{
  "name": "document-access-policy",
  "version": "2.1.0",
  "description": "Controls access to sensitive documents",
  "priority": 50,
  "rules": [
    {
      "effect": "allow",
      "condition": {
        "operator": "and",
        "operands": [
          {
            "attribute": "principal.department",
            "operator": "=",
            "value": "legal"
          },
          {
            "attribute": "resource.classification",
            "operator": "in",
            "value": ["confidential", "restricted"]
          }
        ]
      },
      "explanation": "Legal department can access confidential documents"
    },
    {
      "effect": "deny",
      "condition": {
        "operator": "and",
        "operands": [
          {
            "attribute": "principal.clearance_level",
            "operator": "<",
            "value": 3
          },
          {
            "attribute": "resource.classification",
            "operator": "=",
            "value": "top_secret"
          }
        ]
      },
      "explanation": "Insufficient clearance for top secret documents"
    }
  ]
}
```

## API Reference

### Authorization Endpoint

**POST /authorize**

Evaluate if a principal can perform an action on a resource.

```bash
curl -X POST https://api.rbac-platform.com/authorize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -d '{
    "tenantId": "tenant-123",
    "principalId": "user-456",
    "action": "delete",
    "resource": {
      "type": "invoice",
      "id": "inv-789",
      "attributes": {
        "owner_id": "user-456",
        "amount": 5000
      }
    }
  }'
```

**Response:**
```json
{
  "allowed": true,
  "reason": "Principal has delete permission via role InvoiceManager",
  "explanation": "User has InvoiceManager role with invoice.delete permission",
  "policy_evaluated": "invoice-management-policy-v2",
  "evaluated_at": "2024-01-01T10:00:00Z",
  "cache_hit": true
}
```

### Management API Endpoints

#### Tenants
```
POST   /tenants                    # Create tenant
GET    /tenants                    # List tenants
GET    /tenants/:id                # Get tenant
PUT    /tenants/:id                # Update tenant
DELETE /tenants/:id                # Delete tenant
```

#### Roles
```
POST   /tenants/:tenantId/roles
GET    /tenants/:tenantId/roles
GET    /tenants/:tenantId/roles/:id
PUT    /tenants/:tenantId/roles/:id
DELETE /tenants/:tenantId/roles/:id
```

#### Permissions
```
POST   /tenants/:tenantId/permissions
GET    /tenants/:tenantId/permissions
GET    /tenants/:tenantId/permissions/:id
```

#### Audit Logs
```
GET    /tenants/:tenantId/audit-logs
POST   /tenants/:tenantId/audit-logs/export
```

## Examples

### Basic Authorization Check

```typescript
// Simple permission check
const canRead = await rbac.can(userId, 'read', {
  type: 'document',
  id: documentId
});

if (canRead.allowed) {
  // Grant access
} else {
  // Deny access with explanation
  console.log(canRead.reason);
}
```

### Complex Resource Attributes

```typescript
// Check with resource attributes
const canTransfer = await rbac.can(userId, 'transfer', {
  type: 'bank_account',
  id: accountId,
  attributes: {
    balance: 15000,
    currency: 'USD',
    owner_id: userId,
    account_type: 'checking'
  }
});
```

### Context-Aware Authorization

```typescript
// Include contextual information
const canAccess = await rbac.canWithContext(
  userId,
  'access',
  { type: 'medical_record', id: recordId },
  {
    ip_address: request.ip,
    time_of_day: getCurrentShift(),
    location: getUserLocation(),
    device_compliance: checkDeviceCompliance()
  }
);
```

### Batch Authorization

```typescript
// Check multiple permissions efficiently
const results = await rbac.canBatch([
  { principalId: userId, action: 'read', resource: doc1 },
  { principalId: userId, action: 'write', resource: doc1 },
  { principalId: userId, action: 'delete', resource: doc2 }
]);

results.forEach((result, index) => {
  console.log(`Operation ${index}: ${result.allowed ? 'ALLOWED' : 'DENIED'}`);
});
```

### Policy Simulation

```typescript
// Test what policies would affect a decision
const simulation = await rbac.simulate(userId, 'delete', {
  type: 'server',
  id: 'prod-server-01'
});

console.log('Active policies:', simulation.activePolicies);
console.log('Evaluation trace:', simulation.evaluationTrace);
```

## Troubleshooting

### Common Issues

#### Authorization Always Denied
```bash
# Check tenant context
curl -H "Authorization: Bearer $TOKEN" \
  https://api.rbac-platform.com/tenants/current

# Verify principal exists
curl -H "Authorization: Bearer $TOKEN" \
  https://api.rbac-platform.com/tenants/$TENANT_ID/principals/$USER_ID
```

#### Performance Issues
```bash
# Check cache hit ratio
curl https://api.rbac-platform.com/metrics/cache-hit-ratio

# Monitor database queries
# Enable slow query logging in PostgreSQL
log_min_duration_statement = 1000  # Log queries taking >1s
```

#### Cache Invalidation Problems
```bash
# Force cache refresh
await rbac.invalidateCache(principalId, action, resource);

# Check Redis connectivity
redis-cli ping
```

### Debugging Tools

#### Enable Debug Logging
```typescript
const rbac = new RBACClient({
  debug: true,
  logger: console
});
```

#### Health Check Endpoints
```bash
# Service health
curl https://api.rbac-platform.com/health

# Database connectivity
curl https://api.rbac-platform.com/health/database

# Cache status
curl https://api.rbac-platform.com/health/cache
```

#### Metrics Collection
```typescript
// Collect performance metrics
const metrics = await rbac.getMetrics();
console.log({
  avgLatency: metrics.averageLatency,
  cacheHitRatio: metrics.cacheHitRatio,
  errorRate: metrics.errorRate
});
```

---

**Next Steps:**
- Review the [Security Model](#security-model) for detailed threat modeling
- Explore [Integration Examples](#examples) for common use cases
- Check [API Reference](#api-reference) for complete endpoint documentation
- Visit our [Developer Portal](https://docs.rbac-platform.com) for interactive documentation