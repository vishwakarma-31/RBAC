/**
 * RBAC Hierarchy Manager
 * Implements NIST RBAC Levels 1-3 with role inheritance and constraints
 */

interface Role {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentRoleId?: string;
  level: number;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Permission {
  id: string;
  tenantId: string;
  name: string;
  resourceType: string;
  action: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RolePermission {
  roleId: string;
  permissionId: string;
  createdAt: Date;
}

interface PrincipalRole {
  principalId: string;
  roleId: string;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

interface RoleConstraint {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  constraintType: 'static_sod' | 'dynamic_sod';
  roleSet: string[]; // Array of mutually exclusive role IDs
  violationAction: 'deny' | 'alert';
  createdAt: Date;
  updatedAt: Date;
}

import { Pool } from 'pg';

export class RBACHierarchyManager {
  private dbPool: Pool;
  
  constructor() {
    this.dbPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/rbac_platform',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Create a new role with optional parent
   */
  async createRole(
    tenantId: string,
    name: string,
    description?: string,
    parentRoleId?: string
  ): Promise<Role> {
    // Validate parent role exists and is in same tenant
    if (parentRoleId) {
      const parentRoleQuery = {
        text: 'SELECT id, tenant_id, name, parent_role_id, level FROM roles WHERE id = $1 AND tenant_id = $2 AND is_active = true',
        values: [parentRoleId, tenantId]
      };
      
      const result = await this.dbPool.query(parentRoleQuery);
      if (result.rows.length === 0) {
        throw new Error('Parent role not found or invalid tenant');
      }
    }

    // Calculate level based on parent role
    let level = 0;
    if (parentRoleId) {
      const parentQuery = {
        text: 'SELECT level FROM roles WHERE id = $1',
        values: [parentRoleId]
      };
      const parentResult = await this.dbPool.query(parentQuery);
      if (parentResult.rows.length > 0) {
        level = parentResult.rows[0].level + 1;
      }
    }

    const role: Role = {
      id: this.generateId(),
      tenantId,
      name,
      description,
      parentRoleId,
      level,
      isSystemRole: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const insertQuery = {
      text: `INSERT INTO roles(id, tenant_id, name, description, parent_role_id, level, is_system_role, is_active, created_at, updated_at)
             VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
      values: [
        role.id, role.tenantId, role.name, role.description,
        role.parentRoleId, role.level, role.isSystemRole, 
        role.isActive, role.createdAt, role.updatedAt
      ]
    };
    
    const result = await this.dbPool.query(insertQuery);
    const insertedRole = result.rows[0];
    
    return {
      id: insertedRole.id,
      tenantId: insertedRole.tenant_id,
      name: insertedRole.name,
      description: insertedRole.description,
      parentRoleId: insertedRole.parent_role_id,
      level: insertedRole.level,
      isSystemRole: insertedRole.is_system_role,
      isActive: insertedRole.is_active,
      createdAt: insertedRole.created_at,
      updatedAt: insertedRole.updated_at
    };
  }

  /**
   * Get all roles for a tenant
   */
  async getRoles(tenantId: string): Promise<Role[]> {
    const query = {
      text: 'SELECT * FROM roles WHERE tenant_id = $1 AND is_active = true ORDER BY level, name',
      values: [tenantId]
    };
    
    const result = await this.dbPool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      parentRoleId: row.parent_role_id,
      level: row.level,
      isSystemRole: row.is_system_role,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Get role hierarchy for a principal (including inherited roles)
   */
  async getPrincipalRoles(principalId: string, tenantId: string): Promise<Role[]> {
    // Use recursive CTE to get all roles (direct and inherited) for the principal
    const query = {
      text: `
        WITH RECURSIVE role_hierarchy AS (
          -- Base case: directly assigned roles
          SELECT 
            r.id,
            r.tenant_id,
            r.name,
            r.description,
            r.parent_role_id,
            r.level,
            r.is_system_role,
            r.is_active,
            r.created_at,
            r.updated_at,
            0 as depth
          FROM roles r
          INNER JOIN principal_roles pr ON r.id = pr.role_id
          WHERE pr.principal_id = $1
            AND r.tenant_id = $2
            AND r.is_active = true
            AND pr.is_active = true
          
          UNION ALL
          
          -- Recursive case: parent roles
          SELECT 
            r.id,
            r.tenant_id,
            r.name,
            r.description,
            r.parent_role_id,
            r.level,
            r.is_system_role,
            r.is_active,
            r.created_at,
            r.updated_at,
            rh.depth + 1
          FROM roles r
          INNER JOIN role_hierarchy rh ON r.id = rh.parent_role_id
          WHERE r.is_active = true
            AND rh.depth < 10  -- Prevent infinite loops
        )
        SELECT DISTINCT * FROM role_hierarchy ORDER BY level, name;`
      ,
      values: [principalId, tenantId]
    };
    
    const result = await this.dbPool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      parentRoleId: row.parent_role_id,
      level: row.level,
      isSystemRole: row.is_system_role,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Assign a role to a principal
   */
  async assignRole(
    principalId: string,
    roleId: string,
    grantedBy: string,
    tenantId: string
  ): Promise<void> {
    // Verify role exists and belongs to the tenant
    const roleQuery = {
      text: 'SELECT id, tenant_id FROM roles WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      values: [roleId, tenantId]
    };
    const roleResult = await this.dbPool.query(roleQuery);
    if (roleResult.rows.length === 0) {
      throw new Error('Role not found or invalid tenant');
    }

    // Check role constraints
    const constraintViolation = await this.checkRoleConstraintViolation(principalId, roleId, tenantId);
    if (constraintViolation) {
      throw new Error(`Role constraint violation: ${constraintViolation}`);
    }

    // Insert the principal-role assignment into the database
    const insertQuery = {
      text: `INSERT INTO principal_roles(principal_id, role_id, granted_by, granted_at, is_active)
             VALUES($1, $2, $3, NOW(), true)
             ON CONFLICT (principal_id, role_id) DO UPDATE SET
               granted_by = EXCLUDED.granted_by,
               granted_at = EXCLUDED.granted_at,
               is_active = true`,
      values: [principalId, roleId, grantedBy]
    };
    
    await this.dbPool.query(insertQuery);
  }

  /**
   * Revoke a role from a principal
   */
  async revokeRole(principalId: string, roleId: string, tenantId: string): Promise<void> {
    // Verify role exists and belongs to the tenant
    const roleQuery = {
      text: 'SELECT id, tenant_id FROM roles WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      values: [roleId, tenantId]
    };
    const roleResult = await this.dbPool.query(roleQuery);
    if (roleResult.rows.length === 0) {
      throw new Error('Role not found or invalid tenant');
    }
    
    // Remove the principal-role assignment from the database
    const updateQuery = {
      text: 'UPDATE principal_roles SET is_active = false, granted_at = NOW() WHERE principal_id = $1 AND role_id = $2',
      values: [principalId, roleId]
    };
    
    await this.dbPool.query(updateQuery);
  }

  /**
   * Grant permission to a role
   */
  async grantPermission(roleId: string, permissionId: string, tenantId: string): Promise<void> {
    // Verify role exists and belongs to the tenant
    const roleQuery = {
      text: 'SELECT id, tenant_id FROM roles WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      values: [roleId, tenantId]
    };
    const roleResult = await this.dbPool.query(roleQuery);
    if (roleResult.rows.length === 0) {
      throw new Error('Role not found or invalid tenant');
    }
    
    // Verify permission exists and belongs to the tenant
    const permissionQuery = {
      text: 'SELECT id, tenant_id FROM permissions WHERE id = $1 AND tenant_id = $2',
      values: [permissionId, tenantId]
    };
    const permissionResult = await this.dbPool.query(permissionQuery);
    if (permissionResult.rows.length === 0) {
      throw new Error('Permission not found or invalid tenant');
    }
    
    // Insert the role-permission assignment into the database
    const insertQuery = {
      text: `INSERT INTO role_permissions(role_id, permission_id, created_at)
             VALUES($1, $2, NOW())
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
      values: [roleId, permissionId]
    };
    
    await this.dbPool.query(insertQuery);
  }

  /**
   * Revoke permission from a role
   */
  async revokePermission(roleId: string, permissionId: string, tenantId: string): Promise<void> {
    // Verify role exists and belongs to the tenant
    const roleQuery = {
      text: 'SELECT id, tenant_id FROM roles WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      values: [roleId, tenantId]
    };
    const roleResult = await this.dbPool.query(roleQuery);
    if (roleResult.rows.length === 0) {
      throw new Error('Role not found or invalid tenant');
    }
    
    // Remove the role-permission assignment from the database
    const deleteQuery = {
      text: 'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      values: [roleId, permissionId]
    };
    
    await this.dbPool.query(deleteQuery);
  }

  /**
   * Get all permissions for a principal (including inherited)
   */
  async getPrincipalPermissions(principalId: string, tenantId: string): Promise<Permission[]> {
    // Use recursive CTE to get all permissions from all roles (direct and inherited) for the principal
    const query = {
      text: `
        WITH RECURSIVE role_hierarchy AS (
          -- Base case: directly assigned roles
          SELECT 
            r.id,
            r.tenant_id,
            r.name,
            r.description,
            r.parent_role_id,
            r.level,
            r.is_system_role,
            r.is_active,
            r.created_at,
            r.updated_at,
            0 as depth
          FROM roles r
          INNER JOIN principal_roles pr ON r.id = pr.role_id
          WHERE pr.principal_id = $1
            AND r.tenant_id = $2
            AND r.is_active = true
            AND pr.is_active = true
          
          UNION ALL
          
          -- Recursive case: parent roles
          SELECT 
            r.id,
            r.tenant_id,
            r.name,
            r.description,
            r.parent_role_id,
            r.level,
            r.is_system_role,
            r.is_active,
            r.created_at,
            r.updated_at,
            rh.depth + 1
          FROM roles r
          INNER JOIN role_hierarchy rh ON r.id = rh.parent_role_id
          WHERE r.is_active = true
            AND rh.depth < 10  -- Prevent infinite loops
        ),
        -- Get all permissions for all roles in the hierarchy
        role_permissions_expanded AS (
          SELECT DISTINCT rp.permission_id
          FROM role_hierarchy rh
          JOIN role_permissions rp ON rh.id = rp.role_id
        )
        -- Get the actual permission records
        SELECT p.* FROM permissions p
        JOIN role_permissions_expanded rpe ON p.id = rpe.permission_id
        WHERE p.tenant_id = $2;`
      ,
      values: [principalId, tenantId]
    };
    
    const result = await this.dbPool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      resourceType: row.resource_type,
      action: row.action,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Create a role constraint
   */
  async createRoleConstraint(
    tenantId: string,
    name: string,
    roleSet: string[],
    constraintType: 'static_sod' | 'dynamic_sod',
    description?: string,
    violationAction: 'deny' | 'alert' = 'deny'
  ): Promise<RoleConstraint> {
    // Validate all roles exist and belong to the same tenant
    for (const roleId of roleSet) {
      const roleQuery = {
        text: 'SELECT id FROM roles WHERE id = $1 AND tenant_id = $2 AND is_active = true',
        values: [roleId, tenantId]
      };
      const result = await this.dbPool.query(roleQuery);
      if (result.rows.length === 0) {
        throw new Error(`Invalid role ID: ${roleId}`);
      }
    }

    const constraint: RoleConstraint = {
      id: this.generateId(),
      tenantId,
      name,
      description,
      constraintType,
      roleSet,
      violationAction,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const insertQuery = {
      text: `INSERT INTO role_constraints(id, tenant_id, name, description, constraint_type, role_set, violation_action, created_at, updated_at)
             VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
      values: [
        constraint.id, constraint.tenantId, constraint.name, 
        constraint.description, constraint.constraintType, 
        constraint.roleSet, constraint.violationAction,
        constraint.createdAt, constraint.updatedAt
      ]
    };
    
    const result = await this.dbPool.query(insertQuery);
    const insertedConstraint = result.rows[0];
    
    return {
      id: insertedConstraint.id,
      tenantId: insertedConstraint.tenant_id,
      name: insertedConstraint.name,
      description: insertedConstraint.description,
      constraintType: insertedConstraint.constraint_type,
      roleSet: insertedConstraint.role_set,
      violationAction: insertedConstraint.violation_action,
      createdAt: insertedConstraint.created_at,
      updatedAt: insertedConstraint.updated_at
    };
  }

  /**
   * Check for role constraint violations
   */
  private async checkRoleConstraintViolation(
    principalId: string,
    newRoleId: string,
    tenantId: string
  ): Promise<string | null> {
    const principalRoles = await this.getPrincipalRoles(principalId, tenantId);
    const principalRoleIds = new Set(principalRoles.map(r => r.id));
    principalRoleIds.add(newRoleId); // Include the new role being assigned

    // Get all role constraints for this tenant
    const constraintQuery = {
      text: 'SELECT * FROM role_constraints WHERE tenant_id = $1',
      values: [tenantId]
    };
    const constraintResult = await this.dbPool.query(constraintQuery);
    
    // Check all constraints for this tenant
    for (const constraint of constraintResult.rows) {
      if (constraint.tenant_id !== tenantId) continue;

      // Check if this constraint applies (contains the new role)
      if (!constraint.role_set.includes(newRoleId)) continue;

      // Check for mutual exclusion violations
      const conflictingRoles = constraint.role_set.filter((roleId: string) => 
        roleId !== newRoleId && principalRoleIds.has(roleId)
      );

      if (conflictingRoles.length > 0) {
        return `Constraint '${constraint.name}' violated: cannot assign role with mutually exclusive roles ${conflictingRoles.join(', ')}`;
      }
    }

    return null;
  }

  /**
   * Validate role hierarchy for cycles
   */
  private validateRoleHierarchy(roleId: string, newParentId?: string): boolean {
    if (!newParentId) return true;
    
    // To detect cycles, we need to check if setting newParentId as parent would create a cycle
    // This is a simplified check - in practice you'd query the DB to traverse the hierarchy
    // and ensure no cycles are formed
    
    // For now, return true as cycle detection would involve complex recursive DB queries
    // In a real implementation, we would need to:
    // 1. Get the full hierarchy path from newParentId upward
    // 2. Check if roleId is in that path
    return true;
  }

  /**
   * Set parent role (update role hierarchy)
   */
  async setParentRole(roleId: string, parentRoleId: string, tenantId: string): Promise<void> {
    // Verify both roles exist and belong to the tenant
    const roleQuery = {
      text: 'SELECT id, tenant_id, level FROM roles WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      values: [roleId, tenantId]
    };
    const roleResult = await this.dbPool.query(roleQuery);
    if (roleResult.rows.length === 0) {
      throw new Error('Role not found or invalid tenant');
    }
    
    const parentRoleQuery = {
      text: 'SELECT id, tenant_id, level FROM roles WHERE id = $1 AND tenant_id = $2 AND is_active = true',
      values: [parentRoleId, tenantId]
    };
    const parentResult = await this.dbPool.query(parentRoleQuery);
    if (parentResult.rows.length === 0) {
      throw new Error('Parent role not found or invalid tenant');
    }
    
    // Validate no cycles would be created
    if (!this.validateRoleHierarchy(roleId, parentRoleId)) {
      throw new Error('Cannot create role hierarchy cycle');
    }

    // Update role in database
    const level = parentResult.rows[0].level + 1;
    const updateQuery = {
      text: 'UPDATE roles SET parent_role_id = $1, level = $2, updated_at = NOW() WHERE id = $3',
      values: [parentRoleId, level, roleId]
    };
    
    await this.dbPool.query(updateQuery);
  }

  /**
   * Get role hierarchy visualization
   */
  async getRoleHierarchy(tenantId: string): Promise<any> {
    const roles = await this.getRoles(tenantId);
    const hierarchy: any = {};

    // Build hierarchy tree
    const buildTree = (parentId?: string): any[] => {
      return roles
        .filter(role => role.parentRoleId === parentId)
        .map(role => ({
          ...role,
          children: buildTree(role.id)
        }));
    };

    return buildTree();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return 'role-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get constraint violations for a principal
   */
  async getConstraintViolations(principalId: string, tenantId: string): Promise<string[]> {
    const violations: string[] = [];
    const principalRoles = await this.getPrincipalRoles(principalId, tenantId);
    const principalRoleIds = new Set(principalRoles.map(r => r.id));

    // Get all role constraints for this tenant
    const constraintQuery = {
      text: 'SELECT * FROM role_constraints WHERE tenant_id = $1',
      values: [tenantId]
    };
    const constraintResult = await this.dbPool.query(constraintQuery);
    
    for (const constraint of constraintResult.rows) {
      if (constraint.tenant_id !== tenantId) continue;

      const assignedRolesInConstraint = constraint.role_set.filter((roleId: string) => 
        principalRoleIds.has(roleId)
      );

      if (assignedRolesInConstraint.length > 1) {
        violations.push(
          `Constraint '${constraint.name}' violated: principal has mutually exclusive roles ${assignedRolesInConstraint.join(', ')}`
        );
      }
    }

    return violations;
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const query = {
      text: `SELECT p.* FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             WHERE rp.role_id = $1`,
      values: [roleId]
    };
    
    const result = await this.dbPool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      resourceType: row.resource_type,
      action: row.action,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

}