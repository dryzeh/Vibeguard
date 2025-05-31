import { EventEmitter } from 'events';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenSuccess: number;
  monitorInterval: number;
  timeoutDuration?: number;
}

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailure: number | null;
  lastSuccess: number | null;
  state: CircuitState;
  startTime: number;
  errorPercentage: number;
  totalCalls: number;
  timeouts: number;
}

type CircuitBreakerError = Error & {
  code?: string;
  isTimeout?: boolean;
};

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private stats: CircuitStats;
  private options: Required<CircuitBreakerOptions>;
  private monitorInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    super();
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      resetTimeout: options.resetTimeout || 60000, // 1 minute
      halfOpenSuccess: options.halfOpenSuccess || 3,
      monitorInterval: options.monitorInterval || 10000, // 10 seconds
      timeoutDuration: options.timeoutDuration || 5000 // 5 seconds
    };

    this.stats = {
      failures: 0,
      successes: 0,
      lastFailure: null,
      lastSuccess: null,
      state: CircuitState.CLOSED,
      startTime: Date.now(),
      errorPercentage: 0,
      totalCalls: 0,
      timeouts: 0
    };

    this.startMonitoring();
  }

  private startMonitoring() {
    this.monitorInterval = setInterval(() => {
      this.checkState();
      this.updateStats();
      this.emit('stats', this.getStats());
    }, this.options.monitorInterval);
  }

  private updateStats() {
    if (this.stats.totalCalls > 0) {
      this.stats.errorPercentage = 
        (this.stats.failures / this.stats.totalCalls) * 100;
    }

    // Reset stats if they're too old
    const now = Date.now();
    if (this.stats.lastFailure && 
        now - this.stats.lastFailure > this.options.resetTimeout * 2) {
      this.stats.failures = 0;
      this.stats.timeouts = 0;
    }
  }

  private checkState() {
    const now = Date.now();

    if (this.state === CircuitState.OPEN) {
      if (this.stats.lastFailure && 
          now - this.stats.lastFailure >= this.options.resetTimeout) {
        this.halfOpen();
      }
    } else if (this.state === CircuitState.CLOSED) {
      if (this.stats.errorPercentage > 50 || 
          this.stats.timeouts >= this.options.failureThreshold) {
        this.open();
      }
    }
  }

  private open() {
    if (this.state !== CircuitState.OPEN) {
      this.state = CircuitState.OPEN;
      this.stats.state = CircuitState.OPEN;
      this.emit('open', this.getStats());
    }
  }

  private close() {
    if (this.state !== CircuitState.CLOSED) {
      this.state = CircuitState.CLOSED;
      this.stats.state = CircuitState.CLOSED;
      this.stats.failures = 0;
      this.stats.successes = 0;
      this.stats.timeouts = 0;
      this.emit('close', this.getStats());
    }
  }

  private halfOpen() {
    if (this.state !== CircuitState.HALF_OPEN) {
      this.state = CircuitState.HALF_OPEN;
      this.stats.state = CircuitState.HALF_OPEN;
      this.stats.successes = 0;
      this.emit('half_open', this.getStats());
    }
  }

  public async execute<T>(
    action: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      this.emit('rejected', { reason: 'Circuit is OPEN' });
      if (fallback) {
        return fallback();
      }
      throw new Error('Circuit breaker is OPEN');
    }

    this.stats.totalCalls++;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const error: CircuitBreakerError = new Error('Operation timeout');
          error.code = 'TIMEOUT';
          error.isTimeout = true;
          reject(error);
        }, this.options.timeoutDuration);
      });

      const result = await Promise.race([action(), timeoutPromise]);
      this.handleSuccess();
      return result;
    } catch (error) {
      const circuitError = error as CircuitBreakerError;
      if (circuitError.isTimeout) {
        this.stats.timeouts++;
      }
      this.handleFailure(circuitError);
      
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  private handleSuccess() {
    this.stats.successes++;
    this.stats.lastSuccess = Date.now();

    if (this.state === CircuitState.HALF_OPEN &&
        this.stats.successes >= this.options.halfOpenSuccess) {
      this.close();
    }

    this.emit('success', this.getStats());
  }

  private handleFailure(error: CircuitBreakerError) {
    this.stats.failures++;
    this.stats.lastFailure = Date.now();

    if (this.state === CircuitState.CLOSED &&
        this.stats.failures >= this.options.failureThreshold) {
      this.open();
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.open();
    }

    this.emit('failure', { error, stats: this.getStats() });
  }

  public getStats() {
    const now = Date.now();
    return {
      ...this.stats,
      uptime: now - this.stats.startTime,
      timeSinceLastFailure: this.stats.lastFailure ? 
        now - this.stats.lastFailure : null,
      timeSinceLastSuccess: this.stats.lastSuccess ? 
        now - this.stats.lastSuccess : null,
      isCircuitBroken: this.state === CircuitState.OPEN,
      currentState: this.state
    };
  }

  public reset() {
    this.close();
    this.stats = {
      ...this.stats,
      failures: 0,
      successes: 0,
      lastFailure: null,
      lastSuccess: null,
      errorPercentage: 0,
      totalCalls: 0,
      timeouts: 0,
      startTime: Date.now()
    };
    this.emit('reset', this.getStats());
  }

  public cleanup() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    this.emit('cleanup');
  }
} 