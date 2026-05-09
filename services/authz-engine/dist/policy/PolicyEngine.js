"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
const mongodb_1 = require("mongodb");
const config_1 = __importDefault(require("../config"));
class PolicyEngine {
    constructor(appConfig) {
        this.evaluationCache = new Map();
        const config = appConfig || config_1.default;
        this.client = new mongodb_1.MongoClient(config.database.connectionString, {
            maxPoolSize: config.database.maxPoolSize,
            minPoolSize: config.database.minPoolSize,
            serverSelectionTimeoutMS: config.database.serverSelectionTimeoutMs,
            socketTimeoutMS: config.database.socketTimeoutMs,
        });
        this.db = this.client.db(config.database.databaseName);
    }
    async connect() {
        await this.client.connect();
    }
    async disconnect() {
        await this.client.close();
    }
    async createPolicy(tenantId, name, version, rules, description, priority = 0, status = 'active') {
        const policy = {
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
        this.validatePolicyRules(policy.rules);
        const collection = this.db.collection('policies');
        await collection.insertOne(policy);
        return policy;
    }
    async evaluatePolicies(tenantId, context) {
        const cacheKey = this.generateCacheKey(tenantId, context);
        const cachedResult = this.evaluationCache.get(cacheKey);
        if (cachedResult) {
            return {
                ...cachedResult,
                explanation: `${cachedResult.explanation} (cached)`
            };
        }
        const collection = this.db.collection('policies');
        const cursor = collection.find({
            tenantId: tenantId,
            status: 'active'
        }).sort({ priority: -1 });
        const activePolicies = await cursor.toArray();
        for (const policy of activePolicies) {
            const result = this.evaluatePolicy(policy, context);
            if (result.matched) {
                this.evaluationCache.set(cacheKey, result);
                return result;
            }
        }
        return {
            matched: false,
            effect: 'allow',
            explanation: 'No applicable policies matched the request'
        };
    }
    evaluatePolicy(policy, context) {
        const sortedRules = [...policy.rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
        const failedConditions = [];
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
            }
            else {
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
    evaluateRule(rule, context) {
        const result = this.evaluateCondition(rule.condition, context);
        return {
            matched: result.satisfied,
            failedConditions: result.failedConditions
        };
    }
    evaluateCondition(condition, context) {
        if (this.isConditionGroup(condition)) {
            return this.evaluateConditionGroup(condition, context);
        }
        const simpleCondition = condition;
        return this.evaluateSimpleCondition(simpleCondition, context);
    }
    evaluateConditionGroup(group, context) {
        const failedConditions = [];
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
            const orFailedConditions = [];
            for (const condition of group.conditions) {
                const result = this.evaluateCondition(condition, context);
                if (result.satisfied) {
                    anySatisfied = true;
                    orFailedConditions.length = 0;
                    break;
                }
                else {
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
    evaluateSimpleCondition(condition, context) {
        const { attribute, operator, value, values } = condition;
        const attributeValue = this.getAttributeValue(attribute, context);
        if (operator === 'exists') {
            const exists = attributeValue !== undefined && attributeValue !== null;
            return {
                satisfied: exists,
                failedConditions: exists ? [] : [`${attribute} does not exist`]
            };
        }
        if (attributeValue === undefined || attributeValue === null) {
            return {
                satisfied: false,
                failedConditions: [`${attribute} is undefined or null`]
            };
        }
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
    getAttributeValue(attribute, context) {
        if (attribute === 'principal.id')
            return context.principal.id;
        if (attribute === 'resource.type')
            return context.resource.type;
        if (attribute === 'resource.id')
            return context.resource.id;
        if (attribute === 'action')
            return context.action;
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
        return undefined;
    }
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }
    isConditionGroup(condition) {
        return condition && typeof condition === 'object' && 'operator' in condition && 'conditions' in condition;
    }
    validatePolicyRules(rules) {
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
    validateCondition(condition) {
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
        }
        else {
            const simpleCondition = condition;
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
    generateId() {
        return 'policy-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    generateCacheKey(tenantId, context) {
        return `${tenantId}:${context.principal.id}:${context.action}:${context.resource.type}:${context.resource.id}`;
    }
    async getActivePolicies(tenantId) {
        const collection = this.db.collection('policies');
        const cursor = collection.find({
            tenantId: tenantId,
            status: 'active'
        }).sort({ priority: -1 });
        return cursor.toArray();
    }
    async updatePolicyStatus(policyId, status) {
        const collection = this.db.collection('policies');
        const result = await collection.updateOne({ id: policyId }, { $set: { status, updatedAt: new Date() } });
        if (result.matchedCount === 0) {
            throw new Error('Policy not found');
        }
        this.evaluationCache.clear();
    }
    getEvaluationStats() {
        return {
            cacheSize: this.evaluationCache.size,
            cacheHitRate: 0
        };
    }
}
exports.PolicyEngine = PolicyEngine;
//# sourceMappingURL=PolicyEngine.js.map