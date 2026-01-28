// Authorization route handler

import { AuthorizationEngine } from "../authorization/AuthorizationEngine";

// Create a single instance of the authorization engine
const authzEngine = new AuthorizationEngine();

function sendJson(res: any, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:3003',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

export async function handleAuthorization(req: any, res: any) {
  try {
    // Parse request body
    const { tenantId, principalId, action, resource, principal, context } = req.body;
    
    // Validate required fields
    if (!tenantId || !principalId || !action || !resource) {
      return sendJson(res, 400, {
        error: 'Missing required fields',
        required: ['tenantId', 'principalId', 'action', 'resource']
      });
    }
    
    // Create authorization request
    const authRequest = {
      tenantId,
      principalId,
      action,
      resource: {
        type: resource.type,
        id: resource.id,
        attributes: resource.attributes || {}
      },
      principal: principal || {},
      context: context || {}
    };
    
    // Evaluate authorization using the real engine
    const result = await authzEngine.evaluate(authRequest);
    
    // Return response
    sendJson(res, 200, {
      allowed: result.allowed,
      reason: result.reason,
      explanation: result.explanation,
      policy_evaluated: result.policy_evaluated,
      failed_conditions: result.failed_conditions,
      evaluated_at: result.evaluated_at.toISOString(),
      cache_hit: result.cache_hit
    });
    
  } catch (error) {
    console.error('Authorization evaluation error:', error);
    sendJson(res, 500, {
      error: 'Authorization evaluation failed',
      message: (error as Error).message
    });
  }
}