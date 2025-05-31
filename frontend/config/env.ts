import { z } from 'zod';
import Constants from 'expo-constants';

// Environment variable schema
const envSchema = z.object({
  // API Configuration
  EXPO_PUBLIC_API_URL: z.string().url().optional(),
  EXPO_PUBLIC_WS_URL: z.string().url().optional(),

  // Feature Flags
  EXPO_PUBLIC_ENABLE_BIOMETRICS: z.string().transform(val => val === 'true').default('true'),
  EXPO_PUBLIC_ENABLE_EMAIL_VERIFICATION: z.string().transform(val => val === 'true').default('true'),
  EXPO_PUBLIC_ENABLE_PASSWORD_RESET: z.string().transform(val => val === 'true').default('true'),
  EXPO_PUBLIC_ENABLE_REMEMBER_ME: z.string().transform(val => val === 'true').default('true'),
  EXPO_PUBLIC_ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('true'),
  EXPO_PUBLIC_ENABLE_CRASH_REPORTING: z.string().transform(val => val === 'true').default('true'),

  // Analytics
  EXPO_PUBLIC_ANALYTICS_ID: z.string().optional(),
  EXPO_PUBLIC_ANALYTICS_SAMPLE_RATE: z.string().transform(Number).default('100'),
  EXPO_PUBLIC_ERROR_SAMPLE_RATE: z.string().transform(Number).default('100'),

  // Cache
  EXPO_PUBLIC_CACHE_MAX_AGE: z.string().transform(Number).default('3600'),
  EXPO_PUBLIC_CACHE_MAX_SIZE: z.string().transform(Number).default('52428800'), // 50MB

  // Notifications
  EXPO_PUBLIC_NOTIFICATIONS_ENABLED: z.string().transform(val => val === 'true').default('true'),
  EXPO_PUBLIC_NOTIFICATIONS_CHANNEL: z.string().default('default'),

  // App Configuration
  EXPO_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
  EXPO_PUBLIC_BUILD_NUMBER: z.string().default('1'),
  EXPO_PUBLIC_MIN_PASSWORD_LENGTH: z.string().transform(Number).default('8'),
  EXPO_PUBLIC_MAX_PASSWORD_LENGTH: z.string().transform(Number).default('128'),
  EXPO_PUBLIC_SESSION_TIMEOUT: z.string().transform(Number).default('3600'),
  EXPO_PUBLIC_API_TIMEOUT: z.string().transform(Number).default('5000'),

  // Development
  EXPO_PUBLIC_DEV_MODE: z.string().transform(val => val === 'true').default('false'),
  EXPO_PUBLIC_DEV_API_URL: z.string().url().optional(),
  EXPO_PUBLIC_DEV_WS_URL: z.string().url().optional(),
});

// Type for the validated environment variables
export type Env = z.infer<typeof envSchema>;

// Get environment variables from Expo Constants
const getEnvVars = () => {
  const extra = Constants.expoConfig?.extra || {};
  return {
    ...process.env,
    ...extra,
  };
};

// Validate and transform environment variables
export function validateEnv(): Env {
  try {
    return envSchema.parse(getEnvVars());
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
export const isDevelopment = env.EXPO_PUBLIC_DEV_MODE === true;
export const isProduction = !isDevelopment;

// Get API URL based on environment
export const getApiUrl = () => {
  if (isDevelopment && env.EXPO_PUBLIC_DEV_API_URL) {
    return env.EXPO_PUBLIC_DEV_API_URL;
  }
  return env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';
};

// Get WebSocket URL based on environment
export const getWsUrl = () => {
  if (isDevelopment && env.EXPO_PUBLIC_DEV_WS_URL) {
    return env.EXPO_PUBLIC_DEV_WS_URL;
  }
  return env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001/ws';
};

// Export configuration object
export const config = {
  api: {
    url: getApiUrl(),
    wsUrl: getWsUrl(),
    timeout: env.EXPO_PUBLIC_API_TIMEOUT,
  },
  features: {
    biometrics: env.EXPO_PUBLIC_ENABLE_BIOMETRICS,
    emailVerification: env.EXPO_PUBLIC_ENABLE_EMAIL_VERIFICATION,
    passwordReset: env.EXPO_PUBLIC_ENABLE_PASSWORD_RESET,
    rememberMe: env.EXPO_PUBLIC_ENABLE_REMEMBER_ME,
    analytics: env.EXPO_PUBLIC_ENABLE_ANALYTICS,
    crashReporting: env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING,
  },
  analytics: {
    id: env.EXPO_PUBLIC_ANALYTICS_ID,
    sampleRate: env.EXPO_PUBLIC_ANALYTICS_SAMPLE_RATE,
    errorSampleRate: env.EXPO_PUBLIC_ERROR_SAMPLE_RATE,
  },
  cache: {
    maxAge: env.EXPO_PUBLIC_CACHE_MAX_AGE,
    maxSize: env.EXPO_PUBLIC_CACHE_MAX_SIZE,
  },
  notifications: {
    enabled: env.EXPO_PUBLIC_NOTIFICATIONS_ENABLED,
    channel: env.EXPO_PUBLIC_NOTIFICATIONS_CHANNEL,
  },
  app: {
    version: env.EXPO_PUBLIC_APP_VERSION,
    buildNumber: env.EXPO_PUBLIC_BUILD_NUMBER,
    minPasswordLength: env.EXPO_PUBLIC_MIN_PASSWORD_LENGTH,
    maxPasswordLength: env.EXPO_PUBLIC_MAX_PASSWORD_LENGTH,
    sessionTimeout: env.EXPO_PUBLIC_SESSION_TIMEOUT,
  },
  isDevelopment,
  isProduction,
} as const; 