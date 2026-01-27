"use strict";
/**
 * Shared utility functions for the Authorization Platform
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.createCacheKey = createCacheKey;
exports.createAuthzCacheKey = createAuthzCacheKey;
exports.hashData = hashData;
exports.createHashChain = createHashChain;
exports.isValidUuid = isValidUuid;
exports.isValidEmail = isValidEmail;
exports.sanitizeInput = sanitizeInput;
exports.deepClone = deepClone;
exports.arraysIntersect = arraysIntersect;
exports.uniqueArray = uniqueArray;
exports.paginateArray = paginateArray;
exports.sleep = sleep;
exports.retryWithBackoff = retryWithBackoff;
exports.maskSensitiveData = maskSensitiveData;
exports.formatDuration = formatDuration;
exports.validateRequiredFields = validateRequiredFields;
exports.deepMerge = deepMerge;
exports.createRateLimitKey = createRateLimitKey;
const crypto = __importStar(require("crypto"));
const uuid_1 = require("uuid");
const constants_1 = require("../constants");
/**
 * Generate a cryptographically secure UUID
 */
function generateId() {
    return (0, uuid_1.v4)();
}
/**
 * Create a cache key with tenant isolation
 */
function createCacheKey(prefix, tenantId, ...parts) {
    return `${prefix}${tenantId}:${parts.join(':')}`;
}
/**
 * Create authorization decision cache key
 */
function createAuthzCacheKey(tenantId, principalId, action, resourceType, resourceId) {
    return createCacheKey(constants_1.CACHE.PREFIXES.AUTHZ_DECISION, tenantId, principalId, action, resourceType, resourceId);
}
/**
 * Hash data using SHA-256 for audit log tamper detection
 */
function hashData(data) {
    return crypto
        .createHash(constants_1.SECURITY.HASH_ALGORITHM)
        .update(data)
        .digest('hex');
}
/**
 * Create hash chain for audit logs
 */
function createHashChain(previousHash, requestData) {
    const dataToHash = `${constants_1.SECURITY.HASH_CHAIN_SEED}:${previousHash}:${requestData}`;
    return hashData(dataToHash);
}
/**
 * Validate UUID format
 */
function isValidUuid(id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}
/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Sanitize input to prevent injection attacks
 */
function sanitizeInput(input) {
    return input
        .replace(/[<>]/g, '') // Remove HTML tags
        .trim()
        .substring(0, constants_1.DATABASE.MAX_IDENTIFIER_LENGTH);
}
/**
 * Deep clone an object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * Check if two arrays have any common elements
 */
function arraysIntersect(arr1, arr2) {
    const set1 = new Set(arr1);
    return arr2.some(item => set1.has(item));
}
/**
 * Get unique elements from an array
 */
function uniqueArray(arr) {
    return [...new Set(arr)];
}
/**
 * Paginate an array
 */
function paginateArray(array, page, limit) {
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
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 100) {
    let lastError;
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (i === maxRetries) {
                throw lastError;
            }
            const delay = baseDelay * Math.pow(2, i);
            await sleep(delay);
        }
    }
    throw lastError;
}
/**
 * Mask sensitive data for logging
 */
function maskSensitiveData(data, visibleChars = 4) {
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
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}min`;
}
/**
 * Validate that all required fields are present
 */
function validateRequiredFields(obj, requiredFields) {
    const missingFields = requiredFields.filter(field => obj[field] === undefined || obj[field] === null);
    return {
        isValid: missingFields.length === 0,
        missingFields: missingFields.map(String),
    };
}
/**
 * Merge two objects deeply
 */
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (source[key] !== undefined) {
            if (typeof source[key] === 'object' &&
                source[key] !== null &&
                !Array.isArray(source[key])) {
                result[key] = deepMerge((result[key] || {}), source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
    }
    return result;
}
/**
 * Create a rate limiter key
 */
function createRateLimitKey(identifier, endpoint) {
    return `rate-limit:${identifier}:${endpoint}`;
}
