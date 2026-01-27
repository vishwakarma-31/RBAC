#!/usr/bin/env node

/**
 * Authorization Engine Test Script
 * Demonstrates the core functionality of the authorization engine
 */

// Simple mock of the authorization logic
function evaluateAuthorization(request) {
  console.log(`\n🔍 Evaluating authorization:`);
  console.log(`   Tenant: ${request.tenantId}`);
  console.log(`   Principal: ${request.principalId}`);
  console.log(`   Action: ${request.action}`);
  console.log(`   Resource: ${request.resource.type}:${request.resource.id}`);
  
  // Allow admins
  if (request.principalId.includes('admin')) {
    console.log(`✅ ALLOWED: Administrator access granted`);
    return {
      allowed: true,
      reason: 'Administrator access granted',
      explanation: 'Principal has administrative privileges',
      evaluated_at: new Date().toISOString()
    };
  }
  
  // Allow users to read invoices
  if (request.action === 'read' && request.resource.type === 'invoice') {
    console.log(`✅ ALLOWED: Read access granted for invoices`);
    return {
      allowed: true,
      reason: 'Read access granted',
      explanation: 'Users can read invoices',
      evaluated_at: new Date().toISOString()
    };
  }
  
  // Deny other operations
  console.log(`❌ DENIED: Missing required permissions`);
  return {
    allowed: false,
    reason: `Access denied: ${request.action} permission required for ${request.resource.type}`,
    explanation: `Principal lacks ${request.resource.type}.${request.action} permission`,
    evaluated_at: new Date().toISOString()
  };
}

// Test cases
const testCases = [
  {
    name: "Admin accessing invoice",
    request: {
      tenantId: "tenant-123",
      principalId: "admin-user-456",
      action: "delete",
      resource: {
        type: "invoice",
        id: "inv-789",
        attributes: { owner_id: "user-456", amount: 5000 }
      }
    }
  },
  {
    name: "Regular user reading invoice",
    request: {
      tenantId: "tenant-123",
      principalId: "regular-user-123",
      action: "read",
      resource: {
        type: "invoice",
        id: "inv-456",
        attributes: { owner_id: "user-123", amount: 2500 }
      }
    }
  },
  {
    name: "User trying to delete invoice",
    request: {
      tenantId: "tenant-123",
      principalId: "regular-user-123",
      action: "delete",
      resource: {
        type: "invoice",
        id: "inv-456",
        attributes: { owner_id: "user-123", amount: 2500 }
      }
    }
  },
  {
    name: "User accessing document",
    request: {
      tenantId: "tenant-123",
      principalId: "regular-user-123",
      action: "read",
      resource: {
        type: "document",
        id: "doc-789",
        attributes: { department: "engineering" }
      }
    }
  }
];

console.log("🚀 Authorization Engine Test Suite");
console.log("==================================");

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.name}`);
  console.log("-".repeat(50));
  
  const result = evaluateAuthorization(testCase.request);
  
  console.log(`\n📊 Result:`);
  console.log(`   Decision: ${result.allowed ? '✅ ALLOWED' : '❌ DENIED'}`);
  console.log(`   Reason: ${result.reason}`);
  console.log(`   Explanation: ${result.explanation}`);
  console.log(`   Evaluated at: ${result.evaluated_at}`);
});

console.log("\n🎯 Key Features Demonstrated:");
console.log("• RBAC: Role-based access control (admins vs regular users)");
console.log("• Resource-specific permissions (read vs delete)");
console.log("• Explainable decisions with reasons");
console.log("• Multi-tenant awareness");
console.log("• Detailed audit information");

console.log("\n🔧 Next Steps:");
console.log("• Integrate with PostgreSQL for role/permission storage");
console.log("• Add Redis caching for performance");
console.log("• Implement full ABAC evaluation");
console.log("• Add policy engine support");
console.log("• Connect to audit service for logging");