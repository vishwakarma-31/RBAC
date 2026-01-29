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
import { RateLimiter } from "../utils/rateLimiter";
import config from "../config";
import { AuditLogger } from "../audit/AuditLogger";

export class AuthorizationEngine {
  private cache: RedisCacheManager;
  private rbacManager: RBACHierarchyManager;
  private policyEngine: PolicyEngine;
  private rateLimiter: RateLimiter;
  private auditLogger: AuditLogger;

  /**
   * Main authorization decision method
   */
  constructor() {
    this.cache = new RedisCacheManager(config);
    this.rbacManager = new RBACHierarchyManager(config);
    this.policyEngine = new PolicyEngine(config);
    this.rateLimiter = new RateLimiter(
      config.rateLimit.maxTokens,
      config.rateLimit.intervalSeconds
    );
    this.auditLogger = new AuditLogger();
  }

  /**
   * Evaluates an authorization request against the configured authorization models
   * Processes RBAC, ABAC, and Policy checks in sequence
   * 
   * @param request - The authorization request containing tenant, principal, action, and resource details
   * @returns Promise<AuthorizationResponse> - The result of the authorization evaluation
   * 
   * @throws Error if there are issues with the request validation or evaluation
   */
  async evaluate(request: AuthorizationRequest): Promise<AuthorizationResponse> {
    const startTime = Date.now();
    
    try {
      // Rate limiting check - use tenant and principal as the rate limiting key
      const rateLimitKey = `${request.tenantId}:${request.principalId}`;
      const isAllowed = await this.rateLimiter.isAllowed(rateLimitKey);
      
      if (!isAllowed) {
        return this.createDeniedResponse('Rate limit exceeded. Too many authorization requests.');
      }

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
      // Short-circuit: if policy evaluation resulted in deny, return immediately
      if (!policyResult.allowed) {
        const response = this.createDeniedResponse(
          policyResult.reason,
          policyResult.failedConditions,
          policyResult.policyEvaluated
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

      // Final allowed response if all checks passed
      const response = this.createAllowedResponse(policyResult.reason, policyResult.policyEvaluated);

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
      
      // 7. Log the authorization decision for compliance and debugging
      await this.auditLogger.logAuthorizationDecision(request, response);
      
      return response;

    } catch (error) {
      console.error("Authorization evaluation error:", error);
      // Log the error for debugging purposes
      const errorResponse = this.createDeniedResponse('Internal authorization error');
      await this.auditLogger.logAuthorizationDecision(request, errorResponse, { error: (error as Error).message });
      return errorResponse;
    }
  }

  /**
   * Evaluate RBAC permissions
   */
  /**
   * Evaluates RBAC (Role-Based Access Control) permissions for the given request
   * Checks if the principal has any role that grants the required permission
   * 
   * @param request - The authorization request containing tenant, principal, action, and resource details
   * @returns Promise<{ allowed: boolean; reason: string; }> - Whether the request is allowed and the reason
   * 
   * @throws Error if there are issues with role or permission retrieval
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
  /**
   * Evaluates ABAC (Attribute-Based Access Control) conditions for the given request
   * Checks attribute-based constraints like resource ownership, department isolation, etc.
   * 
   * @param request - The authorization request containing tenant, principal, action, and resource details
   * @returns Promise<{ allowed: boolean; reason: string; failedConditions?: string[]; }> - Whether the request is allowed, the reason, and any failed conditions
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
  /**
   * Evaluates policy rules for the given request
   * Applies policy-based authorization rules with highest precedence
   * 
   * @param request - The authorization request containing tenant, principal, action, and resource details
   * @returns Promise<{ allowed: boolean; reason: string; policyEvaluated?: string; failedConditions?: string[]; }> - Whether the request is allowed, the reason, policy evaluated, and any failed conditions
   * 
   * @throws Error if there are issues with policy evaluation
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

  /**
   * Validates the authorization request parameters
   * Checks for required fields and proper formatting
   * 
   * @param request - The authorization request to validate
   * @returns { isValid: boolean; errors: string[] } - Whether the request is valid and any validation errors
   */
  private validateRequest(request: AuthorizationRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate tenantId
    if (!request.tenantId) {
      errors.push('tenantId is required');
    } else if (typeof request.tenantId !== 'string' || !this.isValidUUID(request.tenantId)) {
      errors.push('tenantId must be a valid UUID');
    }

    // Validate principalId
    if (!request.principalId) {
      errors.push('principalId is required');
    } else if (typeof request.principalId !== 'string' || !this.isValidUUID(request.principalId)) {
      errors.push('principalId must be a valid UUID');
    }

    // Validate action
    if (!request.action) {
      errors.push('action is required');
    } else if (typeof request.action !== 'string' || !/^[a-zA-Z0-9_.-]+$/.test(request.action)) {
      errors.push('action contains invalid characters');
    }

    // Validate resource
    if (!request.resource?.type) {
      errors.push('resource.type is required');
    } else if (typeof request.resource.type !== 'string' || !/^[a-zA-Z0-9_.-]+$/.test(request.resource.type)) {
      errors.push('resource.type contains invalid characters');
    }

    if (!request.resource?.id) {
      errors.push('resource.id is required');
    } else if (typeof request.resource.id !== 'string' || !this.isValidUUID(request.resource.id) && isNaN(Number(request.resource.id))) {
      errors.push('resource.id must be a valid UUID or numeric ID');
    }

    // Validate additional attributes
    if (request.resource.attributes && typeof request.resource.attributes !== 'object') {
      errors.push('resource.attributes must be an object');
    }

    if (request.principal?.attributes && typeof request.principal.attributes !== 'object') {
      errors.push('principal.attributes must be an object');
    }

    if (request.context && typeof request.context !== 'object') {
      errors.push('context must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates if a string is a properly formatted UUID
   * 
   * @param uuid - The string to validate as a UUID
   * @returns boolean - Whether the string is a valid UUID
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Generates a unique cache key for the authorization request
   * Used to store and retrieve cached authorization decisions
   * 
   * @param request - The authorization request to generate a key for
   * @returns string - The cache key string
   */
  private generateCacheKey(request: AuthorizationRequest): string {
    return `${request.tenantId}:${request.principalId}:${request.action}:${request.resource.type}:${request.resource.id}`;
  }

  /**
   * Creates an allowed authorization response
   * 
   * @param reason - The reason why the request was allowed
   * @param policyEvaluated - Optional policy that was evaluated
   * @returns AuthorizationResponse - The allowed authorization response
   */
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

  /**
   * Creates a denied authorization response
   * 
   * @param reason - The reason why the request was denied
   * @param failedConditions - Optional list of failed conditions
   * @param policyEvaluated - Optional policy that was evaluated
   * @returns AuthorizationResponse - The denied authorization response
   */
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
  /**
   * Invalidates the authorization cache for a specific principal
   * 
   * @param tenantId - The tenant ID whose cache needs invalidation
   * @param principalId - The principal ID whose cache needs invalidation
   * @returns Promise<void>
   */
  public async invalidateCache(tenantId: string, principalId: string): Promise<void> {
    await this.cache.invalidateAuthorizationCache(tenantId, principalId);
  }

  /**
   * Get cache statistics
   */
  /**
   * Gets cache statistics for monitoring and debugging
   * 
   * @returns { hits: number; misses: number; hitRate: number; errors: number } - Cache statistics
   */
  public getCacheStats(): { hits: number; misses: number; hitRate: number; errors: number } {
    return this.cache.getStats();
  }
}