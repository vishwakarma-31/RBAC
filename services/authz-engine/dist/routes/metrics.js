"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMetrics = handleMetrics;
function handleMetrics(req, res) {
    res.json({
        timestamp: new Date().toISOString(),
        service: 'authz-engine',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        requests_processed: 0,
        cache_hit_rate: 0,
        average_response_time: 0
    });
}
//# sourceMappingURL=metrics.js.map