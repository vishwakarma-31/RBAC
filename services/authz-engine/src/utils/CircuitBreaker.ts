/**
 * Circuit Breaker Pattern Implementation
 * For handling external service dependencies (Redis, PostgreSQL)
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  failureThreshold: number;      // Number of failures before opening circuit
  timeoutMs: number;             // Time to wait before attempting half-open
  successThreshold: number;      // Success count needed to close circuit in half-open state
  name?: string;                 // Name for identification
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number | null = null;
  private successCount: number = 0;
  
  private readonly failureThreshold: number;
  private readonly timeoutMs: number;
  private readonly successThreshold: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions) {
    this.failureThreshold = options.failureThreshold;
    this.timeoutMs = options.timeoutMs;
    this.successThreshold = options.successThreshold;
    this.name = options.name || 'circuit-breaker';
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    this.checkHalfOpen();

    if (this.state === CircuitState.OPEN) {
      throw new Error(`Circuit breaker ${this.name} is OPEN`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if circuit should transition from OPEN to HALF_OPEN
   */
  private checkHalfOpen(): void {
    if (
      this.state === CircuitState.OPEN &&
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= this.timeoutMs
    ) {
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.close();
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.open();
    }
  }

  /**
   * Open the circuit (stop accepting requests)
   */
  private open(): void {
    this.state = CircuitState.OPEN;
    console.log(`Circuit breaker ${this.name} opened`);
  }

  /**
   * Close the circuit (resume normal operation)
   */
  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    console.log(`Circuit breaker ${this.name} closed`);
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Force reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }
}