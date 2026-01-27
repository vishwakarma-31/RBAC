#!/usr/bin/env node

// Debug policy evaluation
class SimplePolicyEngine {
  constructor() {
    this.policies = new Map();
  }

  createPolicy(tenantId, name, version, rules) {
    const policy = {
      id: `policy-${Date.now()}`,
      tenantId,
      name,
      version,
      rules,
      status: 'active'
    };
    this.policies.set(policy.id, policy);
    return policy;
  }

  evaluatePolicies(tenantId, context) {
    const activePolicies = Array.from(this.policies.values())
      .filter(p => p.tenantId === tenantId && p.status === 'active');

    for (const policy of activePolicies) {
      const result = this.evaluatePolicy(policy, context);
      if (result.matched) return result;
    }

    return { matched: false, effect: 'deny', explanation: 'No match' };
  }

  evaluatePolicy(policy, context) {
    for (const rule of policy.rules) {
      const result = this.evaluateRule(rule, context);
      if (result.matched) {
        return {
          matched: true,
          effect: rule.effect,
          explanation: rule.description
        };
      }
    }
    return { matched: false, effect: 'deny', explanation: 'No rules matched' };
  }

  evaluateRule(rule, context) {
    const satisfied = this.evaluateCondition(rule.condition, context);
    return { matched: satisfied };
  }

  evaluateCondition(condition, context) {
    if (condition.operator === 'or') {
      console.log('Evaluating OR condition with', condition.conditions.length, 'sub-conditions');
      for (let i = 0; i < condition.conditions.length; i++) {
        const subCondition = condition.conditions[i];
        console.log(`  Sub-condition ${i + 1}:`, subCondition);
        const result = this.evaluateSimpleCondition(subCondition, context);
        console.log(`    Result: ${result}`);
        if (result) return true;
      }
      return false;
    }
    
    return this.evaluateSimpleCondition(condition, context);
  }

  evaluateSimpleCondition(condition, context) {
    const { attribute, operator, value } = condition;
    console.log(`Evaluating: ${attribute} ${operator} ${value}`);
    
    let attrValue;
    if (attribute === 'principal.id') attrValue = context.principal.id;
    else if (attribute === 'resource.type') attrValue = context.resource.type;
    else if (attribute === 'resource.id') attrValue = context.resource.id;
    else if (attribute === 'principal.role') attrValue = context.principal.attributes.role;
    else if (attribute === 'resource.owner_id') attrValue = context.resource.attributes.owner_id;

    console.log(`  Attribute value: ${attrValue}`);
    console.log(`  Comparing against: ${value}`);

    // Special case: if value is 'principal.id', compare against actual principal ID
    const compareValue = value === 'principal.id' ? context.principal.id : value;

    switch (operator) {
      case '=': return attrValue === compareValue;
      case '!=': return attrValue !== compareValue;
      default: return false;
    }
  }
}

const engine = new SimplePolicyEngine();

const policy = engine.createPolicy('tenant-123', 'TestPolicy', '1.0', [
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

console.log('Created policy:', policy.name);

// Test case: document owner
const context = {
  principal: { id: 'user-456', attributes: { role: 'user' } },
  resource: { type: 'document', id: 'doc-789', attributes: { owner_id: 'user-456' } },
  action: 'delete'
};

console.log('\n--- Evaluating policy ---');
const result = engine.evaluatePolicies('tenant-123', context);
console.log('Result:', result);