/**
 * Policy Engine Wrapper
 * Provides a cleaner interface to the existing PolicyEngine
 */

import { AuthorizationRequest } from '../authorization/AuthorizationEngine';
import { PolicyEngine, PolicyEvaluationContext } from '../policy/PolicyEngine';

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason: string;
  policy_evaluated?: string;
  failedConditions?: string[];
}

export class PolicyEngineWrapper {
  private policyEngine: PolicyEngine;

  constructor() {
    this.policyEngine = new PolicyEngine();
  }

  async evaluate(request: AuthorizationRequest): Promise<PolicyEvaluationResult> {
    try {
      const policyContext: PolicyEvaluationContext = {
        principal: { 
          id: request.principalId, 
          attributes: request.principal?.attributes || {}
        },
        resource: {
          type: request.resource.type,
          id: request.resource.id,
          attributes: request.resource.attributes || {}
        },
        action: request.action,
        context: request.context || {}
      };
      
      const result = await this.policyEngine.evaluatePolicies(
        request.tenantId,
        policyContext
      );
      
      if (result.matched) {
        return {
          allowed: result.effect === "allow",
          reason: result.explanation,
          policy_evaluated: result.ruleId,
          failedConditions: result.failedConditions
        };
      } else {
        // No applicable policies, return neutral result allowing other controls to decide
        return {
          allowed: true,
          reason: "No applicable policies found, proceeding with other authorization controls"
        };
      }
    } catch (error) {
      console.error("Policy evaluation error:", error);
      return {
        allowed: false,
        reason: "Policy evaluation failed"
      };
    }
  }
}