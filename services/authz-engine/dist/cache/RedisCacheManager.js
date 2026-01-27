"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCacheManager = void 0;
class RedisCacheManager {
    constructor(config) {
        this.isConnected = false;
        this.stats = { hits: 0, misses: 0, errors: 0 };
        this.config = config;
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
    async connect() {
        try {
            await this.redis.connect();
            this.isConnected = true;
            console.log('Redis cache connected successfully');
        }
        catch (error) {
            this.isConnected = false;
            this.stats.errors++;
            console.error('Failed to connect to Redis:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.isConnected) {
            await this.redis.quit();
            this.isConnected = false;
            console.log('Redis cache disconnected');
        }
    }
    generateAuthKey(key) {
        return `${this.config.prefix.authorization}${key.tenantId}:${key.principalId}:${key.action}:${key.resourceType}:${key.resourceId}`;
    }
    generateRoleHierarchyKey(tenantId, principalId) {
        return `${this.config.prefix.roleHierarchy}${tenantId}:${principalId}`;
    }
    generatePolicyKey(tenantId, policyName, version) {
        return `${this.config.prefix.policy}${tenantId}:${policyName}:${version}`;
    }
    generateTenantKey(tenantId) {
        return `${this.config.prefix.tenant}${tenantId}`;
    }
    async cacheAuthorizationDecision(key, value, ttl = this.config.ttl.authorization) {
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
        }
        catch (error) {
            this.stats.errors++;
            console.error('Failed to cache authorization decision:', error);
        }
    }
    async getAuthorizationDecision(key) {
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
            }
            else {
                this.stats.misses++;
                return null;
            }
        }
        catch (error) {
            this.stats.errors++;
            console.error('Failed to get cached authorization decision:', error);
            return null;
        }
    }
    async cacheRoleHierarchy(tenantId, principalId, roles, ttl = this.config.ttl.roleHierarchy) {
        if (!this.isConnected) {
            this.stats.errors++;
            return;
        }
        try {
            const cacheKey = this.generateRoleHierarchyKey(tenantId, principalId);
            const serializedRoles = JSON.stringify(roles);
            await this.redis.setex(cacheKey, ttl, serializedRoles);
        }
        catch (error) {
            this.stats.errors++;
            console.error('Failed to cache role hierarchy:', error);
        }
    }
    async getRoleHierarchy(tenantId, principalId) {
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
            }
            else {
                this.stats.misses++;
                return null;
            }
        }
        catch (error) {
            this.stats.errors++;
            console.error('Failed to get cached role hierarchy:', error);
            return null;
        }
    }
    async cachePolicy(tenantId, policyName, version, policy, ttl = this.config.ttl.policy) {
        if (!this.isConnected) {
            this.stats.errors++;
            return;
        }
        try {
            const cacheKey = this.generatePolicyKey(tenantId, policyName, version);
            const serializedPolicy = JSON.stringify(policy);
            await this.redis.setex(cacheKey, ttl, serializedPolicy);
        }
        catch (error) {
            this.stats.errors++;
            console.error('Failed to cache policy:', error);
        }
    }
    async getPolicy(tenantId, policyName, version) {
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
            }
            else {
                this.stats.misses++;
                return null;
            }
        }
        catch (error) {
            this.stats.errors++;
            console.error('Failed to get cached policy:', error);
            return null;
        }
    }
    async cacheTenantConfig(tenantId, config, ttl = this.config.ttl.tenantConfig) {
        if (!this.isConnected) {
            this.stats.errors++;
            return;
        }
        try {
            const cacheKey = this.generateTenantKey(tenantId);
            const serializedConfig = JSON.stringify(config);
            await this.redis.setex(cacheKey, ttl, serializedConfig);
        }
        catch (error) {
            this.stats.errors++;
            console.error('Failed to cache tenant configuration:', error);
        }
    }
    async getTenantConfig(tenantId) {
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
            }
            else {
                this.stats.misses++;
                return null;
            }
        }
        catch (error) {
            this.stats.errors++;
            console.error('Failed to get cached tenant configuration:', error);
            return null;
        }
    }
    async invalidateAuthorizationCache(tenantId, principalId, resourceType, resourceId) {
        if (!this.isConnected) {
            this.stats.errors++;
            return;
        }
        try {
            const pattern = `${this.config.prefix.authorization}${tenantId}:${principalId}${resourceType ? `:*:${resourceType}` : ''}${resourceId ? `:${resourceId}` : ''}*`;
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        catch (error) {
            this.stats.errors++;
            console.error('Failed to invalidate authorization cache:', error);
        }
    }
    async invalidateRoleHierarchyCache(tenantId, principalId) {
        if (!this.isConnected) {
            this.stats.errors++;
            return;
        }
        try {
            const cacheKey = this.generateRoleHierarchyKey(tenantId, principalId);
            await this.redis.del(cacheKey);
        }
        catch (error) {
            this.stats.errors++;
            console.error('Failed to invalidate role hierarchy cache:', error);
        }
    }
    async invalidateTenantCache(tenantId) {
        if (!this.isConnected) {
            this.stats.errors++;
            return;
        }
        try {
            const pattern = `*${tenantId}*`;
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        catch (error) {
            this.stats.errors++;
            console.error('Failed to invalidate tenant cache:', error);
        }
    }
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate,
            errors: this.stats.errors
        };
    }
    resetStats() {
        this.stats = { hits: 0, misses: 0, errors: 0 };
    }
    isConnectedToCache() {
        return this.isConnected;
    }
    async ping() {
        if (!this.isConnected) {
            return false;
        }
        try {
            await this.redis.ping();
            return true;
        }
        catch (error) {
            this.isConnected = false;
            return false;
        }
    }
    setupEventHandlers() {
        this.redis.on('connect', () => {
            this.isConnected = true;
            console.log('Redis cache connected');
        });
        this.redis.on('error', (error) => {
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
exports.RedisCacheManager = RedisCacheManager;
//# sourceMappingURL=RedisCacheManager.js.map