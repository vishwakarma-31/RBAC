/**
 * Cache Interface
 * Defines the abstraction layer for caching implementations
 */

export interface CacheKey {
  tenantId: string;
  principalId: string;
  action: string;
  resourceType: string;
  resourceId: string;
}

export interface CachedAuthorizationDecision {
  allowed: boolean;
  reason: string;
  explanation: string;
  policyEvaluated?: string;
  failedConditions?: string[];
  evaluatedAt: Date;
}

export interface CacheInterface {
  getAuthorizationDecision(key: CacheKey): Promise<CachedAuthorizationDecision | null>;
  cacheAuthorizationDecision(key: CacheKey, decision: CachedAuthorizationDecision): Promise<void>;
  invalidateAuthorizationCache(tenantId: string, principalId: string): Promise<void>;
  getStats(): { hits: number; misses: number; hitRate: number; errors: number };
}