import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Audit Service'
  });
});

// Placeholder for audit endpoints
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Audit Service for RBAC Platform',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      logs: '/api/v1/logs',
      export: '/api/v1/export',
      compliance: '/api/v1/compliance'
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Audit Service Server listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export { server };