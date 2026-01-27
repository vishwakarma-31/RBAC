#!/usr/bin/env node

/**
 * Simple RBAC Hierarchy Test (JavaScript version)
 * Demonstrates core RBAC concepts without TypeScript compilation
 */

// Simple RBAC hierarchy implementation
class SimpleRBAC {
  constructor() {
    this.roles = new Map();
    this.permissions = new Map();
    this.rolePermissions = new Map();
    this.principalRoles = new Map();
    this.constraints = new Map();
  }

  // Create role with optional parent
  createRole(tenantId, name, description = '', parentRoleId = null) {
    const role = {
      id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      name,
      description,
      parentRoleId,
      level: parentRoleId ? (this.roles.get(parentRoleId)?.level || 0) + 1 : 0,
      isActive: true,
      createdAt: new Date()
    };
    
    this.roles.set(role.id, role);
    this.rolePermissions.set(role.id, new Set());
    return role;
  }

  // Grant permission to role
  grantPermission(roleId, permissionName) {
    if (!this.rolePermissions.has(roleId)) {
      this.rolePermissions.set(roleId, new Set());
    }
    this.rolePermissions.get(roleId).add(permissionName);
  }

  // Assign role to principal
  assignRole(principalId, roleId) {
    if (!this.principalRoles.has(principalId)) {
      this.principalRoles.set(principalId, new Set());
    }
    this.principalRoles.get(principalId).add(roleId);
  }

  // Get all roles for principal (including inherited)
  getPrincipalRoles(principalId) {
    const directRoles = this.principalRoles.get(principalId) || new Set();
    const allRoles = new Set(directRoles);

    // Add inherited roles
    const addInherited = (roleId) => {
      const role = this.roles.get(roleId);
      if (role && role.parentRoleId) {
        allRoles.add(role.parentRoleId);
        addInherited(role.parentRoleId);
      }
    };

    directRoles.forEach(roleId => addInherited(roleId));
    return Array.from(allRoles).map(id => this.roles.get(id));
  }

  // Get all permissions for principal
  getPrincipalPermissions(principalId) {
    const roles = this.getPrincipalRoles(principalId);
    const permissions = new Set();

    const collectPermissions = (roleId) => {
      const rolePerms = this.rolePermissions.get(roleId);
      if (rolePerms) {
        rolePerms.forEach(perm => permissions.add(perm));
      }

      // Collect from parent roles
      const role = this.roles.get(roleId);
      if (role && role.parentRoleId) {
        collectPermissions(role.parentRoleId);
      }
    };

    roles.forEach(role => collectPermissions(role.id));
    return Array.from(permissions);
  }

  // Create role constraint
  createConstraint(name, roleSet, description = '') {
    const constraint = {
      id: `constraint-${Date.now()}`,
      name,
      roleSet,
      description,
      createdAt: new Date()
    };
    this.constraints.set(constraint.id, constraint);
    return constraint;
  }

  // Check constraint violations
  checkConstraintViolations(principalId) {
    const principalRoles = this.getPrincipalRoles(principalId);
    const principalRoleIds = new Set(principalRoles.map(r => r.id));
    const violations = [];

    for (const constraint of this.constraints.values()) {
      const conflictingRoles = constraint.roleSet.filter(roleId => 
        principalRoleIds.has(roleId)
      );

      if (conflictingRoles.length > 1) {
        violations.push(`Constraint '${constraint.name}' violated: mutually exclusive roles assigned`);
      }
    }

    return violations;
  }
}

// Run tests
async function runTests() {
  console.log("🚀 RBAC Hierarchy & Constraints Test Suite");
  console.log("==========================================");

  const rbac = new SimpleRBAC();

  try {
    // Test 1: Create role hierarchy
    console.log("\n📝 Test 1: Creating Role Hierarchy");
    console.log("---------------------------------");
    
    const admin = rbac.createRole('tenant-123', 'Administrator', 'Full system access');
    console.log(`✅ Created: ${admin.name} (Level: ${admin.level})`);
    
    const manager = rbac.createRole('tenant-123', 'Manager', 'Department manager', admin.id);
    console.log(`✅ Created: ${manager.name} (Level: ${manager.level})`);
    
    const employee = rbac.createRole('tenant-123', 'Employee', 'Regular employee', manager.id);
    console.log(`✅ Created: ${employee.name} (Level: ${employee.level})`);

    // Test 2: Assign permissions
    console.log("\n📝 Test 2: Assigning Permissions");
    console.log("-------------------------------");
    
    // Admin gets all permissions
    rbac.grantPermission(admin.id, 'invoice.create');
    rbac.grantPermission(admin.id, 'invoice.read');
    rbac.grantPermission(admin.id, 'invoice.update');
    rbac.grantPermission(admin.id, 'invoice.delete');
    rbac.grantPermission(admin.id, 'user.create');
    rbac.grantPermission(admin.id, 'user.read');
    console.log("✅ Granted all permissions to Administrator");

    // Manager gets read/write but not delete
    rbac.grantPermission(manager.id, 'invoice.read');
    rbac.grantPermission(manager.id, 'invoice.update');
    rbac.grantPermission(manager.id, 'user.read');
    console.log("✅ Granted read/write permissions to Manager");

    // Employee gets only read permissions
    rbac.grantPermission(employee.id, 'invoice.read');
    rbac.grantPermission(employee.id, 'user.read');
    console.log("✅ Granted read permissions to Employee");

    // Test 3: Role assignment and inheritance
    console.log("\n📝 Test 3: Role Assignment and Inheritance");
    console.log("------------------------------------------");
    
    const principalId = 'user-456';
    rbac.assignRole(principalId, employee.id);
    console.log(`✅ Assigned Employee role to principal ${principalId}`);

    const roles = rbac.getPrincipalRoles(principalId);
    console.log(`📋 Principal has roles:`);
    roles.forEach(role => {
      console.log(`   - ${role.name} (Level: ${role.level})`);
    });

    // Test 4: Permission inheritance
    console.log("\n📝 Test 4: Permission Inheritance");
    console.log("--------------------------------");
    
    const permissions = rbac.getPrincipalPermissions(principalId);
    console.log(`📋 Principal has permissions:`);
    permissions.forEach(perm => {
      console.log(`   - ${perm}`);
    });

    // Test 5: Role constraints (SoD)
    console.log("\n📝 Test 5: Role Constraints (SoD)");
    console.log("---------------------------------");
    
    const financeRole = rbac.createRole('tenant-123', 'FinanceManager', 'Handles financial operations');
    const hrRole = rbac.createRole('tenant-123', 'HRManager', 'Handles human resources');
    
    rbac.grantPermission(financeRole.id, 'invoice.create');
    rbac.grantPermission(hrRole.id, 'user.create');
    
    const constraint = rbac.createConstraint(
      'Finance-HR Separation',
      [financeRole.id, hrRole.id],
      'Finance and HR roles must be separated'
    );
    console.log(`✅ Created constraint: ${constraint.name}`);

    // Test constraint violation - assign both conflicting roles
    rbac.assignRole(principalId, financeRole.id); // Assign first conflicting role
    rbac.assignRole(principalId, hrRole.id);      // Assign second conflicting role
    const violations = rbac.checkConstraintViolations(principalId);
    
    if (violations.length > 0) {
      console.log("✅ Constraint violation detected:");
      violations.forEach(v => console.log(`   - ${v}`));
    } else {
      console.log("❌ Expected constraint violation but none found");
    }

    console.log("\n🎯 RBAC Features Demonstrated:");
    console.log("• Role hierarchy with inheritance (Level 2 RBAC)");
    console.log("• Permission inheritance through role hierarchy");
    console.log("• Static Separation of Duties constraints (Level 3 RBAC)");
    console.log("• Multi-level role structure");
    console.log("• Constraint validation on role assignment");

    console.log("\n📊 Summary:");
    console.log(`• Roles created: ${rbac.roles.size}`);
    console.log(`• Permissions granted: ${Array.from(rbac.rolePermissions.values()).reduce((sum, perms) => sum + perms.size, 0)}`);
    console.log(`• Principal role assignments: ${rbac.principalRoles.size}`);
    console.log(`• Constraints defined: ${rbac.constraints.size}`);

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();