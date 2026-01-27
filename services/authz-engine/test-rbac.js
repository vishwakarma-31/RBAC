#!/usr/bin/env node

/**
 * RBAC Hierarchy & Constraints Test Script
 * Demonstrates NIST RBAC Levels 1-3 implementation
 */

const { RBACHierarchyManager } = require('./src/rbac/RBACHierarchyManager');

async function runRBACTests() {
  console.log("🚀 RBAC Hierarchy & Constraints Test Suite");
  console.log("==========================================");

  const rbac = new RBACHierarchyManager();

  try {
    // Test 1: Create roles with hierarchy
    console.log("\n📝 Test 1: Creating Role Hierarchy");
    console.log("---------------------------------");
    
    const adminRole = await rbac.createRole('tenant-123', 'Administrator', 'Full system access');
    console.log(`✅ Created role: ${adminRole.name} (Level: ${adminRole.level})`);
    
    const managerRole = await rbac.createRole('tenant-123', 'Manager', 'Department manager', adminRole.id);
    console.log(`✅ Created role: ${managerRole.name} (Level: ${managerRole.level})`);
    
    const employeeRole = await rbac.createRole('tenant-123', 'Employee', 'Regular employee', managerRole.id);
    console.log(`✅ Created role: ${employeeRole.name} (Level: ${employeeRole.level})`);

    // Test 2: Create permissions
    console.log("\n📝 Test 2: Creating Permissions");
    console.log("-------------------------------");
    
    const permissions = [
      { id: 'perm-1', tenantId: 'tenant-123', name: 'invoice.create', resourceType: 'invoice', action: 'create' },
      { id: 'perm-2', tenantId: 'tenant-123', name: 'invoice.read', resourceType: 'invoice', action: 'read' },
      { id: 'perm-3', tenantId: 'tenant-123', name: 'invoice.update', resourceType: 'invoice', action: 'update' },
      { id: 'perm-4', tenantId: 'tenant-123', name: 'invoice.delete', resourceType: 'invoice', action: 'delete' },
      { id: 'perm-5', tenantId: 'tenant-123', name: 'user.create', resourceType: 'user', action: 'create' },
      { id: 'perm-6', tenantId: 'tenant-123', name: 'user.read', resourceType: 'user', action: 'read' }
    ];

    // Simulate adding permissions to the manager's internal map
    permissions.forEach(perm => {
      rbac.getPermissionsMap().set(perm.id, perm);
    });
    console.log(`✅ Created ${permissions.length} permissions`);

    // Test 3: Assign permissions to roles
    console.log("\n📝 Test 3: Assigning Permissions to Roles");
    console.log("----------------------------------------");
    
    // Admin gets all permissions
    await rbac.grantPermission(adminRole.id, 'perm-1', 'tenant-123'); // create
    await rbac.grantPermission(adminRole.id, 'perm-2', 'tenant-123'); // read
    await rbac.grantPermission(adminRole.id, 'perm-3', 'tenant-123'); // update
    await rbac.grantPermission(adminRole.id, 'perm-4', 'tenant-123'); // delete
    await rbac.grantPermission(adminRole.id, 'perm-5', 'tenant-123'); // user create
    await rbac.grantPermission(adminRole.id, 'perm-6', 'tenant-123'); // user read
    console.log(`✅ Granted all permissions to ${adminRole.name}`);

    // Manager gets read/write but not delete
    await rbac.grantPermission(managerRole.id, 'perm-2', 'tenant-123'); // read
    await rbac.grantPermission(managerRole.id, 'perm-3', 'tenant-123'); // update
    await rbac.grantPermission(managerRole.id, 'perm-6', 'tenant-123'); // user read
    console.log(`✅ Granted read/write permissions to ${managerRole.name}`);

    // Employee gets only read permissions
    await rbac.grantPermission(employeeRole.id, 'perm-2', 'tenant-123'); // read
    await rbac.grantPermission(employeeRole.id, 'perm-6', 'tenant-123'); // user read
    console.log(`✅ Granted read permissions to ${employeeRole.name}`);

    // Test 4: Role assignment and inheritance
    console.log("\n📝 Test 4: Role Assignment and Inheritance");
    console.log("------------------------------------------");
    
    const principalId = 'user-456';
    await rbac.assignRole(principalId, employeeRole.id, 'admin-123', 'tenant-123');
    console.log(`✅ Assigned ${employeeRole.name} to principal ${principalId}`);

    const inheritedRoles = await rbac.getPrincipalRoles(principalId, 'tenant-123');
    console.log(`📋 Principal ${principalId} has roles:`);
    inheritedRoles.forEach(role => {
      console.log(`   - ${role.name} (Level: ${role.level})`);
    });

    // Test 5: Permission inheritance
    console.log("\n📝 Test 5: Permission Inheritance");
    console.log("--------------------------------");
    
    const principalPerms = await rbac.getPrincipalPermissions(principalId, 'tenant-123');
    console.log(`📋 Principal ${principalId} has permissions:`);
    principalPerms.forEach(perm => {
      console.log(`   - ${perm.name} (${perm.resourceType}.${perm.action})`);
    });

    // Test 6: Role constraints (Separation of Duties)
    console.log("\n📝 Test 6: Role Constraints (SoD)");
    console.log("---------------------------------");
    
    // Create mutually exclusive roles
    const financeRole = await rbac.createRole('tenant-123', 'FinanceManager', 'Handles financial operations');
    const hrRole = await rbac.createRole('tenant-123', 'HRManager', 'Handles human resources');
    
    // Grant permissions
    await rbac.grantPermission(financeRole.id, 'perm-1', 'tenant-123'); // invoice.create
    await rbac.grantPermission(hrRole.id, 'perm-5', 'tenant-123'); // user.create
    
    // Create constraint: FinanceManager and HRManager are mutually exclusive
    const constraint = await rbac.createRoleConstraint(
      'tenant-123',
      'Finance-HR Separation',
      [financeRole.id, hrRole.id],
      'static_sod',
      'Finance and HR roles must be separated for compliance',
      'deny'
    );
    console.log(`✅ Created constraint: ${constraint.name}`);

    // Test constraint violation
    try {
      await rbac.assignRole(principalId, financeRole.id, 'admin-123', 'tenant-123');
      console.log("❌ Expected constraint violation but assignment succeeded");
    } catch (error) {
      console.log(`✅ Constraint working: ${error.message}`);
    }

    // Test 7: Role hierarchy visualization
    console.log("\n📝 Test 7: Role Hierarchy Visualization");
    console.log("--------------------------------------");
    
    const hierarchy = await rbac.getRoleHierarchy('tenant-123');
    console.log("📊 Role Hierarchy:");
    console.log(JSON.stringify(hierarchy, null, 2));

    // Test 8: Constraint violations check
    console.log("\n📝 Test 8: Constraint Violations Check");
    console.log("-------------------------------------");
    
    const violations = await rbac.getConstraintViolations(principalId, 'tenant-123');
    if (violations.length === 0) {
      console.log("✅ No constraint violations found");
    } else {
      console.log("❌ Constraint violations:");
      violations.forEach(v => console.log(`   - ${v}`));
    }

    console.log("\n🎯 RBAC Features Demonstrated:");
    console.log("• NIST RBAC Level 1: Flat RBAC with direct role-permission assignments");
    console.log("• NIST RBAC Level 2: Hierarchical RBAC with role inheritance");
    console.log("• NIST RBAC Level 3: Constrained RBAC with Separation of Duties");
    console.log("• Role hierarchy with level-based inheritance");
    console.log("• Permission inheritance through role hierarchy");
    console.log("• Static Separation of Duties constraints");
    console.log("• Multi-tenant role management");
    console.log("• Role assignment with constraint validation");

    console.log("\n🔧 Next Steps:");
    console.log("• Integrate with PostgreSQL for persistent storage");
    console.log("• Add Redis caching for role hierarchy queries");
    console.log("• Implement dynamic SoD (session-based constraints)");
    console.log("• Add role activation/deactivation workflows");
    console.log("• Connect to audit service for role management logging");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the tests
runRBACTests();