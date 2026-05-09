/**
 * Centralized Configuration Management
 * Consolidates all configuration values in one place
 */

export interface AppConfig {
  // Database configuration (MongoDB Atlas)
  database: {
    connectionString: string; // MongoDB Atlas connection string (mongodb+srv://...)
    databaseName: string;      // Database name
    maxPoolSize: number;        // Max connection pool size
    minPoolSize: number;        // Min connection pool size
    serverSelectionTimeoutMs: number;
    socketTimeoutMs: number;
    maxConnections: number;     // PostgreSQL max connections
    idleTimeoutMillis: number;      // PostgreSQL idle timeout
    connectionTimeoutMillis: number; // PostgreSQL connection timeout
  };

  // Redis configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    tls?: {
      rejectUnauthorized: boolean;
    };
  };

  // Cache configuration
  cache: {
    ttl: {
      authorization: number; // seconds
      roleHierarchy: number; // seconds
      policy: number; // seconds
      tenantConfig: number; // seconds
    };
    prefix: {
      authorization: string;
      roleHierarchy: string;
      policy: string;
      tenant: string;
    };
  };

  // Rate limiting configuration
  rateLimit: {
    maxTokens: number;
    intervalSeconds: number;
  };

  // Logging configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
  };

  // Server configuration
  server: {
    port: number;
    host: string;
  };
}

// Default configuration values
const defaultConfig: AppConfig = {
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
      authorization: parseInt(process.env.CACHE_TTL_AUTHORIZATION || '300'), // 5 minutes
      roleHierarchy: parseInt(process.env.CACHE_TTL_ROLE_HIERARCHY || '3600'), // 1 hour
      policy: parseInt(process.env.CACHE_TTL_POLICY || '1800'), // 30 minutes
      tenantConfig: parseInt(process.env.CACHE_TTL_TENANT_CONFIG || '7200'), // 2 hours
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
    level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    format: (process.env.LOG_FORMAT as 'json' | 'text') || 'json'
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0'
  }
};

// Configuration validator
function validateConfig(config: AppConfig): void {
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

function isValidConnectionString(connectionString: string): boolean {
  try {
    // Accept MongoDB Atlas (mongodb+srv://) or local MongoDB (mongodb://)
    return connectionString.startsWith('mongodb+srv://') || connectionString.startsWith('mongodb://');
  } catch {
    return false;
  }
}

// Create and validate the configuration
const config: AppConfig = (() => {
  const cfg = { ...defaultConfig };
  validateConfig(cfg);
  return cfg;
})();

export default config;