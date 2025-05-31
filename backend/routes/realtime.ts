import { z } from 'zod';
import { FastifyInstance, FastifyInstanceWithServices } from '../types/fastify';
import { RoutePlugin } from '../types/fastify.js';
import RealTimeProcessor from '../services/realTimeProcessor.js';
import { Prisma } from '@prisma/client';
import { FastifyRequest, FastifyReply } from 'fastify';

// Input validation schemas
const metricSchema = z.object({
  type: z.enum(['OCCUPANCY', 'MOVEMENT', 'ALERT', 'SENSOR', 'CUSTOM']),
  value: z.number(),
  nightclubId: z.string(),
  zoneId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const timeRangeSchema = z.enum(['1h', '6h', '24h', '7d']).default('1h');
const metricTypeSchema = z.enum(['OCCUPANCY', 'MOVEMENT', 'ALERT', 'SENSOR', 'CUSTOM']);

// Route types
type MetricBody = z.infer<typeof metricSchema>;
type TimeRange = z.infer<typeof timeRangeSchema>;
type MetricType = z.infer<typeof metricTypeSchema>;

const realtimeRoutes = async (fastify: FastifyInstanceWithServices, options: any) => {
  // Initialize real-time processor
  const processor = new RealTimeProcessor(fastify);

  // Submit real-time metric
  fastify.post<{ Body: MetricBody }>('/metrics', {
    onRequest: [fastify.authenticate],
    schema: {
      body: metricSchema
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const metric = await processor.processMetric(request.body);
      return metric;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to process metric' });
    }
  });

  // Get real-time metrics
  fastify.get<{ 
    Querystring: { 
      type?: MetricType;
      timeRange: TimeRange;
    }
  }>('/metrics', {
    onRequest: [fastify.authenticate],
    schema: {
      querystring: z.object({
        type: metricTypeSchema.optional(),
        timeRange: timeRangeSchema
      })
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { type, timeRange } = request.query;
      
      // Calculate time range
      const startDate = new Date();
      switch (timeRange) {
        case '1h': startDate.setHours(startDate.getHours() - 1); break;
        case '6h': startDate.setHours(startDate.getHours() - 6); break;
        case '24h': startDate.setDate(startDate.getDate() - 1); break;
        case '7d': startDate.setDate(startDate.getDate() - 7); break;
      }

      // Get metrics from database
      const metrics = await fastify.prisma.realTimeMetric.findMany({
        where: {
          type: type || undefined,
          timestamp: {
            gte: startDate
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      return metrics;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to get metrics' });
    }
  });

  // Get behavior analysis
  fastify.get<{ 
    Params: { nightclubId: string };
    Querystring: { 
      type?: 'CROWD' | 'INDIVIDUAL' | 'GROUP';
      timeRange: TimeRange;
      zoneId?: string;
    }
  }>('/behavior/:nightclubId', {
    onRequest: [fastify.authenticate],
    schema: {
      querystring: z.object({
        type: z.enum(['CROWD', 'INDIVIDUAL', 'GROUP']).optional(),
        timeRange: timeRangeSchema,
        zoneId: z.string().optional()
      })
    }
  }, async (request, reply) => {
    try {
      const { nightclubId } = request.params;
      const { type, timeRange, zoneId } = request.query;

      // Verify access
      const userId = (request.user as { id: string }).id;
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      if (user.nightclubId !== nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Calculate time range
      const startDate = new Date();
      switch (timeRange) {
        case '1h': startDate.setHours(startDate.getHours() - 1); break;
        case '6h': startDate.setHours(startDate.getHours() - 6); break;
        case '24h': startDate.setDate(startDate.getDate() - 1); break;
        case '7d': startDate.setDate(startDate.getDate() - 7); break;
      }

      // Get behavior analysis
      const analysis = await fastify.prisma.behaviorAnalysis.findMany({
        where: {
          nightclubId,
          type: type || undefined,
          zoneId: zoneId || undefined,
          timestamp: {
            gte: startDate
          }
        },
        include: {
          model: true,
          zone: true
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      return analysis;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch behavior analysis' });
    }
  });

  // Cleanup on server shutdown
  fastify.addHook('onClose', async () => {
    await processor.cleanup();
  });
};

export default realtimeRoutes; 