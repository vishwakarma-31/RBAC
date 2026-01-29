-- Performance Indexes for RBAC Platform

-- Indexes for roles table
CREATE INDEX IF NOT EXISTS idx_roles_tenant_id_name ON roles(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_roles_parent_role_id ON roles(parent_role_id) WHERE parent_role_id IS NOT NULL;

-- Indexes for role_permissions table
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Indexes for principal_roles table
CREATE INDEX IF NOT EXISTS idx_principal_roles_principal_id ON principal_roles(principal_id);
CREATE INDEX IF NOT EXISTS idx_principal_roles_role_id ON principal_roles(role_id);

-- Indexes for permissions table
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource_type, action);

-- Composite index for faster authorization lookups
CREATE INDEX IF NOT EXISTS idx_principal_roles_tenant_principal_role ON principal_roles(tenant_id, principal_id, role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant_role_permission ON role_permissions(tenant_id, role_id, permission_id);

-- Index for faster role hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_roles_tenant_parent_child ON roles(tenant_id, parent_role_id, id) WHERE parent_role_id IS NOT NULL;

-- Index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_principal_action ON audit_logs(tenant_id, principal_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type_id ON audit_logs(resource_type, resource_id);