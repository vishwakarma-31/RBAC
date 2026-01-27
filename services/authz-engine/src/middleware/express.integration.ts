/**
 * RBAC Express Integration
 * Easy-to-use Express.js middleware for RBAC authorization
 */

import {
  createAuthorizationMiddleware,
  requirePermission,
  requireAdmin,
  requireTenantAccess,
  AuthorizationMiddlewareOptions
} from './authorization.middleware';

// Re-export for convenience
export {
  createAuthorizationMiddleware,
  requirePermission,
  requireAdmin,
  requireTenantAccess
};

/**
 * Express.js integration helpers
 */

// Permission-based route protection
export function protectRoute(permission: string | string[]) {
  const permissions = Array.isArray(permission) ? permission : [permission];
  return requirePermission(...permissions);
}

// Resource-specific protection
export function protectResource(resourceType: string, actions: string | string[] = ['read']) {
  const actionList = Array.isArray(actions) ? actions : [actions];
  const permissions = actionList.map(action => `${resourceType}.${action}`);
  return requirePermission(...permissions);
}

// CRUD operation protection
export function protectCRUD(resourceType: string) {
  return requirePermission(
    `${resourceType}.read`,
    `${resourceType}.create`,
    `${resourceType}.update`,
    `${resourceType}.delete`
  );
}

// Ownership-based protection (requires owner_id in resource attributes)
export function protectOwnership(resourceType: string, actions: string[] = ['update', 'delete']) {
  return createAuthorizationMiddleware({
    extractPrincipalId: (req) => req.user?.id || req.headers['x-principal-id'],
    extractResource: (req) => ({
      type: resourceType,
      id: req.params.id || req.params.resourceId || 'unknown',
      attributes: {
        owner_id: req.user?.id // Owner is the requesting user
      }
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
    }
  });
}

// Department-based protection (requires department matching)
export function protectDepartment(resourceType: string) {
  return createAuthorizationMiddleware({
    extractPrincipalId: (req) => req.user?.id || req.headers['x-principal-id'],
    extractResource: (req) => ({
      type: resourceType,
      id: req.params.id || req.params.resourceId || 'unknown',
      attributes: {
        required_department: req.user?.department
      }
    }),
    extractPrincipalAttributes: (req) => ({
      department: req.user?.department
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
    }
  });
}

// Multi-tenant protection
export function protectTenant(tenantIdParam: string = 'tenantId') {
  return requireTenantAccess(tenantIdParam);
}

// Admin-only routes
export function adminOnly() {
  return requireAdmin();
}

// Public routes (no authorization required, but still logged)
export function publicRoute() {
  return (req: any, res: any, next: any) => {
    req.authorization = {
      allowed: true,
      reason: 'Public route',
      explanation: 'No authorization required',
      evaluated_at: new Date()
    };
    next();
  };
}

// Custom middleware with full control
export function customAuthorization(options: AuthorizationMiddlewareOptions) {
  return createAuthorizationMiddleware(options);
}

// Error handler for authorization failures
export function authorizationErrorHandler(err: any, req: any, res: any, next: any) {
  if (err.name === 'AuthorizationError') {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message,
      reason: err.reason,
      explanation: err.explanation
    });
  }
  next(err);
}

// Middleware to log authorization decisions (for debugging/audit)
export function logAuthorization() {
  return (req: any, res: any, next: any) => {
    if (req.authorization) {
      console.log(`[AUTHZ] ${req.method} ${req.url} - Principal: ${req.user?.id || 'anonymous'} - Allowed: ${req.authorization.allowed}`);
      if (!req.authorization.allowed) {
        console.log(`[AUTHZ] Denied reason: ${req.authorization.reason}`);
      }
    }
    next();
  };
}

// Helper to check permissions in route handlers (alternative to middleware)
export async function checkPermission(
  tenantId: string,
  principalId: string,
  action: string,
  resource: { type: string; id: string; attributes?: Record<string, any> },
  context?: Record<string, any>
) {
  const { AuthorizationEngine } = await import('./authorization.middleware');
  const engine = new AuthorizationEngine();
  
  return engine.evaluate({
    tenantId,
    principalId,
    action,
    resource,
    context
  });
}

/*
Example usage patterns:

// Basic permission check
app.get('/invoices/:id', requirePermission('invoice.read'), (req, res) => {
  // Route handler
});

// CRUD protection
app.use('/api/invoices', protectCRUD('invoice'));
app.get('/api/invoices', (req, res) => { // handler });
app.post('/api/invoices', (req, res) => { // handler });

// Resource-specific protection
app.delete('/api/invoices/:id', protectResource('invoice', 'delete'), (req, res) => {
  // Only users with invoice.delete permission can access
});

// Admin-only route
app.get('/api/admin/users', adminOnly(), (req, res) => {
  // Only admins can access
});

// Multi-tenant protection
app.use('/api/tenants/:tenantId', protectTenant('tenantId'));
app.get('/api/tenants/:tenantId/users', (req, res) => {
  // Tenant isolation enforced
});

// Custom middleware with full control
app.use('/api/custom', createAuthorizationMiddleware({
  extractTenantId: (req) => req.headers['x-tenant-id'],
  extractPrincipalId: (req) => req.user?.id,
  extractResource: (req) => ({
    type: 'custom-resource',
    id: req.params.id,
    attributes: { sensitive: true }
  }),
  extractPrincipalAttributes: (req) => ({
    clearance_level: req.user?.clearance_level
  })
}));
*/

export default {
  protectRoute,
  protectResource,
  protectCRUD,
  protectOwnership,
  protectDepartment,
  protectTenant,
  adminOnly,
  publicRoute,
  customAuthorization,
  authorizationErrorHandler,
  logAuthorization,
  checkPermission
};
