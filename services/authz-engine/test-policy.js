#!/usr/bin/env node

/**
 * Policy Engine Test Script
 * Demonstrates JSON-based policy evaluation with deterministic rule processing
 */

// Simple policy engine implementation for testing
class SimplePolicyEngine {
  constructor() {
    this.policies = new Map();
    this.cache = new Map();
  }

  // Create policy
  createPolicy(tenantId, name, version, rules, priority = 0) {
    const policy = {
      id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      name,
      version,
      priority,
      rules,
      status: 'active',
      createdAt: new Date()
    };
    this.policies.set(policy.id, policy);
    return policy;
  }

  // Evaluate policies
  evaluatePolicies(tenantId, context) {
    const cacheKey = `${tenantId}:${context.principal.id}:${context.action}:${context.resource.type}:${context.resource.id}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, explanation: `${cached.explanation} (cached)` };
    }

    const activePolicies = Array.from(this.policies.values())
      .filter(p => p.tenantId === tenantId && p.status === 'active')
      .sort((a, b) => b.priority - a.priority);

    for (const policy of activePolicies) {
      const result = this.evaluatePolicy(policy, context);
      if (result.matched) {
        this.cache.set(cacheKey, result);
        return result;
      }
    }

    return {
      matched: false,
      effect: 'deny',
      explanation: 'No applicable policies matched'
    };
  }

  // Evaluate single policy
  evaluatePolicy(policy, context) {
    const sortedRules = [...policy.rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const rule of sortedRules) {
      const ruleResult = this.evaluateRule(rule, context);
      if (ruleResult.matched) {
        return {
          matched: true,
          effect: rule.effect,
          ruleId: rule.id,
          ruleDescription: rule.description,
          explanation: rule.description || `Rule matched with ${rule.effect} effect`
        };
      }
    }

    return { matched: false, effect: 'deny', explanation: `No rules matched in policy ${policy.name}` };
  }

  // Evaluate rule
  evaluateRule(rule, context) {
    const result = this.evaluateCondition(rule.condition, context);
    return { matched: result.satisfied };
  }

  // Evaluate condition
  evaluateCondition(condition, context) {
    if (condition.operator === 'and') {
      for (const subCondition of condition.conditions) {
        const result = this.evaluateCondition(subCondition, context);
        if (!result.satisfied) return { satisfied: false };
      }
      return { satisfied: true };
    }

    if (condition.operator === 'or') {
      for (const subCondition of condition.conditions) {
        const result = this.evaluateCondition(subCondition, context);
        if (result.satisfied) return { satisfied: true };
      }
      return { satisfied: false };
    }

    // Simple condition
    const { attribute, operator, value } = condition;
    let attrValue;

    if (attribute === 'principal.id') attrValue = context.principal.id;
    else if (attribute === 'resource.type') attrValue = context.resource.type;
    else if (attribute === 'resource.id') attrValue = context.resource.id;
    else if (attribute === 'action') attrValue = context.action;
    else if (attribute.startsWith('principal.')) {
      const key = attribute.substring('principal.'.length);
      attrValue = context.principal.attributes[key];
    }
    else if (attribute.startsWith('resource.')) {
      const key = attribute.substring('resource.'.length);
      attrValue = context.resource.attributes[key];
    }

    if (attrValue === undefined) {
      return { satisfied: false };
    }

    // Handle special case: value is 'principal.id' - compare against actual principal ID
    const compareValue = value === 'principal.id' ? context.principal.id : value;

    switch (operator) {
      case '=': return { satisfied: attrValue === compareValue };
      case '!=': return { satisfied: attrValue !== compareValue };
      case '>': return { satisfied: attrValue > compareValue };
      case '<': return { satisfied: attrValue < compareValue };
      case 'in': return { satisfied: Array.isArray(compareValue) && compareValue.includes(attrValue) };
      default: return { satisfied: false };
    }
  }
}

// Run tests
async function runPolicyTests() {
  console.log("🚀 Policy Engine Test Suite");
  console.log("==========================");

  const engine = new SimplePolicyEngine();

  try {
    // Test 1: Simple allow policy
    console.log("\n📝 Test 1: Simple Allow Policy");
    console.log("-----------------------------");
    
    const simplePolicy = engine.createPolicy('tenant-123', 'SimpleAllow', '1.0', [
      {
        id: 'rule-1',
        description: 'Allow all users to read invoices',
        condition: {
          operator: 'and',
          conditions: [
            { attribute: 'resource.type', operator: '=', value: 'invoice' },
            { attribute: 'action', operator: '=', value: 'read' }
          ]
        },
        effect: 'allow'
      }
    ]);

    console.log(`✅ Created policy: ${simplePolicy.name} v${simplePolicy.version}`);

    const result1 = engine.evaluatePolicies('tenant-123', {
      principal: { id: 'user-456', attributes: {} },
      resource: { type: 'invoice', id: 'inv-789', attributes: {} },
      action: 'read'
    });

    console.log(`📊 Evaluation result: ${result1.effect.toUpperCase()}`);
    console.log(`   Explanation: ${result1.explanation}`);

    // Test 2: Complex policy with attributes
    console.log("\n📝 Test 2: Complex Policy with Attributes");
    console.log("----------------------------------------");
    
    const complexPolicy = engine.createPolicy('tenant-123', 'DepartmentAccess', '1.0', [
      {
        id: 'rule-1',
        description: 'Finance department can access financial documents',
        condition: {
          operator: 'and',
          conditions: [
            { attribute: 'principal.department', operator: '=', value: 'finance' },
            { attribute: 'resource.type', operator: '=', value: 'financial_document' }
          ]
        },
        effect: 'allow'
      },
      {
        id: 'rule-2',
        description: 'Deny access to confidential documents for non-managers',
        condition: {
          operator: 'and',
          conditions: [
            { attribute: 'resource.classification', operator: '=', value: 'confidential' },
            { attribute: 'principal.role', operator: '!=', value: 'manager' }
          ]
        },
        effect: 'deny'
      }
    ], 10); // Higher priority

    console.log(`✅ Created policy: ${complexPolicy.name} with priority ${complexPolicy.priority}`);

    const result2 = engine.evaluatePolicies('tenant-123', {
      principal: { id: 'user-123', attributes: { department: 'finance', role: 'analyst' } },
      resource: { type: 'financial_document', id: 'doc-456', attributes: { classification: 'confidential' } },
      action: 'read'
    });

    console.log(`📊 Evaluation result: ${result2.effect.toUpperCase()}`);
    console.log(`   Explanation: ${result2.explanation}`);
    if (result2.ruleId) console.log(`   Rule: ${result2.ruleId} - ${result2.ruleDescription}`);

    // Test 3: Policy with OR condition
    console.log("\n📝 Test 3: Policy with OR Condition");
    console.log("----------------------------------");
    
    const orPolicy = engine.createPolicy('tenant-123', 'FlexibleAccess', '1.0', [
      {
        id: 'rule-1',
        description: 'Allow admins or document owners to delete',
        condition: {
          operator: 'or',
          conditions: [
            { attribute: 'principal.role', operator: '=', value: 'admin' },
            { attribute: 'resource.owner_id', operator: '=', value: 'principal.id' }
          ]
        },
        effect: 'allow'
      }
    ]);

    console.log(`✅ Created policy: ${orPolicy.name}`);

    // Test case 1: Admin user
    const result3a = engine.evaluatePolicies('tenant-123', {
      principal: { id: 'admin-123', attributes: { role: 'admin' } },
      resource: { type: 'document', id: 'doc-789', attributes: { owner_id: 'user-456' } },
      action: 'delete'
    });

    console.log(`📊 Admin test result: ${result3a.effect.toUpperCase()}`);
    console.log(`   Explanation: ${result3a.explanation}`);

    // Test case 2: Document owner
    const result3b = engine.evaluatePolicies('tenant-123', {
      principal: { id: 'user-456', attributes: { role: 'user' } },
      resource: { type: 'document', id: 'doc-789', attributes: { owner_id: 'user-456' } },
      action: 'delete'
    });

    console.log(`📊 Owner test result: ${result3b.effect.toUpperCase()}`);
    console.log(`   Explanation: ${result3b.explanation}`);

    // Test case 3: Regular user (should be denied)
    const result3c = engine.evaluatePolicies('tenant-123', {
      principal: { id: 'user-789', attributes: { role: 'user' } },
      resource: { type: 'document', id: 'doc-789', attributes: { owner_id: 'user-456' } },
      action: 'delete'
    });

    console.log(`📊 Regular user test result: ${result3c.effect.toUpperCase()}`);
    console.log(`   Explanation: ${result3c.explanation}`);

    // Test 4: Policy priority and override
    console.log("\n📝 Test 4: Policy Priority and Override");
    console.log("--------------------------------------");
    
    const lowPriorityPolicy = engine.createPolicy('tenant-123', 'LowPriority', '1.0', [
      {
        id: 'rule-1',
        description: 'Allow all access (low priority)',
        condition: { attribute: 'resource.type', operator: '=', value: 'document' },
        effect: 'allow'
      }
    ], 1); // Low priority

    const highPriorityPolicy = engine.createPolicy('tenant-123', 'HighPriority', '1.0', [
      {
        id: 'rule-1',
        description: 'Deny access to sensitive documents (high priority)',
        condition: { attribute: 'resource.classification', operator: '=', value: 'sensitive' },
        effect: 'deny'
      }
    ], 100); // High priority

    console.log(`✅ Created low priority policy: ${lowPriorityPolicy.name} (priority: ${lowPriorityPolicy.priority})`);
    console.log(`✅ Created high priority policy: ${highPriorityPolicy.name} (priority: ${highPriorityPolicy.priority})`);

    const result4 = engine.evaluatePolicies('tenant-123', {
      principal: { id: 'user-123', attributes: {} },
      resource: { type: 'document', id: 'doc-123', attributes: { classification: 'sensitive' } },
      action: 'read'
    });

    console.log(`📊 Priority test result: ${result4.effect.toUpperCase()}`);
    console.log(`   Explanation: ${result4.explanation}`);
    if (result4.ruleId) console.log(`   Applied rule from: ${result4.ruleDescription}`);

    // Test 5: Cache demonstration
    console.log("\n📝 Test 5: Cache Demonstration");
    console.log("-----------------------------");
    
    const cacheTestContext = {
      principal: { id: 'cached-user', attributes: {} },
      resource: { type: 'invoice', id: 'cached-inv', attributes: {} },
      action: 'read'
    };

    const result5a = engine.evaluatePolicies('tenant-123', cacheTestContext);
    const result5b = engine.evaluatePolicies('tenant-123', cacheTestContext); // Should be cached

    console.log(`📊 First evaluation: ${result5a.effect.toUpperCase()} (${result5a.explanation})`);
    console.log(`📊 Second evaluation: ${result5b.effect.toUpperCase()} (${result5b.explanation})`);
    console.log(`   Cache working: ${result5b.explanation.includes('cached') ? '✅ YES' : '❌ NO'}`);

    console.log("\n🎯 Policy Engine Features Demonstrated:");
    console.log("• JSON-based policy definition with versioning");
    console.log("• Deterministic rule evaluation with AND/OR logic");
    console.log("• Priority-based policy resolution");
    console.log("• Attribute-based conditions (principal, resource, context)");
    console.log("• Policy override capabilities");
    console.log("• Caching for performance optimization");
    console.log("• Multi-tenant policy management");
    console.log("• Explainable policy decisions");

    console.log("\n📊 Summary:");
    console.log(`• Policies created: ${engine.policies.size}`);
    console.log(`• Cache entries: ${engine.cache.size}`);
    console.log(`• Active policies: ${Array.from(engine.policies.values()).filter(p => p.status === 'active').length}`);

    console.log("\n🔧 Next Steps:");
    console.log("• Integrate with PostgreSQL for persistent policy storage");
    console.log("• Add Redis caching for policy evaluation results");
    console.log("• Implement policy versioning and rollback capabilities");
    console.log("• Add policy simulation and testing tools");
    console.log("• Connect to audit service for policy evaluation logging");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the tests
runPolicyTests();