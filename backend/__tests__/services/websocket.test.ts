import '@jest/globals';
import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import { buildTestApp } from '../../utils/buildTestApp.js';
import { createTestUser } from '../setup.js';
import { WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

describe('WebSocket Service', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let redis: Redis;
  let testUser: any;
  let testToken: string;
  let ws: WebSocket;
  let messages: any[] = [];

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

  beforeEach(() => {
    messages = [];
  });

  afterEach(() => {
    if (ws) {
      ws.close();
    }
  });

  it('should establish WebSocket connection', (done) => {
    const port = (app.server.address() as any).port;
    ws = new WebSocket(`ws://localhost:${port}/ws`);

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      done();
    });

    ws.on('error', (error) => {
      done(error);
    });
  });

  it('should receive welcome message on connection', (done) => {
    const port = (app.server.address() as any).port;
    ws = new WebSocket(`ws://localhost:${port}/ws`);

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      expect(message).toMatchObject({
        type: 'connected',
        message: expect.stringContaining('VibeGuard WebSocket service')
      });
      done();
    });
  });

  it('should handle subscription to events', (done) => {
    const port = (app.server.address() as any).port;
    ws = new WebSocket(`ws://localhost:${port}/ws`);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'SUBSCRIBE',
        events: ['METRIC_UPDATE', 'ANOMALY_DETECTED']
      }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'subscribed') {
        expect(message.channels).toContain('METRIC_UPDATE');
        expect(message.channels).toContain('ANOMALY_DETECTED');
        done();
      }
    });
  });

  it('should handle unsubscription from events', (done) => {
    const port = (app.server.address() as any).port;
    ws = new WebSocket(`ws://localhost:${port}/ws`);

    ws.on('open', () => {
      // First subscribe
      ws.send(JSON.stringify({
        type: 'SUBSCRIBE',
        events: ['METRIC_UPDATE']
      }));

      // Then unsubscribe
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'UNSUBSCRIBE',
          events: ['METRIC_UPDATE']
        }));
      }, 100);
    });

    let subscribed = false;
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'subscribed') {
        subscribed = true;
      } else if (message.type === 'unsubscribed' && subscribed) {
        expect(message.channels).not.toContain('METRIC_UPDATE');
        done();
      }
    });
  });

  it('should handle heartbeat', (done) => {
    const port = (app.server.address() as any).port;
    ws = new WebSocket(`ws://localhost:${port}/ws`);

    ws.on('open', () => {
      // Wait for PING
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }, 100);
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'pong') {
        done();
      }
    });
  });

  it('should broadcast messages to subscribed clients', (done) => {
    const port = (app.server.address() as any).port;
    const ws1 = new WebSocket(`ws://localhost:${port}/ws`);
    const ws2 = new WebSocket(`ws://localhost:${port}/ws`);
    let receivedCount = 0;

    const handleMessage = (data: any) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'METRIC_UPDATE') {
        receivedCount++;
        if (receivedCount === 2) {
          ws1.close();
          ws2.close();
          done();
        }
      }
    };

    ws1.on('message', handleMessage);
    ws2.on('message', handleMessage);

    ws1.on('open', () => {
      ws1.send(JSON.stringify({
        type: 'SUBSCRIBE',
        events: ['METRIC_UPDATE']
      }));
    });

    ws2.on('open', () => {
      ws2.send(JSON.stringify({
        type: 'SUBSCRIBE',
        events: ['METRIC_UPDATE']
      }));

      // Broadcast a test message
      setTimeout(() => {
        app.ws.broadcast('METRIC_UPDATE', {
          type: 'OCCUPANCY',
          value: 75,
          nightclubId: testUser.nightclubId
        });
      }, 100);
    });
  });

  it('should handle rate limiting', (done) => {
    const port = (app.server.address() as any).port;
    ws = new WebSocket(`ws://localhost:${port}/ws`);

    ws.on('open', () => {
      // Send multiple messages rapidly
      for (let i = 0; i < 10; i++) {
        ws.send(JSON.stringify({
          type: 'SUBSCRIBE',
          events: ['TEST_EVENT']
        }));
      }
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'error' && message.error === 'Rate limit exceeded') {
        done();
      }
    });
  });
}); 