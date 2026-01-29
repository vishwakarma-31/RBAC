/**
 * RBAC Engine
 * Handles Role-Based Access Control evaluation separately from other authorization models
 */

import { AuthorizationRequest } from '../authorization/AuthorizationEngine';
import { RBACHierarchyManager } from '../rbac/RBACHierarchyManager';

export interface RbacEvaluationResult {
  allowed: boolean;
  reason: string;
  roles?: any[];
}

export class RbacEngine {
  private rbacManager: RBACHierarchyManager;

  constructor() {
    this.rbacManager = new RBACHierarchyManager();
  }

  async evaluate(request: AuthorizationRequest): Promise<RbacEvaluationResult> {
    try {
      // Get principal's roles with inheritance
      const roles = await this.rbacManager.getPrincipalRoles(
        request.principalId, 
        request.tenantId
      );
      
      // Check if any role grants the required permission
      const requiredPermission = `${request.resource.type}.${request.action}`;
      
      for (const role of roles) {
        const permissions = await this.rbacManager.getRolePermissions(role.id);
        if (permissions.some(p => p.name === requiredPermission)) {
          return {
            allowed: true,
            reason: `Granted by role "${role.name}" (Level ${role.level})`,
            roles: roles
          };
        }
      }
      
      return {
        allowed: false,
        reason: `Missing required permission: ${requiredPermission}. Principal has roles: [${roles.map(r => r.name).join(", ")}]`,
        roles: roles
      };
    } catch (error) {
      console.error("RBAC evaluation error:", error);
      return {
        allowed: false,
        reason: "RBAC evaluation failed"
      };
    }
  }
}