#!/usr/bin/env node

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config();

async function seedDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/rbac_platform',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Set tenant context for system operations
    await client.query("SELECT set_tenant_context('00000000-0000-0000-0000-000000000000');");

    // Create system tenant
    const systemTenantId = uuidv4();
    await client.query(`
      INSERT INTO tenants (id, name, slug, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug) DO NOTHING;
    `, [systemTenantId, 'System Tenant', 'system', 'active']);

    console.log('Created system tenant');

    // Create system principal
    const systemPrincipalId = uuidv4();
    await client.query(`
      INSERT INTO principals (id, tenant_id, email, name, type, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING;
    `, [systemPrincipalId, systemTenantId, 'system@rbac-platform.com', 'System Administrator', 'user', 'active']);

    console.log('Created system principal');

    // Create default system roles
    const systemRoles = [
      { name: 'system:root', description: 'Root system administrator with all permissions', level: 0 },
      { name: 'system:admin', description: 'System administrator', level: 1 },
      { name: 'system:auditor', description: 'Compliance auditor', level: 1 },
      { name: 'system:operator', description: 'System operator', level: 2 }
    ];

    const roleIds = {};
    for (const role of systemRoles) {
      const roleId = uuidv4();
      await client.query(`
        INSERT INTO roles (id, tenant_id, name, description, level, is_system_role)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
        RETURNING id;
      `, [roleId, systemTenantId, role.name, role.description, role.level, true]);
      
      roleIds[role.name] = roleId;
      console.log(`Created role: ${role.name}`);
    }

    // Create default permissions
    const defaultPermissions = [
      // Tenant management
      { name: 'tenant.create', resource_type: 'tenant', action: 'create', description: 'Create new tenants' },
      { name: 'tenant.read', resource_type: 'tenant', action: 'read', description: 'Read tenant information' },
      { name: 'tenant.update', resource_type: 'tenant', action: 'update', description: 'Update tenant settings' },
      { name: 'tenant.delete', resource_type: 'tenant', action: 'delete', description: 'Delete tenants' },
      
      // Principal management
      { name: 'principal.create', resource_type: 'principal', action: 'create', description: 'Create principals' },
      { name: 'principal.read', resource_type: 'principal', action: 'read', description: 'Read principal information' },
      { name: 'principal.update', resource_type: 'principal', action: 'update', description: 'Update principals' },
      { name: 'principal.delete', resource_type: 'principal', action: 'delete', description: 'Delete principals' },
      
      // Role management
      { name: 'role.create', resource_type: 'role', action: 'create', description: 'Create roles' },
      { name: 'role.read', resource_type: 'role', action: 'read', description: 'Read roles' },
      { name: 'role.update', resource_type: 'role', action: 'update', description: 'Update roles' },
      { name: 'role.delete', resource_type: 'role', action: 'delete', description: 'Delete roles' },
      { name: 'role.assign', resource_type: 'role', action: 'assign', description: 'Assign roles to principals' },
      { name: 'role.revoke', resource_type: 'role', action: 'revoke', description: 'Revoke roles from principals' },
      
      // Permission management
      { name: 'permission.create', resource_type: 'permission', action: 'create', description: 'Create permissions' },
      { name: 'permission.read', resource_type: 'permission', action: 'read', description: 'Read permissions' },
      { name: 'permission.update', resource_type: 'permission', action: 'update', description: 'Update permissions' },
      { name: 'permission.delete', resource_type: 'permission', action: 'delete', description: 'Delete permissions' },
      { name: 'permission.grant', resource_type: 'permission', action: 'grant', description: 'Grant permissions to roles' },
      { name: 'permission.revoke', resource_type: 'permission', action: 'revoke', description: 'Revoke permissions from roles' },
      
      // Policy management
      { name: 'policy.create', resource_type: 'policy', action: 'create', description: 'Create policies' },
      { name: 'policy.read', resource_type: 'policy', action: 'read', description: 'Read policies' },
      { name: 'policy.update', resource_type: 'policy', action: 'update', description: 'Update policies' },
      { name: 'policy.delete', resource_type: 'policy', action: 'delete', description: 'Delete policies' },
      { name: 'policy.version', resource_type: 'policy', action: 'version', description: 'Create policy versions' },
      
      // Audit management
      { name: 'audit.read', resource_type: 'audit_log', action: 'read', description: 'Read audit logs' },
      { name: 'audit.export', resource_type: 'audit_log', action: 'export', description: 'Export audit logs' },
      
      // Authorization decisions
      { name: 'authorization.evaluate', resource_type: 'authorization', action: 'evaluate', description: 'Evaluate authorization decisions' }
    ];

    const permissionIds = {};
    for (const perm of defaultPermissions) {
      const permId = uuidv4();
      await client.query(`
        INSERT INTO permissions (id, tenant_id, name, resource_type, action, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
        RETURNING id;
      `, [permId, systemTenantId, perm.name, perm.resource_type, perm.action, perm.description]);
      
      permissionIds[perm.name] = permId;
      console.log(`Created permission: ${perm.name}`);
    }

    // Assign permissions to roles
    const rolePermissions = {
      'system:root': Object.keys(permissionIds), // All permissions
      'system:admin': [
        'tenant.read', 'tenant.update',
        'principal.create', 'principal.read', 'principal.update', 'principal.delete',
        'role.create', 'role.read', 'role.update', 'role.delete', 'role.assign', 'role.revoke',
        'permission.read', 'permission.grant', 'permission.revoke',
        'policy.create', 'policy.read', 'policy.update', 'policy.delete', 'policy.version',
        'audit.read', 'audit.export',
        'authorization.evaluate'
      ],
      'system:auditor': [
        'tenant.read',
        'principal.read',
        'role.read',
        'permission.read',
        'policy.read',
        'audit.read', 'audit.export'
      ],
      'system:operator': [
        'tenant.read',
        'principal.read',
        'role.read',
        'permission.read',
        'policy.read',
        'authorization.evaluate'
      ]
    };

    for (const [roleName, perms] of Object.entries(rolePermissions)) {
      const roleId = roleIds[roleName];
      if (!roleId) continue;
      
      for (const permName of perms) {
        const permId = permissionIds[permName];
        if (!permId) continue;
        
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, [roleId, permId]);
      }
      console.log(`Assigned permissions to role: ${roleName}`);
    }

    // Assign root role to system principal
    await client.query(`
      INSERT INTO principal_roles (principal_id, role_id, granted_by, is_active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING;
    `, [systemPrincipalId, roleIds['system:root'], systemPrincipalId, true]);

    console.log('Assigned root role to system principal');

    // Create sample tenant for demonstration
    const demoTenantId = uuidv4();
    await client.query(`
      INSERT INTO tenants (id, name, slug, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (slug) DO NOTHING;
    `, [demoTenantId, 'Demo Company', 'demo-company', 'active']);

    // Create sample principals for demo tenant
    const demoPrincipals = [
      { email: 'admin@demo-company.com', name: 'Demo Administrator' },
      { email: 'manager@demo-company.com', name: 'Demo Manager' },
      { email: 'employee@demo-company.com', name: 'Demo Employee' }
    ];

    const demoPrincipalIds = [];
    for (const principal of demoPrincipals) {
      const principalId = uuidv4();
      await client.query(`
        INSERT INTO principals (id, tenant_id, email, name, type, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
        RETURNING id;
      `, [principalId, demoTenantId, principal.email, principal.name, 'user', 'active']);
      
      demoPrincipalIds.push(principalId);
      console.log(`Created demo principal: ${principal.email}`);
    }

    // Create demo roles
    const demoRoles = [
      { name: 'CompanyAdmin', description: 'Company administrator', level: 0 },
      { name: 'DepartmentManager', description: 'Department manager', level: 1 },
      { name: 'Employee', description: 'Regular employee', level: 2 }
    ];

    const demoRoleIds = {};
    for (const role of demoRoles) {
      const roleId = uuidv4();
      await client.query(`
        INSERT INTO roles (id, tenant_id, name, description, level, is_system_role)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
        RETURNING id;
      `, [roleId, demoTenantId, role.name, role.description, role.level, false]);
      
      demoRoleIds[role.name] = roleId;
      console.log(`Created demo role: ${role.name}`);
    }

    // Set role hierarchy
    await client.query(`
      UPDATE roles 
      SET parent_role_id = $1 
      WHERE id = $2;
    `, [demoRoleIds['CompanyAdmin'], demoRoleIds['DepartmentManager']]);

    await client.query(`
      UPDATE roles 
      SET parent_role_id = $1 
      WHERE id = $2;
    `, [demoRoleIds['DepartmentManager'], demoRoleIds['Employee']]);

    console.log('Set role hierarchy');

    // Assign demo roles to principals
    await client.query(`
      INSERT INTO principal_roles (principal_id, role_id, granted_by, is_active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING;
    `, [demoPrincipalIds[0], demoRoleIds['CompanyAdmin'], demoPrincipalIds[0], true]);

    await client.query(`
      INSERT INTO principal_roles (principal_id, role_id, granted_by, is_active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING;
    `, [demoPrincipalIds[1], demoRoleIds['DepartmentManager'], demoPrincipalIds[0], true]);

    await client.query(`
      INSERT INTO principal_roles (principal_id, role_id, granted_by, is_active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING;
    `, [demoPrincipalIds[2], demoRoleIds['Employee'], demoPrincipalIds[1], true]);

    console.log('Assigned demo roles to principals');

    // Create sample permissions for demo tenant
    const demoPermissions = [
      { name: 'invoice.create', resource_type: 'invoice', action: 'create' },
      { name: 'invoice.read', resource_type: 'invoice', action: 'read' },
      { name: 'invoice.update', resource_type: 'invoice', action: 'update' },
      { name: 'invoice.delete', resource_type: 'invoice', action: 'delete' },
      { name: 'document.create', resource_type: 'document', action: 'create' },
      { name: 'document.read', resource_type: 'document', action: 'read' },
      { name: 'document.update', resource_type: 'document', action: 'update' },
      { name: 'document.delete', resource_type: 'document', action: 'delete' }
    ];

    const demoPermissionIds = {};
    for (const perm of demoPermissions) {
      const permId = uuidv4();
      await client.query(`
        INSERT INTO permissions (id, tenant_id, name, resource_type, action)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
        RETURNING id;
      `, [permId, demoTenantId, perm.name, perm.resource_type, perm.action]);
      
      demoPermissionIds[`${perm.resource_type}.${perm.action}`] = permId;
    }

    // Assign permissions to demo roles
    // CompanyAdmin gets all permissions
    for (const permId of Object.values(demoPermissionIds)) {
      await client.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
      `, [demoRoleIds['CompanyAdmin'], permId]);
    }

    // DepartmentManager gets read/write but not delete
    const managerPerms = Object.entries(demoPermissionIds)
      .filter(([key]) => !key.endsWith('.delete'))
      .map(([, id]) => id);
    
    for (const permId of managerPerms) {
      await client.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
      `, [demoRoleIds['DepartmentManager'], permId]);
    }

    // Employee gets only read permissions
    const employeePerms = Object.entries(demoPermissionIds)
      .filter(([key]) => key.endsWith('.read'))
      .map(([, id]) => id);
    
    for (const permId of employeePerms) {
      await client.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
      `, [demoRoleIds['Employee'], permId]);
    }

    console.log('Assigned demo permissions to roles');

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Default credentials:');
    console.log('- System Admin: system@rbac-platform.com');
    console.log('- Demo Admin: admin@demo-company.com');
    console.log('- Demo Manager: manager@demo-company.com');
    console.log('- Demo Employee: employee@demo-company.com');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };