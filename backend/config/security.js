import { z } from 'zod';

/**
 * @typedef {Object} SecurityConfig
 * @property {Object} jwt - JWT configuration
 * @property {string} jwt.secret - JWT secret key
 * @property {string} jwt.expiresIn - Token expiration time
 * @property {string} jwt.refreshExpiresIn - Refresh token expiration time
 * @property {Object} cors - CORS configuration
 * @property {string[]} cors.origin - Allowed origins
 * @property {string[]} cors.methods - Allowed methods
 * @property {string[]} cors.allowedHeaders - Allowed headers
 * @property {boolean} cors.credentials - Whether to allow credentials
 * @property {Object} rateLimit - Rate limiting configuration
 * @property {number} rateLimit.windowMs - Time window in milliseconds
 * @property {number} rateLimit.max - Maximum requests per window
 * @property {Object} password - Password requirements
 * @property {number} password.minLength - Minimum password length
 * @property {boolean} password.requireUppercase - Whether to require uppercase
 * @property {boolean} password.requireLowercase - Whether to require lowercase
 * @property {boolean} password.requireNumbers - Whether to require numbers
 * @property {boolean} password.requireSpecialChars - Whether to require special chars
 */

/**
 * Security configuration schema
 */
const securitySchema = z.object({
  jwt: z.object({
    secret: z.string().min(32),
    expiresIn: z.string().default('1h'),
    refreshExpiresIn: z.string().default('7d')
  }),
  cors: z.object({
    origin: z.array(z.string()).default(['http://localhost:3000']),
    methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
    allowedHeaders: z.array(z.string()).default(['Content-Type', 'Authorization']),
    credentials: z.boolean().default(true)
  }),
  rateLimit: z.object({
    windowMs: z.number().default(900000), // 15 minutes
    max: z.number().default(100)
  }),
  password: z.object({
    minLength: z.number().default(8),
    requireUppercase: z.boolean().default(true),
    requireLowercase: z.boolean().default(true),
    requireNumbers: z.boolean().default(true),
    requireSpecialChars: z.boolean().default(true)
  })
});

/**
 * Security configuration
 * @type {SecurityConfig}
 */
export const securityConfig = securitySchema.parse({
  jwt: {
    secret: process.env.JWT_SECRET || 'vibeguard_secure_jwt_secret_key_2024_dev_only',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100')
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  }
}); 