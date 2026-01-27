#!/usr/bin/env node

// Debug version to check constraint logic
class SimpleRBAC {
  constructor() {
    this.roles = new Map();
    this.rolePermissions = new Map();
    this.principalRoles = new Map();
    this.constraints = new Map();
  }

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

  assignRole(principalId, roleId) {
    if (!this.principalRoles.has(principalId)) {
      this.principalRoles.set(principalId, new Set());
    }
    this.principalRoles.get(principalId).add(roleId);
    console.log(`Assigned role ${roleId} to principal ${principalId}`);
  }

  createConstraint(name, roleSet, description = '') {
    const constraint = {
      id: `constraint-${Date.now()}`,
      name,
      roleSet,
      description,
      createdAt: new Date()
    };
    this.constraints.set(constraint.id, constraint);
    console.log(`Created constraint ${name} with roles: ${roleSet.join(', ')}`);
    return constraint;
  }

  checkConstraintViolations(principalId) {
    const directRoles = this.principalRoles.get(principalId) || new Set();
    console.log(`Principal ${principalId} has direct roles: ${Array.from(directRoles).join(', ')}`);
    
    const violations = [];

    for (const constraint of this.constraints.values()) {
      console.log(`Checking constraint: ${constraint.name}`);
      console.log(`Constraint role set: ${constraint.roleSet.join(', ')}`);
      
      const conflictingRoles = constraint.roleSet.filter(roleId => {
        const hasRole = directRoles.has(roleId);
        console.log(`  Role ${roleId}: ${hasRole ? 'ASSIGNED' : 'NOT ASSIGNED'}`);
        return hasRole;
      });

      console.log(`Conflicting roles found: ${conflictingRoles.length}`);
      if (conflictingRoles.length > 1) {
        violations.push(`Constraint '${constraint.name}' violated: mutually exclusive roles assigned`);
      }
    }

    return violations;
  }
}

// Debug test
const rbac = new SimpleRBAC();

const financeRole = rbac.createRole('tenant-123', 'FinanceManager');
const hrRole = rbac.createRole('tenant-123', 'HRManager');

const constraint = rbac.createConstraint(
  'Finance-HR Separation',
  [financeRole.id, hrRole.id],
  'Finance and HR roles must be separated'
);

const principalId = 'user-456';
rbac.assignRole(principalId, financeRole.id);
rbac.assignRole(principalId, hrRole.id);

console.log('\n--- Checking violations ---');
const violations = rbac.checkConstraintViolations(principalId);
console.log('Violations:', violations);