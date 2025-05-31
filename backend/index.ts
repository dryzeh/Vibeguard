import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import dotenv from 'dotenv';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import Redis from 'ioredis';
import { securityConfig } from './config/security.js';
import { encryption, password, sanitize } from './utils/security.js';
import WebSocketService from './services/websocket.js';
import { config } from './config/env.js';
import { apiRateLimit } from './middleware/rateLimit.js';

// Import routes
import userRoutes from './routes/user.js';
import emergencyRoutes from './routes/emergency.js';
import braceletRoutes from './routes/bracelet.js';
import floorPlanRoutes from './routes/floorplan.js';
import zoneRoutes from './routes/zone.js';
import sensorRoutes from './routes/sensor.js';
import analyticsRoutes from './routes/analytics.js';
import dashboardRoutes from './routes/dashboard.js';
import realtimeRoutes from './routes/realtime.js';

// Load environment variables
dotenv.config();

// Initialize services
const prisma = new PrismaClient();
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10)
};
const redis = new (Redis as any)(redisOptions);

// Initialize OpenAI only if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
} else {
  console.warn('OpenAI API key not found. AI features will be disabled.');
}

// Set development port
const PORT = parseInt(process.env.PORT || '3001', 10);

/**
 * Create and configure the Fastify application
 */
const app = Fastify({ 
  logger: {
    level: config.logging.level,
    transport: config.logging.format === 'pretty' ? {
      target: 'pino-pretty'
    } : undefined
  },
  bodyLimit: 30 * 1024 * 1024, // 30MB
  maxParamLength: 100
});

// Add services to the app instance
app.decorate('prisma', prisma);
app.decorate('redis', redis);
app.decorate('openai', openai);

// Add content type parser for JSON
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req: FastifyRequest, body: string, done: (err: Error | null, result?: any) => void) => {
  try {
    const json = JSON.parse(body);
    done(null, json);
  } catch (err) {
    done(err as Error, undefined);
  }
});

// Security middleware setup
app.register(cors, securityConfig.cors);
app.register(jwt, {
  secret: process.env.JWT_SECRET || 'vibeguard_secure_jwt_secret_key_2024_dev_only',
  sign: { 
    algorithm: 'HS256',
    expiresIn: securityConfig.jwt.expiresIn 
  },
  verify: {
    algorithms: ['HS256']
  }
});

// WebSocket setup
app.register(websocket, {
  options: {
    maxPayload: 1024 * 1024, // 1MB
    clientTracking: true
  }
});

// Initialize WebSocket service
const wsService = new WebSocketService(app);
app.decorate('ws', wsService);

// Authentication middleware
app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Admin authentication decorator
app.decorate('authenticateAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
    if (request.user.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }
  } catch (err) {
    reply.code(403).send({ error: 'Admin access required' });
  }
});

// Global rate limiting for all routes
if (config.features.rateLimiting) {
  app.addHook('preHandler', apiRateLimit);
}

// Register routes with proper typing
const routes = [
  { plugin: userRoutes, prefix: '/api/users' },
  { plugin: emergencyRoutes, prefix: '/api/emergencies' },
  { plugin: braceletRoutes, prefix: '/api/bracelets' },
  { plugin: floorPlanRoutes, prefix: '/api/floorplans' },
  { plugin: zoneRoutes, prefix: '/api/zones' },
  { plugin: sensorRoutes, prefix: '/api/sensors' },
  { plugin: analyticsRoutes, prefix: '/api/analytics' },
  { plugin: dashboardRoutes, prefix: '/api/dashboard' },
  { plugin: realtimeRoutes, prefix: '/api/realtime' }
];

routes.forEach(({ plugin, prefix }) => {
  app.register(plugin, { prefix });
});

// Error handling
app.setErrorHandler((error: Error, request: FastifyRequest, reply: FastifyReply) => {
  app.log.error(error);
  
  if ('validation' in error) {
    return reply.code(400).send({ 
      error: 'Validation error',
      details: (error as { validation: unknown }).validation
    });
  }
  
  if ('statusCode' in error) {
    return reply.code((error as { statusCode: number }).statusCode).send({ 
      error: error.message 
    });
  }
  
  reply.code(500).send({ error: 'Internal server error' });
});

// Start the server
const start = async (): Promise<void> => {
  try {
    await app.listen({ 
      port: PORT,
      host: '0.0.0.0'
    });
    
    app.log.info(`Server listening on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
const shutdown = async (): Promise<void> => {
  app.log.info('Shutting down...');
  
  try {
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
    
    app.log.info('Server stopped');
    process.exit(0);
  } catch (err) {
    app.log.error('Error during shutdown:', err);
    process.exit(1);
  }
};

// Handle process signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
start();

export { app };