/**
 * Centralized Configuration Management
 * Consolidates all configuration values in one place
 */

export interface AppConfig {
  // Database configuration
  database: {
    connectionString: string;
    maxConnections: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
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
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/rbac_platform',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000'),
    connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '2000'),
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
    // Basic validation for PostgreSQL connection string
    return connectionString.startsWith('postgresql://') || connectionString.startsWith('postgres://');
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