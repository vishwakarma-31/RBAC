/**
 * Redis Cache Manager
 * Implements caching for authorization decisions and role hierarchies
 */

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

export class RedisCacheManager {
  private redis: any; // Redis client will be initialized in constructor
  private config: CacheConfig;
  private isConnected: boolean = false;
  private stats: {
    hits: number;
    misses: number;
    errors: number;
  } = { hits: 0, misses: 0, errors: 0 };

  constructor(config: CacheConfig) {
    this.config = config;
    
    // Dynamically import Redis client
    const Redis = require('ioredis');
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      lazyConnect: true
    });
    
    this.setupEventHandlers();
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    try {
      await this.redis.connect();
      this.isConnected = true;
      console.log('Redis cache connected successfully');
    } catch (error) {
      this.isConnected = false;
      this.stats.errors++;
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.redis.quit();
      this.isConnected = false;
      console.log('Redis cache disconnected');
    }
  }

  /**
   * Generate cache key for authorization decision
   */
  private generateAuthKey(key: CacheKey): string {
    return `${this.config.prefix.authorization}${key.tenantId}:${key.principalId}:${key.action}:${key.resourceType}:${key.resourceId}`;
  }

  /**
   * Generate cache key for role hierarchy
   */
  private generateRoleHierarchyKey(tenantId: string, principalId: string): string {
    return `${this.config.prefix.roleHierarchy}${tenantId}:${principalId}`;
  }

  /**
   * Generate cache key for policy
   */
  private generatePolicyKey(tenantId: string, policyName: string, version: string): string {
    return `${this.config.prefix.policy}${tenantId}:${policyName}:${version}`;
  }

  /**
   * Generate cache key for tenant configuration
   */
  private generateTenantKey(tenantId: string): string {
    return `${this.config.prefix.tenant}${tenantId}`;
  }

  /**
   * Cache authorization decision
   */
  async cacheAuthorizationDecision(
    key: CacheKey,
    value: CacheValue,
    ttl: number = this.config.ttl.authorization
  ): Promise<void> {
    if (!this.isConnected) {
      this.stats.errors++;
      return;
    }

    try {
      const cacheKey = this.generateAuthKey(key);
      const serializedValue = JSON.stringify({
        ...value,
        evaluatedAt: value.evaluatedAt.toISOString()
      });

      await this.redis.setex(cacheKey, ttl, serializedValue);
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to cache authorization decision:', error);
    }
  }

  /**
   * Get cached authorization decision
   */
  async getAuthorizationDecision(key: CacheKey): Promise<CacheValue | null> {
    if (!this.isConnected) {
      this.stats.errors++;
      return null;
    }

    try {
      const cacheKey = this.generateAuthKey(key);
      
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        this.stats.hits++;
        const parsed = JSON.parse(cached);
        return {
          ...parsed,
          evaluatedAt: new Date(parsed.evaluatedAt),
          cache_hit: true
        };
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to get cached authorization decision:', error);
      return null;
    }
  }

  /**
   * Cache role hierarchy for a principal
   */
  async cacheRoleHierarchy(
    tenantId: string,
    principalId: string,
    roles: any[], // Role objects
    ttl: number = this.config.ttl.roleHierarchy
  ): Promise<void> {
    if (!this.isConnected) {
      this.stats.errors++;
      return;
    }

    try {
      const cacheKey = this.generateRoleHierarchyKey(tenantId, principalId);
      const serializedRoles = JSON.stringify(roles);

      await this.redis.setex(cacheKey, ttl, serializedRoles);
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to cache role hierarchy:', error);
    }
  }

  /**
   * Get cached role hierarchy for a principal
   */
  async getRoleHierarchy(tenantId: string, principalId: string): Promise<any[] | null> {
    if (!this.isConnected) {
      this.stats.errors++;
      return null;
    }

    try {
      const cacheKey = this.generateRoleHierarchyKey(tenantId, principalId);
      
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        this.stats.hits++;
        return JSON.parse(cached);
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to get cached role hierarchy:', error);
      return null;
    }
  }

  /**
   * Cache policy
   */
  async cachePolicy(
    tenantId: string,
    policyName: string,
    version: string,
    policy: any,
    ttl: number = this.config.ttl.policy
  ): Promise<void> {
    if (!this.isConnected) {
      this.stats.errors++;
      return;
    }

    try {
      const cacheKey = this.generatePolicyKey(tenantId, policyName, version);
      const serializedPolicy = JSON.stringify(policy);

      await this.redis.setex(cacheKey, ttl, serializedPolicy);
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to cache policy:', error);
    }
  }

  /**
   * Get cached policy
   */
  async getPolicy(tenantId: string, policyName: string, version: string): Promise<any | null> {
    if (!this.isConnected) {
      this.stats.errors++;
      return null;
    }

    try {
      const cacheKey = this.generatePolicyKey(tenantId, policyName, version);
      
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        this.stats.hits++;
        return JSON.parse(cached);
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to get cached policy:', error);
      return null;
    }
  }

  /**
   * Cache tenant configuration
   */
  async cacheTenantConfig(
    tenantId: string,
    config: any,
    ttl: number = this.config.ttl.tenantConfig
  ): Promise<void> {
    if (!this.isConnected) {
      this.stats.errors++;
      return;
    }

    try {
      const cacheKey = this.generateTenantKey(tenantId);
      const serializedConfig = JSON.stringify(config);

      await this.redis.setex(cacheKey, ttl, serializedConfig);
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to cache tenant configuration:', error);
    }
  }

  /**
   * Get cached tenant configuration
   */
  async getTenantConfig(tenantId: string): Promise<any | null> {
    if (!this.isConnected) {
      this.stats.errors++;
      return null;
    }

    try {
      const cacheKey = this.generateTenantKey(tenantId);
      
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        this.stats.hits++;
        return JSON.parse(cached);
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to get cached tenant configuration:', error);
      return null;
    }
  }

  /**
   * Invalidate authorization cache for a principal/resource
   */
  async invalidateAuthorizationCache(
    tenantId: string,
    principalId: string,
    resourceType?: string,
    resourceId?: string
  ): Promise<void> {
    if (!this.isConnected) {
      this.stats.errors++;
      return;
    }

    try {
      // Use pattern matching to delete multiple keys
      const pattern = `${this.config.prefix.authorization}${tenantId}:${principalId}${resourceType ? `:*:${resourceType}` : ''}${resourceId ? `:${resourceId}` : ''}*`;
      
      // Get all matching keys
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to invalidate authorization cache:', error);
    }
  }

  /**
   * Invalidate role hierarchy cache for a principal
   */
  async invalidateRoleHierarchyCache(tenantId: string, principalId: string): Promise<void> {
    if (!this.isConnected) {
      this.stats.errors++;
      return;
    }

    try {
      const cacheKey = this.generateRoleHierarchyKey(tenantId, principalId);
      await this.redis.del(cacheKey);
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to invalidate role hierarchy cache:', error);
    }
  }

  /**
   * Invalidate all cache for a tenant
   */
  async invalidateTenantCache(tenantId: string): Promise<void> {
    if (!this.isConnected) {
      this.stats.errors++;
      return;
    }

    try {
      // Use pattern matching to delete all tenant keys
      const pattern = `*${tenantId}*`;
      
      // Get all matching keys
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to invalidate tenant cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { hits: number; misses: number; hitRate: number; errors: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      errors: this.stats.errors
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, errors: 0 };
  }

  /**
   * Check if cache is connected
   */
  isConnectedToCache(): boolean {
    return this.isConnected;
  }

  /**
   * Ping Redis to check connection
   */
  async ping(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      console.log('Redis cache connected');
    });

    this.redis.on('error', (error: Error) => {
      this.isConnected = false;
      this.stats.errors++;
      console.error('Redis cache error:', error);
    });

    this.redis.on('reconnecting', () => {
      console.log('Redis cache reconnecting...');
    });

    this.redis.on('end', () => {
      this.isConnected = false;
      console.log('Redis cache connection ended');
    });
  }
}