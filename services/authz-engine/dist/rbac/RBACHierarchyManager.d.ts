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
interface RoleConstraint {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    constraintType: 'static_sod' | 'dynamic_sod';
    roleSet: string[];
    violationAction: 'deny' | 'alert';
    createdAt: Date;
    updatedAt: Date;
}
export declare class RBACHierarchyManager {
    private dbPool;
    constructor();
    createRole(tenantId: string, name: string, description?: string, parentRoleId?: string): Promise<Role>;
    getRoles(tenantId: string): Promise<Role[]>;
    getPrincipalRoles(principalId: string, tenantId: string): Promise<Role[]>;
    assignRole(principalId: string, roleId: string, grantedBy: string, tenantId: string): Promise<void>;
    revokeRole(principalId: string, roleId: string, tenantId: string): Promise<void>;
    grantPermission(roleId: string, permissionId: string, tenantId: string): Promise<void>;
    revokePermission(roleId: string, permissionId: string, tenantId: string): Promise<void>;
    getPrincipalPermissions(principalId: string, tenantId: string): Promise<Permission[]>;
    createRoleConstraint(tenantId: string, name: string, roleSet: string[], constraintType: 'static_sod' | 'dynamic_sod', description?: string, violationAction?: 'deny' | 'alert'): Promise<RoleConstraint>;
    private checkRoleConstraintViolation;
    private validateRoleHierarchy;
    setParentRole(roleId: string, parentRoleId: string, tenantId: string): Promise<void>;
    getRoleHierarchy(tenantId: string): Promise<any>;
    private generateId;
    getConstraintViolations(principalId: string, tenantId: string): Promise<string[]>;
    getRolePermissions(roleId: string): Promise<Permission[]>;
}
export {};
//# sourceMappingURL=RBACHierarchyManager.d.ts.map