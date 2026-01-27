interface PolicyCondition {
    attribute: string;
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains' | 'exists';
    value?: any;
    values?: any[];
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
export declare class PolicyEngine {
    private dbPool;
    private evaluationCache;
    constructor();
    createPolicy(tenantId: string, name: string, version: string, rules: PolicyRule[], description?: string, priority?: number, status?: 'active' | 'inactive' | 'draft'): Promise<Policy>;
    evaluatePolicies(tenantId: string, context: PolicyEvaluationContext): Promise<PolicyEvaluationResult>;
    private evaluatePolicy;
    private evaluateRule;
    private evaluateCondition;
    private evaluateConditionGroup;
    private evaluateSimpleCondition;
    private getAttributeValue;
    private getNestedValue;
    private isConditionGroup;
    private validatePolicyRules;
    private validateCondition;
    private generateId;
    private generateCacheKey;
    getActivePolicies(tenantId: string): Promise<Policy[]>;
    updatePolicyStatus(policyId: string, status: 'active' | 'inactive' | 'draft'): Promise<void>;
    getEvaluationStats(): {
        cacheSize: number;
        cacheHitRate: number;
    };
}
export {};
//# sourceMappingURL=PolicyEngine.d.ts.map