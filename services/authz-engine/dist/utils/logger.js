"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
function createLogger(serviceName) {
    return {
        info: (message, meta) => console.log(`[${serviceName}] INFO: ${message}`, meta || ''),
        error: (message, meta) => console.error(`[${serviceName}] ERROR: ${message}`, meta || ''),
        warn: (message, meta) => console.warn(`[${serviceName}] WARN: ${message}`, meta || ''),
        debug: (message, meta) => console.debug(`[${serviceName}] DEBUG: ${message}`, meta || '')
    };
}
//# sourceMappingURL=logger.js.map