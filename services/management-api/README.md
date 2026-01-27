# Management API Service

RESTful API for managing tenants, principals, roles, permissions, and policies.

## Responsibilities

- Tenant lifecycle management (create, update, suspend)
- Principal management (users and service accounts)
- Role creation and hierarchy management
- Permission definition and assignment
- Role constraint definition (SoD rules)
- Policy creation and version management
- Audit log querying and export
- System configuration management

## Architecture

```
├── src/
│   ├── controllers/            # REST endpoint handlers
│   │   ├── tenant.controller.ts
│   │   ├── principal.controller.ts
│   │   ├── role.controller.ts
│   │   ├── permission.controller.ts
│   │   ├── policy.controller.ts
│   │   └── audit.controller.ts
│   ├── services/               # Business logic layer
│   │   ├── tenant.service.ts
│   │   ├── principal.service.ts
│   │   ├── role.service.ts
│   │   ├── permission.service.ts
│   │   ├── policy.service.ts
│   │   └── audit.service.ts
│   ├── repositories/           # Data access layer
│   │   ├── tenant.repository.ts
│   │   ├── principal.repository.ts
│   │   ├── role.repository.ts
│   │   ├── permission.repository.ts
│   │   ├── policy.repository.ts
│   │   └── audit.repository.ts
│   ├── middleware/             # Authentication, validation, etc.
│   ├── validators/             # Input validation schemas
│   └── types/                  # Service-specific types
├── tests/                      # Unit and integration tests
└── Dockerfile                  # Container definition
```

## Security Model

### Authentication
- JWT-based service-to-service authentication
- Tenant-scoped tokens for isolation
- System-level tokens for platform administration

### Authorization
- Built-in authorization using the Authz Engine
- Self-hosted authorization for administrative operations
- Principle of least privilege for service accounts

### Validation
- Comprehensive input validation
- Output sanitization
- SQL injection prevention
- Rate limiting

## API Design Principles

### RESTful Design
- Resource-oriented URLs
- Standard HTTP methods
- Proper status codes
- HATEOAS where applicable

### Tenant Isolation
- Every request scoped to tenant
- Automatic tenant context propagation
- Cross-tenant access strictly prohibited

### Idempotency
- POST operations are idempotent where possible
- PUT operations fully replace resources
- DELETE operations are idempotent

## Core Endpoints

### Tenants
```
POST   /tenants                    # Create tenant
GET    /tenants                    # List tenants
GET    /tenants/:id                # Get tenant
PUT    /tenants/:id                # Update tenant
DELETE /tenants/:id                # Delete tenant
```

### Principals
```
POST   /tenants/:tenantId/principals
GET    /tenants/:tenantId/principals
GET    /tenants/:tenantId/principals/:id
PUT    /tenants/:tenantId/principals/:id
DELETE /tenants/:tenantId/principals/:id
```

### Roles
```
POST   /tenants/:tenantId/roles
GET    /tenants/:tenantId/roles
GET    /tenants/:tenantId/roles/:id
PUT    /tenants/:tenantId/roles/:id
DELETE /tenants/:tenantId/roles/:id
POST   /tenants/:tenantId/roles/:id/hierarchy  # Set parent role
```

### Permissions
```
POST   /tenants/:tenantId/permissions
GET    /tenants/:tenantId/permissions
GET    /tenants/:tenantId/permissions/:id
PUT    /tenants/:tenantId/permissions/:id
DELETE /tenants/:tenantId/permissions/:id
POST   /tenants/:tenantId/roles/:roleId/permissions  # Assign permission
DELETE /tenants/:tenantId/roles/:roleId/permissions/:permissionId
```

### Role Constraints
```
POST   /tenants/:tenantId/constraints
GET    /tenants/:tenantId/constraints
GET    /tenants/:tenantId/constraints/:id
PUT    /tenants/:tenantId/constraints/:id
DELETE /tenants/:tenantId/constraints/:id
```

### Policies
```
POST   /tenants/:tenantId/policies
GET    /tenants/:tenantId/policies
GET    /tenants/:tenantId/policies/:id
PUT    /tenants/:tenantId/policies/:id
DELETE /tenants/:tenantId/policies/:id
POST   /tenants/:tenantId/policies/:id/versions  # Create new version
```

### Audit Logs
```
GET    /tenants/:tenantId/audit-logs
GET    /tenants/:tenantId/audit-logs/:id
POST   /tenants/:tenantId/audit-logs/export  # Export for compliance
```

## Performance Considerations

- Database connection pooling
- Query optimization and indexing
- Pagination for large result sets
- Caching of frequently accessed data
- Background processing for exports

## Error Handling

Standardized error responses:
```json
{
  "code": "TENANT_NOT_FOUND",
  "message": "Tenant with ID 'xxx' not found",
  "details": {
    "tenantId": "xxx"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Rate Limiting

- Management API: 100 requests/minute per tenant
- Burst allowance: 200 requests/minute
- Configurable per deployment

## Monitoring & Observability

- Structured logging
- Metrics collection (Prometheus format)
- Health check endpoints
- Distributed tracing support