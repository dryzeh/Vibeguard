import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { build } from '../index.js';
import { Redis } from 'ioredis-mock';

// Global test setup
let app: FastifyInstance;
let prisma: PrismaClient;
let redis: Redis;

beforeAll(async () => {
  // Create test database connection
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vibeguard_test'
      }
    }
  });

  // Create mock Redis instance
  redis = new Redis();

  // Build test app instance
  app = await build({
    logger: false,
    prisma,
    redis
  });

  // Clean database before tests
  await prisma.$transaction([
    prisma.behaviorAnalysis.deleteMany(),
    prisma.anomaly.deleteMany(),
    prisma.realTimeMetric.deleteMany(),
    prisma.user.deleteMany(),
    prisma.nightclub.deleteMany(),
    prisma.zone.deleteMany()
  ]);
});

afterAll(async () => {
  // Clean up after all tests
  await prisma.$disconnect();
  await app.close();
});

// Export test utilities
export { app, prisma, redis };

// Helper function to create test user
export async function createTestUser(role: 'ADMIN' | 'STAFF' = 'STAFF') {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      password: 'hashed_password', // In real tests, use proper password hashing
      role,
      nightclub: {
        create: {
          name: 'Test Nightclub',
          address: '123 Test St'
        }
      }
    },
    include: {
      nightclub: true
    }
  });
}

// Helper function to create test metric
export async function createTestMetric(nightclubId: string, type: string = 'OCCUPANCY') {
  return prisma.realTimeMetric.create({
    data: {
      type,
      value: Math.random() * 100,
      nightclubId,
      metadata: { test: true }
    }
  });
}

// Helper function to create test behavior analysis
export async function createTestBehaviorAnalysis(nightclubId: string, type: string = 'CROWD') {
  return prisma.behaviorAnalysis.create({
    data: {
      type,
      insights: { test: true },
      nightclubId,
      model: {
        create: {
          name: 'Test Model',
          type: 'BEHAVIOR_ANALYSIS',
          status: 'ACTIVE'
        }
      }
    }
  });
} 