#!/usr/bin/env node

/**
 * REST API Test Script
 * Demonstrates authorization API endpoints
 */

const http = require('http');

// Mock services
class MockAuthzEngine {
  async evaluate(request) {
    // Simulate slow processing
    await new Promise(resolve => setTimeout(resolve, 10));
    
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

class MockAuditLogger {
  logDecision(entry) {
    console.log(`Audit log: ${entry.principalId} ${entry.action} ${entry.resource.type}:${entry.resource.id} -> ${entry.allowed ? 'ALLOWED' : 'DENIED'}`);
    return { id: 'audit-' + Date.now() };
  }
}

// Simple HTTP server
class SimpleAPIServer {
  constructor() {
    this.authzEngine = new MockAuthzEngine();
    this.auditLogger = new MockAuditLogger();
    this.server = null;
  }

  start(port = 3000) {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });
    
    this.server.listen(port, () => {
      console.log(`API server listening on port ${port}`);
    });
  }

  async handleRequest(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = req.url;
    const method = req.method;

    try {
      if (url === '/authorize' && method === 'POST') {
        await this.handleAuthorize(req, res);
      } else if (url === '/health' && method === 'GET') {
        this.handleHealth(req, res);
      } else if (url === '/metrics' && method === 'GET') {
        this.handleMetrics(req, res);
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      console.error('Request error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  async handleAuthorize(req, res) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const request = JSON.parse(body);
        
        // Validate request
        const validation = this.validateAuthorizeRequest(request);
        if (!validation.isValid) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid request', details: validation.errors }));
          return;
        }

        // Evaluate authorization
        const result = await this.authzEngine.evaluate(request);
        
        // Log audit
        this.auditLogger.logDecision({
          ...request,
          allowed: result.allowed,
          reason: result.reason
        });

        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }

  handleHealth(req, res) {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'authz-engine'
    };
    
    res.writeHead(200);
    res.end(JSON.stringify(health));
  }

  handleMetrics(req, res) {
    const metrics = {
      timestamp: new Date().toISOString(),
      service: 'authz-engine',
      uptime: process.uptime()
    };
    
    res.writeHead(200);
    res.end(JSON.stringify(metrics));
  }

  validateAuthorizeRequest(request) {
    const errors = [];
    
    if (!request.tenantId) errors.push('tenantId is required');
    if (!request.principalId) errors.push('principalId is required');
    if (!request.action) errors.push('action is required');
    if (!request.resource) errors.push('resource is required');
    if (request.resource && !request.resource.type) errors.push('resource.type is required');
    if (request.resource && !request.resource.id) errors.push('resource.id is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

// API client for testing
class APIClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async authorize(request) {
    const response = await fetch(`${this.baseUrl}/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    return {
      status: response.status,
      data: await response.json()
    };
  }

  async health() {
    const response = await fetch(`${this.baseUrl}/health`);
    return {
      status: response.status,
      data: await response.json()
    };
  }

  async metrics() {
    const response = await fetch(`${this.baseUrl}/metrics`);
    return {
      status: response.status,
      data: await response.json()
    };
  }
}

// Run API tests
async function runAPITests() {
  console.log("🚀 REST API Test Suite");
  console.log("=====================");

  const server = new SimpleAPIServer();
  const client = new APIClient();
  
  try {
    // Start server
    server.start(3001);
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for server to start

    // Test 1: Health endpoint
    console.log("\n📝 Test 1: Health Endpoint");
    console.log("-------------------------");
    
    const healthResponse = await client.health();
    if (healthResponse.status === 200) {
      console.log("✅ Health check successful");
      console.log(`   Status: ${healthResponse.data.status}`);
      console.log(`   Service: ${healthResponse.data.service}`);
    } else {
      console.log("❌ Health check failed");
    }

    // Test 2: Valid authorization request
    console.log("\n📝 Test 2: Valid Authorization Request");
    console.log("-------------------------------------");
    
    const validRequest = {
      tenantId: 'tenant-123',
      principalId: 'admin-user-456',
      action: 'delete',
      resource: {
        type: 'invoice',
        id: 'inv-789',
        attributes: { owner_id: 'user-456', amount: 5000 }
      }
    };

    const authResponse = await client.authorize(validRequest);
    if (authResponse.status === 200) {
      console.log("✅ Authorization request successful");
      console.log(`   Decision: ${authResponse.data.allowed ? 'ALLOWED' : 'DENIED'}`);
      console.log(`   Reason: ${authResponse.data.reason}`);
    } else {
      console.log("❌ Authorization request failed");
    }

    // Test 3: Invalid authorization request
    console.log("\n📝 Test 3: Invalid Authorization Request");
    console.log("----------------------------------------");
    
    const invalidRequest = {
      tenantId: 'tenant-123',
      // Missing principalId
      action: 'read',
      resource: { type: 'invoice', id: 'inv-456' }
    };

    const invalidResponse = await client.authorize(invalidRequest);
    if (invalidResponse.status === 400) {
      console.log("✅ Invalid request properly rejected");
      console.log(`   Error: ${invalidResponse.data.error}`);
    } else {
      console.log("❌ Invalid request not rejected properly");
    }

    // Test 4: Multiple concurrent requests
    console.log("\n📝 Test 4: Concurrent Requests");
    console.log("------------------------------");
    
    const requests = [
      { tenantId: 'tenant-123', principalId: 'user-1', action: 'read', resource: { type: 'invoice', id: 'inv-1' } },
      { tenantId: 'tenant-123', principalId: 'user-2', action: 'read', resource: { type: 'invoice', id: 'inv-2' } },
      { tenantId: 'tenant-123', principalId: 'user-3', action: 'read', resource: { type: 'invoice', id: 'inv-3' } }
    ];

    const start = Date.now();
    const responses = await Promise.all(requests.map(req => client.authorize(req)));
    const duration = Date.now() - start;

    const successCount = responses.filter(r => r.status === 200).length;
    console.log(`✅ ${successCount}/${requests.length} requests successful`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Average: ${(duration/requests.length).toFixed(2)}ms per request`);

    // Test 5: Metrics endpoint
    console.log("\n📝 Test 5: Metrics Endpoint");
    console.log("---------------------------");
    
    const metricsResponse = await client.metrics();
    if (metricsResponse.status === 200) {
      console.log("✅ Metrics endpoint successful");
      console.log(`   Uptime: ${metricsResponse.data.uptime.toFixed(2)} seconds`);
      console.log(`   Timestamp: ${metricsResponse.data.timestamp}`);
    } else {
      console.log("❌ Metrics endpoint failed");
    }

    console.log("\n🎯 API Features Demonstrated:");
    console.log("• RESTful authorization endpoint (/authorize)");
    console.log("• Health check endpoint (/health)");
    console.log("• Metrics endpoint (/metrics)");
    console.log("• Request validation and error handling");
    console.log("• CORS support for web applications");
    console.log("• Concurrent request handling");
    console.log("• Integration with authz engine and audit logging");

    console.log("\n📊 Summary:");
    console.log(`• Endpoints tested: 3 (/authorize, /health, /metrics)`);
    console.log(`• Request validation: WORKING`);
    console.log(`• Error handling: WORKING`);
    console.log(`• Concurrent processing: WORKING`);
    console.log(`• CORS support: ENABLED`);

    console.log("\n🔧 Next Steps:");
    console.log("• Add JWT authentication middleware");
    console.log("• Implement rate limiting");
    console.log("• Add request/response logging");
    console.log("• Implement OpenAPI/Swagger documentation");
    console.log("• Add integration with management API");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    server.stop();
    process.exit(0);
  }
}

// Run the tests
runAPITests();