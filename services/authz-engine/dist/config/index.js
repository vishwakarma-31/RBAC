"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const defaultConfig = {
    database: {
        connectionString: process.env.MONGODB_ATLAS_URI || 'mongodb+srv://username:password@cluster.mongodb.net/test?retryWrites=true&w=majority',
        databaseName: process.env.MONGODB_DATABASE || 'rbac_platform',
        maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '10'),
        minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '2'),
        serverSelectionTimeoutMs: parseInt(process.env.MONGO_SERVER_SELECT_TIMEOUT || '5000'),
        socketTimeoutMs: parseInt(process.env.MONGO_SOCKET_TIMEOUT || '30000'),
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        tls: process.env.REDIS_TLS_REJECT_UNAUTHORIZED ? {
            rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED === 'true'
        } : undefined
    },
    cache: {
        ttl: {
            authorization: parseInt(process.env.CACHE_TTL_AUTHORIZATION || '300'),
            roleHierarchy: parseInt(process.env.CACHE_TTL_ROLE_HIERARCHY || '3600'),
            policy: parseInt(process.env.CACHE_TTL_POLICY || '1800'),
            tenantConfig: parseInt(process.env.CACHE_TTL_TENANT_CONFIG || '7200'),
        },
        prefix: {
            authorization: process.env.CACHE_PREFIX_AUTHORIZATION || 'authz:',
            roleHierarchy: process.env.CACHE_PREFIX_ROLE_HIERARCHY || 'role-hierarchy:',
            policy: process.env.CACHE_PREFIX_POLICY || 'policy:',
            tenant: process.env.CACHE_PREFIX_TENANT || 'tenant:',
        }
    },
    rateLimit: {
        maxTokens: parseInt(process.env.RATE_LIMIT_MAX_TOKENS || '100'),
        intervalSeconds: parseInt(process.env.RATE_LIMIT_INTERVAL_SECONDS || '60')
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json'
    },
    server: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || '0.0.0.0'
    }
};
function validateConfig(config) {
    if (config.database.connectionString && !isValidConnectionString(config.database.connectionString)) {
        throw new Error('Invalid database connection string');
    }
    if (config.redis.port < 1 || config.redis.port > 65535) {
        throw new Error('Redis port must be between 1 and 65535');
    }
    if (config.cache.ttl.authorization < 1) {
        throw new Error('Authorization cache TTL must be at least 1 second');
    }
    if (config.rateLimit.maxTokens < 1) {
        throw new Error('Rate limit max tokens must be at least 1');
    }
    if (config.rateLimit.intervalSeconds < 1) {
        throw new Error('Rate limit interval must be at least 1 second');
    }
}
function isValidConnectionString(connectionString) {
    try {
        return connectionString.startsWith('mongodb+srv://') || connectionString.startsWith('mongodb://');
    }
    catch {
        return false;
    }
}
const config = (() => {
    const cfg = { ...defaultConfig };
    validateConfig(cfg);
    return cfg;
})();
exports.default = config;
//# sourceMappingURL=index.js.map