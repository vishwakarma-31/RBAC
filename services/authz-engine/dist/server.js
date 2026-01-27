"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const authorization_1 = require("./routes/authorization");
const health_1 = require("./routes/health");
const PORT = process.env.PORT || 3000;
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            }
            catch (error) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data, null, 2));
}
const server = (0, http_1.createServer)(async (req, res) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    if (req.method === 'OPTIONS') {
        sendJson(res, 200, {});
        return;
    }
    try {
        if (req.url === '/authorize' && req.method === 'POST') {
            const body = await parseBody(req);
            req.body = body;
            (0, authorization_1.handleAuthorization)(req, res);
        }
        else if (req.url === '/health' && req.method === 'GET') {
            (0, health_1.handleHealth)(req, res);
        }
        else {
            sendJson(res, 404, {
                error: 'Route not found',
                path: req.url
            });
        }
    }
    catch (error) {
        console.error('Request error:', error);
        sendJson(res, 500, {
            error: 'Internal server error',
            message: error.message
        });
    }
});
server.listen(PORT, () => {
    console.log(`Authorization Engine listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Authorization endpoint: http://localhost:${PORT}/authorize`);
});
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
//# sourceMappingURL=server.js.map