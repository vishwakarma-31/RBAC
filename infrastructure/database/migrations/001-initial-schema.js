/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create extensions
  pgm.createExtension('uuid-ossp', { ifNotExists: true });
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  // Create tenants table
  pgm.createTable('tenants', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    name: {
      type: 'varchar(255)',
      notNull: true
    },
    slug: {
      type: 'varchar(100)',
      notNull: true,
      unique: true
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'active',
      check: "status IN ('active', 'inactive', 'suspended')"
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Create principals table
  pgm.createTable('principals', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants(id)',
      onDelete: 'CASCADE'
    },
    email: {
      type: 'varchar(255)',
      notNull: true
    },
    name: {
      type: 'varchar(255)',
      notNull: true
    },
    type: {
      type: 'varchar(20)',
      notNull: true,
      default: 'user',
      check: "type IN ('user', 'service_account')"
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'active',
      check: "status IN ('active', 'inactive', 'suspended')"
    },
    attributes: {
      type: 'jsonb',
      notNull: true,
      default: '{}'
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Add unique constraint for email per tenant
  pgm.addConstraint('principals', 'unique_principal_email_per_tenant', {
    unique: ['tenant_id', 'email']
  });

  // Create roles table
  pgm.createTable('roles', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants(id)',
      onDelete: 'CASCADE'
    },
    name: {
      type: 'varchar(100)',
      notNull: true
    },
    description: {
      type: 'text'
    },
    parent_role_id: {
      type: 'uuid',
      references: 'roles(id)',
      onDelete: 'SET NULL'
    },
    level: {
      type: 'integer',
      notNull: true,
      default: 0
    },
    is_system_role: {
      type: 'boolean',
      notNull: true,
      default: false
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Add unique constraint for role name per tenant
  pgm.addConstraint('roles', 'unique_role_name_per_tenant', {
    unique: ['tenant_id', 'name']
  });

  // Create permissions table
  pgm.createTable('permissions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants(id)',
      onDelete: 'CASCADE'
    },
    name: {
      type: 'varchar(100)',
      notNull: true
    },
    resource_type: {
      type: 'varchar(50)',
      notNull: true
    },
    action: {
      type: 'varchar(20)',
      notNull: true
    },
    description: {
      type: 'text'
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Add unique constraint for permission name per tenant
  pgm.addConstraint('permissions', 'unique_permission_name_per_tenant', {
    unique: ['tenant_id', 'name']
  });

  // Create role_permissions table
  pgm.createTable('role_permissions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    role_id: {
      type: 'uuid',
      notNull: true,
      references: 'roles(id)',
      onDelete: 'CASCADE'
    },
    permission_id: {
      type: 'uuid',
      notNull: true,
      references: 'permissions(id)',
      onDelete: 'CASCADE'
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Add unique constraint to prevent duplicate assignments
  pgm.addConstraint('role_permissions', 'unique_role_permission_assignment', {
    unique: ['role_id', 'permission_id']
  });

  // Create principal_roles table
  pgm.createTable('principal_roles', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    principal_id: {
      type: 'uuid',
      notNull: true,
      references: 'principals(id)',
      onDelete: 'CASCADE'
    },
    role_id: {
      type: 'uuid',
      notNull: true,
      references: 'roles(id)',
      onDelete: 'CASCADE'
    },
    granted_by: {
      type: 'uuid',
      notNull: true,
      references: 'principals(id)'
    },
    granted_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    },
    expires_at: {
      type: 'timestamp with time zone'
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true
    }
  });

  // Add unique constraint for active role assignments
  pgm.addConstraint('principal_roles', 'unique_active_principal_role', {
    unique: ['principal_id', 'role_id'],
    where: "is_active = TRUE"
  });

  // Create role_constraints table
  pgm.createTable('role_constraints', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants(id)',
      onDelete: 'CASCADE'
    },
    name: {
      type: 'varchar(100)',
      notNull: true
    },
    description: {
      type: 'text'
    },
    constraint_type: {
      type: 'varchar(20)',
      notNull: true,
      check: "constraint_type IN ('static_sod', 'dynamic_sod')"
    },
    role_set: {
      type: 'uuid[]',
      notNull: true
    },
    violation_action: {
      type: 'varchar(10)',
      notNull: true,
      default: 'deny',
      check: "violation_action IN ('deny', 'alert')"
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Create policies table
  pgm.createTable('policies', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants(id)',
      onDelete: 'CASCADE'
    },
    name: {
      type: 'varchar(100)',
      notNull: true
    },
    version: {
      type: 'varchar(20)',
      notNull: true
    },
    description: {
      type: 'text'
    },
    priority: {
      type: 'integer',
      notNull: true,
      default: 0
    },
    rules: {
      type: 'jsonb',
      notNull: true
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'active',
      check: "status IN ('active', 'inactive', 'draft')"
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Add unique constraint for policy name-version combination
  pgm.addConstraint('policies', 'unique_policy_name_version_per_tenant', {
    unique: ['tenant_id', 'name', 'version']
  });

  // Create audit_logs table (will be partitioned in later migration)
  pgm.createTable('audit_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    tenant_id: {
      type: 'uuid',
      notNull: true
    },
    principal_id: {
      type: 'uuid',
      notNull: true
    },
    action: {
      type: 'varchar(50)',
      notNull: true
    },
    resource_type: {
      type: 'varchar(50)',
      notNull: true
    },
    resource_id: {
      type: 'varchar(100)',
      notNull: true
    },
    decision: {
      type: 'varchar(10)',
      notNull: true,
      check: "decision IN ('allowed', 'denied')"
    },
    reason: {
      type: 'text',
      notNull: true
    },
    policy_evaluated: {
      type: 'varchar(100)'
    },
    request_hash: {
      type: 'varchar(64)',
      notNull: true
    },
    previous_hash: {
      type: 'varchar(64)',
      notNull: true
    },
    timestamp: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('NOW()')
    },
    metadata: {
      type: 'jsonb'
    }
  });

  // Create indexes for performance
  pgm.createIndex('tenants', 'slug');
  pgm.createIndex('tenants', 'status');
  
  pgm.createIndex('principals', 'tenant_id');
  pgm.createIndex('principals', 'email');
  pgm.createIndex('principals', 'status');
  pgm.createIndex('principals', 'attributes', { method: 'GIN' });
  
  pgm.createIndex('roles', 'tenant_id');
  pgm.createIndex('roles', 'parent_role_id');
  pgm.createIndex('roles', 'level');
  pgm.createIndex('roles', 'is_system_role');
  
  pgm.createIndex('permissions', 'tenant_id');
  pgm.createIndex('permissions', ['resource_type', 'action']);
  
  pgm.createIndex('role_permissions', 'role_id');
  pgm.createIndex('role_permissions', 'permission_id');
  
  pgm.createIndex('principal_roles', 'principal_id');
  pgm.createIndex('principal_roles', 'role_id');
  pgm.createIndex('principal_roles', 'is_active');
  pgm.createIndex('principal_roles', 'expires_at');
  
  pgm.createIndex('role_constraints', 'tenant_id');
  pgm.createIndex('role_constraints', 'constraint_type');
  
  pgm.createIndex('policies', 'tenant_id');
  pgm.createIndex('policies', 'name');
  pgm.createIndex('policies', 'priority');
  pgm.createIndex('policies', 'status');
  pgm.createIndex('policies', 'rules', { method: 'GIN' });
  
  pgm.createIndex('audit_logs', ['tenant_id', 'timestamp']);
  pgm.createIndex('audit_logs', 'principal_id');
  pgm.createIndex('audit_logs', 'decision');
  pgm.createIndex('audit_logs', ['resource_type', 'resource_id']);
  pgm.createIndex('audit_logs', 'policy_evaluated');

  // Create updated_at trigger function
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Add triggers for automatic updated_at updates
  pgm.createTrigger('tenants', 'update_tenants_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });

  pgm.createTrigger('principals', 'update_principals_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });

  pgm.createTrigger('roles', 'update_roles_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });

  pgm.createTrigger('permissions', 'update_permissions_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });

  pgm.createTrigger('role_constraints', 'update_role_constraints_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });

  pgm.createTrigger('policies', 'update_policies_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    function: 'update_updated_at_column',
    level: 'ROW'
  });
};

exports.down = (pgm) => {
  // Drop triggers
  pgm.dropTrigger('policies', 'update_policies_updated_at');
  pgm.dropTrigger('role_constraints', 'update_role_constraints_updated_at');
  pgm.dropTrigger('permissions', 'update_permissions_updated_at');
  pgm.dropTrigger('roles', 'update_roles_updated_at');
  pgm.dropTrigger('principals', 'update_principals_updated_at');
  pgm.dropTrigger('tenants', 'update_tenants_updated_at');

  // Drop function
  pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column();');

  // Drop tables in reverse order of creation
  pgm.dropTable('audit_logs');
  pgm.dropTable('policies');
  pgm.dropTable('role_constraints');
  pgm.dropTable('principal_roles');
  pgm.dropTable('role_permissions');
  pgm.dropTable('permissions');
  pgm.dropTable('roles');
  pgm.dropTable('principals');
  pgm.dropTable('tenants');

  // Drop extensions
  pgm.dropExtension('pgcrypto');
  pgm.dropExtension('uuid-ossp');
};