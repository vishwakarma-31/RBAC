/**
 * ABAC Engine
 * Handles Attribute-Based Access Control evaluation separately from other authorization models
 */

import { AuthorizationRequest } from '../authorization/AuthorizationEngine';

export interface AbacEvaluationResult {
  allowed: boolean;
  reason: string;
  failedConditions?: string[];
}

export class AbacEngine {
  async evaluate(request: AuthorizationRequest): Promise<AbacEvaluationResult> {
    const failedConditions: string[] = [];

    // Check resource ownership
    if (request.resource.attributes?.owner_id && 
        request.resource.attributes.owner_id !== request.principalId) {
      failedConditions.push(
        `Resource owner mismatch: expected ${request.resource.attributes.owner_id}, got ${request.principalId}`
      );
    }

    // Check principal department if principal attributes are provided
    if (request.principal?.attributes?.department && 
        request.resource.attributes?.required_department &&
        request.principal.attributes.department !== request.resource.attributes.required_department) {
      failedConditions.push(
        `Department mismatch: required ${request.resource.attributes.required_department}, got ${request.principal.attributes.department}`
      );
    }

    // Check resource sensitivity if principal attributes are provided
    if (request.resource.attributes?.sensitivity && 
        request.principal?.attributes?.clearance_level &&
        request.resource.attributes.sensitivity > request.principal.attributes.clearance_level) {
      failedConditions.push(
        `Clearance level insufficient: ${request.principal.attributes.clearance_level} < ${request.resource.attributes.sensitivity}`
      );
    }

    return {
      allowed: failedConditions.length === 0,
      reason: failedConditions.length === 0 ? 
        "All ABAC conditions satisfied" : 
        `ABAC conditions failed: ${failedConditions.join(", ")}`,
      failedConditions
    };
  }
}