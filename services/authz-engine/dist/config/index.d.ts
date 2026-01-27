export interface Config {
    nodeEnv: string;
    port: number;
    corsOrigin: string | string[];
    database: {
        url: string;
        poolMin: number;
        poolMax: number;
    };
    redis: {
        url: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    rateLimit: {
        windowMs: number;
        max: number;
    };
    cache: {
        ttl: {
            authorization: number;
            roleHierarchy: number;
            policy: number;
        };
    };
    logging: {
        level: string;
        format: 'json' | 'simple';
    };
}
export declare const config: Config;
//# sourceMappingURL=index.d.ts.map