# Authorization Engine Service

The core authorization decision engine that evaluates access requests in real-time.

## Responsibilities

- Evaluate authorization requests against RBAC, ABAC, and policy rules
- Provide sub-5ms decision latency through intelligent caching
- Generate detailed decision explanations for audit and debugging
- Handle role hierarchy traversal and inheritance
- Enforce role constraints (Separation of Duties)
- Integrate with audit service for compliance logging

## Architecture

```
├── src/
│   ├── authorization/          # Core authorization logic
│   │   ├── evaluator.ts        # Main decision evaluator
│   │   ├── rbac-engine.ts      # RBAC evaluation
│   │   ├── abac-engine.ts      # ABAC evaluation
│   │   └── policy-engine.ts    # Policy evaluation
│   ├── cache/                  # Redis caching layer
│   ├── tenant/                 # Tenant context management
│   └── types/                  # Service-specific types
├── tests/                      # Unit and integration tests
└── Dockerfile                  # Container definition
```

## Key Components

### Decision Evaluator
Orchestrates the authorization decision process:
1. Validate request and tenant context
2. Check cache for existing decisions
3. Evaluate RBAC permissions
4. Apply ABAC conditions
5. Execute policy rules (highest precedence)
6. Generate explainable response
7. Log decision to audit service
8. Cache result for performance

### RBAC Engine
Implements NIST RBAC Levels 1-3:
- **Level 1 (Flat)**: Direct role-permission assignments
- **Level 2 (Hierarchical)**: Role inheritance with parent-child relationships
- **Level 3 (Constrained)**: Static and dynamic separation of duties

### ABAC Engine
Evaluates attribute-based conditions:
- Resource attributes (`resource.owner_id == principal.id`)
- Principal attributes (`principal.department == "finance"`)
- Context attributes (time-based, IP-based, etc.)

### Policy Engine
Executes JSON-based policies with deterministic evaluation:
- Boolean expression trees
- Versioned policy management
- Priority-based conflict resolution
- Explainable evaluation traces

## Performance Targets

- **Latency**: <5ms for cached decisions, <50ms for uncached
- **Throughput**: 10,000+ requests/second
- **Cache Hit Rate**: >95%
- **Availability**: 99.99%

## Security Considerations

- Zero-trust tenant isolation
- Immutable audit trails
- Cryptographic request hashing
- Defense-in-depth validation
- Rate limiting and DoS protection

## Integration Points

- **Management API**: Fetch roles, permissions, policies
- **Audit Service**: Log authorization decisions
- **Redis**: Cache authorization decisions
- **PostgreSQL**: Persistent storage (through Management API)

## API Endpoints

```
POST /authorize
GET /health
GET /metrics
```

See OpenAPI specification for detailed schemas.