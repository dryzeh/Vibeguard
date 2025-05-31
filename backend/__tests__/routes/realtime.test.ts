import '@jest/globals';
import { buildTestApp } from '../../utils/buildTestApp.js';
import { createTestUser, createTestMetric, createTestBehaviorAnalysis } from '../setup.js';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';

describe('Realtime Routes', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let redis: Redis;
  let testUser: any;
  let testToken: string;

  beforeAll(async () => {
    // Build test app
    app = await buildTestApp();
    prisma = app.prisma;
    redis = app.redis;

    // Create test user and get token
    testUser = await createTestUser();
    testToken = app.jwt.sign({ 
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
      nightclubId: testUser.nightclubId
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/metrics', () => {
    it('should create a new metric', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/metrics',
        headers: {
          authorization: `Bearer ${testToken}`
        },
        payload: {
          type: 'OCCUPANCY',
          value: 75,
          nightclubId: testUser.nightclubId,
          metadata: { test: true }
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data).toMatchObject({
        type: 'OCCUPANCY',
        value: 75,
        nightclubId: testUser.nightclubId
      });
    });

    it('should reject invalid metric data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/metrics',
        headers: {
          authorization: `Bearer ${testToken}`
        },
        payload: {
          type: 'INVALID_TYPE',
          value: 'not-a-number',
          nightclubId: testUser.nightclubId
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/metrics',
        payload: {
          type: 'OCCUPANCY',
          value: 75,
          nightclubId: testUser.nightclubId
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/metrics', () => {
    beforeEach(async () => {
      // Create test metrics
      await createTestMetric(testUser.nightclubId, 'OCCUPANCY');
      await createTestMetric(testUser.nightclubId, 'MOVEMENT');
    });

    it('should get metrics for the specified time range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/metrics?timeRange=1h',
        headers: {
          authorization: `Bearer ${testToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('type');
      expect(data[0]).toHaveProperty('value');
    });

    it('should filter metrics by type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/metrics?timeRange=1h&type=OCCUPANCY',
        headers: {
          authorization: `Bearer ${testToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.every((metric: any) => metric.type === 'OCCUPANCY')).toBe(true);
    });
  });

  describe('GET /api/behavior/:nightclubId', () => {
    beforeEach(async () => {
      // Create test behavior analysis
      await createTestBehaviorAnalysis(testUser.nightclubId, 'CROWD');
    });

    it('should get behavior analysis for the nightclub', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/behavior/${testUser.nightclubId}?timeRange=1h`,
        headers: {
          authorization: `Bearer ${testToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('type');
      expect(data[0]).toHaveProperty('insights');
    });

    it('should filter analysis by type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/behavior/${testUser.nightclubId}?timeRange=1h&type=CROWD`,
        headers: {
          authorization: `Bearer ${testToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.every((analysis: any) => analysis.type === 'CROWD')).toBe(true);
    });

    it('should deny access to other nightclubs', async () => {
      const otherUser = await createTestUser();
      const otherToken = app.jwt.sign({ 
        id: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
        nightclubId: otherUser.nightclubId
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/behavior/${testUser.nightclubId}?timeRange=1h`,
        headers: {
          authorization: `Bearer ${otherToken}`
        }
      });

      expect(response.statusCode).toBe(403);
    });
  });
}); 