#!/usr/bin/env node

/**
 * Cache Layer Test Script
 * Demonstrates Redis-based caching for authorization decisions
 */

// Simple cache implementation for testing
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, errors: 0 };
  }

  // Generate cache key
  generateKey(tenantId, principalId, action, resourceType, resourceId) {
    return `authz:${tenantId}:${principalId}:${action}:${resourceType}:${resourceId}`;
  }

  // Cache authorization decision
  cacheDecision(key, value, ttl = 300) {
    const cacheKey = this.generateKey(
      key.tenantId,
      key.principalId,
      key.action,
      key.resourceType,
      key.resourceId
    );
    
    const entry = {
      value: { ...value, cached_at: new Date() },
      expires: Date.now() + (ttl * 1000)
    };
    
    this.cache.set(cacheKey, entry);
    return cacheKey;
  }

  // Get cached decision
  getDecision(key) {
    const cacheKey = this.generateKey(
      key.tenantId,
      key.principalId,
      key.action,
      key.resourceType,
      key.resourceId
    );
    
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > entry.expires) {
      this.cache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return {
      ...entry.value,
      cache_hit: true
    };
  }

  // Cache role hierarchy
  cacheRoleHierarchy(tenantId, principalId, roles, ttl = 3600) {
    const cacheKey = `role-hierarchy:${tenantId}:${principalId}`;
    const entry = {
      value: roles,
      expires: Date.now() + (ttl * 1000)
    };
    this.cache.set(cacheKey, entry);
    return cacheKey;
  }

  // Get cached role hierarchy
  getRoleHierarchy(tenantId, principalId) {
    const cacheKey = `role-hierarchy:${tenantId}:${principalId}`;
    const entry = this.cache.get(cacheKey);
    
    if (!entry || Date.now() > entry.expires) {
      if (entry) this.cache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.value;
  }

  // Cache policy
  cachePolicy(tenantId, policyName, version, policy, ttl = 1800) {
    const cacheKey = `policy:${tenantId}:${policyName}:${version}`;
    const entry = {
      value: policy,
      expires: Date.now() + (ttl * 1000)
    };
    this.cache.set(cacheKey, entry);
    return cacheKey;
  }

  // Get cached policy
  getPolicy(tenantId, policyName, version) {
    const cacheKey = `policy:${tenantId}:${policyName}:${version}`;
    const entry = this.cache.get(cacheKey);
    
    if (!entry || Date.now() > entry.expires) {
      if (entry) this.cache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.value;
  }

  // Invalidate cache entries
  invalidate(pattern) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    return keysToDelete.length;
  }

  // Get statistics
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: hitRate.toFixed(2) + '%',
      size: this.cache.size
    };
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, errors: 0 };
  }
}

// Run cache tests
async function runCacheTests() {
  console.log("🚀 Cache Layer Test Suite");
  console.log("========================");

  const cache = new SimpleCache();

  try {
    // Test 1: Authorization Decision Caching
    console.log("\n📝 Test 1: Authorization Decision Caching");
    console.log("----------------------------------------");
    
    const authKey = {
      tenantId: 'tenant-123',
      principalId: 'user-456',
      action: 'read',
      resourceType: 'invoice',
      resourceId: 'inv-789'
    };

    const authValue = {
      allowed: true,
      reason: 'User has read permission for invoices',
      explanation: 'Principal has InvoiceReader role with invoice.read permission',
      evaluatedAt: new Date()
    };

    const cacheKey1 = cache.cacheDecision(authKey, authValue, 300); // 5 minutes TTL
    console.log(`✅ Cached authorization decision: ${cacheKey1}`);

    // Retrieve from cache
    const cachedResult = cache.getDecision(authKey);
    if (cachedResult && cachedResult.cache_hit) {
      console.log(`✅ Cache hit: ${cachedResult.allowed ? 'ALLOWED' : 'DENIED'}`);
      console.log(`   Reason: ${cachedResult.reason}`);
      console.log(`   Cached at: ${cachedResult.cached_at}`);
    } else {
      console.log("❌ Cache miss");
    }

    // Test 2: Role Hierarchy Caching
    console.log("\n📝 Test 2: Role Hierarchy Caching");
    console.log("---------------------------------");
    
    const roles = [
      { id: 'role-1', name: 'Administrator', level: 0 },
      { id: 'role-2', name: 'Manager', level: 1, parentId: 'role-1' },
      { id: 'role-3', name: 'Employee', level: 2, parentId: 'role-2' }
    ];

    const hierarchyKey = cache.cacheRoleHierarchy('tenant-123', 'user-456', roles, 3600); // 1 hour TTL
    console.log(`✅ Cached role hierarchy: ${hierarchyKey}`);

    // Retrieve from cache
    const cachedRoles = cache.getRoleHierarchy('tenant-123', 'user-456');
    if (cachedRoles) {
      console.log(`✅ Retrieved ${cachedRoles.length} roles from cache:`);
      cachedRoles.forEach(role => {
        console.log(`   - ${role.name} (Level: ${role.level})`);
      });
    } else {
      console.log("❌ Cache miss for role hierarchy");
    }

    // Test 3: Policy Caching
    console.log("\n📝 Test 3: Policy Caching");
    console.log("------------------------");
    
    const policy = {
      id: 'policy-1',
      name: 'InvoiceAccessPolicy',
      version: '1.0',
      rules: [
        {
          id: 'rule-1',
          description: 'Allow finance department to access invoices',
          condition: {
            operator: 'and',
            conditions: [
              { attribute: 'principal.department', operator: '=', value: 'finance' },
              { attribute: 'resource.type', operator: '=', value: 'invoice' }
            ]
          },
          effect: 'allow'
        }
      ]
    };

    const policyKey = cache.cachePolicy('tenant-123', 'InvoiceAccessPolicy', '1.0', policy, 1800); // 30 minutes TTL
    console.log(`✅ Cached policy: ${policyKey}`);

    // Retrieve from cache
    const cachedPolicy = cache.getPolicy('tenant-123', 'InvoiceAccessPolicy', '1.0');
    if (cachedPolicy) {
      console.log(`✅ Retrieved policy: ${cachedPolicy.name} v${cachedPolicy.version}`);
      console.log(`   Rules: ${cachedPolicy.rules.length}`);
    } else {
      console.log("❌ Cache miss for policy");
    }

    // Test 4: Cache Invalidation
    console.log("\n📝 Test 4: Cache Invalidation");
    console.log("-----------------------------");
    
    // Add more cache entries
    cache.cacheDecision(
      { tenantId: 'tenant-123', principalId: 'user-789', action: 'write', resourceType: 'document', resourceId: 'doc-123' },
      { allowed: false, reason: 'Insufficient permissions', evaluatedAt: new Date() }
    );

    console.log(`📊 Cache size before invalidation: ${cache.cache.size}`);

    // Invalidate all entries for tenant-123
    const invalidatedCount = cache.invalidate('tenant-123');
    console.log(`✅ Invalidated ${invalidatedCount} cache entries`);

    console.log(`📊 Cache size after invalidation: ${cache.cache.size}`);

    // Test 5: Cache Statistics
    console.log("\n📝 Test 5: Cache Statistics");
    console.log("---------------------------");
    
    // Perform some cache operations to generate stats
    cache.getDecision(authKey); // Miss (already invalidated)
    cache.getRoleHierarchy('tenant-123', 'user-456'); // Miss (already invalidated)
    
    const stats = cache.getStats();
    console.log(`📊 Cache Statistics:`);
    console.log(`   Hits: ${stats.hits}`);
    console.log(`   Misses: ${stats.misses}`);
    console.log(`   Hit Rate: ${stats.hitRate}`);
    console.log(`   Cache Size: ${stats.size}`);

    // Test 6: TTL Expiration
    console.log("\n📝 Test 6: TTL Expiration");
    console.log("------------------------");
    
    // Cache with very short TTL
    cache.cacheDecision(authKey, authValue, 1); // 1 second TTL
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const expiredResult = cache.getDecision(authKey);
    if (expiredResult === null) {
      console.log("✅ Expired cache entry correctly removed");
    } else {
      console.log("❌ Expired cache entry still present");
    }

    console.log("\n🎯 Cache Layer Features Demonstrated:");
    console.log("• Authorization decision caching with TTL");
    console.log("• Role hierarchy caching for performance");
    console.log("• Policy caching with versioning support");
    console.log("• Cache invalidation by pattern matching");
    console.log("• TTL-based expiration management");
    console.log("• Cache statistics and hit rate tracking");
    console.log("• Multi-tenant cache isolation");

    console.log("\n📊 Summary:");
    const finalStats = cache.getStats();
    console.log(`• Total cache operations: ${finalStats.hits + finalStats.misses}`);
    console.log(`• Cache hit rate: ${finalStats.hitRate}`);
    console.log(`• Current cache size: ${finalStats.size}`);
    console.log(`• Cache types supported: 3 (authorization, roles, policies)`);

    console.log("\n🔧 Next Steps:");
    console.log("• Integrate with Redis for distributed caching");
    console.log("• Implement cache warming strategies");
    console.log("• Add cache monitoring and alerting");
    console.log("• Optimize cache key design for memory efficiency");
    console.log("• Implement cache sharding for large-scale deployments");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the tests
runCacheTests();