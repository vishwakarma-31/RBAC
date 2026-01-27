# Database Infrastructure

PostgreSQL schema design with Row Level Security for multi-tenancy.

## Schema Design Philosophy

### Normalization Approach
- **Fully normalized** to eliminate redundancy
- **UUID primary keys** for global uniqueness
- **Foreign key constraints** for data integrity
- **Index optimization** for authorization queries
- **Partitioning** for large-scale deployments

### Multi-Tenancy Implementation
- **Tenant ID in every table** (no shared tables)
- **Row Level Security (RLS)** policies
- **Tenant-specific indexes**
- **Cross-tenant query prevention**

### Security Considerations
- **Immutable audit fields** (created_at, updated_at)
- **Soft deletes** where appropriate
- **Cryptographic hashing** for sensitive data
- **Encrypted storage** for PII

## Core Tables

### tenants
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
```

### principals
```sql
CREATE TABLE principals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (type IN ('user', 'service_account')),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'suspended')),
    attributes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure unique email per tenant
    UNIQUE(tenant_id, email)
);

-- Indexes
CREATE INDEX idx_principals_tenant_id ON principals(tenant_id);
CREATE INDEX idx_principals_email ON principals(email);
CREATE INDEX idx_principals_status ON principals(status);
CREATE INDEX idx_principals_attributes ON principals USING GIN(attributes);
```

### roles
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 0,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure unique role name per tenant
    UNIQUE(tenant_id, name)
);

-- Indexes
CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX idx_roles_parent_role_id ON roles(parent_role_id);
CREATE INDEX idx_roles_level ON roles(level);
CREATE INDEX idx_roles_system ON roles(is_system_role);
```

### permissions
```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., "invoice.create"
    resource_type VARCHAR(50) NOT NULL, -- e.g., "invoice"
    action VARCHAR(20) NOT NULL, -- e.g., "create"
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure unique permission name per tenant
    UNIQUE(tenant_id, name)
);

-- Indexes
CREATE INDEX idx_permissions_tenant_id ON permissions(tenant_id);
CREATE INDEX idx_permissions_resource_action ON permissions(resource_type, action);
```

### role_permissions
```sql
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate assignments
    UNIQUE(role_id, permission_id)
);

-- Indexes
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
```

### principal_roles
```sql
CREATE TABLE principal_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    principal_id UUID NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES principals(id),
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Prevent duplicate active assignments
    UNIQUE(principal_id, role_id) WHERE (is_active = TRUE)
);

-- Indexes
CREATE INDEX idx_principal_roles_principal_id ON principal_roles(principal_id);
CREATE INDEX idx_principal_roles_role_id ON principal_roles(role_id);
CREATE INDEX idx_principal_roles_active ON principal_roles(is_active);
CREATE INDEX idx_principal_roles_expires_at ON principal_roles(expires_at);
```

### role_constraints
```sql
CREATE TABLE role_constraints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    constraint_type VARCHAR(20) NOT NULL
        CHECK (constraint_type IN ('static_sod', 'dynamic_sod')),
    role_set UUID[] NOT NULL, -- Array of mutually exclusive role IDs
    violation_action VARCHAR(10) NOT NULL DEFAULT 'deny'
        CHECK (violation_action IN ('deny', 'alert')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_role_constraints_tenant_id ON role_constraints(tenant_id);
CREATE INDEX idx_role_constraints_type ON role_constraints(constraint_type);
```

### policies
```sql
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL, -- Semantic versioning
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    rules JSONB NOT NULL, -- Policy rules structure
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'draft')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure unique name-version combination per tenant
    UNIQUE(tenant_id, name, version)
);

-- Indexes
CREATE INDEX idx_policies_tenant_id ON policies(tenant_id);
CREATE INDEX idx_policies_name ON policies(name);
CREATE INDEX idx_policies_priority ON policies(priority);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_rules ON policies USING GIN(rules);
```

### audit_logs
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    principal_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    decision VARCHAR(10) NOT NULL
        CHECK (decision IN ('allowed', 'denied')),
    reason TEXT NOT NULL,
    policy_evaluated VARCHAR(100),
    request_hash VARCHAR(64) NOT NULL, -- SHA-256 hex
    previous_hash VARCHAR(64) NOT NULL, -- SHA-256 hex for chaining
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- Indexes for query performance
CREATE INDEX idx_audit_logs_tenant_timestamp ON audit_logs(tenant_id, timestamp);
CREATE INDEX idx_audit_logs_principal ON audit_logs(principal_id);
CREATE INDEX idx_audit_logs_decision ON audit_logs(decision);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_policy ON audit_logs(policy_evaluated);

-- Partitioning for large-scale deployments
CREATE TABLE audit_logs_template (
    LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Monthly partitions (example)
CREATE TABLE audit_logs_y2024m01 PARTITION OF audit_logs_template
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Row Level Security (RLS) Policies

### Tenant Isolation Policies
```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE principal_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

-- Create application user
CREATE USER authz_app_user WITH PASSWORD 'secure_password';

-- Tenant isolation policy for principals
CREATE POLICY tenant_isolation_principals ON principals
FOR ALL TO authz_app_user
USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Similar policies for other tables...
```

## Recursive Queries for Role Hierarchy

### Get all inherited roles for a principal
```sql
WITH RECURSIVE role_hierarchy AS (
    -- Base case: direct role assignments
    SELECT 
        pr.principal_id,
        r.id as role_id,
        r.name as role_name,
        r.parent_role_id,
        0 as level
    FROM principal_roles pr
    JOIN roles r ON pr.role_id = r.id
    WHERE pr.principal_id = 'principal-uuid'
    AND pr.is_active = TRUE
    AND (pr.expires_at IS NULL OR pr.expires_at > NOW())
    
    UNION ALL
    
    -- Recursive case: inherited roles
    SELECT 
        rh.principal_id,
        r.id as role_id,
        r.name as role_name,
        r.parent_role_id,
        rh.level + 1 as level
    FROM role_hierarchy rh
    JOIN roles r ON rh.parent_role_id = r.id
    WHERE r.parent_role_id IS NOT NULL
)
SELECT DISTINCT role_id, role_name, level
FROM role_hierarchy
ORDER BY level, role_name;
```

## Performance Optimization

### Critical Indexes for Authorization Queries
```sql
-- Composite index for authorization decisions
CREATE INDEX idx_authz_lookup ON principal_roles(principal_id, is_active)
WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW());

-- Index for role hierarchy traversal
CREATE INDEX idx_roles_hierarchy ON roles(parent_role_id, id);

-- Index for permission lookups
CREATE INDEX idx_permission_lookup ON role_permissions(role_id, permission_id);
```

### Materialized Views for Frequently Accessed Data
```sql
-- Pre-computed role hierarchy for performance
CREATE MATERIALIZED VIEW principal_role_hierarchy AS
WITH RECURSIVE role_tree AS (
    -- Implementation similar to above CTE
)
SELECT * FROM role_tree;

-- Refresh strategy
CREATE UNIQUE INDEX idx_principal_role_hierarchy 
ON principal_role_hierarchy(principal_id, role_id);

-- Refresh every 5 minutes
REFRESH MATERIALIZED VIEW CONCURRENTLY principal_role_hierarchy;
```

## Migration Strategy

### Version Control
- Use migration tools (e.g., db-migrate, typeorm migrations)
- Semantic versioning for schema changes
- Backward compatibility for API changes
- Rollback procedures for each migration

### Deployment Process
1. Test migrations in staging environment
2. Backup production database
3. Apply migrations during maintenance window
4. Verify data integrity
5. Monitor performance post-deployment

## Monitoring & Maintenance

### Health Checks
- Connection pool status
- Query performance metrics
- Index usage statistics
- Table bloat analysis

### Regular Maintenance
- Vacuum and analyze schedules
- Index rebuild for fragmented indexes
- Statistics updates
- Partition maintenance