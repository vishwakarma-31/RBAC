// Simple logger for now - will enhance later
export function createLogger(serviceName: string) {
  return {
    info: (message: string, meta?: any) => 
      console.log(`[${serviceName}] INFO: ${message}`, meta || ''),
    error: (message: string, meta?: any) => 
      console.error(`[${serviceName}] ERROR: ${message}`, meta || ''),
    warn: (message: string, meta?: any) => 
      console.warn(`[${serviceName}] WARN: ${message}`, meta || ''),
    debug: (message: string, meta?: any) => 
      console.debug(`[${serviceName}] DEBUG: ${message}`, meta || '')
  };
}