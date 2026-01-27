/**
 * Shared constants used across the Authorization Platform
 */

// Database Constants
export const DATABASE = {
  MAX_IDENTIFIER_LENGTH: 63,
  UUID_LENGTH: 36,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 1000,
} as const;

// Cache Constants
export const CACHE = {
  TTL: {
    AUTHORIZATION_DECISION: 300, // 5 minutes
    ROLE_HIERARCHY: 3600, // 1 hour
    POLICY: 1800, // 30 minutes
    TENANT_CONFIG: 7200, // 2 hours
  },
  PREFIXES: {
    AUTHZ_DECISION: 'authz:',
    ROLE_HIERARCHY: 'role-hierarchy:',
    POLICY: 'policy:',
    TENANT: 'tenant:',
  },
} as const;

// Security Constants
export const SECURITY = {
  MIN_PASSWORD_LENGTH: 12,
  JWT_EXPIRATION: '1h',
  REFRESH_TOKEN_EXPIRATION: '7d',
  HASH_ALGORITHM: 'sha256',
  HASH_CHAIN_SEED: 'authorization-platform-audit-log',
} as const;

// Authorization Constants
export const AUTHORIZATION = {
  SYSTEM_TENANT_ID: '00000000-0000-0000-0000-000000000000',
  ROOT_ROLE_NAME: 'system:root',
  DEFAULT_PERMISSIONS: [
    'tenant.read',
    'tenant.update',
    'principal.read',
    'principal.create',
    'role.read',
    'role.create',
    'permission.read',
  ],
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Codes
export const ERROR_CODES = {
  // Tenant Errors
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  TENANT_SUSPENDED: 'TENANT_SUSPENDED',
  TENANT_SLUG_EXISTS: 'TENANT_SLUG_EXISTS',

  // Principal Errors
  PRINCIPAL_NOT_FOUND: 'PRINCIPAL_NOT_FOUND',
  PRINCIPAL_SUSPENDED: 'PRINCIPAL_SUSPENDED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Role Errors
  ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
  ROLE_CONFLICT: 'ROLE_CONFLICT',
  ROLE_HIERARCHY_CYCLE: 'ROLE_HIERARCHY_CYCLE',
  ROLE_CONSTRAINT_VIOLATION: 'ROLE_CONSTRAINT_VIOLATION',

  // Permission Errors
  PERMISSION_NOT_FOUND: 'PERMISSION_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Policy Errors
  POLICY_NOT_FOUND: 'POLICY_NOT_FOUND',
  POLICY_SYNTAX_ERROR: 'POLICY_SYNTAX_ERROR',
  POLICY_EVALUATION_ERROR: 'POLICY_EVALUATION_ERROR',

  // Authorization Errors
  AUTHORIZATION_DENIED: 'AUTHORIZATION_DENIED',
  INVALID_REQUEST: 'INVALID_REQUEST',

  // System Errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

// Audit Event Types
export const AUDIT_EVENTS = {
  AUTHORIZATION_DECISION: 'authorization.decision',
  ROLE_ASSIGNED: 'role.assigned',
  ROLE_REVOKED: 'role.revoked',
  PERMISSION_GRANTED: 'permission.granted',
  PERMISSION_REVOKED: 'permission.revoked',
  POLICY_CREATED: 'policy.created',
  POLICY_UPDATED: 'policy.updated',
  POLICY_DELETED: 'policy.deleted',
  TENANT_CREATED: 'tenant.created',
  TENANT_UPDATED: 'tenant.updated',
  PRINCIPAL_CREATED: 'principal.created',
  PRINCIPAL_UPDATED: 'principal.updated',
} as const;

// Resource Actions
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  EXECUTE: 'execute',
} as const;

// Common Resource Types
export const RESOURCE_TYPES = {
  TENANT: 'tenant',
  PRINCIPAL: 'principal',
  ROLE: 'role',
  PERMISSION: 'permission',
  POLICY: 'policy',
  AUDIT_LOG: 'audit_log',
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  AUTHORIZATION_API: {
    POINTS: 1000, // requests
    DURATION: 60, // per minute
  },
  MANAGEMENT_API: {
    POINTS: 100,
    DURATION: 60,
  },
} as const;

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 1000,
} as const;

// Logging Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
} as const;

// Service Names
export const SERVICES = {
  AUTHZ_ENGINE: 'authz-engine',
  MANAGEMENT_API: 'management-api',
  AUDIT_SERVICE: 'audit-service',
} as const;

// Environment Variables
export const ENV_VARS = {
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  DATABASE_URL: 'DATABASE_URL',
  REDIS_URL: 'REDIS_URL',
  JWT_SECRET: 'JWT_SECRET',
  ENCRYPTION_KEY: 'ENCRYPTION_KEY',
  LOG_LEVEL: 'LOG_LEVEL',
  ENABLE_AUDIT_LOGGING: 'ENABLE_AUDIT_LOGGING',
} as const;