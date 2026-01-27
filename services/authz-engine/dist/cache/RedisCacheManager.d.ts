interface CacheConfig {
    host: string;
    port: number;
    password?: string;
    db?: number;
    ttl: {
        authorization: number;
        roleHierarchy: number;
        policy: number;
        tenantConfig: number;
    };
    prefix: {
        authorization: string;
        roleHierarchy: string;
        policy: string;
        tenant: string;
    };
}
interface CacheKey {
    tenantId: string;
    principalId: string;
    action: string;
    resourceType: string;
    resourceId: string;
}
interface CacheValue {
    allowed: boolean;
    reason: string;
    policyEvaluated?: string;
    failedConditions?: string[];
    explanation: string;
    evaluatedAt: Date;
}
export declare class RedisCacheManager {
    private redis;
    private config;
    private isConnected;
    private stats;
    constructor(config: CacheConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private generateAuthKey;
    private generateRoleHierarchyKey;
    private generatePolicyKey;
    private generateTenantKey;
    cacheAuthorizationDecision(key: CacheKey, value: CacheValue, ttl?: number): Promise<void>;
    getAuthorizationDecision(key: CacheKey): Promise<CacheValue | null>;
    cacheRoleHierarchy(tenantId: string, principalId: string, roles: any[], ttl?: number): Promise<void>;
    getRoleHierarchy(tenantId: string, principalId: string): Promise<any[] | null>;
    cachePolicy(tenantId: string, policyName: string, version: string, policy: any, ttl?: number): Promise<void>;
    getPolicy(tenantId: string, policyName: string, version: string): Promise<any | null>;
    cacheTenantConfig(tenantId: string, config: any, ttl?: number): Promise<void>;
    getTenantConfig(tenantId: string): Promise<any | null>;
    invalidateAuthorizationCache(tenantId: string, principalId: string, resourceType?: string, resourceId?: string): Promise<void>;
    invalidateRoleHierarchyCache(tenantId: string, principalId: string): Promise<void>;
    invalidateTenantCache(tenantId: string): Promise<void>;
    getStats(): {
        hits: number;
        misses: number;
        hitRate: number;
        errors: number;
    };
    resetStats(): void;
    isConnectedToCache(): boolean;
    ping(): Promise<boolean>;
    private setupEventHandlers;
}
export {};
//# sourceMappingURL=RedisCacheManager.d.ts.map