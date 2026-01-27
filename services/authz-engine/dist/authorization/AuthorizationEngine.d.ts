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
export declare class AuthorizationEngine {
    private cache;
    private rbacManager;
    private policyEngine;
    constructor();
    evaluate(request: AuthorizationRequest): Promise<AuthorizationResponse>;
    private evaluateRBAC;
    private evaluateABAC;
    private evaluatePolicies;
    private validateRequest;
    private generateCacheKey;
    private createAllowedResponse;
    private createDeniedResponse;
    invalidateCache(tenantId: string, principalId: string): Promise<void>;
    getCacheStats(): {
        hits: number;
        misses: number;
        hitRate: number;
        errors: number;
    };
}
//# sourceMappingURL=AuthorizationEngine.d.ts.map