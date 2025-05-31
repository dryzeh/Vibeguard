import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Security
  BCRYPT_SALT_ROUNDS: z.string().transform(Number).default('10'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  CORS_ORIGINS: z.string().transform(val => val.split(',')),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // Feature Flags
  ENABLE_AUDIT_LOGS: z.string().transform(val => val === 'true').default('true'),
  ENABLE_RATE_LIMITING: z.string().transform(val => val === 'true').default('true'),
  ENABLE_WEBSOCKET: z.string().transform(val => val === 'true').default('true'),
  ENABLE_EMAIL_VERIFICATION: z.string().transform(val => val === 'true').default('true'),
  ENABLE_PASSWORD_RESET: z.string().transform(val => val === 'true').default('true'),

  // Monitoring
  ENABLE_METRICS: z.string().transform(val => val === 'true').default('true'),
  METRICS_PORT: z.string().transform(Number).default('9090'),
  ENABLE_TRACING: z.string().transform(val => val === 'true').default('true'),
  TRACING_SAMPLE_RATE: z.string().transform(Number).default('0.1'),

  // Cache
  REDIS_URL: z.string().optional(),
  CACHE_TTL: z.string().transform(Number).default('3600'),

  // WebSocket
  WS_HEARTBEAT_INTERVAL: z.string().transform(Number).default('30000'),
  WS_PATH: z.string().default('/ws'),

  // Admin
  ADMIN_EMAIL: z.string().email().default('admin@vibeguard.se'),
  ADMIN_PASSWORD: z.string().min(12).default('change-this-in-production'),
  ADMIN_NAME: z.string().default('System Administrator'),
});

// Type for the validated environment variables
export type Env = z.infer<typeof envSchema>;

// Validate and transform environment variables
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
        .map(err => err.path.join('.'));

      if (missingVars.length > 0) {
        console.error('Missing required environment variables:', missingVars.join(', '));
      }

      const invalidVars = error.errors
        .filter(err => err.code !== 'invalid_type' || err.received !== 'undefined')
        .map(err => `${err.path.join('.')}: ${err.message}`);

      if (invalidVars.length > 0) {
        console.error('Invalid environment variables:', invalidVars.join('\n'));
      }
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Helper functions for environment-specific configuration
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
export const isProduction = env.NODE_ENV === 'production';

// Export configuration object
export const config = {
  server: {
    port: env.PORT,
    host: env.HOST,
    isDevelopment,
    isTest,
    isProduction,
  },
  database: {
    url: env.DATABASE_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  security: {
    bcryptSaltRounds: env.BCRYPT_SALT_ROUNDS,
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
    },
    cors: {
      origins: env.CORS_ORIGINS,
    },
  },
  email: {
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    from: env.EMAIL_FROM,
  },
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },
  features: {
    auditLogs: env.ENABLE_AUDIT_LOGS,
    rateLimiting: env.ENABLE_RATE_LIMITING,
    websocket: env.ENABLE_WEBSOCKET,
    emailVerification: env.ENABLE_EMAIL_VERIFICATION,
    passwordReset: env.ENABLE_PASSWORD_RESET,
  },
  monitoring: {
    metrics: {
      enabled: env.ENABLE_METRICS,
      port: env.METRICS_PORT,
    },
    tracing: {
      enabled: env.ENABLE_TRACING,
      sampleRate: env.TRACING_SAMPLE_RATE,
    },
  },
  cache: {
    redisUrl: env.REDIS_URL,
    ttl: env.CACHE_TTL,
  },
  websocket: {
    heartbeatInterval: env.WS_HEARTBEAT_INTERVAL,
    path: env.WS_PATH,
  },
  admin: {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    name: env.ADMIN_NAME,
  },
} as const; 