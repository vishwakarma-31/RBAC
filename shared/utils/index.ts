/**
 * Shared utility functions for the Authorization Platform
 */

import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { CACHE, SECURITY, DATABASE } from '../constants';

/**
 * Generate a cryptographically secure UUID
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Create a cache key with tenant isolation
 */
export function createCacheKey(
  prefix: string,
  tenantId: string,
  ...parts: string[]
): string {
  return `${prefix}${tenantId}:${parts.join(':')}`;
}

/**
 * Create authorization decision cache key
 */
export function createAuthzCacheKey(
  tenantId: string,
  principalId: string,
  action: string,
  resourceType: string,
  resourceId: string
): string {
  return createCacheKey(
    CACHE.PREFIXES.AUTHZ_DECISION,
    tenantId,
    principalId,
    action,
    resourceType,
    resourceId
  );
}

/**
 * Hash data using SHA-256 for audit log tamper detection
 */
export function hashData(data: string): string {
  return crypto
    .createHash(SECURITY.HASH_ALGORITHM)
    .update(data)
    .digest('hex');
}

/**
 * Create hash chain for audit logs
 */
export function createHashChain(previousHash: string, requestData: string): string {
  const dataToHash = `${SECURITY.HASH_CHAIN_SEED}:${previousHash}:${requestData}`;
  return hashData(dataToHash);
}

/**
 * Validate UUID format
 */
export function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim()
    .substring(0, DATABASE.MAX_IDENTIFIER_LENGTH);
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if two arrays have any common elements
 */
export function arraysIntersect<T>(arr1: T[], arr2: T[]): boolean {
  const set1 = new Set(arr1);
  return arr2.some(item => set1.has(item));
}

/**
 * Get unique elements from an array
 */
export function uniqueArray<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Paginate an array
 */
export function paginateArray<T>(
  array: T[],
  page: number,
  limit: number
): { data: T[]; total: number; totalPages: number } {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: array.slice(startIndex, endIndex),
    total: array.length,
    totalPages: Math.ceil(array.length / limit),
  };
}

/**
 * Sleep for specified milliseconds (for retry logic)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars * 2) {
    return '*'.repeat(data.length);
  }
  
  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const masked = '*'.repeat(data.length - visibleChars * 2);
  
  return `${start}${masked}${end}`;
}

/**
 * Convert milliseconds to human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}min`;
}

/**
 * Validate that all required fields are present
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  obj: T,
  requiredFields: (keyof T)[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => 
    obj[field] === undefined || obj[field] === null
  );
  
  return {
    isValid: missingFields.length === 0,
    missingFields: missingFields.map(String),
  };
}

/**
 * Merge two objects deeply
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key])
      ) {
        result[key] = deepMerge(
          (result[key] || {}) as Record<string, unknown>,
          source[key] as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }
  
  return result;
}

/**
 * Create a rate limiter key
 */
export function createRateLimitKey(identifier: string, endpoint: string): string {
  return `rate-limit:${identifier}:${endpoint}`;
}