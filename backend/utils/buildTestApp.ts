import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import OpenAI from 'openai';
import { FastifyInstanceWithServices } from '../types/fastify.js';
import { securityConfig } from '../config/security.js';
import WebSocketService from '../services/websocket.js';

interface TestAppOptions {
  logger?: boolean;
  prisma?: PrismaClient;
  redis?: Redis;
  openai?: OpenAI;
}

export async function buildTestApp(options: TestAppOptions = {}): Promise<FastifyInstanceWithServices> {
  const {
    logger = false,
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vibeguard_test'
        }
      }
    }),
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10)
    }),
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'test-key'
    })
  } = options;

  // Create Fastify instance
  const app = Fastify({ 
    logger: logger ? {
      level: 'info',
      transport: {
        target: 'pino-pretty'
      }
    } : false,
    bodyLimit: 30 * 1024 * 1024, // 30MB
    maxParamLength: 100
  }) as FastifyInstanceWithServices;

  // Add services to app instance
  app.decorate('prisma', prisma);
  app.decorate('redis', redis);
  app.decorate('openai', openai);
  app.decorate('ws', new WebSocketService(app));

  // Register plugins
  await app.register(cors, securityConfig.cors);
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'test-secret',
    sign: { 
      algorithm: 'HS256',
      expiresIn: securityConfig.jwt.expiresIn 
    },
    verify: {
      algorithms: ['HS256']
    }
  });
  await app.register(websocket);

  // Add authentication decorator
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Add admin authentication decorator
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

  return app;
} 