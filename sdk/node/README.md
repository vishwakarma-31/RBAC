# Node.js SDK (@rbac-platform/node)

Official Node.js client SDK for integrating with the Authorization Platform.

## Installation

```bash
npm install @rbac-platform/node
```

## Quick Start

```typescript
import { RBACClient } from '@rbac-platform/node';

const rbac = new RBACClient({
  baseUrl: 'https://api.rbac-platform.com',
  serviceToken: process.env.RBAC_SERVICE_TOKEN,
  tenantId: 'your-tenant-id'
});

// Check if a user can perform an action
const canDelete = await rbac.can(
  'user-123',
  'delete',
  {
    type: 'invoice',
    id: 'inv-456',
    attributes: {
      owner_id: 'user-123',
      amount: 5000
    }
  }
);

if (canDelete.allowed) {
  console.log('Access granted:', canDelete.explanation);
} else {
  console.log('Access denied:', canDelete.reason);
  console.log('Failed conditions:', canDelete.failed_conditions);
}
```

## Core Concepts

### Client Initialization
```typescript
const rbac = new RBACClient({
  baseUrl: string,           // Platform API endpoint
  serviceToken: string,      // JWT service token
  tenantId: string,          // Your tenant ID
  timeout?: number,          // Request timeout (default: 5000ms)
  retries?: number,          // Retry attempts (default: 3)
  cacheEnabled?: boolean     // Enable local caching (default: true)
});
```

### Authorization Check
```typescript
const result = await rbac.can(
  principalId: string,
  action: string,
  resource: Resource
): Promise<AuthorizationResponse>
```

### Batch Authorization
```typescript
const results = await rbac.canBatch([
  {
    principalId: 'user-123',
    action: 'read',
    resource: { type: 'document', id: 'doc-1' }
  },
  {
    principalId: 'user-123',
    action: 'delete',
    resource: { type: 'document', id: 'doc-1' }
  }
]);
```

## Advanced Usage

### Resource Attributes
```typescript
const result = await rbac.can(
  'user-456',
  'update',
  {
    type: 'user_profile',
    id: 'profile-789',
    attributes: {
      department: 'engineering',
      clearance_level: 3,
      location: 'us-east-1'
    }
  }
);
```

### Context-Aware Authorization
```typescript
const result = await rbac.canWithContext(
  'user-123',
  'access',
  {
    type: 'financial_report',
    id: 'report-q3-2024'
  },
  {
    ip_address: '192.168.1.100',
    time_of_day: 'business_hours',
    device_type: 'desktop'
  }
);
```

### Policy Simulation
```typescript
// Simulate what policies would affect a decision
const simulation = await rbac.simulate(
  'user-123',
  'delete',
  { type: 'server', id: 'srv-prod-01' }
);

console.log('Active policies:', simulation.activePolicies);
console.log('Evaluation trace:', simulation.evaluationTrace);
```

### Permission Enumeration
```typescript
// Get all permissions a principal has
const permissions = await rbac.getPermissions('user-123');

// Check if principal has specific permission
const hasPermission = await rbac.hasPermission('user-123', 'invoice.create');

// Get effective roles for a principal
const roles = await rbac.getRoles('user-123');
```

## Response Handling

### Successful Authorization
```typescript
{
  allowed: true,
  reason: "Granted by role Administrator",
  explanation: "Principal has Administrator role with invoice.delete permission",
  policy_evaluated: "invoice-management-policy-v2",
  evaluated_at: "2024-01-01T10:00:00Z",
  cache_hit: true
}
```

### Denied Authorization
```typescript
{
  allowed: false,
  reason: "Missing required permission: invoice.delete",
  failed_conditions: [
    "resource.owner_id != principal.id",
    "principal.department != 'finance'"
  ],
  explanation: "Principal lacks delete permission and is not the resource owner",
  policy_evaluated: "invoice-delete-policy-v3",
  evaluated_at: "2024-01-01T10:00:00Z"
}
```

## Error Handling

```typescript
try {
  const result = await rbac.can('user-123', 'delete', resource);
  
  if (!result.allowed) {
    // Handle authorization denial
    logger.warn(`Access denied: ${result.reason}`, {
      principal: 'user-123',
      resource: resource.id,
      failedConditions: result.failed_conditions
    });
  }
} catch (error) {
  if (error.code === 'AUTHORIZATION_SERVICE_UNAVAILABLE') {
    // Fallback logic for service unavailability
    logger.error('Authorization service unavailable, using fallback');
  } else if (error.code === 'INVALID_REQUEST') {
    // Handle malformed requests
    logger.error('Invalid authorization request', error.details);
  } else {
    // Handle other errors
    logger.error('Authorization check failed', error);
  }
}
```

## Caching Strategy

### Local Cache Configuration
```typescript
const rbac = new RBACClient({
  // ... other config
  cacheEnabled: true,
  cacheTTL: 300, // 5 minutes
  cacheMaxSize: 10000 // Maximum cached entries
});

// Manually invalidate cache
await rbac.invalidateCache('user-123', 'delete', resource);
```

### Cache Key Generation
```typescript
// Custom cache key strategy
const customRbac = new RBACClient({
  cacheKeyGenerator: (principalId, action, resource) => {
    return `${principalId}:${action}:${resource.type}:${resource.id}`;
  }
});
```

## Middleware Integration

### Express.js Middleware
```typescript
import { createAuthorizationMiddleware } from '@rbac-platform/node/express';

const app = express();

// Add authorization middleware
app.use(createAuthorizationMiddleware({
  rbacClient: rbac,
  extractPrincipal: (req) => req.user?.id,
  extractResource: (req) => ({
    type: req.params.resourceType,
    id: req.params.resourceId
  })
}));

// Protected route
app.delete('/invoices/:id', async (req, res) => {
  // Authorization already checked by middleware
  // req.authorization contains the decision result
  if (!req.authorization.allowed) {
    return res.status(403).json({
      error: 'Forbidden',
      reason: req.authorization.reason
    });
  }
  
  // Proceed with business logic
  await deleteInvoice(req.params.id);
  res.status(204).send();
});
```

### Fastify Plugin
```typescript
import { fastifyRbacPlugin } from '@rbac-platform/node/fastify';

const fastify = require('fastify')();

fastify.register(fastifyRbacPlugin, {
  rbacClient: rbac,
  extractPrincipal: (req) => req.user?.id
});

fastify.delete('/documents/:id', {
  onRequest: [
    fastify.rbac.authorize({
      action: 'delete',
      extractResource: (req) => ({
        type: 'document',
        id: req.params.id
      })
    })
  ]
}, async (req, res) => {
  // Route handler
});
```

## Service Account Management

### Token Generation
```typescript
import { ServiceAccountManager } from '@rbac-platform/node';

const manager = new ServiceAccountManager({
  managementApiUrl: 'https://api.rbac-platform.com',
  adminToken: process.env.ADMIN_TOKEN
});

// Create service account
const serviceAccount = await manager.createServiceAccount({
  name: 'backend-service-1',
  permissions: ['invoice.read', 'invoice.create']
});

console.log('Service account created:', serviceAccount.token);
```

### Token Refresh
```typescript
const tokenManager = new TokenManager({
  refreshToken: serviceAccount.refresh_token,
  clientId: serviceAccount.client_id
});

// Auto-refresh tokens
const accessToken = await tokenManager.getValidToken();
```

## Testing Utilities

### Mock Client for Testing
```typescript
import { createMockRBACClient } from '@rbac-platform/node/testing';

const mockRbac = createMockRBACClient();

// Configure mock responses
mockRbac.mockCan({
  principalId: 'test-user',
  action: 'read',
  resource: { type: 'document', id: 'test-doc' },
  response: {
    allowed: true,
    reason: 'Test permission granted'
  }
});

// Use in tests
const result = await mockRbac.can('test-user', 'read', {
  type: 'document',
  id: 'test-doc'
});

expect(result.allowed).toBe(true);
```

### Test Helpers
```typescript
import { 
  createTestPrincipal,
  createTestResource,
  createTestPolicy 
} from '@rbac-platform/node/testing';

const principal = createTestPrincipal({
  id: 'user-123',
  tenantId: 'tenant-456'
});

const resource = createTestResource({
  type: 'invoice',
  id: 'inv-789'
});
```

## Performance Optimization

### Connection Pooling
```typescript
const rbac = new RBACClient({
  baseUrl: 'https://api.rbac-platform.com',
  maxConnections: 20,        // HTTP connection pool size
  keepAlive: true,           // Keep connections alive
  keepAliveMsecs: 1000       // Keep-alive timeout
});
```

### Bulk Operations
```typescript
// Efficiently check multiple permissions
const bulkResult = await rbac.checkBulk([
  { principalId: 'user-1', action: 'read', resource: doc1 },
  { principalId: 'user-1', action: 'write', resource: doc1 },
  { principalId: 'user-2', action: 'read', resource: doc2 }
]);

// Results indexed by operation
console.log(bulkResult[0]); // First operation result
```

### Streaming Responses
```typescript
// For large permission sets
for await (const result of rbac.streamPermissions('user-123')) {
  console.log(`Permission: ${result.permission}, Allowed: ${result.allowed}`);
}
```

## Configuration Management

### Environment-Based Configuration
```typescript
import { loadConfig } from '@rbac-platform/node/config';

const config = loadConfig({
  development: {
    baseUrl: 'http://localhost:3000',
    cacheEnabled: true
  },
  production: {
    baseUrl: 'https://api.rbac-platform.com',
    cacheEnabled: true,
    retries: 5
  }
});

const rbac = new RBACClient(config);
```

### Configuration Validation
```typescript
import { validateConfig } from '@rbac-platform/node/config';

try {
  validateConfig({
    baseUrl: 'invalid-url',
    serviceToken: 'short-token'
  });
} catch (error) {
  console.error('Configuration validation failed:', error.message);
}
```

## Monitoring & Observability

### Metrics Collection
```typescript
import { MetricsCollector } from '@rbac-platform/node/metrics';

const collector = new MetricsCollector();

const rbac = new RBACClient({
  baseUrl: 'https://api.rbac-platform.com',
  metricsCollector: collector
});

// Collect metrics
const metrics = collector.getMetrics();
console.log('Authorization latency:', metrics.avgLatency);
console.log('Cache hit ratio:', metrics.cacheHitRatio);
```

### Tracing Integration
```typescript
import { Tracer } from '@opentelemetry/sdk-trace-node';

const tracer = new Tracer();

const rbac = new RBACClient({
  baseUrl: 'https://api.rbac-platform.com',
  tracer: tracer
});

// Spans will automatically be created for authorization calls
```

## Migration Guide

### From v1.x to v2.x
```typescript
// OLD (v1.x)
const allowed = await rbac.checkPermission('user-123', 'invoice.delete');

// NEW (v2.x)
const result = await rbac.can('user-123', 'delete', {
  type: 'invoice',
  id: 'inv-456'
});

if (result.allowed) {
  // Access granted
}
```

### Breaking Changes
- Method names changed for clarity
- Resource structure now required
- Response format standardized
- Error handling improved

## Troubleshooting

### Common Issues

**Timeout Errors**
```bash
# Increase timeout
const rbac = new RBACClient({ timeout: 10000 });
```

**Authentication Failures**
```bash
# Verify token validity
curl -H "Authorization: Bearer $TOKEN" https://api.rbac-platform.com/health
```

**Network Issues**
```typescript
// Enable debug logging
const rbac = new RBACClient({ 
  debug: true,
  logger: console 
});
```

### Debug Mode
```typescript
const rbac = new RBACClient({
  debug: true,
  logger: {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error
  }
});
```

## Support

### Documentation
- [API Reference](https://docs.rbac-platform.com/api)
- [Integration Guides](https://docs.rbac-platform.com/integration)
- [Best Practices](https://docs.rbac-platform.com/best-practices)

### Community
- GitHub Issues: [github.com/rbac-platform/node-sdk/issues](https://github.com/rbac-platform/node-sdk/issues)
- Slack: [rbac-platform.slack.com](https://rbac-platform.slack.com)
- Email: support@rbac-platform.com

### Enterprise Support
For enterprise customers with SLA requirements:
- 24/7 support hotline
- Dedicated customer success manager
- Priority bug fixes
- Custom integration assistance