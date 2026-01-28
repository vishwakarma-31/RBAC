# Database Infrastructure

PostgreSQL schema and security model for the Authorization Platform.

## Design Goals

- Strong tenant isolation
- Clear role/permission relationships
- Efficient authorization queries
- Auditable authorization history

## Key Characteristics

- UUID primary keys
- Foreign key enforcement
- Row Level Security (RLS)
- Indexed authorization paths

## Core Tables

- tenants
- principals
- roles
- permissions
- role_permissions
- principal_roles
- policies
- audit_logs

Each tenant-scoped table includes a `tenant_id`.

## Row Level Security

- RLS is enabled on all tenant-scoped tables
- Tenant context is injected via `SET app.tenant_id`
- Queries without tenant context are rejected

## Role Hierarchy

- Roles support parent-child relationships
- Recursive CTEs are used for inheritance resolution

## Audit Logs

- Append-only table
- Partitioned by time
- Indexed for tenant and principal queries

## Migrations

Schema changes should be applied via versioned migration scripts.
