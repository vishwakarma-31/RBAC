/**
 * Shared utility functions for the Authorization Platform
 */
/**
 * Generate a cryptographically secure UUID
 */
export declare function generateId(): string;
/**
 * Create a cache key with tenant isolation
 */
export declare function createCacheKey(prefix: string, tenantId: string, ...parts: string[]): string;
/**
 * Create authorization decision cache key
 */
export declare function createAuthzCacheKey(tenantId: string, principalId: string, action: string, resourceType: string, resourceId: string): string;
/**
 * Hash data using SHA-256 for audit log tamper detection
 */
export declare function hashData(data: string): string;
/**
 * Create hash chain for audit logs
 */
export declare function createHashChain(previousHash: string, requestData: string): string;
/**
 * Validate UUID format
 */
export declare function isValidUuid(id: string): boolean;
/**
 * Validate email format
 */
export declare function isValidEmail(email: string): boolean;
/**
 * Sanitize input to prevent injection attacks
 */
export declare function sanitizeInput(input: string): string;
/**
 * Deep clone an object
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Check if two arrays have any common elements
 */
export declare function arraysIntersect<T>(arr1: T[], arr2: T[]): boolean;
/**
 * Get unique elements from an array
 */
export declare function uniqueArray<T>(arr: T[]): T[];
/**
 * Paginate an array
 */
export declare function paginateArray<T>(array: T[], page: number, limit: number): {
    data: T[];
    total: number;
    totalPages: number;
};
/**
 * Sleep for specified milliseconds (for retry logic)
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Retry a function with exponential backoff
 */
export declare function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;
/**
 * Mask sensitive data for logging
 */
export declare function maskSensitiveData(data: string, visibleChars?: number): string;
/**
 * Convert milliseconds to human-readable format
 */
export declare function formatDuration(ms: number): string;
/**
 * Validate that all required fields are present
 */
export declare function validateRequiredFields<T extends Record<string, unknown>>(obj: T, requiredFields: (keyof T)[]): {
    isValid: boolean;
    missingFields: string[];
};
/**
 * Merge two objects deeply
 */
export declare function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T;
/**
 * Create a rate limiter key
 */
export declare function createRateLimitKey(identifier: string, endpoint: string): string;
