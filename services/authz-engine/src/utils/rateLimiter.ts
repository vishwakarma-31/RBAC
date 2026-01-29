/**
 * Rate Limiter for Authorization Endpoints
 * Implements token bucket algorithm to prevent abuse
 */

interface RateLimitInfo {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillIntervalMs: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitInfo> = new Map();
  private readonly defaultMaxTokens: number;
  private readonly defaultRefillIntervalMs: number;

  constructor(maxTokens: number = 100, refillIntervalSeconds: number = 60) {
    this.defaultMaxTokens = maxTokens;
    this.defaultRefillIntervalMs = refillIntervalSeconds * 1000;
  }

  /**
   * Check if a request should be allowed based on rate limits
   * @param key Unique identifier for the client (e.g., IP address + tenant ID)
   * @param maxTokens Maximum tokens allowed per interval (optional, uses default if not provided)
   * @param refillIntervalMs Refill interval in milliseconds (optional, uses default if not provided)
   * @returns boolean indicating if request is allowed
   */
  public async isAllowed(
    key: string,
    maxTokens?: number,
    refillIntervalMs?: number
  ): Promise<boolean> {
    const effectiveMaxTokens = maxTokens ?? this.defaultMaxTokens;
    const effectiveRefillInterval = refillIntervalMs ?? this.defaultRefillIntervalMs;

    let limitInfo = this.limits.get(key);

    if (!limitInfo) {
      // Initialize new rate limit entry
      limitInfo = {
        tokens: effectiveMaxTokens,
        lastRefill: Date.now(),
        maxTokens: effectiveMaxTokens,
        refillIntervalMs: effectiveRefillInterval
      };
      this.limits.set(key, limitInfo);
      return true;
    }

    // Refill tokens based on time passed
    const now = Date.now();
    const timePassed = now - limitInfo.lastRefill;
    const tokensToAdd = Math.floor(timePassed / limitInfo.refillIntervalMs);
    
    if (tokensToAdd > 0) {
      limitInfo.tokens = Math.min(limitInfo.maxTokens, limitInfo.tokens + tokensToAdd);
      limitInfo.lastRefill = now;
    }

    // Check if request is allowed
    if (limitInfo.tokens > 0) {
      limitInfo.tokens--;
      return true;
    }

    return false;
  }

  /**
   * Get rate limit information for a key
   */
  public getLimitInfo(key: string): { 
    allowed: boolean; 
    remaining: number; 
    resetTime: number; 
  } | null {
    const limitInfo = this.limits.get(key);
    if (!limitInfo) {
      return null;
    }

    const now = Date.now();
    const timePassed = now - limitInfo.lastRefill;
    const tokensToAdd = Math.floor(timePassed / limitInfo.refillIntervalMs);
    const currentTokens = Math.min(limitInfo.maxTokens, limitInfo.tokens + tokensToAdd);

    return {
      allowed: currentTokens > 0,
      remaining: Math.max(0, currentTokens),
      resetTime: limitInfo.lastRefill + limitInfo.refillIntervalMs
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  public reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Cleanup expired rate limit entries
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, limitInfo] of this.limits.entries()) {
      // Clean up entries that haven't been used for a while
      if (now - limitInfo.lastRefill > limitInfo.refillIntervalMs * 10) {
        this.limits.delete(key);
      }
    }
  }
}