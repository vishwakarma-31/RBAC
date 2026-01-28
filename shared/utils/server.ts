import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { Request, Response } from 'express';

export interface ServerConfig {
  port: number | string;
  serviceName: string;
  allowedOrigins?: string[];
  jsonLimit?: string;
}

export class BaseServer {
  protected app: express.Application;
  protected port: number | string;
  protected serviceName: string;

  constructor(config: ServerConfig) {
    this.app = express();
    this.port = config.port;
    this.serviceName = config.serviceName;
    
    this.setupMiddleware(config);
    this.setupHealthEndpoint();
  }

  private setupMiddleware(config: ServerConfig) {
    this.app.use(helmet());
    
    const corsOptions = {
      origin: config.allowedOrigins || process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3003'],
      credentials: true,
      optionsSuccessStatus: 200
    };
    this.app.use(cors(corsOptions));
    
    this.app.use(express.json({ limit: config.jsonLimit || '10mb' }));
  }

  private setupHealthEndpoint() {
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: this.serviceName
      });
    });
  }

  protected addRoute(path: string, handler: express.RequestHandler) {
    this.app.get(path, handler);
  }

  public start() {
    const server = this.app.listen(this.port, () => {
      if (process.env.LOG_LEVEL === 'debug') {
        console.log(`${this.serviceName} Server listening on port ${this.port}`);
        console.log(`Health check: http://localhost:${this.port}/health`);
      }
    });
    
    return server;
  }

  public getApp() {
    return this.app;
  }
}