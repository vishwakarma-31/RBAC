/**
 * Shared TypeScript interfaces for the Authorization Platform
 * Used across all services for consistent type definitions
 */

// Core Entity Types
export interface Tenant {
  id: string; // UUID
  name: string;
  slug: string; // Unique identifier for API routes
  status: 'active' | 'inactive' | 'suspended';
  created_at: Date;
  updated_at: Date;
}

export interface Principal {
  id: string; // UUID
  tenant_id: string; // Foreign key to tenants
  email: string;
  name: string;
  type: 'user' | 'service_account';
  status: 'active' | 'inactive' | 'suspended';
  attributes: Record<string, unknown>; // Custom attributes for ABAC
  created_at: Date;
  updated_at: Date;
}

export interface Role {
  id: string; // UUID
  tenant_id: string; // Foreign key to tenants
  name: string;
  description?: string;
  parent_role_id?: string; // For hierarchical RBAC
  level: number; // Hierarchy level (0 = root)
  is_system_role: boolean; // Global system roles
  created_at: Date;
  updated_at: Date;
}

export interface Permission {
  id: string; // UUID
  tenant_id: string; // Foreign key to tenants
  name: string; // e.g., "invoice.create"
  resource_type: string; // e.g., "invoice"
  action: string; // e.g., "create", "read", "update", "delete"
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RolePermission {
  id: string; // UUID
  role_id: string; // Foreign key to roles
  permission_id: string; // Foreign key to permissions
  created_at: Date;
}

export interface PrincipalRole {
  id: string; // UUID
  principal_id: string; // Foreign key to principals
  role_id: string; // Foreign key to roles
  granted_by: string; // Principal ID who granted this role
  granted_at: Date;
  expires_at?: Date; // For time-bound role assignments
  is_active: boolean;
}

// Role Constraints (Separation of Duties)
export interface RoleConstraint {
  id: string; // UUID
  tenant_id: string; // Foreign key to tenants
  name: string;
  description?: string;
  constraint_type: 'static_sod' | 'dynamic_sod'; // Static or Dynamic SoD
  role_set: string[]; // Array of role IDs that are mutually exclusive
  violation_action: 'deny' | 'alert'; // What to do on violation
  created_at: Date;
  updated_at: Date;
}

// Policy Engine Types
export interface Policy {
  id: string; // UUID
  tenant_id: string; // Foreign key to tenants
  name: string;
  version: string; // Semantic versioning
  description?: string;
  priority: number; // Higher number = higher precedence
  rules: PolicyRule[];
  status: 'active' | 'inactive' | 'draft';
  created_at: Date;
  updated_at: Date;
}

export interface PolicyRule {
  id: string;
  condition: PolicyCondition; // Boolean expression
  effect: 'allow' | 'deny'; // Permit or forbid
  explanation?: string; // Human-readable explanation
}

export interface PolicyCondition {
  operator: 'and' | 'or' | 'not';
  operands: (PolicyCondition | PolicyExpression)[];
}

export interface PolicyExpression {
  attribute: string; // e.g., "resource.owner_id"
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains';
  value: unknown;
}

// Resource Types
export interface Resource {
  type: string; // e.g., "invoice", "document"
  id: string; // Resource identifier
  attributes?: Record<string, unknown>; // Resource-specific attributes
}

// Authorization Request/Response
export interface AuthorizationRequest {
  tenantId: string;
  principalId: string;
  action: string;
  resource: Resource;
  context?: Record<string, unknown>; // Additional context for evaluation
}

export interface AuthorizationResponse {
  allowed: boolean;
  reason: string;
  policy_evaluated?: string; // Policy name that influenced decision
  failed_conditions?: string[]; // Specific conditions that failed
  explanation: string; // Human-readable explanation
  evaluated_at: Date;
  cache_hit?: boolean; // Whether result came from cache
}

// Audit Logging
export interface AuditLog {
  id: string; // UUID
  tenant_id: string;
  principal_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  decision: 'allowed' | 'denied';
  reason: string;
  policy_evaluated?: string;
  request_hash: string; // SHA-256 of request for tamper detection
  previous_hash: string; // For hash chaining
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Cache Keys
export interface CacheKey {
  tenant_id: string;
  principal_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
}

// Service Communication Types
export interface ServiceToken {
  service_id: string;
  tenant_id?: string; // Optional for system-level services
  permissions: string[];
  expires_at: Date;
  issued_at: Date;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// Pagination
export interface PaginationOptions {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}