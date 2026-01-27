/**
 * Policy Engine
 * JSON-based policy evaluation with deterministic rule processing
 */

interface PolicyCondition {
  attribute: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains' | 'exists';
  value?: any;
  values?: any[]; // For 'in' operator
}

interface PolicyRule {
  id: string;
  description?: string;
  condition: PolicyCondition | PolicyConditionGroup;
  effect: 'allow' | 'deny';
  priority?: number;
}

interface PolicyConditionGroup {
  operator: 'and' | 'or' | 'not';
  conditions: (PolicyCondition | PolicyConditionGroup)[];
}

interface Policy {
  id: string;
  tenantId: string;
  name: string;
  version: string;
  description?: string;
  priority: number;
  rules: PolicyRule[];
  status: 'active' | 'inactive' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyEvaluationContext {
  principal: {
    id: string;
    attributes: Record<string, any>;
  };
  resource: {
    type: string;
    id: string;
    attributes: Record<string, any>;
  };
  action: string;
  context?: Record<string, any>;
}

interface PolicyEvaluationResult {
  matched: boolean;
  effect: 'allow' | 'deny';
  ruleId?: string;
  ruleDescription?: string;
  explanation: string;
  failedConditions?: string[];
}

import { Pool } from 'pg';

export class PolicyEngine {
  private dbPool: Pool;
  private evaluationCache: Map<string, PolicyEvaluationResult> = new Map();
  
  constructor() {
    this.dbPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/rbac_platform',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Create a new policy
   */
  async createPolicy(
    tenantId: string,
    name: string,
    version: string,
    rules: PolicyRule[],
    description?: string,
    priority: number = 0,
    status: 'active' | 'inactive' | 'draft' = 'active'
  ): Promise<Policy> {
    const policy: Policy = {
      id: this.generateId(),
      tenantId,
      name,
      version,
      description,
      priority,
      rules: rules.map((rule, index) => ({
        ...rule,
        id: rule.id || `rule-${index}-${Date.now()}`,
        priority: rule.priority ?? 0
      })),
      status,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate policy rules
    this.validatePolicyRules(policy.rules);

    // Insert policy into database
    const insertQuery = {
      text: `INSERT INTO policies(id, tenant_id, name, version, description, priority, rules, status, created_at, updated_at)
             VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
      values: [
        policy.id, policy.tenantId, policy.name, policy.version,
        policy.description, policy.priority, JSON.stringify(policy.rules),
        policy.status, policy.createdAt, policy.updatedAt
      ]
    };
    
    const result = await this.dbPool.query(insertQuery);
    const insertedPolicy = result.rows[0];
    
    return {
      id: insertedPolicy.id,
      tenantId: insertedPolicy.tenant_id,
      name: insertedPolicy.name,
      version: insertedPolicy.version,
      description: insertedPolicy.description,
      priority: insertedPolicy.priority,
      rules: insertedPolicy.rules,
      status: insertedPolicy.status,
      createdAt: insertedPolicy.created_at,
      updatedAt: insertedPolicy.updated_at
    };
  }

  /**
   * Evaluate policies against a request
   */
  async evaluatePolicies(
    tenantId: string,
    context: PolicyEvaluationContext
  ): Promise<PolicyEvaluationResult> {
    const cacheKey = this.generateCacheKey(tenantId, context);
    
    // Check cache first
    const cachedResult = this.evaluationCache.get(cacheKey);
    if (cachedResult) {
      return {
        ...cachedResult,
        explanation: `${cachedResult.explanation} (cached)`
      };
    }

    // Get active policies for tenant, sorted by priority (highest first)
    const query = {
      text: 'SELECT * FROM policies WHERE tenant_id = $1 AND status = $2 ORDER BY priority DESC',
      values: [tenantId, 'active']
    };
    
    const result = await this.dbPool.query(query);
    const activePolicies = result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      version: row.version,
      description: row.description,
      priority: row.priority,
      rules: row.rules,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    // Evaluate policies in priority order
    for (const policy of activePolicies) {
      const result = this.evaluatePolicy(policy, context);
      if (result.matched) {
        // Cache the result
        this.evaluationCache.set(cacheKey, result);
        return result;
      }
    }

    // No matching policies
    return {
      matched: false,
      effect: 'allow', // Default to allow if no policies match
      explanation: 'No applicable policies matched the request'
    };
  }

  /**
   * Evaluate a single policy
   */
  private evaluatePolicy(
    policy: Policy,
    context: PolicyEvaluationContext
  ): PolicyEvaluationResult {
    // Sort rules by priority within the policy
    const sortedRules = [...policy.rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const failedConditions: string[] = [];

    for (const rule of sortedRules) {
      const ruleResult = this.evaluateRule(rule, context);
      if (ruleResult.matched) {
        return {
          matched: true,
          effect: rule.effect,
          ruleId: rule.id,
          ruleDescription: rule.description,
          explanation: rule.description || `Rule ${rule.id} matched with ${rule.effect} effect`,
          failedConditions: ruleResult.failedConditions
        };
      } else {
        failedConditions.push(...(ruleResult.failedConditions || []));
      }
    }

    return {
      matched: false,
      effect: 'deny',
      explanation: `No rules in policy ${policy.name} matched`,
      failedConditions
    };
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(
    rule: PolicyRule,
    context: PolicyEvaluationContext
  ): { matched: boolean; failedConditions?: string[] } {
    const result = this.evaluateCondition(rule.condition, context);
    return {
      matched: result.satisfied,
      failedConditions: result.failedConditions
    };
  }

  /**
   * Evaluate a condition or condition group
   */
  private evaluateCondition(
    condition: PolicyCondition | PolicyConditionGroup,
    context: PolicyEvaluationContext
  ): { satisfied: boolean; failedConditions: string[] } {
    // Handle condition group (and/or/not)
    if (this.isConditionGroup(condition)) {
      return this.evaluateConditionGroup(condition, context);
    }

    // Handle simple condition
    const simpleCondition = condition as PolicyCondition;
    return this.evaluateSimpleCondition(simpleCondition, context);
  }

  /**
   * Evaluate a condition group
   */
  private evaluateConditionGroup(
    group: PolicyConditionGroup,
    context: PolicyEvaluationContext
  ): { satisfied: boolean; failedConditions: string[] } {
    const failedConditions: string[] = [];

    if (group.operator === 'and') {
      let allSatisfied = true;
      for (const condition of group.conditions) {
        const result = this.evaluateCondition(condition, context);
        if (!result.satisfied) {
          allSatisfied = false;
          failedConditions.push(...result.failedConditions);
        }
      }
      return { satisfied: allSatisfied, failedConditions };
    }

    if (group.operator === 'or') {
      let anySatisfied = false;
      const orFailedConditions: string[] = [];
      for (const condition of group.conditions) {
        const result = this.evaluateCondition(condition, context);
        if (result.satisfied) {
          anySatisfied = true;
          // Clear previous failed conditions since we found a match
          orFailedConditions.length = 0;
          break;
        } else {
          orFailedConditions.push(...result.failedConditions);
        }
      }
      return { 
        satisfied: anySatisfied, 
        failedConditions: anySatisfied ? [] : orFailedConditions 
      };
    }

    if (group.operator === 'not') {
      if (group.conditions.length !== 1) {
        throw new Error('NOT operator requires exactly one condition');
      }
      const result = this.evaluateCondition(group.conditions[0], context);
      return { 
        satisfied: !result.satisfied, 
        failedConditions: result.satisfied ? 
          [`NOT condition was satisfied (expected false)`] : 
          [`NOT condition failed: ${result.failedConditions.join(', ')}`] 
      };
    }

    throw new Error(`Unknown condition operator: ${group.operator}`);
  }

  /**
   * Evaluate a simple condition
   */
  private evaluateSimpleCondition(
    condition: PolicyCondition,
    context: PolicyEvaluationContext
  ): { satisfied: boolean; failedConditions: string[] } {
    const { attribute, operator, value, values } = condition;
    
    // Extract attribute value from context
    const attributeValue = this.getAttributeValue(attribute, context);
    
    // Handle 'exists' operator
    if (operator === 'exists') {
      const exists = attributeValue !== undefined && attributeValue !== null;
      return {
        satisfied: exists,
        failedConditions: exists ? [] : [`${attribute} does not exist`]
      };
    }

    // Check if attribute exists for other operators
    if (attributeValue === undefined || attributeValue === null) {
      return {
        satisfied: false,
        failedConditions: [`${attribute} is undefined or null`]
      };
    }

    // Evaluate based on operator
    switch (operator) {
      case '=':
        const equals = attributeValue === value;
        return {
          satisfied: equals,
          failedConditions: equals ? [] : [`${attribute} (${attributeValue}) != ${value}`]
        };

      case '!=':
        const notEquals = attributeValue !== value;
        return {
          satisfied: notEquals,
          failedConditions: notEquals ? [] : [`${attribute} (${attributeValue}) == ${value}`]
        };

      case '>':
        const greater = attributeValue > value;
        return {
          satisfied: greater,
          failedConditions: greater ? [] : [`${attribute} (${attributeValue}) <= ${value}`]
        };

      case '<':
        const less = attributeValue < value;
        return {
          satisfied: less,
          failedConditions: less ? [] : [`${attribute} (${attributeValue}) >= ${value}`]
        };

      case '>=':
        const greaterEqual = attributeValue >= value;
        return {
          satisfied: greaterEqual,
          failedConditions: greaterEqual ? [] : [`${attribute} (${attributeValue}) < ${value}`]
        };

      case '<=':
        const lessEqual = attributeValue <= value;
        return {
          satisfied: lessEqual,
          failedConditions: lessEqual ? [] : [`${attribute} (${attributeValue}) > ${value}`]
        };

      case 'in':
        if (!Array.isArray(values)) {
          throw new Error("'in' operator requires 'values' array");
        }
        const inArray = values.includes(attributeValue);
        return {
          satisfied: inArray,
          failedConditions: inArray ? [] : [`${attribute} (${attributeValue}) not in [${values.join(', ')}]`]
        };

      case 'contains':
        if (!Array.isArray(attributeValue)) {
          throw new Error("'contains' operator requires attribute to be an array");
        }
        const contains = attributeValue.includes(value);
        return {
          satisfied: contains,
          failedConditions: contains ? [] : [`${attribute} does not contain ${value}`]
        };

      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Extract attribute value from context using dot notation
   */
  private getAttributeValue(attribute: string, context: PolicyEvaluationContext): any {
    // Handle special attributes
    if (attribute === 'principal.id') return context.principal.id;
    if (attribute === 'resource.type') return context.resource.type;
    if (attribute === 'resource.id') return context.resource.id;
    if (attribute === 'action') return context.action;

    // Handle nested attributes with dot notation
    if (attribute.startsWith('principal.')) {
      const key = attribute.substring('principal.'.length);
      return this.getNestedValue(context.principal.attributes, key);
    }

    if (attribute.startsWith('resource.')) {
      const key = attribute.substring('resource.'.length);
      return this.getNestedValue(context.resource.attributes, key);
    }

    if (attribute.startsWith('context.')) {
      const key = attribute.substring('context.'.length);
      return this.getNestedValue(context.context || {}, key);
    }

    // Unknown attribute
    return undefined;
  }

  /**
   * Get nested value using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Check if condition is a group
   */
  private isConditionGroup(condition: any): condition is PolicyConditionGroup {
    return condition && typeof condition === 'object' && 'operator' in condition && 'conditions' in condition;
  }

  /**
   * Validate policy rules
   */
  private validatePolicyRules(rules: PolicyRule[]): void {
    for (const rule of rules) {
      if (!rule.condition) {
        throw new Error(`Rule ${rule.id} must have a condition`);
      }
      if (!rule.effect) {
        throw new Error(`Rule ${rule.id} must have an effect (allow/deny)`);
      }
      this.validateCondition(rule.condition);
    }
  }

  /**
   * Validate a condition
   */
  private validateCondition(condition: PolicyCondition | PolicyConditionGroup): void {
    if (this.isConditionGroup(condition)) {
      if (!['and', 'or', 'not'].includes(condition.operator)) {
        throw new Error(`Invalid condition group operator: ${condition.operator}`);
      }
      if (!Array.isArray(condition.conditions) || condition.conditions.length === 0) {
        throw new Error('Condition group must have at least one condition');
      }
      for (const subCondition of condition.conditions) {
        this.validateCondition(subCondition);
      }
    } else {
      const simpleCondition = condition as PolicyCondition;
      if (!simpleCondition.attribute) {
        throw new Error('Condition must have an attribute');
      }
      if (!simpleCondition.operator) {
        throw new Error('Condition must have an operator');
      }
      if (simpleCondition.operator !== 'exists' && 
          simpleCondition.value === undefined && 
          simpleCondition.values === undefined) {
        throw new Error('Condition must have a value or values');
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return 'policy-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(tenantId: string, context: PolicyEvaluationContext): string {
    return `${tenantId}:${context.principal.id}:${context.action}:${context.resource.type}:${context.resource.id}`;
  }

  /**
   * Get active policies for a tenant
   */
  async getActivePolicies(tenantId: string): Promise<Policy[]> {
    const query = {
      text: 'SELECT * FROM policies WHERE tenant_id = $1 AND status = $2 ORDER BY priority DESC',
      values: [tenantId, 'active']
    };
    
    const result = await this.dbPool.query(query);
    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      version: row.version,
      description: row.description,
      priority: row.priority,
      rules: row.rules,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Update policy status
   */
  async updatePolicyStatus(policyId: string, status: 'active' | 'inactive' | 'draft'): Promise<void> {
    // Check if policy exists
    const checkQuery = {
      text: 'SELECT id FROM policies WHERE id = $1',
      values: [policyId]
    };
    const checkResult = await this.dbPool.query(checkQuery);
    if (checkResult.rows.length === 0) {
      throw new Error('Policy not found');
    }
    
    // Update in database
    const updateQuery = {
      text: 'UPDATE policies SET status = $1, updated_at = NOW() WHERE id = $2',
      values: [status, policyId]
    };
    await this.dbPool.query(updateQuery);
    
    // Clear cache when policy status changes
    this.evaluationCache.clear();
  }

  /**
   * Get policy evaluation statistics
   */
  getEvaluationStats(): { cacheSize: number; cacheHitRate: number } {
    // In a real implementation, you'd track hits/misses
    return {
      cacheSize: this.evaluationCache.size,
      cacheHitRate: 0 // Placeholder
    };
  }
}