"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACHierarchyManager = void 0;
const pg_1 = require("pg");
class RBACHierarchyManager {
    constructor() {
        this.dbPool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/rbac_platform',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }
    async createRole(tenantId, name, description, parentRoleId) {
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
        const role = {
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
    async getRoles(tenantId) {
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
    async getPrincipalRoles(principalId, tenantId) {
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
        SELECT DISTINCT * FROM role_hierarchy ORDER BY level, name;`,
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
    async assignRole(principalId, roleId, grantedBy, tenantId) {
        const roleQuery = {
            text: 'SELECT id, tenant_id FROM roles WHERE id = $1 AND tenant_id = $2 AND is_active = true',
            values: [roleId, tenantId]
        };
        const roleResult = await this.dbPool.query(roleQuery);
        if (roleResult.rows.length === 0) {
            throw new Error('Role not found or invalid tenant');
        }
        const constraintViolation = await this.checkRoleConstraintViolation(principalId, roleId, tenantId);
        if (constraintViolation) {
            throw new Error(`Role constraint violation: ${constraintViolation}`);
        }
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
    async revokeRole(principalId, roleId, tenantId) {
        const roleQuery = {
            text: 'SELECT id, tenant_id FROM roles WHERE id = $1 AND tenant_id = $2 AND is_active = true',
            values: [roleId, tenantId]
        };
        const roleResult = await this.dbPool.query(roleQuery);
        if (roleResult.rows.length === 0) {
            throw new Error('Role not found or invalid tenant');
        }
        const updateQuery = {
            text: 'UPDATE principal_roles SET is_active = false, granted_at = NOW() WHERE principal_id = $1 AND role_id = $2',
            values: [principalId, roleId]
        };
        await this.dbPool.query(updateQuery);
    }
    async grantPermission(roleId, permissionId, tenantId) {
        const roleQuery = {
            text: 'SELECT id, tenant_id FROM roles WHERE id = $1 AND tenant_id = $2 AND is_active = true',
            values: [roleId, tenantId]
        };
        const roleResult = await this.dbPool.query(roleQuery);
        if (roleResult.rows.length === 0) {
            throw new Error('Role not found or invalid tenant');
        }
        const permissionQuery = {
            text: 'SELECT id, tenant_id FROM permissions WHERE id = $1 AND tenant_id = $2',
            values: [permissionId, tenantId]
        };
        const permissionResult = await this.dbPool.query(permissionQuery);
        if (permissionResult.rows.length === 0) {
            throw new Error('Permission not found or invalid tenant');
        }
        const insertQuery = {
            text: `INSERT INTO role_permissions(role_id, permission_id, created_at)
             VALUES($1, $2, NOW())
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
            values: [roleId, permissionId]
        };
        await this.dbPool.query(insertQuery);
    }
    async revokePermission(roleId, permissionId, tenantId) {
        const roleQuery = {
            text: 'SELECT id, tenant_id FROM roles WHERE id = $1 AND tenant_id = $2 AND is_active = true',
            values: [roleId, tenantId]
        };
        const roleResult = await this.dbPool.query(roleQuery);
        if (roleResult.rows.length === 0) {
            throw new Error('Role not found or invalid tenant');
        }
        const deleteQuery = {
            text: 'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
            values: [roleId, permissionId]
        };
        await this.dbPool.query(deleteQuery);
    }
    async getPrincipalPermissions(principalId, tenantId) {
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
        WHERE p.tenant_id = $2;`,
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
    async createRoleConstraint(tenantId, name, roleSet, constraintType, description, violationAction = 'deny') {
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
        const constraint = {
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
    async checkRoleConstraintViolation(principalId, newRoleId, tenantId) {
        const principalRoles = await this.getPrincipalRoles(principalId, tenantId);
        const principalRoleIds = new Set(principalRoles.map(r => r.id));
        principalRoleIds.add(newRoleId);
        const constraintQuery = {
            text: 'SELECT * FROM role_constraints WHERE tenant_id = $1',
            values: [tenantId]
        };
        const constraintResult = await this.dbPool.query(constraintQuery);
        for (const constraint of constraintResult.rows) {
            if (constraint.tenant_id !== tenantId)
                continue;
            if (!constraint.role_set.includes(newRoleId))
                continue;
            const conflictingRoles = constraint.role_set.filter((roleId) => roleId !== newRoleId && principalRoleIds.has(roleId));
            if (conflictingRoles.length > 0) {
                return `Constraint '${constraint.name}' violated: cannot assign role with mutually exclusive roles ${conflictingRoles.join(', ')}`;
            }
        }
        return null;
    }
    validateRoleHierarchy(roleId, newParentId) {
        if (!newParentId)
            return true;
        return true;
    }
    async setParentRole(roleId, parentRoleId, tenantId) {
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
        if (!this.validateRoleHierarchy(roleId, parentRoleId)) {
            throw new Error('Cannot create role hierarchy cycle');
        }
        const level = parentResult.rows[0].level + 1;
        const updateQuery = {
            text: 'UPDATE roles SET parent_role_id = $1, level = $2, updated_at = NOW() WHERE id = $3',
            values: [parentRoleId, level, roleId]
        };
        await this.dbPool.query(updateQuery);
    }
    async getRoleHierarchy(tenantId) {
        const roles = await this.getRoles(tenantId);
        const hierarchy = {};
        const buildTree = (parentId) => {
            return roles
                .filter(role => role.parentRoleId === parentId)
                .map(role => ({
                ...role,
                children: buildTree(role.id)
            }));
        };
        return buildTree();
    }
    generateId() {
        return 'role-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    async getConstraintViolations(principalId, tenantId) {
        const violations = [];
        const principalRoles = await this.getPrincipalRoles(principalId, tenantId);
        const principalRoleIds = new Set(principalRoles.map(r => r.id));
        const constraintQuery = {
            text: 'SELECT * FROM role_constraints WHERE tenant_id = $1',
            values: [tenantId]
        };
        const constraintResult = await this.dbPool.query(constraintQuery);
        for (const constraint of constraintResult.rows) {
            if (constraint.tenant_id !== tenantId)
                continue;
            const assignedRolesInConstraint = constraint.role_set.filter((roleId) => principalRoleIds.has(roleId));
            if (assignedRolesInConstraint.length > 1) {
                violations.push(`Constraint '${constraint.name}' violated: principal has mutually exclusive roles ${assignedRolesInConstraint.join(', ')}`);
            }
        }
        return violations;
    }
    async getRolePermissions(roleId) {
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
exports.RBACHierarchyManager = RBACHierarchyManager;
//# sourceMappingURL=RBACHierarchyManager.js.map