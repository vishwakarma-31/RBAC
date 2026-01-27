"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAuthorization = handleAuthorization;
const AuthorizationEngine_1 = require("../authorization/AuthorizationEngine");
const authzEngine = new AuthorizationEngine_1.AuthorizationEngine();
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}
async function handleAuthorization(req, res) {
    try {
        const { tenantId, principalId, action, resource, principal, context } = req.body;
        if (!tenantId || !principalId || !action || !resource) {
            return sendJson(res, 400, {
                error: 'Missing required fields',
                required: ['tenantId', 'principalId', 'action', 'resource']
            });
        }
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
        const result = await authzEngine.evaluate(authRequest);
        sendJson(res, 200, {
            allowed: result.allowed,
            reason: result.reason,
            explanation: result.explanation,
            policy_evaluated: result.policy_evaluated,
            failed_conditions: result.failed_conditions,
            evaluated_at: result.evaluated_at.toISOString(),
            cache_hit: result.cache_hit
        });
    }
    catch (error) {
        console.error('Authorization evaluation error:', error);
        sendJson(res, 500, {
            error: 'Authorization evaluation failed',
            message: error.message
        });
    }
}
//# sourceMappingURL=authorization.js.map