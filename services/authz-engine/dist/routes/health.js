"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleHealth = handleHealth;
function handleHealth(req, res) {
    const data = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'authz-engine'
    };
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}
//# sourceMappingURL=health.js.map