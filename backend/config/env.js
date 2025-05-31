const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000')
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'vibeguard_secure_jwt_secret_key_2024_dev_only',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Security configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || '100')
    },
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }
  },

  // Email configuration
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    provider: process.env.EMAIL_PROVIDER || 'smtp',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    },
    from: process.env.EMAIL_FROM || 'noreply@vibeguard.com'
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    file: process.env.LOG_FILE
  },

  // Feature flags
  features: {
    rateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
    emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false',
    realTimeUpdates: process.env.ENABLE_REAL_TIME_UPDATES !== 'false',
    auditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false'
  },

  // Emergency handling configuration
  emergency: {
    alertTimeout: parseInt(process.env.EMERGENCY_ALERT_TIMEOUT || '300000'), // 5 minutes
    cleanupInterval: parseInt(process.env.EMERGENCY_CLEANUP_INTERVAL || '86400000'), // 24 hours
    maxActiveEmergencies: parseInt(process.env.MAX_ACTIVE_EMERGENCIES || '100')
  },

  // WebSocket configuration
  websocket: {
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '30000'), // 30 seconds
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '10000'), // 10 seconds
    maxPayload: parseInt(process.env.WS_MAX_PAYLOAD || '65536') // 64KB
  },

  // Admin configuration
  admin: {
    defaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe123!',
    maxLoginAttempts: parseInt(process.env.ADMIN_MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.ADMIN_LOCKOUT_DURATION || '900000') // 15 minutes
  }
}

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS'
]

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

if (missingEnvVars.length > 0 && config.server.env === 'production') {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
}

module.exports = { config } 