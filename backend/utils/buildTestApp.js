import fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { buildTestApp } from './buildTestApp.js';

async function buildTestApp() {
  const app = fastify({ logger: false });
  const prisma = new PrismaClient();
  const redis = new Redis({ host: 'localhost', port: 6379, lazyConnect: true });
  // (Optional) register minimal plugins (e.g. CORS, JWT, etc.) if needed for tests.
  // (For example, if your tests require auth, you can register a minimal JWT plugin.)
  // await app.register(import('@fastify/jwt'), { secret: 'test-secret' });
  // (Optional) register minimal routes (or mock them) if needed.
  // (For example, if your tests call /auth/login, you can register a minimal route.)
  // app.get('/auth/login', (req, reply) => { reply.send({ token: 'fake-token' }); });
  return { app, prisma, redis };
}

export { buildTestApp }; 