/**
 * Shared constants used across the Authorization Platform
 */
export declare const DATABASE: {
    readonly MAX_IDENTIFIER_LENGTH: 63;
    readonly UUID_LENGTH: 36;
    readonly DEFAULT_PAGE_SIZE: 50;
    readonly MAX_PAGE_SIZE: 1000;
};
export declare const CACHE: {
    readonly TTL: {
        readonly AUTHORIZATION_DECISION: 300;
        readonly ROLE_HIERARCHY: 3600;
        readonly POLICY: 1800;
        readonly TENANT_CONFIG: 7200;
    };
    readonly PREFIXES: {
        readonly AUTHZ_DECISION: "authz:";
        readonly ROLE_HIERARCHY: "role-hierarchy:";
        readonly POLICY: "policy:";
        readonly TENANT: "tenant:";
    };
};
export declare const SECURITY: {
    readonly MIN_PASSWORD_LENGTH: 12;
    readonly JWT_EXPIRATION: "1h";
    readonly REFRESH_TOKEN_EXPIRATION: "7d";
    readonly HASH_ALGORITHM: "sha256";
    readonly HASH_CHAIN_SEED: "authorization-platform-audit-log";
};
export declare const AUTHORIZATION: {
    readonly SYSTEM_TENANT_ID: "00000000-0000-0000-0000-000000000000";
    readonly ROOT_ROLE_NAME: "system:root";
    readonly DEFAULT_PERMISSIONS: readonly ["tenant.read", "tenant.update", "principal.read", "principal.create", "role.read", "role.create", "permission.read"];
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly ACCEPTED: 202;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly NOT_IMPLEMENTED: 501;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const ERROR_CODES: {
    readonly TENANT_NOT_FOUND: "TENANT_NOT_FOUND";
    readonly TENANT_SUSPENDED: "TENANT_SUSPENDED";
    readonly TENANT_SLUG_EXISTS: "TENANT_SLUG_EXISTS";
    readonly PRINCIPAL_NOT_FOUND: "PRINCIPAL_NOT_FOUND";
    readonly PRINCIPAL_SUSPENDED: "PRINCIPAL_SUSPENDED";
    readonly INVALID_CREDENTIALS: "INVALID_CREDENTIALS";
    readonly ROLE_NOT_FOUND: "ROLE_NOT_FOUND";
    readonly ROLE_CONFLICT: "ROLE_CONFLICT";
    readonly ROLE_HIERARCHY_CYCLE: "ROLE_HIERARCHY_CYCLE";
    readonly ROLE_CONSTRAINT_VIOLATION: "ROLE_CONSTRAINT_VIOLATION";
    readonly PERMISSION_NOT_FOUND: "PERMISSION_NOT_FOUND";
    readonly PERMISSION_DENIED: "PERMISSION_DENIED";
    readonly POLICY_NOT_FOUND: "POLICY_NOT_FOUND";
    readonly POLICY_SYNTAX_ERROR: "POLICY_SYNTAX_ERROR";
    readonly POLICY_EVALUATION_ERROR: "POLICY_EVALUATION_ERROR";
    readonly AUTHORIZATION_DENIED: "AUTHORIZATION_DENIED";
    readonly INVALID_REQUEST: "INVALID_REQUEST";
    readonly DATABASE_ERROR: "DATABASE_ERROR";
    readonly CACHE_ERROR: "CACHE_ERROR";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
};
export declare const AUDIT_EVENTS: {
    readonly AUTHORIZATION_DECISION: "authorization.decision";
    readonly ROLE_ASSIGNED: "role.assigned";
    readonly ROLE_REVOKED: "role.revoked";
    readonly PERMISSION_GRANTED: "permission.granted";
    readonly PERMISSION_REVOKED: "permission.revoked";
    readonly POLICY_CREATED: "policy.created";
    readonly POLICY_UPDATED: "policy.updated";
    readonly POLICY_DELETED: "policy.deleted";
    readonly TENANT_CREATED: "tenant.created";
    readonly TENANT_UPDATED: "tenant.updated";
    readonly PRINCIPAL_CREATED: "principal.created";
    readonly PRINCIPAL_UPDATED: "principal.updated";
};
export declare const ACTIONS: {
    readonly CREATE: "create";
    readonly READ: "read";
    readonly UPDATE: "update";
    readonly DELETE: "delete";
    readonly LIST: "list";
    readonly EXECUTE: "execute";
};
export declare const RESOURCE_TYPES: {
    readonly TENANT: "tenant";
    readonly PRINCIPAL: "principal";
    readonly ROLE: "role";
    readonly PERMISSION: "permission";
    readonly POLICY: "policy";
    readonly AUDIT_LOG: "audit_log";
};
export declare const RATE_LIMITS: {
    readonly AUTHORIZATION_API: {
        readonly POINTS: 1000;
        readonly DURATION: 60;
    };
    readonly MANAGEMENT_API: {
        readonly POINTS: 100;
        readonly DURATION: 60;
    };
};
export declare const PAGINATION: {
    readonly DEFAULT_PAGE: 1;
    readonly DEFAULT_LIMIT: 50;
    readonly MAX_LIMIT: 1000;
};
export declare const LOG_LEVELS: {
    readonly ERROR: "error";
    readonly WARN: "warn";
    readonly INFO: "info";
    readonly DEBUG: "debug";
    readonly TRACE: "trace";
};
export declare const SERVICES: {
    readonly AUTHZ_ENGINE: "authz-engine";
    readonly MANAGEMENT_API: "management-api";
    readonly AUDIT_SERVICE: "audit-service";
};
export declare const ENV_VARS: {
    readonly NODE_ENV: "NODE_ENV";
    readonly PORT: "PORT";
    readonly DATABASE_URL: "DATABASE_URL";
    readonly REDIS_URL: "REDIS_URL";
    readonly JWT_SECRET: "JWT_SECRET";
    readonly ENCRYPTION_KEY: "ENCRYPTION_KEY";
    readonly LOG_LEVEL: "LOG_LEVEL";
    readonly ENABLE_AUDIT_LOGGING: "ENABLE_AUDIT_LOGGING";
};
