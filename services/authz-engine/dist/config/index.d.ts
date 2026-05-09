export interface AppConfig {
    database: {
        connectionString: string;
        databaseName: string;
        maxPoolSize: number;
        minPoolSize: number;
        serverSelectionTimeoutMs: number;
        socketTimeoutMs: number;
        maxConnections: number;
        idleTimeoutMillis: number;
        connectionTimeoutMillis: number;
    };
    redis: {
        host: string;
        port: number;
        password?: string;
        db: number;
        tls?: {
            rejectUnauthorized: boolean;
        };
    };
    cache: {
        ttl: {
            authorization: number;
            roleHierarchy: number;
            policy: number;
            tenantConfig: number;
        };
        prefix: {
            authorization: string;
            roleHierarchy: string;
            policy: string;
            tenant: string;
        };
    };
    rateLimit: {
        maxTokens: number;
        intervalSeconds: number;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        format: 'json' | 'text';
    };
    server: {
        port: number;
        host: string;
    };
}
declare const config: AppConfig;
export default config;
//# sourceMappingURL=index.d.ts.map