const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function seedDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres_password@localhost:5432/rbac_platform'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create a sample tenant
    const tenantId = uuidv4();
    await client.query(
      'INSERT INTO tenants (id, name, description) VALUES ($1, $2, $3)',
      [tenantId, 'Sample Tenant', 'A sample tenant for testing']
    );
    console.log('Created sample tenant');

    // Create sample principals
    const principalIds = [];
    for (let i = 1; i <= 5; i++) {
      const principalId = uuidv4();
      await client.query(
        'INSERT INTO principals (id, tenant_id, username, email, first_name, last_name, attributes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [principalId, tenantId, `user${i}`, `user${i}@example.com`, `First${i}`, `Last${i}`, JSON.stringify({ department: 'engineering' })]
      );
      principalIds.push(principalId);
    }
    console.log('Created sample principals');

    // Create sample roles
    const roleIds = {};
    const roles = [
      { name: 'admin', description: 'Administrator role' },
      { name: 'manager', description: 'Manager role' },
      { name: 'user', description: 'Standard user role' },
      { name: 'guest', description: 'Guest role' }
    ];

    for (const role of roles) {
      const roleId = uuidv4();
      await client.query(
        'INSERT INTO roles (id, tenant_id, name, description) VALUES ($1, $2, $3, $4)',
        [roleId, tenantId, role.name, role.description]
      );
      roleIds[role.name] = roleId;
    }
    console.log('Created sample roles');

    // Create role hierarchy (admin -> manager -> user)
    await client.query(
      'INSERT INTO role_hierarchy (tenant_id, parent_role_id, child_role_id) VALUES ($1, $2, $3)',
      [tenantId, roleIds.admin, roleIds.manager]
    );
    await client.query(
      'INSERT INTO role_hierarchy (tenant_id, parent_role_id, child_role_id) VALUES ($1, $2, $3)',
      [tenantId, roleIds.manager, roleIds.user]
    );
    console.log('Created role hierarchy');

    // Create sample permissions
    const permissionIds = {};
    const permissions = [
      { name: 'read_documents', resource_type: 'document', action: 'read' },
      { name: 'write_documents', resource_type: 'document', action: 'write' },
      { name: 'delete_documents', resource_type: 'document', action: 'delete' },
      { name: 'manage_users', resource_type: 'user', action: 'manage' },
      { name: 'view_reports', resource_type: 'report', action: 'view' }
    ];

    for (const perm of permissions) {
      const permissionId = uuidv4();
      await client.query(
        'INSERT INTO permissions (id, tenant_id, name, resource_type, action, description) VALUES ($1, $2, $3, $4, $5, $6)',
        [permissionId, tenantId, perm.name, perm.resource_type, perm.action, `${perm.action} ${perm.resource_type}`]
      );
      permissionIds[perm.name] = permissionId;
    }
    console.log('Created sample permissions');

    // Assign permissions to roles
    const rolePermissions = {
      admin: ['manage_users', 'read_documents', 'write_documents', 'delete_documents', 'view_reports'],
      manager: ['read_documents', 'write_documents', 'view_reports'],
      user: ['read_documents'],
      guest: ['read_documents']
    };

    for (const [roleName, permNames] of Object.entries(rolePermissions)) {
      for (const permName of permNames) {
        await client.query(
          'INSERT INTO role_permissions (tenant_id, role_id, permission_id) VALUES ($1, $2, $3)',
          [tenantId, roleIds[roleName], permissionIds[permName]]
        );
      }
    }
    console.log('Assigned permissions to roles');

    // Assign roles to principals
    const principalRoles = {
      0: ['admin'],      // user1 is admin
      1: ['manager'],    // user2 is manager
      2: ['user'],       // user3 is user
      3: ['user'],       // user4 is user
      4: ['guest']       // user5 is guest
    };

    for (let i = 0; i < principalIds.length; i++) {
      const principalId = principalIds[i];
      const roles = principalRoles[i] || ['user'];
      for (const roleName of roles) {
        await client.query(
          'INSERT INTO principal_roles (tenant_id, principal_id, role_id) VALUES ($1, $2, $3)',
          [tenantId, principalId, roleIds[roleName]]
        );
      }
    }
    console.log('Assigned roles to principals');

    // Create sample policies
    const policies = [
      {
        name: 'document-owner-access',
        description: 'Document owners can perform all actions on their documents',
        priority: 100,
        condition: JSON.stringify({
          operator: 'and',
          conditions: [
            {
              attribute: 'resource.owner_id',
              operator: '=',
              value: 'principal.id'
            }
          ]
        }),
        effect: 'allow'
      },
      {
        name: 'department-isolation',
        description: 'Users can only access resources in their department',
        priority: 50,
        condition: JSON.stringify({
          operator: 'and',
          conditions: [
            {
              attribute: 'principal.department',
              operator: '=',
              value: 'resource.department'
            }
          ]
        }),
        effect: 'allow'
      }
    ];

    for (const policy of policies) {
      await client.query(
        'INSERT INTO policies (tenant_id, name, description, priority, condition, effect) VALUES ($1, $2, $3, $4, $5, $6)',
        [tenantId, policy.name, policy.description, policy.priority, policy.condition, policy.effect]
      );
    }
    console.log('Created sample policies');

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = { seedDatabase };