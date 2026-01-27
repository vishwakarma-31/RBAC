// Simple HTTP server for Authorization Engine

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { handleAuthorization } from './routes/authorization';
import { handleHealth } from './routes/health';

const PORT = process.env.PORT || 3000;

interface CustomIncomingMessage extends IncomingMessage {
  body?: any;
}

function parseBody(req: CustomIncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data, null, 2));
}

const server = createServer(async (req: CustomIncomingMessage, res: ServerResponse) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, {});
    return;
  }
  
  try {
    if (req.url === '/authorize' && req.method === 'POST') {
      const body = await parseBody(req);
      (req as CustomIncomingMessage).body = body;
      handleAuthorization(req as CustomIncomingMessage, res);
    } else if (req.url === '/health' && req.method === 'GET') {
      handleHealth(req as CustomIncomingMessage, res);
    } else {
      sendJson(res, 404, {
        error: 'Route not found',
        path: req.url
      });
    }
  } catch (error) {
    console.error('Request error:', error);
    sendJson(res, 500, {
      error: 'Internal server error',
      message: (error as Error).message
    });
  }
});

server.listen(PORT, () => {
  console.log(`Authorization Engine listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Authorization endpoint: http://localhost:${PORT}/authorize`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});