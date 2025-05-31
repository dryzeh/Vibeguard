declare module 'events' {
  export class EventEmitter {
    addListener(event: string | symbol, listener: (...args: any[]) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
    removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
    off(event: string | symbol, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string | symbol): this;
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
    listeners(event: string | symbol): Function[];
    rawListeners(event: string | symbol): Function[];
    emit(event: string | symbol, ...args: any[]): boolean;
    listenerCount(event: string | symbol): number;
    prependListener(event: string | symbol, listener: (...args: any[]) => void): this;
    prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;
    eventNames(): Array<string | symbol>;
  }
}

declare module 'ws' {
  import { EventEmitter } from 'events';
  
  class WebSocket extends EventEmitter {
    constructor(url: string, protocols?: string | string[]);
    close(code?: number, reason?: string): void;
    send(data: any): void;
    onopen?: (event: any) => void;
    onerror?: (event: any) => void;
    onclose?: (event: any) => void;
    onmessage?: (event: any) => void;
  }
  
  export = WebSocket;
}

declare namespace NodeJS {
  interface Timeout {
    ref(): this;
    unref(): this;
    hasRef(): boolean;
    refresh(): this;
    [Symbol.toPrimitive](): number;
  }

  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    CORS_ORIGIN: string;
    LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
    SMTP_HOST: string;
    SMTP_PORT: string;
    SMTP_USER: string;
    SMTP_PASS: string;
    SMTP_FROM: string;
    REDIS_URL: string;
    SENTRY_DSN: string;
    ADMIN_EMAIL: string;
    ADMIN_PASSWORD: string;
  }
}

declare global {
  type AsyncFunction = (...args: unknown[]) => Promise<unknown>;
  type SyncFunction = (...args: unknown[]) => unknown;
  type ErrorHandler = (error: Error) => void;
  type RequestHandler = (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  type ValidationFunction = (data: unknown) => Promise<boolean>;
  type TransformFunction = (data: unknown) => Promise<unknown>;

  interface CircuitBreakerOptions {
    failureThreshold: number;
    resetTimeout: number;
    monitorInterval: number;
    onStateChange?: (state: 'CLOSED' | 'OPEN' | 'HALF_OPEN') => void;
    onFailure?: (error: Error) => void;
  }

  interface LoadBalancerOptions {
    strategy: 'round-robin' | 'least-connections' | 'random';
    healthCheckInterval: number;
    maxRetries: number;
    timeout: number;
    onError?: (error: Error) => void;
  }

  interface ServiceEndpoint {
    url: string;
    weight?: number;
    healthCheck?: () => Promise<boolean>;
    metadata?: Record<string, unknown>;
  }
}

export {}; 