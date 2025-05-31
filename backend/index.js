import Fastify from 'fastify'
import dotenv from 'dotenv'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { PrismaClient } from '@prisma/client'
import { Configuration, OpenAIApi } from 'openai'
import Redis from 'ioredis'
import { securityConfig } from './config/security.js'
import { encryption, password, sanitize } from './utils/security.js'
import WebSocketService from './services/websocket.js'
import { config } from './config/env.js'

// Import routes
import userRoutes from './routes/user.js'
import emergencyRoutes from './routes/emergency.js'
import braceletRoutes from './routes/bracelet.js'
import floorPlanRoutes from './routes/floorplan.js'
import zoneRoutes from './routes/zone.js'
import sensorRoutes from './routes/sensor.js'
import adminRoutes from './routes/admin.js'
import analyticsRoutes from './routes/analytics.js'
import dashboardRoutes from './routes/dashboard.js'
import realtimeRoutes from './routes/realtime.js'

// Load environment variables
dotenv.config()

// Debug logs
console.log('Environment variables:');
console.log('PORT from env:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'exists' : 'missing');

// Set development port
const PORT = process.env.PORT || 3001

/**
 * @type {import('fastify').FastifyInstance}
 */
const app = Fastify({ 
  logger: {
    level: config.logging.level,
    transport: config.logging.format === 'pretty' ? {
      target: 'pino-pretty'
    } : undefined
  },
  // Add explicit JSON parsing configuration
  bodyLimit: 30 * 1024 * 1024, // 30MB
  maxParamLength: 100,
  // Configure JSON parsing
  json: {
    strict: true,
    // Custom JSON parser options
    parser: {
      reviver: (key, value) => {
        // Handle special cases if needed
        return value;
      }
    }
  }
})

// Add content type parser for JSON
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    const json = JSON.parse(body)
    done(null, json)
  } catch (err) {
    done(err, undefined)
  }
})

// Initialize services
const prisma = new PrismaClient()
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}))

// Make services available in route handlers
app.decorate('prisma', prisma)
app.decorate('redis', redis)
app.decorate('openai', openai)

// Security middleware setup
app.register(cors, securityConfig.cors)
app.register(jwt, {
  secret: process.env.JWT_SECRET || 'vibeguard_secure_jwt_secret_key_2024_dev_only',
  sign: { 
    algorithm: 'HS256',
    expiresIn: securityConfig.jwt.expiresIn 
  },
  verify: {
    algorithms: ['HS256']
  }
})
app.register(websocket)

// Authentication decorator
app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
})

// Admin authentication decorator
app.decorate('authenticateAdmin', async (request, reply) => {
  try {
    await request.jwtVerify()
    if (request.user.role !== 'ADMIN') {
      throw new Error('Admin access required')
    }
  } catch (err) {
    reply.code(403).send({ error: 'Admin access required' })
  }
})

// Auth routes
app.post('/auth/login', async (request, reply) => {
  const { email, password: plainPassword } = request.body
  
  // Input validation
  if (!email || !plainPassword) {
    return reply.code(400).send({ error: 'Email and password required' })
  }
  
  const sanitizedEmail = sanitize.email(email)
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail }
    })
    
    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }
    
    const isValid = await password.verify(user.password, plainPassword)
    if (!isValid) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })
    
    const token = app.jwt.sign(
      { id: user.id, role: user.role },
      { expiresIn: securityConfig.jwt.expiresIn }
    )
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        metadata: { role: user.role }
      }
    })
    
    return { 
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        nightclubId: user.nightclubId
      }
    }
  } catch (err) {
    app.log.error(err)
    return reply.code(500).send({ error: 'Internal server error' })
  }
})

// Register routes
app.register(async function (fastify) {
  // Public routes
  fastify.register(userRoutes, { prefix: '/api' })
  
  // Protected routes
  fastify.register(async function (fastify) {
    fastify.addHook('onRequest', fastify.authenticate)
    
    // Register route handlers
    await fastify.register(emergencyRoutes, { prefix: '/api' })
    await fastify.register(braceletRoutes, { prefix: '/api' })
    await fastify.register(floorPlanRoutes, { prefix: '/api' })
    await fastify.register(zoneRoutes, { prefix: '/api' })
    await fastify.register(sensorRoutes, { prefix: '/api' })
  })
  
  // Admin routes
  fastify.register(async function (fastify) {
    fastify.addHook('onRequest', fastify.authenticateAdmin)
    
    await fastify.register(adminRoutes, { prefix: '/api/admin' })
  })
  
  // Analytics routes
  fastify.register(analyticsRoutes, { prefix: '/api' })
  
  // Dashboard routes
  fastify.register(dashboardRoutes, { prefix: '/api' })
  
  // Real-time routes
  fastify.register(realtimeRoutes, { prefix: '/api' })
})

// Error handling
app.setErrorHandler((error, request, reply) => {
  app.log.error(error)
  
  // Don't expose internal errors to clients
  if (error.validation) {
    return reply.code(400).send({ 
      error: 'Validation error',
      details: error.validation
    })
  }
  
  if (error.statusCode) {
    return reply.code(error.statusCode).send({ error: error.message })
  }
  
  reply.code(500).send({ error: 'Internal server error' })
})

// Start server
const start = async () => {
  try {
    // Initialize WebSocket service
    const wsService = new WebSocketService(app)
    app.decorate('ws', wsService)
    
    // Handle graceful shutdown
    const shutdown = async () => {
      app.log.info('Shutting down...')
      
      // Cleanup WebSocket connections
      wsService.cleanup()
      
      // Close Redis connection
      await redis.quit()
      
      // Close database connection
      await prisma.$disconnect()
      
      // Close server
      await app.close()
      
      process.exit(0)
    }
    
    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
    
    await app.listen({ 
      port: PORT,
      host: '0.0.0.0'
    })
    
    app.log.info(`Server running with enhanced security on port ${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
