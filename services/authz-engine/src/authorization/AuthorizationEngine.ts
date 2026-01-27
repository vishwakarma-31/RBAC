// Authorization Engine - Core Decision Logic

export interface AuthorizationRequest {
  tenantId: string;
  principalId: string;
  action: string;
  resource: {
    type: string;
    id: string;
    attributes?: Record<string, any>;
  };
  principal?: {
    id: string;
    attributes?: Record<string, any>;
  };
  context?: Record<string, any>;
}

export interface AuthorizationResponse {
  allowed: boolean;
  reason: string;
  policy_evaluated?: string;
  failed_conditions?: string[];
  explanation: string;
  evaluated_at: Date;
  cache_hit?: boolean;
}

import { RedisCacheManager } from "../cache/RedisCacheManager";
import { RBACHierarchyManager } from "../rbac/RBACHierarchyManager";
import { PolicyEngine, PolicyEvaluationContext } from "../policy/PolicyEngine";

export class AuthorizationEngine {
  private cache: RedisCacheManager;
  private rbacManager: RBACHierarchyManager;
  private policyEngine: PolicyEngine;

  /**
   * Main authorization decision method
   */
  constructor() {
    this.cache = new RedisCacheManager({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || "0"),
      ttl: {
        authorization: parseInt(process.env.CACHE_TTL_AUTHORIZATION || "300"),
        roleHierarchy: parseInt(process.env.CACHE_TTL_ROLE_HIERARCHY || "3600"),
        policy: parseInt(process.env.CACHE_TTL_POLICY || "1800"),
        tenantConfig: parseInt(process.env.CACHE_TTL_TENANT_CONFIG || "7200"),
      },
      prefix: {
        authorization: "authz:",
        roleHierarchy: "role-hierarchy:",
        policy: "policy:",
        tenant: "tenant:",
      }
    });
    this.rbacManager = new RBACHierarchyManager();
    this.policyEngine = new PolicyEngine();
  }

  async evaluate(request: AuthorizationRequest): Promise<AuthorizationResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cachedResult = await this.cache.getAuthorizationDecision({
        tenantId: request.tenantId,
        principalId: request.principalId,
        action: request.action,
        resourceType: request.resource.type,
        resourceId: request.resource.id
      });
      if (cachedResult) {
        return {
          allowed: cachedResult.allowed,
          reason: cachedResult.reason,
          explanation: cachedResult.explanation,
          policy_evaluated: cachedResult.policyEvaluated,
          failed_conditions: cachedResult.failedConditions,
          evaluated_at: new Date(),
          cache_hit: true
        };
      }

      // 2. Validate request
      const validation = this.validateRequest(request);
      if (!validation.isValid) {
        return this.createDeniedResponse(
          `Invalid request: ${validation.errors.join(', ')}`
        );
      }

      // 3. Evaluate RBAC permissions
      const rbacResult = await this.evaluateRBAC(request);
      if (!rbacResult.allowed) {
        const response = this.createDeniedResponse(rbacResult.reason);
        await this.cache.cacheAuthorizationDecision(
          {
            tenantId: request.tenantId,
            principalId: request.principalId,
            action: request.action,
            resourceType: request.resource.type,
            resourceId: request.resource.id
          },
          {
            allowed: response.allowed,
            reason: response.reason,
            policyEvaluated: response.policy_evaluated,
            failedConditions: response.failed_conditions,
            explanation: response.explanation,
            evaluatedAt: new Date()
          }
        );
        return response;
      }

      // 4. Evaluate ABAC conditions
      const abacResult = await this.evaluateABAC(request);
      if (!abacResult.allowed) {
        const response = this.createDeniedResponse(
          abacResult.reason,
          abacResult.failedConditions
        );
        await this.cache.cacheAuthorizationDecision(
          {
            tenantId: request.tenantId,
            principalId: request.principalId,
            action: request.action,
            resourceType: request.resource.type,
            resourceId: request.resource.id
          },
          {
            allowed: response.allowed,
            reason: response.reason,
            policyEvaluated: response.policy_evaluated,
            failedConditions: response.failed_conditions,
            explanation: response.explanation,
            evaluatedAt: new Date()
          }
        );
        return response;
      }

      // 5. Evaluate policies (highest precedence)
      const policyResult = await this.evaluatePolicies(request);
      const response = policyResult.allowed
        ? this.createAllowedResponse(policyResult.reason, policyResult.policyEvaluated)
        : this.createDeniedResponse(
            policyResult.reason,
            policyResult.failedConditions,
            policyResult.policyEvaluated
          );

      // 6. Cache the result
      if (!response.cache_hit) {  // Only cache if not already cached
        await this.cache.cacheAuthorizationDecision(
          {
            tenantId: request.tenantId,
            principalId: request.principalId,
            action: request.action,
            resourceType: request.resource.type,
            resourceId: request.resource.id
          },
          {
            allowed: response.allowed,
            reason: response.reason,
            policyEvaluated: response.policy_evaluated,
            failedConditions: response.failed_conditions,
            explanation: response.explanation,
            evaluatedAt: new Date()
          }
        );
      }
      
      return response;

    } catch (error) {
      console.error("Authorization evaluation error:", error);
      return this.createDeniedResponse('Internal authorization error');
    }
  }

  /**
   * Evaluate RBAC permissions
   */
  private async evaluateRBAC(request: AuthorizationRequest): Promise<{
    allowed: boolean;
    reason: string;
  }> {
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
            reason: `Granted by role "${role.name}" (Level ${role.level})`
          };
        }
      }
      
      return {
        allowed: false,
        reason: `Missing required permission: ${requiredPermission}. Principal has roles: [${roles.map(r => r.name).join(", ")}]`
      };
    } catch (error) {
      console.error("RBAC evaluation error:", error);
      return {
        allowed: false,
        reason: "RBAC evaluation failed"
      };
    }
  }

  /**
   * Evaluate ABAC conditions
   */
  private async evaluateABAC(request: AuthorizationRequest): Promise<{
    allowed: boolean;
    reason: string;
    failedConditions?: string[];
  }> {
    const failedConditions: string[] = [];

    // Check resource ownership
    if (request.resource.attributes?.owner_id && 
        request.resource.attributes.owner_id !== request.principalId) {
      failedConditions.push(
        `Resource owner mismatch: expected ${request.resource.attributes.owner_id}, got ${request.principalId}`
      );
    }

    // Check principal department if principal attributes are provided
    if (request.principal?.attributes?.department && 
        request.resource.attributes?.required_department &&
        request.principal.attributes.department !== request.resource.attributes.required_department) {
      failedConditions.push(
        `Department mismatch: required ${request.resource.attributes.required_department}, got ${request.principal.attributes.department}`
      );
    }

    // Check resource sensitivity if principal attributes are provided
    if (request.resource.attributes?.sensitivity && 
        request.principal?.attributes?.clearance_level &&
        request.resource.attributes.sensitivity > request.principal.attributes.clearance_level) {
      failedConditions.push(
        `Clearance level insufficient: ${request.principal.attributes.clearance_level} < ${request.resource.attributes.sensitivity}`
      );
    }

    return {
      allowed: failedConditions.length === 0,
      reason: failedConditions.length === 0 ? 
        "All ABAC conditions satisfied" : 
        `ABAC conditions failed: ${failedConditions.join(", ")}`,
      failedConditions
    };
  }

  /**
   * Evaluate policies
   */
  private async evaluatePolicies(request: AuthorizationRequest): Promise<{
    allowed: boolean;
    reason: string;
    policyEvaluated?: string;
    failedConditions?: string[];
  }> {
    try {
      const policyContext: PolicyEvaluationContext = {
        principal: { 
          id: request.principalId, 
          attributes: request.principal?.attributes || {}
        },
        resource: {
          type: request.resource.type,
          id: request.resource.id,
          attributes: request.resource.attributes || {}
        },
        action: request.action,
        context: request.context || {}
      };
      
      const result = await this.policyEngine.evaluatePolicies(
        request.tenantId,
        policyContext
      );
      
      if (result.matched) {
        return {
          allowed: result.effect === "allow",
          reason: result.explanation,
          policyEvaluated: result.ruleId,
          failedConditions: result.failedConditions
        };
      } else {
        // No applicable policies, return neutral result allowing other controls to decide
        return {
          allowed: true,
          reason: "No applicable policies found, proceeding with other authorization controls",
          policyEvaluated: undefined
        };
      }
    } catch (error) {
      console.error("Policy evaluation error:", error);
      return {
        allowed: false,
        reason: "Policy evaluation failed",
        policyEvaluated: undefined
      };
    }
  }

  private validateRequest(request: AuthorizationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.tenantId) errors.push('tenantId is required');
    if (!request.principalId) errors.push('principalId is required');
    if (!request.action) errors.push('action is required');
    if (!request.resource?.type) errors.push('resource.type is required');
    if (!request.resource?.id) errors.push('resource.id is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private generateCacheKey(request: AuthorizationRequest): string {
    return `${request.tenantId}:${request.principalId}:${request.action}:${request.resource.type}:${request.resource.id}`;
  }

  private createAllowedResponse(reason: string, policyEvaluated?: string): AuthorizationResponse {
    return {
      allowed: true,
      reason,
      explanation: reason,
      policy_evaluated: policyEvaluated,
      evaluated_at: new Date(),
      cache_hit: false
    };
  }

  private createDeniedResponse(
    reason: string,
    failedConditions?: string[],
    policyEvaluated?: string
  ): AuthorizationResponse {
    return {
      allowed: false,
      reason,
      explanation: reason,
      policy_evaluated: policyEvaluated,
      failed_conditions: failedConditions,
      evaluated_at: new Date(),
      cache_hit: false
    };
  }

  /**
   * Clear cache for a specific principal
   */
  public async invalidateCache(tenantId: string, principalId: string): Promise<void> {
    await this.cache.invalidateAuthorizationCache(tenantId, principalId);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { hits: number; misses: number; hitRate: number; errors: number } {
    return this.cache.getStats();
  }
}