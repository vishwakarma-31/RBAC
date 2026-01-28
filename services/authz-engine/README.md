# Authorization Engine

Service responsible for evaluating authorization requests.

## Responsibilities

- Evaluate RBAC permissions
- Apply ABAC conditions
- Execute policy rules
- Return allow/deny decisions

## Evaluation Order

1. Validate tenant and request
2. Resolve roles and permissions
3. Apply attribute-based conditions
4. Evaluate policies
5. Return decision

## Performance

- Uses Redis for caching
- Stateless service
- Horizontally scalable

## Integration

- Called by application services
- Logs decisions to Audit Service
