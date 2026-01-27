import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer, Server } from 'http';
import type { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Management API'
  });
});

// Placeholder for management endpoints
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Management API for RBAC Platform',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      tenants: '/api/v1/tenants',
      roles: '/api/v1/roles',
      permissions: '/api/v1/permissions',
      policies: '/api/v1/policies',
      audit: '/api/v1/audit'
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Management API Server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export { server };