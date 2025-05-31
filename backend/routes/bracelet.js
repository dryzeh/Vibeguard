import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { sanitize } from '../utils/security.js';

// Input validation schemas
const createBraceletSchema = z.object({
  id: z.string(),
  nightclubId: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'LOST']).default('ACTIVE'),
  batteryLevel: z.number().min(0).max(100).optional(),
  lastSeen: z.date().optional(),
  metadata: z.any().optional()
});

const updateBraceletSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'LOST']).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  lastSeen: z.date().optional(),
  metadata: z.any().optional()
});

const updateLocationSchema = z.object({
  zoneId: z.string(),
  coordinates: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  timestamp: z.date().default(() => new Date())
});

async function braceletRoutes(fastify, options) {
  // Create new bracelet
  fastify.post('/bracelets', {
    schema: {
      body: zodToJsonSchema(createBraceletSchema)
    },
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const data = createBraceletSchema.parse(request.body);
      
      // Check if user has access to the nightclub
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });
      
      if (user.nightclubId !== data.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Check if bracelet already exists
      const existingBracelet = await fastify.prisma.bracelet.findUnique({
        where: { id: data.id }
      });
      
      if (existingBracelet) {
        return reply.code(400).send({ error: 'Bracelet already registered' });
      }
      
      // Create bracelet
      const bracelet = await fastify.prisma.bracelet.create({
        data: {
          ...data,
          metadata: {
            ...data.metadata,
            registeredBy: request.user.id,
            registeredAt: new Date()
          }
        },
        include: {
          nightclub: true,
          currentZone: {
            include: {
              floorPlan: true
            }
          }
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'BRACELET_REGISTERED',
          entityType: 'Bracelet',
          entityId: bracelet.id,
          userId: request.user.id,
          metadata: { status: bracelet.status }
        }
      });
      
      // Broadcast to all connected clients
      fastify.ws.broadcastToNightclub(bracelet.nightclubId, {
        type: 'BRACELET_REGISTERED',
        data: bracelet
      });
      
      return bracelet;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get bracelet details
  fastify.get('/bracelets/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const bracelet = await fastify.prisma.bracelet.findUnique({
      where: { id: request.params.id },
      include: {
        nightclub: true,
        currentZone: {
          include: {
            floorPlan: true
          }
        },
        alerts: {
          where: {
            status: 'ACTIVE'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        },
        emergencies: {
          where: {
            status: {
              in: ['ACTIVE', 'RESPONDING', 'ESCALATED']
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });
    
    if (!bracelet) {
      return reply.code(404).send({ error: 'Bracelet not found' });
    }
    
    // Check if user has access
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id }
    });
    
    if (user.nightclubId !== bracelet.nightclubId && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    return bracelet;
  });

  // Update bracelet status
  fastify.put('/bracelets/:id', {
    schema: {
      params: zodToJsonSchema(z.object({
        id: z.string()
      })),
      body: zodToJsonSchema(updateBraceletSchema)
    },
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const data = updateBraceletSchema.parse(request.body);
      
      const bracelet = await fastify.prisma.bracelet.findUnique({
        where: { id: request.params.id },
        include: {
          nightclub: true
        }
      });
      
      if (!bracelet) {
        return reply.code(404).send({ error: 'Bracelet not found' });
      }
      
      // Check if user has access
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });
      
      if (user.nightclubId !== bracelet.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Update bracelet
      const updatedBracelet = await fastify.prisma.bracelet.update({
        where: { id: bracelet.id },
        data: {
          ...data,
          metadata: {
            ...bracelet.metadata,
            ...data.metadata,
            lastUpdatedBy: request.user.id,
            lastUpdatedAt: new Date()
          }
        },
        include: {
          nightclub: true,
          currentZone: {
            include: {
              floorPlan: true
            }
          }
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'BRACELET_UPDATED',
          entityType: 'Bracelet',
          entityId: bracelet.id,
          userId: request.user.id,
          metadata: { 
            status: updatedBracelet.status,
            updatedFields: Object.keys(data)
          }
        }
      });
      
      // Broadcast to all connected clients
      fastify.ws.broadcastToNightclub(bracelet.nightclubId, {
        type: 'BRACELET_UPDATED',
        data: updatedBracelet
      });
      
      return updatedBracelet;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update bracelet location
  fastify.post('/bracelets/:id/location', {
    schema: {
      params: zodToJsonSchema(z.object({
        id: z.string()
      })),
      body: zodToJsonSchema(updateLocationSchema)
    },
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const data = updateLocationSchema.parse(request.body);
      
      const bracelet = await fastify.prisma.bracelet.findUnique({
        where: { id: request.params.id },
        include: {
          nightclub: true,
          currentZone: true
        }
      });
      
      if (!bracelet) {
        return reply.code(404).send({ error: 'Bracelet not found' });
      }
      
      // Verify zone exists and belongs to the same nightclub
      const zone = await fastify.prisma.zone.findUnique({
        where: { id: data.zoneId },
        include: {
          floorPlan: true
        }
      });
      
      if (!zone || zone.floorPlan.nightclubId !== bracelet.nightclubId) {
        return reply.code(400).send({ error: 'Invalid zone' });
      }
      
      // Update bracelet location
      const updatedBracelet = await fastify.prisma.bracelet.update({
        where: { id: bracelet.id },
        data: {
          currentZoneId: data.zoneId,
          lastSeen: data.timestamp,
          metadata: {
            ...bracelet.metadata,
            lastLocation: {
              zoneId: data.zoneId,
              coordinates: data.coordinates,
              timestamp: data.timestamp
            },
            lastUpdatedAt: new Date()
          }
        },
        include: {
          nightclub: true,
          currentZone: {
            include: {
              floorPlan: true
            }
          }
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'BRACELET_LOCATION_UPDATED',
          entityType: 'Bracelet',
          entityId: bracelet.id,
          metadata: { 
            zoneId: data.zoneId,
            coordinates: data.coordinates
          }
        }
      });
      
      // Broadcast to all connected clients
      fastify.ws.broadcastToNightclub(bracelet.nightclubId, {
        type: 'BRACELET_LOCATION',
        data: {
          braceletId: bracelet.id,
          zoneId: data.zoneId,
          coordinates: data.coordinates,
          timestamp: data.timestamp
        }
      });
      
      return updatedBracelet;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get all bracelets for a nightclub
  fastify.get('/nightclubs/:nightclubId/bracelets', {
    schema: {
      params: zodToJsonSchema(z.object({
        nightclubId: z.string()
      }))
    },
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id }
    });
    
    if (user.nightclubId !== request.params.nightclubId && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    const bracelets = await fastify.prisma.bracelet.findMany({
      where: {
        nightclubId: request.params.nightclubId
      },
      include: {
        currentZone: {
          include: {
            floorPlan: true
          }
        }
      },
      orderBy: {
        lastSeen: 'desc'
      }
    });
    
    return bracelets;
  });
}

export default braceletRoutes; 