"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    corsOrigin: process.env.CORS_ORIGIN || '*',
    database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/rbac_platform',
        poolMin: parseInt(process.env.DB_POOL_MIN || '5', 10),
        poolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'development-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    },
    rateLimit: {
        windowMs: 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
    },
    cache: {
        ttl: {
            authorization: parseInt(process.env.CACHE_TTL_AUTHORIZATION || '300', 10),
            roleHierarchy: parseInt(process.env.CACHE_TTL_ROLE_HIERARCHY || '3600', 10),
            policy: parseInt(process.env.CACHE_TTL_POLICY || '1800', 10),
        },
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
    },
};
//# sourceMappingURL=index.js.map