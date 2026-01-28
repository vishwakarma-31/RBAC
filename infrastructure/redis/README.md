# Redis Configuration

Redis is used as a cache for authorization decisions and derived data.

## Usage

Redis stores:
- Authorization decision results
- Role hierarchy lookups
- Policy evaluation data
- Short-lived session data

## Key Design

All keys are namespaced by tenant:

{category}:{tenant_id}:...


Examples:
- authz:{tenant}:{principal}:{action}:{resource}
- role-hierarchy:{tenant}:{principal}

## TTL Strategy

- Authorization decisions: short-lived (minutes)
- Role hierarchy: medium-lived (hours)
- Policies: refreshed on change

## Invalidation

Cache entries are invalidated when:
- Roles are updated
- Permissions change
- Policies are modified

## High Availability

Redis can be deployed with:
- Sentinel (failover)
- Single-node (development)

Cluster mode is optional and environment-specific.