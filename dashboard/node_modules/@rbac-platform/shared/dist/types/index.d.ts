/**
 * Shared TypeScript interfaces for the Authorization Platform
 * Used across all services for consistent type definitions
 */
export interface Tenant {
    id: string;
    name: string;
    slug: string;
    status: 'active' | 'inactive' | 'suspended';
    created_at: Date;
    updated_at: Date;
}
export interface Principal {
    id: string;
    tenant_id: string;
    email: string;
    name: string;
    type: 'user' | 'service_account';
    status: 'active' | 'inactive' | 'suspended';
    attributes: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
}
export interface Role {
    id: string;
    tenant_id: string;
    name: string;
    description?: string;
    parent_role_id?: string;
    level: number;
    is_system_role: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface Permission {
    id: string;
    tenant_id: string;
    name: string;
    resource_type: string;
    action: string;
    description?: string;
    created_at: Date;
    updated_at: Date;
}
export interface RolePermission {
    id: string;
    role_id: string;
    permission_id: string;
    created_at: Date;
}
export interface PrincipalRole {
    id: string;
    principal_id: string;
    role_id: string;
    granted_by: string;
    granted_at: Date;
    expires_at?: Date;
    is_active: boolean;
}
export interface RoleConstraint {
    id: string;
    tenant_id: string;
    name: string;
    description?: string;
    constraint_type: 'static_sod' | 'dynamic_sod';
    role_set: string[];
    violation_action: 'deny' | 'alert';
    created_at: Date;
    updated_at: Date;
}
export interface Policy {
    id: string;
    tenant_id: string;
    name: string;
    version: string;
    description?: string;
    priority: number;
    rules: PolicyRule[];
    status: 'active' | 'inactive' | 'draft';
    created_at: Date;
    updated_at: Date;
}
export interface PolicyRule {
    id: string;
    condition: PolicyCondition;
    effect: 'allow' | 'deny';
    explanation?: string;
}
export interface PolicyCondition {
    operator: 'and' | 'or' | 'not';
    operands: (PolicyCondition | PolicyExpression)[];
}
export interface PolicyExpression {
    attribute: string;
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains';
    value: unknown;
}
export interface Resource {
    type: string;
    id: string;
    attributes?: Record<string, unknown>;
}
export interface AuthorizationRequest {
    tenantId: string;
    principalId: string;
    action: string;
    resource: Resource;
    context?: Record<string, unknown>;
}
export interface AuthorizationResponse {
    allowed: boolean;
    reason: string;
    policy_evaluated?: string;
    failed_conditions?: string[];
    explanation: string;
    evaluated_at: Date;
    cache_hit?: boolean;
}
export interface AuditLog {
    id: string;
    tenant_id: string;
    principal_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    decision: 'allowed' | 'denied';
    reason: string;
    policy_evaluated?: string;
    request_hash: string;
    previous_hash: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}
export interface CacheKey {
    tenant_id: string;
    principal_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
}
export interface ServiceToken {
    service_id: string;
    tenant_id?: string;
    permissions: string[];
    expires_at: Date;
    issued_at: Date;
}
export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: Date;
}
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
