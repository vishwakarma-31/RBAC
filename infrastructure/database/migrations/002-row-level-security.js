/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Enable Row Level Security on tenant-scoped tables
  pgm.sql('ALTER TABLE principals ENABLE ROW LEVEL SECURITY;');
  pgm.sql('ALTER TABLE roles ENABLE ROW LEVEL SECURITY;');
  pgm.sql('ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;');
  pgm.sql('ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;');
  pgm.sql('ALTER TABLE principal_roles ENABLE ROW LEVEL SECURITY;');
  pgm.sql('ALTER TABLE role_constraints ENABLE ROW LEVEL SECURITY;');
  pgm.sql('ALTER TABLE policies ENABLE ROW LEVEL SECURITY;');

  // Create application user for services
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authz_app_user') THEN
        CREATE USER authz_app_user WITH PASSWORD 'secure_application_password';
      END IF;
    END
    $$;
  `);

  // Grant necessary permissions to application user
  pgm.sql('GRANT USAGE ON SCHEMA public TO authz_app_user;');
  pgm.sql('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authz_app_user;');
  pgm.sql('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authz_app_user;');
  
  // Set default privileges for future tables
  pgm.sql('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authz_app_user;');
  pgm.sql('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authz_app_user;');

  // Create tenant isolation policies for each table

  // Principals table RLS policy
  pgm.sql(`
    CREATE POLICY tenant_isolation_principals ON principals
    FOR ALL TO authz_app_user
    USING (tenant_id = current_setting('app.tenant_id')::UUID)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
  `);

  // Roles table RLS policy
  pgm.sql(`
    CREATE POLICY tenant_isolation_roles ON roles
    FOR ALL TO authz_app_user
    USING (tenant_id = current_setting('app.tenant_id')::UUID)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
  `);

  // Permissions table RLS policy
  pgm.sql(`
    CREATE POLICY tenant_isolation_permissions ON permissions
    FOR ALL TO authz_app_user
    USING (tenant_id = current_setting('app.tenant_id')::UUID)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
  `);

  // Role_permissions table RLS policy
  pgm.sql(`
    CREATE POLICY tenant_isolation_role_permissions ON role_permissions
    FOR ALL TO authz_app_user
    USING (
      EXISTS (
        SELECT 1 FROM roles r 
        WHERE r.id = role_permissions.role_id 
        AND r.tenant_id = current_setting('app.tenant_id')::UUID
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM roles r 
        WHERE r.id = role_permissions.role_id 
        AND r.tenant_id = current_setting('app.tenant_id')::UUID
      )
    );
  `);

  // Principal_roles table RLS policy
  pgm.sql(`
    CREATE POLICY tenant_isolation_principal_roles ON principal_roles
    FOR ALL TO authz_app_user
    USING (
      EXISTS (
        SELECT 1 FROM principals p 
        WHERE p.id = principal_roles.principal_id 
        AND p.tenant_id = current_setting('app.tenant_id')::UUID
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM principals p 
        WHERE p.id = principal_roles.principal_id 
        AND p.tenant_id = current_setting('app.tenant_id')::UUID
      )
    );
  `);

  // Role_constraints table RLS policy
  pgm.sql(`
    CREATE POLICY tenant_isolation_role_constraints ON role_constraints
    FOR ALL TO authz_app_user
    USING (tenant_id = current_setting('app.tenant_id')::UUID)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
  `);

  // Policies table RLS policy
  pgm.sql(`
    CREATE POLICY tenant_isolation_policies ON policies
    FOR ALL TO authz_app_user
    USING (tenant_id = current_setting('app.tenant_id')::UUID)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
  `);

  // Create system user for cross-tenant operations (admin functions)
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authz_system_user') THEN
        CREATE USER authz_system_user WITH PASSWORD 'secure_system_password';
      END IF;
    END
    $$;
  `);

  pgm.sql('GRANT USAGE ON SCHEMA public TO authz_system_user;');
  pgm.sql('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authz_system_user;');
  pgm.sql('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authz_system_user;');
  pgm.sql('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authz_system_user;');
  pgm.sql('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authz_system_user;');

  // Create bypass RLS policies for system user
  pgm.sql(`
    CREATE POLICY system_access_principals ON principals
    FOR ALL TO authz_system_user
    USING (true)
    WITH CHECK (true);
  `);

  pgm.sql(`
    CREATE POLICY system_access_roles ON roles
    FOR ALL TO authz_system_user
    USING (true)
    WITH CHECK (true);
  `);

  pgm.sql(`
    CREATE POLICY system_access_permissions ON permissions
    FOR ALL TO authz_system_user
    USING (true)
    WITH CHECK (true);
  `);

  pgm.sql(`
    CREATE POLICY system_access_role_permissions ON role_permissions
    FOR ALL TO authz_system_user
    USING (true)
    WITH CHECK (true);
  `);

  pgm.sql(`
    CREATE POLICY system_access_principal_roles ON principal_roles
    FOR ALL TO authz_system_user
    USING (true)
    WITH CHECK (true);
  `);

  pgm.sql(`
    CREATE POLICY system_access_role_constraints ON role_constraints
    FOR ALL TO authz_system_user
    USING (true)
    WITH CHECK (true);
  `);

  pgm.sql(`
    CREATE POLICY system_access_policies ON policies
    FOR ALL TO authz_system_user
    USING (true)
    WITH CHECK (true);
  `);

  // Create helper functions for tenant context management
  pgm.sql(`
    CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
    RETURNS VOID AS $$
    BEGIN
      PERFORM set_config('app.tenant_id', tenant_uuid::TEXT, false);
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION get_current_tenant()
    RETURNS UUID AS $$
    BEGIN
      RETURN current_setting('app.tenant_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create function to get all roles for a principal (including inherited)
  pgm.sql(`
    CREATE OR REPLACE FUNCTION get_principal_roles(principal_uuid UUID)
    RETURNS TABLE(role_id UUID, role_name VARCHAR(100), level INTEGER) AS $$
    BEGIN
      RETURN QUERY
      WITH RECURSIVE role_hierarchy AS (
        -- Base case: direct role assignments
        SELECT 
          pr.principal_id,
          r.id as role_id,
          r.name as role_name,
          r.level,
          ARRAY[r.id] as path
        FROM principal_roles pr
        JOIN roles r ON pr.role_id = r.id
        WHERE pr.principal_id = principal_uuid
        AND pr.is_active = TRUE
        AND (pr.expires_at IS NULL OR pr.expires_at > NOW())
        AND r.tenant_id = get_current_tenant()
        
        UNION ALL
        
        -- Recursive case: inherited roles
        SELECT 
          rh.principal_id,
          r.id as role_id,
          r.name as role_name,
          r.level,
          rh.path || r.id
        FROM role_hierarchy rh
        JOIN roles r ON rh.role_id = r.parent_role_id
        WHERE r.parent_role_id IS NOT NULL
        AND NOT r.id = ANY(rh.path) -- Prevent cycles
        AND r.tenant_id = get_current_tenant()
      )
      SELECT DISTINCT rh.role_id, rh.role_name, rh.level
      FROM role_hierarchy rh
      ORDER BY rh.level, rh.role_name;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create function to get all permissions for a principal
  pgm.sql(`
    CREATE OR REPLACE FUNCTION get_principal_permissions(principal_uuid UUID)
    RETURNS TABLE(
      permission_id UUID,
      permission_name VARCHAR(100),
      resource_type VARCHAR(50),
      action VARCHAR(20)
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT DISTINCT
        p.id as permission_id,
        p.name as permission_name,
        p.resource_type,
        p.action
      FROM get_principal_roles(principal_uuid) pr
      JOIN role_permissions rp ON pr.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE p.tenant_id = get_current_tenant();
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create function to check role constraint violations
  pgm.sql(`
    CREATE OR REPLACE FUNCTION check_role_constraint_violation(
      principal_uuid UUID,
      new_role_uuid UUID
    )
    RETURNS TABLE(
      constraint_id UUID,
      constraint_name VARCHAR(100),
      violation_type VARCHAR(20)
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        rc.id as constraint_id,
        rc.name as constraint_name,
        rc.constraint_type as violation_type
      FROM role_constraints rc
      WHERE rc.tenant_id = get_current_tenant()
      AND new_role_uuid = ANY(rc.role_set)
      AND EXISTS (
        SELECT 1
        FROM get_principal_roles(principal_uuid) pr
        WHERE pr.role_id = ANY(rc.role_set)
      );
    END;
    $$ LANGUAGE plpgsql;
  `);
};

exports.down = (pgm) => {
  // Drop helper functions
  pgm.sql('DROP FUNCTION IF EXISTS check_role_constraint_violation(UUID, UUID);');
  pgm.sql('DROP FUNCTION IF EXISTS get_principal_permissions(UUID);');
  pgm.sql('DROP FUNCTION IF EXISTS get_principal_roles(UUID);');
  pgm.sql('DROP FUNCTION IF EXISTS get_current_tenant();');
  pgm.sql('DROP FUNCTION IF EXISTS set_tenant_context(UUID);');

  // Drop system user policies
  pgm.sql('DROP POLICY IF EXISTS system_access_policies ON policies;');
  pgm.sql('DROP POLICY IF EXISTS system_access_role_constraints ON role_constraints;');
  pgm.sql('DROP POLICY IF EXISTS system_access_principal_roles ON principal_roles;');
  pgm.sql('DROP POLICY IF EXISTS system_access_role_permissions ON role_permissions;');
  pgm.sql('DROP POLICY IF EXISTS system_access_permissions ON permissions;');
  pgm.sql('DROP POLICY IF EXISTS system_access_roles ON roles;');
  pgm.sql('DROP POLICY IF EXISTS system_access_principals ON principals;');

  // Drop tenant isolation policies
  pgm.sql('DROP POLICY IF EXISTS tenant_isolation_policies ON policies;');
  pgm.sql('DROP POLICY IF EXISTS tenant_isolation_role_constraints ON role_constraints;');
  pgm.sql('DROP POLICY IF EXISTS tenant_isolation_principal_roles ON principal_roles;');
  pgm.sql('DROP POLICY IF EXISTS tenant_isolation_role_permissions ON role_permissions;');
  pgm.sql('DROP POLICY IF EXISTS tenant_isolation_permissions ON permissions;');
  pgm.sql('DROP POLICY IF EXISTS tenant_isolation_roles ON roles;');
  pgm.sql('DROP POLICY IF EXISTS tenant_isolation_principals ON principals;');

  // Revoke permissions and drop users
  pgm.sql('REVOKE ALL PRIVILEGES ON SCHEMA public FROM authz_system_user;');
  pgm.sql('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authz_system_user;');
  pgm.sql('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM authz_system_user;');
  pgm.sql('DROP USER IF EXISTS authz_system_user;');

  pgm.sql('REVOKE ALL PRIVILEGES ON SCHEMA public FROM authz_app_user;');
  pgm.sql('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authz_app_user;');
  pgm.sql('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM authz_app_user;');
  pgm.sql('DROP USER IF EXISTS authz_app_user;');

  // Disable Row Level Security
  pgm.sql('ALTER TABLE policies DISABLE ROW LEVEL SECURITY;');
  pgm.sql('ALTER TABLE role_constraints DISABLE ROW LEVEL SECURITY;');
  pgm.sql('ALTER TABLE principal_roles DISABLE ROW LEVEL SECURITY;');
  pgm.sql('ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;');
  pgm.sql('ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;');
  pgm.sql('ALTER TABLE roles DISABLE ROW LEVEL SECURITY;');
  pgm.sql('ALTER TABLE principals DISABLE ROW LEVEL SECURITY;');
};