interface CacheKey {
    tenantId: string;
    principalId: string;
    action: string;
    resourceType: string;
    resourceId: string;
}
import { CacheInterface, CachedAuthorizationDecision } from './CacheInterface';
import { AppConfig } from '../config';
export declare class RedisCacheManager implements CacheInterface {
    private redis;
    private config;
    private isConnected;
    private stats;
    constructor(appConfig?: AppConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private generateAuthKey;
    private generateRoleHierarchyKey;
    private generatePolicyKey;
    private generateTenantKey;
    cacheAuthorizationDecision(key: CacheKey, decision: CachedAuthorizationDecision): Promise<void>;
    getAuthorizationDecision(key: CacheKey): Promise<CachedAuthorizationDecision | null>;
    cacheRoleHierarchy(tenantId: string, principalId: string, roles: any[], ttl?: number): Promise<void>;
    getRoleHierarchy(tenantId: string, principalId: string): Promise<any[] | null>;
    cachePolicy(tenantId: string, policyName: string, version: string, policy: any, ttl?: number): Promise<void>;
    getPolicy(tenantId: string, policyName: string, version: string): Promise<any | null>;
    cacheTenantConfig(tenantId: string, config: any, ttl?: number): Promise<void>;
    getTenantConfig(tenantId: string): Promise<any | null>;
    invalidateAuthorizationCache(tenantId: string, principalId: string): Promise<void>;
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