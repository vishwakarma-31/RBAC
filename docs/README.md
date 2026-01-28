
# Authorization Platform Documentation

This directory contains technical documentation for the RBAC Authorization Platform.

## Contents

- Architecture overview
- Authorization models
- Integration examples
- API usage
- Operational guidance

## System Overview

The platform consists of three backend services:

- **Authorization Engine** – evaluates authorization decisions
- **Management API** – manages tenants, roles, permissions, and policies
- **Audit Service** – records authorization decisions for compliance and debugging

Supporting infrastructure includes PostgreSQL and Redis.

## Authorization Models

### RBAC
- Flat roles
- Hierarchical roles
- Separation of duties (static constraints)

### ABAC
- Attribute-based conditions on principals and resources

### Policy-Based Rules
- JSON-defined rules evaluated after RBAC/ABAC
- Versioned and prioritized

## Multi-Tenancy

- Every request is scoped to a tenant
- Tenant isolation is enforced at:
  - API level
  - Database level (Row Level Security)
  - Cache level (namespaced keys)

## Integration

The platform is intended to be consumed via SDKs or direct HTTP APIs.
See:
- `/sdk/node`
- OpenAPI specs (where available)

## Disclaimer

This documentation describes intended behavior and interfaces.
Refer to service READMEs for implementation-specific details.
