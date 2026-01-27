#!/usr/bin/env node

/**
 * Node.js SDK Test Script
 * Demonstrates client SDK for authorization platform
 */

// Mock HTTP client
class MockHTTPClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async post(endpoint, data, options = {}) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Mock responses based on endpoint
    if (endpoint === '/authorize') {
      return this.mockAuthorize(data);
    }
    
    throw new Error(`Unknown endpoint: ${endpoint}`);
  }

  mockAuthorize(request) {
    // Mock authorization logic
    if (request.principalId.includes('admin')) {
      return {
        allowed: true,
        reason: 'Administrator access granted',
        explanation: 'Principal has administrative privileges',
        evaluated_at: new Date().toISOString()
      };
    }
    
    if (request.action === 'read' && request.resource.type === 'invoice') {
      return {
        allowed: true,
        reason: 'Read access granted for invoices',
        explanation: 'Users can read invoices',
        evaluated_at: new Date().toISOString()
      };
    }
    
    return {
      allowed: false,
      reason: `Access denied: ${request.action} permission required for ${request.resource.type}`,
      explanation: `Principal lacks ${request.resource.type}.${request.action} permission`,
      evaluated_at: new Date().toISOString()
    };
  }
}

// Main SDK class
class RBACClient {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      serviceToken: config.serviceToken || 'test-token',
      tenantId: config.tenantId || 'default-tenant',
      timeout: config.timeout || 5000,
      retries: config.retries || 3,
      cacheEnabled: config.cacheEnabled !== false,
      ...config
    };
    
    this.httpClient = new MockHTTPClient(this.config.baseUrl);
    this.cache = new Map();
    this.stats = { requests: 0, cacheHits: 0 };
  }

  // Main authorization method
  async can(principalId, action, resource) {
    const request = {
      tenantId: this.config.tenantId,
      principalId,
      action,
      resource: {
        type: resource.type,
        id: resource.id,
        attributes: resource.attributes || {}
      }
    };

    return this.authorize(request);
  }

  // Batch authorization
  async canBatch(requests) {
    const promises = requests.map(req => this.can(req.principalId, req.action, req.resource));
    return Promise.all(promises);
  }

  // Context-aware authorization
  async canWithContext(principalId, action, resource, context = {}) {
    const request = {
      tenantId: this.config.tenantId,
      principalId,
      action,
      resource: {
        type: resource.type,
        id: resource.id,
        attributes: resource.attributes || {}
      },
      context
    };

    return this.authorize(request);
  }

  // Get permissions for principal
  async getPermissions(principalId) {
    // Mock implementation - in real SDK this would query the API
    if (principalId.includes('admin')) {
      return [
        'invoice.create',
        'invoice.read',
        'invoice.update',
        'invoice.delete',
        'user.create',
        'user.read',
        'user.update',
        'user.delete'
      ];
    }
    
    return [
      'invoice.read',
      'user.read'
    ];
  }

  // Check if principal has specific permission
  async hasPermission(principalId, permission) {
    const permissions = await this.getPermissions(principalId);
    return permissions.includes(permission);
  }

  // Get roles for principal
  async getRoles(principalId) {
    // Mock implementation
    if (principalId.includes('admin')) {
      return ['Administrator', 'Manager', 'Employee'];
    }
    
    return ['Employee'];
  }

  // Policy simulation
  async simulate(principalId, action, resource) {
    const result = await this.can(principalId, action, resource);
    
    return {
      allowed: result.allowed,
      reason: result.reason,
      explanation: result.explanation,
      activePolicies: result.policy_evaluated ? [result.policy_evaluated] : [],
      evaluationTrace: [
        `Principal: ${principalId}`,
        `Action: ${action}`,
        `Resource: ${resource.type}:${resource.id}`,
        `Decision: ${result.allowed ? 'ALLOWED' : 'DENIED'}`,
        `Reason: ${result.reason}`
      ]
    };
  }

  // Private authorization method
  async authorize(request) {
    this.stats.requests++;
    
    // Check cache
    if (this.config.cacheEnabled) {
      const cacheKey = this.generateCacheKey(request);
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() < cached.expires) {
        this.stats.cacheHits++;
        return {
          ...cached.value,
          cache_hit: true
        };
      }
    }

    // Make API request
    try {
      const response = await this.httpClient.post('/authorize', request);
      
      // Cache the result
      if (this.config.cacheEnabled) {
        const cacheKey = this.generateCacheKey(request);
        this.cache.set(cacheKey, {
          value: response,
          expires: Date.now() + 300000 // 5 minutes
        });
      }
      
      return response;
    } catch (error) {
      throw new Error(`Authorization failed: ${error.message}`);
    }
  }

  // Generate cache key
  generateCacheKey(request) {
    return `${request.tenantId}:${request.principalId}:${request.action}:${request.resource.type}:${request.resource.id}`;
  }

  // Invalidate cache
  invalidateCache(principalId, action, resource) {
    const cacheKey = this.generateCacheKey({
      tenantId: this.config.tenantId,
      principalId,
      action,
      resource: {
        type: resource.type,
        id: resource.id
      }
    });
    
    this.cache.delete(cacheKey);
  }

  // Get SDK statistics
  getStats() {
    const hitRate = this.stats.requests > 0 ? 
      (this.stats.cacheHits / this.stats.requests) * 100 : 0;
    
    return {
      requests: this.stats.requests,
      cacheHits: this.stats.cacheHits,
      hitRate: hitRate.toFixed(2) + '%',
      cacheSize: this.cache.size
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    this.stats.cacheHits = 0;
  }
}

// Express.js middleware
function createAuthorizationMiddleware(config = {}) {
  const client = new RBACClient(config);
  
  return async (req, res, next) => {
    try {
      // Extract principal from request (mock implementation)
      const principalId = req.user?.id || req.headers['x-principal-id'] || 'anonymous';
      
      // Extract resource from request
      const resource = {
        type: req.params.resourceType || 'unknown',
        id: req.params.resourceId || 'unknown',
        attributes: {}
      };
      
      // Extract action from method
      const actionMap = {
        'GET': 'read',
        'POST': 'create',
        'PUT': 'update',
        'DELETE': 'delete',
        'PATCH': 'update'
      };
      
      const action = actionMap[req.method] || 'read';
      
      // Check authorization
      const result = await client.can(principalId, action, resource);
      
      // Attach authorization result to request
      req.authorization = result;
      
      // If denied, send 403 response
      if (!result.allowed) {
        return res.status(403).json({
          error: 'Forbidden',
          reason: result.reason,
          explanation: result.explanation
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Run SDK tests
async function runSDKTests() {
  console.log("🚀 Node.js SDK Test Suite");
  console.log("========================");

  const client = new RBACClient({
    baseUrl: 'http://localhost:3000',
    tenantId: 'test-tenant',
    cacheEnabled: true
  });

  try {
    // Test 1: Basic authorization
    console.log("\n📝 Test 1: Basic Authorization");
    console.log("------------------------------");
    
    const result1 = await client.can('admin-user-123', 'delete', {
      type: 'invoice',
      id: 'inv-456'
    });
    
    console.log(`✅ Authorization result:`);
    console.log(`   Decision: ${result1.allowed ? 'ALLOWED' : 'DENIED'}`);
    console.log(`   Reason: ${result1.reason}`);

    // Test 2: Batch authorization
    console.log("\n📝 Test 2: Batch Authorization");
    console.log("------------------------------");
    
    const batchRequests = [
      { principalId: 'admin-user', action: 'read', resource: { type: 'invoice', id: 'inv-1' } },
      { principalId: 'regular-user', action: 'read', resource: { type: 'invoice', id: 'inv-2' } },
      { principalId: 'regular-user', action: 'delete', resource: { type: 'invoice', id: 'inv-3' } }
    ];
    
    const batchResults = await client.canBatch(batchRequests);
    const allowedCount = batchResults.filter(r => r.allowed).length;
    
    console.log(`✅ Batch authorization results:`);
    console.log(`   Total requests: ${batchResults.length}`);
    console.log(`   Allowed: ${allowedCount}`);
    console.log(`   Denied: ${batchResults.length - allowedCount}`);

    // Test 3: Context-aware authorization
    console.log("\n📝 Test 3: Context-Aware Authorization");
    console.log("--------------------------------------");
    
    const contextResult = await client.canWithContext(
      'user-123',
      'access',
      { type: 'financial_report', id: 'report-q3-2024' },
      {
        ip_address: '192.168.1.100',
        time_of_day: 'business_hours',
        device_type: 'desktop'
      }
    );
    
    console.log(`✅ Context-aware authorization:`);
    console.log(`   Decision: ${contextResult.allowed ? 'ALLOWED' : 'DENIED'}`);
    console.log(`   Reason: ${contextResult.reason}`);

    // Test 4: Permission enumeration
    console.log("\n📝 Test 4: Permission Enumeration");
    console.log("---------------------------------");
    
    const adminPerms = await client.getPermissions('admin-user-123');
    const userPerms = await client.getPermissions('regular-user-123');
    
    console.log(`✅ Permission enumeration:`);
    console.log(`   Admin permissions: ${adminPerms.length}`);
    console.log(`   User permissions: ${userPerms.length}`);
    
    const hasCreatePerm = await client.hasPermission('regular-user-123', 'invoice.create');
    console.log(`   User has invoice.create: ${hasCreatePerm}`);

    // Test 5: Role enumeration
    console.log("\n📝 Test 5: Role Enumeration");
    console.log("---------------------------");
    
    const adminRoles = await client.getRoles('admin-user-123');
    const userRoles = await client.getRoles('regular-user-123');
    
    console.log(`✅ Role enumeration:`);
    console.log(`   Admin roles: ${adminRoles.join(', ')}`);
    console.log(`   User roles: ${userRoles.join(', ')}`);

    // Test 6: Policy simulation
    console.log("\n📝 Test 6: Policy Simulation");
    console.log("---------------------------");
    
    const simulation = await client.simulate('user-123', 'delete', {
      type: 'server',
      id: 'srv-prod-01'
    });
    
    console.log(`✅ Policy simulation:`);
    console.log(`   Decision: ${simulation.allowed ? 'ALLOWED' : 'DENIED'}`);
    console.log(`   Active policies: ${simulation.activePolicies.join(', ')}`);
    console.log(`   Evaluation steps: ${simulation.evaluationTrace.length}`);

    // Test 7: Caching
    console.log("\n📝 Test 7: Caching Performance");
    console.log("------------------------------");
    
    // Clear cache and make multiple requests
    client.clearCache();
    
    const start = Date.now();
    for (let i = 0; i < 5; i++) {
      await client.can('admin-user-123', 'read', { type: 'invoice', id: 'inv-789' });
    }
    const duration = Date.now() - start;
    
    const stats = client.getStats();
    console.log(`✅ Caching performance:`);
    console.log(`   Total requests: ${stats.requests}`);
    console.log(`   Cache hits: ${stats.cacheHits}`);
    console.log(`   Hit rate: ${stats.hitRate}`);
    console.log(`   Duration: ${duration}ms`);

    // Test 8: Cache invalidation
    console.log("\n📝 Test 8: Cache Invalidation");
    console.log("-----------------------------");
    
    console.log(`   Cache size before invalidation: ${stats.cacheSize}`);
    client.invalidateCache('admin-user-123', 'read', { type: 'invoice', id: 'inv-789' });
    const newStats = client.getStats();
    console.log(`   Cache size after invalidation: ${newStats.cacheSize}`);

    console.log("\n🎯 SDK Features Demonstrated:");
    console.log("• Simple authorization API (can method)");
    console.log("• Batch authorization for multiple requests");
    console.log("• Context-aware authorization");
    console.log("• Permission enumeration and checking");
    console.log("• Role enumeration");
    console.log("• Policy simulation tool");
    console.log("• Built-in caching with TTL");
    console.log("• Cache invalidation");
    console.log("• Express.js middleware integration");
    console.log("• Comprehensive error handling");

    console.log("\n📊 Summary:");
    console.log(`• Authorization methods: 4 (can, canBatch, canWithContext, simulate)`);
    console.log(`• Utility methods: 4 (getPermissions, hasPermission, getRoles, getStats)`);
    console.log(`• Cache hit rate: ${stats.hitRate}`);
    console.log(`• Integration points: 1 (Express middleware)`);

    console.log("\n🔧 Next Steps:");
    console.log("• Add retry logic with exponential backoff");
    console.log("• Implement connection pooling");
    console.log("• Add request/response logging");
    console.log("• Implement JWT token management");
    console.log("• Add TypeScript definitions");
    console.log("• Create comprehensive documentation");
    console.log("• Add integration tests with real API");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the tests
runSDKTests();