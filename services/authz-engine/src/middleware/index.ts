/**
 * RBAC Middleware Index
 * Entry point for RBAC middleware exports
 */

// Core middleware
export * from './authorization.middleware';

// Express integration helpers
export * from './express.integration';

// Constants and defaults
export * from './constants';

// Default export
import * as RBACMiddleware from './express.integration';
export default RBACMiddleware;