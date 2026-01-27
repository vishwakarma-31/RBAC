/**
 * Authorization Middleware
 * Reusable middleware for Express.js applications
 */

import { AuthorizationEngine, AuthorizationRequest } from '../authorization/AuthorizationEngine';

export interface AuthorizationMiddlewareOptions {
  tenantId?: string;
  extractTenantId?: (req: any) => string;
  extractPrincipalId: (req: any) => string;
  extractResource: (req: any) => {
    type: string;
    id: string;
    attributes?: Record<string, any>;
  };
  extractAction?: (req: any) => string;
  extractPrincipalAttributes?: (req: any) => Record<string, any>;
  extractContext?: (req: any) => Record<string, any>;
  unauthorizedHandler?: (req: any, res: any, result: any) => void;
  cache?: boolean;
}

export interface AuthorizationRequestWithMiddleware extends AuthorizationRequest {
  middleware?: {
    route: string;
    method: string;
    timestamp: Date;
  };
}

export function createAuthorizationMiddleware(options: AuthorizationMiddlewareOptions) {
  const authzEngine = new AuthorizationEngine();
  const defaultActionMap: Record<string, string> = {
    'GET': 'read',
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete'
  };

  return async (req: any, res: any, next: any) => {
    try {
      // Extract tenant ID
      const tenantId = options.extractTenantId 
        ? options.extractTenantId(req) 
        : options.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          error: 'Missing tenant ID',
          message: 'Tenant ID is required for authorization'
        });
      }

      // Extract principal ID
      const principalId = options.extractPrincipalId(req);
      if (!principalId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Principal ID not found in request'
        });
      }

      // Extract resource
      const resource = options.extractResource(req);
      if (!resource?.type || !resource?.id) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Resource type and ID are required'
        });
      }

      // Extract action (default to HTTP method mapping)
      const action = options.extractAction 
        ? options.extractAction(req) 
        : defaultActionMap[req.method] || 'read';

      // Extract optional attributes
      const principalAttributes = options.extractPrincipalAttributes?.(req) || {};
      const context = options.extractContext?.(req) || {};

      // Create authorization request
      const authRequest: AuthorizationRequestWithMiddleware = {
        tenantId,
        principalId,
        action,
        resource: {
          type: resource.type,
          id: resource.id,
          attributes: resource.attributes || {}
        },
        principal: {
          id: principalId,
          attributes: principalAttributes
        },
        context,
        middleware: {
          route: req.route?.path || req.url,
          method: req.method,
          timestamp: new Date()
        }
      };

      // Evaluate authorization
      const result = await authzEngine.evaluate(authRequest);

      // Attach result to request for downstream use
      req.authorization = result;

      // Handle denied requests
      if (!result.allowed) {
        if (options.unauthorizedHandler) {
          return options.unauthorizedHandler(req, res, result);
        }

        return res.status(403).json({
          error: 'Forbidden',
          allowed: false,
          reason: result.reason,
          explanation: result.explanation,
          policy_evaluated: result.policy_evaluated,
          failed_conditions: result.failed_conditions,
          evaluated_at: result.evaluated_at,
          cache_hit: result.cache_hit
        });
      }

      // Authorization granted - proceed to next middleware
      next();

    } catch (error) {
      console.error('Authorization middleware error:', error);
      return res.status(500).json({
        error: 'Authorization evaluation failed',
        message: (error as Error).message
      });
    }
  };
}

/**
 * Helper to create role-based middleware
 * Usage: requirePermission('invoice.read', 'invoice.create')
 */
export function requirePermission(...permissions: string[]) {
  return createAuthorizationMiddleware({
    extractPrincipalId: (req) => req.user?.id || req.headers['x-principal-id'],
    extractResource: (req) => ({
      type: req.params.resourceType || req.params.type || 'resource',
      id: req.params.resourceId || req.params.id || 'unknown'
    }),
    extractAction: (req) => {
      const actionMap: Record<string, string> = {
        'GET': 'read',
        'POST': 'create',
        'PUT': 'update',
        'PATCH': 'update',
        'DELETE': 'delete'
      };
      return actionMap[req.method] || 'read';
    },
    extractContext: (req) => ({
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      method: req.method,
      url: req.url
    })
  });
}

/**
 * Helper to create admin-only middleware
 */
export function requireAdmin() {
  return createAuthorizationMiddleware({
    extractPrincipalId: (req) => req.user?.id || req.headers['x-principal-id'],
    extractResource: () => ({
      type: 'system',
      id: 'admin'
    }),
    extractAction: () => 'admin',
    extractContext: (req) => ({
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      method: req.method,
      url: req.url
    })
  });
}

/**
 * Helper to create tenant isolation middleware
 */
export function requireTenantAccess(tenantIdParam: string = 'tenantId') {
  return createAuthorizationMiddleware({
    extractTenantId: (req) => req.params[tenantIdParam] || req.body.tenantId || req.headers['x-tenant-id'],
    extractPrincipalId: (req) => req.user?.id || req.headers['x-principal-id'],
    extractResource: (req) => ({
      type: 'tenant',
      id: req.params[tenantIdParam] || req.body.tenantId || 'unknown'
    }),
    extractAction: () => 'access'
  });
}

// Default unauthorized handler
export function defaultUnauthorizedHandler(req: any, res: any, result: any) {
  return res.status(403).json({
    error: 'Forbidden',
    allowed: false,
    reason: result.reason,
    explanation: result.explanation,
    evaluated_at: result.evaluated_at
  });
}

// Export types
export { AuthorizationEngine, AuthorizationRequest };
