/**
 * RBAC Constants for Middleware and Policy Engine
 */

export const DEFAULT_PERMISSIONS = {
  TENANT: ['tenant.read', 'tenant.update'] as const,
  PRINCIPAL: ['principal.read', 'principal.create', 'principal.update', 'principal.delete'] as const,
  ROLE: ['role.read', 'role.create', 'role.update', 'role.delete'] as const,
  PERMISSION: ['permission.read', 'permission.create', 'permission.update', 'permission.delete'] as const,
  POLICY: ['policy.read', 'policy.create', 'policy.update', 'policy.delete'] as const,
  INVOICE: ['invoice.read', 'invoice.create', 'invoice.update', 'invoice.delete'] as const,
  DOCUMENT: ['document.read', 'document.create', 'document.update', 'document.delete'] as const,
  USER: ['user.read', 'user.create', 'user.update', 'user.delete'] as const,
  SYSTEM: ['system.admin', 'system.audit', 'system.configure'] as const
} as const;

export const RESOURCE_TYPES = {
  TENANT: 'tenant',
  PRINCIPAL: 'principal',
  ROLE: 'role',
  PERMISSION: 'permission',
  POLICY: 'policy',
  INVOICE: 'invoice',
  DOCUMENT: 'document',
  USER: 'user',
  SYSTEM: 'system'
} as const;

export const ACTIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ADMIN: 'admin',
  AUDIT: 'audit'
} as const;

export const ROLES = {
  SYSTEM_ROOT: 'system:root',
  SYSTEM_ADMIN: 'system:admin',
  TENANT_ADMIN: 'tenant:admin',
  USER_ADMIN: 'user:admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest'
} as const;

export const POLICY_OPERATORS = {
  EQUALS: '=',
  NOT_EQUALS: '!=',
  GREATER_THAN: '>',
  LESS_THAN: '<',
  GREATER_EQUAL: '>=',
  LESS_EQUAL: '<=',
  IN: 'in',
  CONTAINS: 'contains',
  EXISTS: 'exists'
} as const;

export const POLICY_LOGIC = {
  AND: 'and',
  OR: 'or',
  NOT: 'not'
} as const;

export const CONSTRAINT_TYPES = {
  STATIC_SOD: 'static_sod',
  DYNAMIC_SOD: 'dynamic_sod'
} as const;

export const CONSTRAINT_ACTIONS = {
  DENY: 'deny',
  ALERT: 'alert'
} as const;

export const CACHE_PREFIXES = {
  AUTHORIZATION: 'authz:',
  ROLE_HIERARCHY: 'role-hierarchy:',
  POLICY: 'policy:',
  TENANT: 'tenant:'
} as const;

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

export const ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
  ROLE_CONFLICT: 'ROLE_CONFLICT',
  ROLE_HIERARCHY_CYCLE: 'ROLE_HIERARCHY_CYCLE',
  ROLE_CONSTRAINT_VIOLATION: 'ROLE_CONSTRAINT_VIOLATION',
  PERMISSION_NOT_FOUND: 'PERMISSION_NOT_FOUND',
  POLICY_NOT_FOUND: 'POLICY_NOT_FOUND',
  POLICY_SYNTAX_ERROR: 'POLICY_SYNTAX_ERROR',
  POLICY_EVALUATION_ERROR: 'POLICY_EVALUATION_ERROR',
  AUTHORIZATION_DENIED: 'AUTHORIZATION_DENIED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
} as const;

export const DEFAULT_TTL = {
  AUTHORIZATION: 300, // 5 minutes
  ROLE_HIERARCHY: 3600, // 1 hour
  POLICY: 1800, // 30 minutes
  TENANT_CONFIG: 7200 // 2 hours
} as const;

// Default role-permission mappings for bootstrapping
export const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.SYSTEM_ROOT]: [
    ...DEFAULT_PERMISSIONS.TENANT,
    ...DEFAULT_PERMISSIONS.PRINCIPAL,
    ...DEFAULT_PERMISSIONS.ROLE,
    ...DEFAULT_PERMISSIONS.PERMISSION,
    ...DEFAULT_PERMISSIONS.POLICY,
    ...DEFAULT_PERMISSIONS.SYSTEM
  ],
  [ROLES.SYSTEM_ADMIN]: [
    ...DEFAULT_PERMISSIONS.TENANT,
    ...DEFAULT_PERMISSIONS.PRINCIPAL,
    ...DEFAULT_PERMISSIONS.ROLE,
    ...DEFAULT_PERMISSIONS.PERMISSION,
    ...DEFAULT_PERMISSIONS.POLICY,
    'system.audit'
  ],
  [ROLES.TENANT_ADMIN]: [
    ...DEFAULT_PERMISSIONS.PRINCIPAL,
    ...DEFAULT_PERMISSIONS.ROLE,
    ...DEFAULT_PERMISSIONS.USER,
    'tenant.update'
  ],
  [ROLES.USER_ADMIN]: [
    ...DEFAULT_PERMISSIONS.USER
  ],
  [ROLES.MANAGER]: [
    ...DEFAULT_PERMISSIONS.INVOICE,
    ...DEFAULT_PERMISSIONS.DOCUMENT
  ],
  [ROLES.USER]: [
    'invoice.read',
    'document.read',
    'user.read'
  ],
  [ROLES.GUEST]: [
    'document.read'
  ]
} as const;

// System reserved role names
export const SYSTEM_ROLES = [
  ROLES.SYSTEM_ROOT,
  ROLES.SYSTEM_ADMIN
] as const;

// Default policy rules for common scenarios
export const DEFAULT_POLICIES = {
  OWNER_ACCESS: {
    id: 'owner-access',
    description: 'Resource owners can perform all actions on their resources',
    condition: {
      operator: 'and',
      conditions: [
        {
          attribute: 'resource.owner_id',
          operator: '=',
          value: 'principal.id'
        }
      ]
    },
    effect: 'allow' as const,
    priority: 100
  },
  DEPARTMENT_ISOLATION: {
    id: 'department-isolation',
    description: 'Users can only access resources in their department',
    condition: {
      operator: 'and',
      conditions: [
        {
          attribute: 'principal.department',
          operator: '=',
          value: 'resource.department'
        }
      ]
    },
    effect: 'allow' as const,
    priority: 50
  },
  SENSITIVITY_CLEARANCE: {
    id: 'sensitivity-clearance',
    description: 'Users need sufficient clearance to access sensitive resources',
    condition: {
      operator: 'and',
      conditions: [
        {
          attribute: 'principal.clearance_level',
          operator: '>=',
          value: 'resource.sensitivity'
        }
      ]
    },
    effect: 'allow' as const,
    priority: 75
  }
} as const;