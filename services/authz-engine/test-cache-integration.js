#!/usr/bin/env node

/**
 * Cache Integration Example
 * Demonstrates how caching integrates with authorization engine
 */

// Simple cache implementation
class SimpleCache {
  constructor() {
    this.cache = new Map();
  }

  generateKey(tenantId, principalId, action, resourceType, resourceId) {
    return `authz:${tenantId}:${principalId}:${action}:${resourceType}:${resourceId}`;
  }

  get(key) {
    const entry = this.cache.get(this.generateKey(
      key.tenantId, key.principalId, key.action, key.resourceType, key.resourceId
    ));
    
    if (entry && Date.now() < entry.expires) {
      return { ...entry.value, cache_hit: true };
    }
    return null;
  }

  set(key, value, ttl = 300) {
    const cacheKey = this.generateKey(
      key.tenantId, key.principalId, key.action, key.resourceType, key.resourceId
    );
    
    this.cache.set(cacheKey, {
      value: value,
      expires: Date.now() + (ttl * 1000)
    });
  }

  invalidate(pattern) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Simple authorization engine
class SimpleAuthzEngine {
  constructor() {
    this.cache = new SimpleCache();
    this.stats = { requests: 0, cache_hits: 0, cache_misses: 0 };
  }

  // Simulate authorization evaluation (slow operation)
  async evaluateAuthorization(request) {
    // Simulate slow database/external service call
    await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
    
    // Simple RBAC logic
    if (request.principalId.includes('admin')) {
      return {
        allowed: true,
        reason: 'Administrator access granted',
        explanation: 'Principal has administrative privileges',
        evaluatedAt: new Date()
      };
    }
    
    if (request.action === 'read' && request.resource.type === 'invoice') {
      return {
        allowed: true,
        reason: 'Read access granted for invoices',
        explanation: 'Users can read invoices',
        evaluatedAt: new Date()
      };
    }
    
    return {
      allowed: false,
      reason: `Access denied: ${request.action} permission required for ${request.resource.type}`,
      explanation: `Principal lacks ${request.resource.type}.${request.action} permission`,
      evaluatedAt: new Date()
    };
  }

  // Main authorization method with caching
  async authorize(request) {
    this.stats.requests++;
    
    // Check cache first
    const cachedResult = this.cache.get(request);
    if (cachedResult) {
      this.stats.cache_hits++;
      console.log(`⚡ CACHE HIT: ${request.principalId} -> ${request.resource.type}:${request.action}`);
      return cachedResult;
    }
    
    this.stats.cache_misses++;
    console.log(`🐢 CACHE MISS: ${request.principalId} -> ${request.resource.type}:${request.action} (evaluating...)`);
    
    // Evaluate authorization
    const result = await this.evaluateAuthorization(request);
    
    // Cache the result
    this.cache.set(request, result, 300); // 5 minute TTL
    
    return result;
  }

  // Invalidate cache when roles/permissions change
  invalidatePrincipalCache(tenantId, principalId) {
    console.log(`🗑️ Invalidating cache for principal ${principalId}`);
    this.cache.invalidate(`${tenantId}:${principalId}`);
  }

  // Get performance statistics
  getStats() {
    const total = this.stats.cache_hits + this.stats.cache_misses;
    const hitRate = total > 0 ? (this.stats.cache_hits / total) * 100 : 0;
    const avgResponseTime = this.stats.cache_hits > 0 ? 
      (this.stats.cache_hits * 1 + this.stats.cache_misses * 50) / total : 50;
    
    return {
      total_requests: this.stats.requests,
      cache_hits: this.stats.cache_hits,
      cache_misses: this.stats.cache_misses,
      hit_rate: hitRate.toFixed(2) + '%',
      average_response_time: avgResponseTime.toFixed(2) + 'ms'
    };
  }
}

// Run integration test
async function runIntegrationTest() {
  console.log("🚀 Cache Integration Test");
  console.log("========================");

  const engine = new SimpleAuthzEngine();

  try {
    // Test requests
    const requests = [
      {
        tenantId: 'tenant-123',
        principalId: 'admin-user-456',
        action: 'delete',
        resource: { type: 'invoice', id: 'inv-789' }
      },
      {
        tenantId: 'tenant-123',
        principalId: 'regular-user-123',
        action: 'read',
        resource: { type: 'invoice', id: 'inv-456' }
      },
      {
        tenantId: 'tenant-123',
        principalId: 'regular-user-123',
        action: 'delete',
        resource: { type: 'invoice', id: 'inv-456' }
      }
    ];

    console.log("\n📝 First Round - All Cache Misses");
    console.log("---------------------------------");
    
    // First round - all cache misses
    const start1 = Date.now();
    for (const request of requests) {
      const result = await engine.authorize(request);
      console.log(`${result.allowed ? '✅ ALLOWED' : '❌ DENIED'}: ${result.reason}`);
    }
    const duration1 = Date.now() - start1;
    console.log(`⏱️ First round duration: ${duration1}ms`);

    console.log("\n📝 Second Round - All Cache Hits");
    console.log("--------------------------------");
    
    // Second round - all cache hits (much faster)
    const start2 = Date.now();
    for (const request of requests) {
      const result = await engine.authorize(request);
      console.log(`${result.allowed ? '✅ ALLOWED' : '❌ DENIED'}: ${result.reason} ${result.cache_hit ? '(cached)' : ''}`);
    }
    const duration2 = Date.now() - start2;
    console.log(`⏱️ Second round duration: ${duration2}ms`);

    console.log("\n📝 Cache Invalidation Test");
    console.log("--------------------------");
    
    // Invalidate cache for a principal
    engine.invalidatePrincipalCache('tenant-123', 'regular-user-123');
    
    // Next request should be a cache miss
    const request = requests[1]; // regular-user-123 reading invoice
    const result = await engine.authorize(request);
    console.log(`${result.allowed ? '✅ ALLOWED' : '❌ DENIED'}: ${result.reason} ${result.cache_hit ? '(cached)' : '(re-evaluated)'}`);

    console.log("\n📊 Performance Statistics");
    console.log("------------------------");
    
    const stats = engine.getStats();
    console.log(`Total requests: ${stats.total_requests}`);
    console.log(`Cache hits: ${stats.cache_hits}`);
    console.log(`Cache misses: ${stats.cache_misses}`);
    console.log(`Hit rate: ${stats.hit_rate}`);
    console.log(`Average response time: ${stats.average_response_time}`);
    
    console.log("\n📈 Performance Improvement");
    console.log("-------------------------");
    const improvement = ((duration1 - duration2) / duration1 * 100).toFixed(2);
    console.log(`Performance improvement: ${improvement}%`);
    console.log(`Cache hit requests: ~1ms vs uncached: ~50ms`);
    console.log(`Theoretical max improvement: 98% (50ms → 1ms)`);

    console.log("\n🎯 Integration Benefits Demonstrated:");
    console.log("• Dramatic performance improvement with caching");
    console.log("• Sub-millisecond response times for cached decisions");
    console.log("• Proper cache invalidation on data changes");
    console.log("• Hit rate monitoring for cache effectiveness");
    console.log("• Integration with authorization evaluation logic");

    console.log("\n🔧 Production Considerations:");
    console.log("• Use Redis for distributed caching");
    console.log("• Implement cache warming for frequently accessed data");
    console.log("• Add cache monitoring and alerting");
    console.log("• Optimize TTL values based on data volatility");
    console.log("• Implement cache sharding for scalability");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the integration test
runIntegrationTest();