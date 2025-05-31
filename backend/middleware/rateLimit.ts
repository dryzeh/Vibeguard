import { FastifyRequest, FastifyReply } from 'fastify';
import { Redis } from 'ioredis';
import { config } from '../config/env.js';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (request: FastifyRequest) => string;
  handler?: (request: FastifyRequest, reply: FastifyReply) => void;
}

export function createRateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyGenerator = (req) => `${req.ip}`,
    handler = (req, reply) => {
      reply.code(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  } = options;

  return async function rateLimit(request: FastifyRequest, reply: FastifyReply) {
    if (!config.features.rateLimiting) {
      return;
    }

    const redis = request.server.redis as Redis;
    const key = `ratelimit:${keyGenerator(request)}`;
    
    try {
      // Get current count
      const count = await redis.incr(key);
      
      // Set expiry on first request
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }
      
      // Check if limit exceeded
      if (count > max) {
        const ttl = await redis.pttl(key);
        reply.header('Retry-After', Math.ceil(ttl / 1000));
        return handler(request, reply);
      }
      
      // Add rate limit headers
      reply.header('X-RateLimit-Limit', max);
      reply.header('X-RateLimit-Remaining', Math.max(0, max - count));
      reply.header('X-RateLimit-Reset', Math.ceil(Date.now() / 1000 + windowMs / 1000));
    } catch (error) {
      request.server.log.error('Rate limit error:', error);
      // Fail open - allow request if rate limiting fails
    }
  };
}

// Pre-configured rate limiters
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  keyGenerator: (req) => `auth:${req.ip}`
});

export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests
  keyGenerator: (req) => `api:${req.ip}`
});

export const wsRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages
  keyGenerator: (req) => `ws:${req.ip}`
}); 