import { z } from 'zod';
import { FastifyInstance, FastifyReply } from 'fastify';
import { RoutePlugin, AuthenticatedRequest, FastifyInstanceWithServices } from '../types/fastify.js';
import { Prisma } from '@prisma/client';
import { zodToJsonSchema } from '../utils/zodToJsonSchema.js';

// Input validation schemas
const createFloorPlanSchema = z.object({
  nightclubId: z.string(),
  name: z.string().min(1),
  level: z.number().int(),
  imageUrl: z.string().url(),
  width: z.number().positive(),
  height: z.number().positive(),
  metadata: z.record(z.unknown()).optional()
});

const updateFloorPlanSchema = z.object({
  name: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  metadata: z.record(z.unknown()).optional()
});

// Route types
type CreateFloorPlanBody = z.infer<typeof createFloorPlanSchema>;
type UpdateFloorPlanBody = z.infer<typeof updateFloorPlanSchema>;

// Plugin definition
export default async function (fastify: FastifyInstanceWithServices, options: any, done: any) {
  // Create floor plan
  fastify.post<{ Body: CreateFloorPlanBody }>('/floorplans', {
    onRequest: [fastify.authenticate],
    schema: {
      body: createFloorPlanSchema
    }
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest & { body: CreateFloorPlanBody };
    try {
      const data = req.body;
      
      // Check if user has access to the nightclub
      const user = await fastify.prisma.user.findUnique({
        where: { id: req.user.id }
      });
      
      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }
      
      if (user.nightclubId !== data.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Check if floor plan already exists for this level
      const existingFloorPlan = await fastify.prisma.floorPlan.findFirst({
        where: {
          nightclubId: data.nightclubId,
          metadata: {
            path: ['level'],
            equals: data.level
          }
        }
      });
      
      if (existingFloorPlan) {
        return reply.code(400).send({ error: 'Floor plan already exists for this level' });
      }
      
      // Create floor plan
      const floorPlan = await fastify.prisma.floorPlan.create({
        data: {
          nightclubId: data.nightclubId,
          name: data.name,
          imageUrl: data.imageUrl,
          metadata: {
            level: data.level,
            width: data.width,
            height: data.height,
            ...(data.metadata || {}),
            createdBy: req.user.id,
            createdAt: new Date()
          }
        },
        include: {
          nightclub: true,
          zones: true
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'FLOORPLAN_CREATED',
          entityType: 'FloorPlan',
          entityId: floorPlan.id,
          userId: req.user.id,
          metadata: { level: (floorPlan.metadata as any).level }
        }
      });
      
      // Broadcast to all connected clients
      fastify.ws.broadcastToNightclub(floorPlan.nightclubId, {
        type: 'FLOORPLAN_CREATED',
        data: floorPlan
      });
      
      return floorPlan;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get floor plan
  fastify.get<{ Params: { id: string } }>('/floorplans/:id', {
    onRequest: [fastify.authenticate],
    schema: {
      params: z.object({
        id: z.string()
      })
    }
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    try {
      const { id } = req.params;
      const floorPlan = await fastify.prisma.floorPlan.findUnique({
        where: { id },
        include: {
          nightclub: true,
          zones: {
            include: {
              sensors: true,
              alerts: {
                where: { status: 'ACTIVE' }
              },
              emergencies: {
                where: {
                  status: {
                    in: ['ACTIVE', 'RESPONDING', 'ESCALATED']
                  }
                }
              }
            }
          }
        }
      });
      
      if (!floorPlan) {
        return reply.code(404).send({ error: 'Floor plan not found' });
      }
      
      // Check if user has access
      const user = await fastify.prisma.user.findUnique({
        where: { id: req.user.id }
      });
      
      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }
      
      if (user.nightclubId !== floorPlan.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      return floorPlan;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update floor plan
  fastify.put<{ Params: { id: string }; Body: UpdateFloorPlanBody }>('/floorplans/:id', {
    onRequest: [fastify.authenticate],
    schema: {
      params: zodToJsonSchema(z.object({
        id: z.string()
      })),
      body: zodToJsonSchema(updateFloorPlanSchema)
    }
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest & { body: UpdateFloorPlanBody };
    try {
      const { id } = req.params;
      const data = req.body;
      
      const floorPlan = await fastify.prisma.floorPlan.findUnique({
        where: { id },
        include: {
          nightclub: true
        }
      });
      
      if (!floorPlan) {
        return reply.code(404).send({ error: 'Floor plan not found' });
      }
      
      // Check if user has access
      const user = await fastify.prisma.user.findUnique({
        where: { id: req.user.id }
      });
      
      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }
      
      if (user.nightclubId !== floorPlan.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Update floor plan
      const updatedFloorPlan = await fastify.prisma.floorPlan.update({
        where: { id: floorPlan.id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.imageUrl && { imageUrl: data.imageUrl }),
          metadata: {
            ...(floorPlan.metadata as Prisma.JsonObject || {}),
            ...(data.width && { width: data.width }),
            ...(data.height && { height: data.height }),
            ...(data.metadata as Prisma.JsonObject || {}),
            lastUpdatedBy: req.user.id,
            lastUpdatedAt: new Date()
          }
        },
        include: {
          nightclub: true,
          zones: true
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'FLOORPLAN_UPDATED',
          entityType: 'FloorPlan',
          entityId: floorPlan.id,
          userId: req.user.id,
          metadata: { updatedFields: Object.keys(data) }
        }
      });
      
      // Broadcast to all connected clients
      fastify.ws.broadcastToNightclub(floorPlan.nightclubId, {
        type: 'FLOORPLAN_UPDATED',
        data: updatedFloorPlan
      });
      
      return updatedFloorPlan;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete floor plan
  fastify.delete<{ Params: { id: string } }>('/floorplans/:id', {
    onRequest: [fastify.authenticate],
    schema: {
      params: z.object({
        id: z.string()
      })
    }
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    try {
      const { id } = req.params;
      const floorPlan = await fastify.prisma.floorPlan.findUnique({
        where: { id },
        include: {
          nightclub: true,
          zones: {
            include: {
              alerts: {
                where: { status: 'ACTIVE' }
              },
              emergencies: {
                where: {
                  status: {
                    in: ['ACTIVE', 'RESPONDING', 'ESCALATED']
                  }
                }
              }
            }
          }
        }
      });
      
      if (!floorPlan) {
        return reply.code(404).send({ error: 'Floor plan not found' });
      }
      
      // Check if user has access
      const user = await fastify.prisma.user.findUnique({
        where: { id: req.user.id }
      });
      
      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }
      
      if (user.nightclubId !== floorPlan.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Check if floor plan has active alerts or emergencies
      const hasActiveAlerts = floorPlan.zones.some(zone => zone.alerts.length > 0);
      const hasActiveEmergencies = floorPlan.zones.some(zone => zone.emergencies.length > 0);
      
      if (hasActiveAlerts || hasActiveEmergencies) {
        return reply.code(400).send({ error: 'Cannot delete floor plan with active alerts or emergencies' });
      }
      
      // Delete floor plan
      await fastify.prisma.floorPlan.delete({
        where: { id: floorPlan.id }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'FLOORPLAN_DELETED',
          entityType: 'FloorPlan',
          entityId: floorPlan.id,
          userId: req.user.id,
          metadata: { level: (floorPlan.metadata as any).level }
        }
      });
      
      // Broadcast to all connected clients
      fastify.ws.broadcastToNightclub(floorPlan.nightclubId, {
        type: 'FLOORPLAN_DELETED',
        data: { id: floorPlan.id }
      });
      
      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get nightclub floor plans
  fastify.get<{ Params: { nightclubId: string } }>('/nightclubs/:nightclubId/floorplans', {
    onRequest: [fastify.authenticate],
    schema: {
      params: z.object({
        nightclubId: z.string()
      })
    }
  }, async (request, reply) => {
    const req = request as AuthenticatedRequest;
    try {
      const { nightclubId } = req.params;
      const user = await fastify.prisma.user.findUnique({
        where: { id: req.user.id }
      });
      
      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }
      
      if (user.nightclubId !== nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      const floorPlans = await fastify.prisma.floorPlan.findMany({
        where: {
          nightclubId
        },
        include: {
          zones: {
            include: {
              alerts: {
                where: { status: 'ACTIVE' }
              },
              emergencies: {
                where: {
                  status: {
                    in: ['ACTIVE', 'RESPONDING', 'ESCALATED']
                  }
                }
              }
            }
          }
        }
      });
      
      return floorPlans;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  done();
} 