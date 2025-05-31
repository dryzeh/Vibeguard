import { z } from 'zod';
import { sanitize } from '../utils/security.js';

// Input validation schemas
const createZoneSchema = z.object({
  floorPlanId: z.string(),
  name: z.string().min(1),
  type: z.enum(['DANCE_FLOOR', 'BAR', 'VIP', 'ENTRANCE', 'EXIT', 'RESTROOM', 'OTHER']),
  coordinates: z.array(z.object({
    x: z.number(),
    y: z.number()
  })).min(3), // At least 3 points to form a polygon
  capacity: z.number().int().positive().optional(),
  metadata: z.any().optional()
});

const updateZoneSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['DANCE_FLOOR', 'BAR', 'VIP', 'ENTRANCE', 'EXIT', 'RESTROOM', 'OTHER']).optional(),
  coordinates: z.array(z.object({
    x: z.number(),
    y: z.number()
  })).min(3).optional(),
  capacity: z.number().int().positive().optional(),
  metadata: z.any().optional()
});

const zoneRoutes = async (fastify, options, done) => {
  // Create new zone
  fastify.post('/zones', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = createZoneSchema.parse(request.body);
      
      // Get floor plan and verify access
      const floorPlan = await fastify.prisma.floorPlan.findUnique({
        where: { id: data.floorPlanId },
        include: { nightclub: true }
      });
      
      if (!floorPlan) {
        return reply.code(404).send({ error: 'Floor plan not found' });
      }
      
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });
      
      if (user.nightclubId !== floorPlan.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Create zone
      const zone = await fastify.prisma.zone.create({
        data: {
          ...data,
          metadata: {
            ...data.metadata,
            createdBy: request.user.id,
            createdAt: new Date()
          }
        },
        include: {
          floorPlan: {
            include: {
              nightclub: true
            }
          },
          sensors: true
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'ZONE_CREATED',
          entityType: 'Zone',
          entityId: zone.id,
          userId: request.user.id,
          metadata: { 
            type: zone.type,
            floorPlanId: zone.floorPlanId
          }
        }
      });
      
      // Broadcast to all connected clients
      fastify.ws.broadcastToNightclub(floorPlan.nightclubId, {
        type: 'ZONE_CREATED',
        data: zone
      });
      
      return zone;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get zone details
  fastify.get('/zones/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const zone = await fastify.prisma.zone.findUnique({
      where: { id: request.params.id },
      include: {
        floorPlan: {
          include: {
            nightclub: true
          }
        },
        sensors: true,
        currentBracelets: {
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
    
    if (!zone) {
      return reply.code(404).send({ error: 'Zone not found' });
    }
    
    // Check if user has access
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id }
    });
    
    if (user.nightclubId !== zone.floorPlan.nightclubId && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    return zone;
  });

  // Update zone
  fastify.put('/zones/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = updateZoneSchema.parse(request.body);
      
      const zone = await fastify.prisma.zone.findUnique({
        where: { id: request.params.id },
        include: {
          floorPlan: {
            include: {
              nightclub: true
            }
          }
        }
      });
      
      if (!zone) {
        return reply.code(404).send({ error: 'Zone not found' });
      }
      
      // Check if user has access
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });
      
      if (user.nightclubId !== zone.floorPlan.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Update zone
      const updatedZone = await fastify.prisma.zone.update({
        where: { id: zone.id },
        data: {
          ...data,
          metadata: {
            ...zone.metadata,
            ...data.metadata,
            lastUpdatedBy: request.user.id,
            lastUpdatedAt: new Date()
          }
        },
        include: {
          floorPlan: {
            include: {
              nightclub: true
            }
          },
          sensors: true
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'ZONE_UPDATED',
          entityType: 'Zone',
          entityId: zone.id,
          userId: request.user.id,
          metadata: { 
            updatedFields: Object.keys(data),
            floorPlanId: zone.floorPlanId
          }
        }
      });
      
      // Broadcast to all connected clients
      fastify.ws.broadcastToNightclub(zone.floorPlan.nightclubId, {
        type: 'ZONE_UPDATED',
        data: updatedZone
      });
      
      return updatedZone;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete zone
  fastify.delete('/zones/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const zone = await fastify.prisma.zone.findUnique({
      where: { id: request.params.id },
      include: {
        floorPlan: {
          include: {
            nightclub: true
          }
        },
        currentBracelets: true,
        sensors: true
      }
    });
    
    if (!zone) {
      return reply.code(404).send({ error: 'Zone not found' });
    }
    
    // Check if user has access
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id }
    });
    
    if (user.nightclubId !== zone.floorPlan.nightclubId && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    // Check if zone has active bracelets
    if (zone.currentBracelets.length > 0) {
      return reply.code(400).send({ error: 'Cannot delete zone with active bracelets' });
    }
    
    // Check if zone has sensors
    if (zone.sensors.length > 0) {
      return reply.code(400).send({ error: 'Cannot delete zone with active sensors' });
    }
    
    // Delete zone
    await fastify.prisma.zone.delete({
      where: { id: zone.id }
    });
    
    // Log the action
    await fastify.prisma.auditLog.create({
      data: {
        action: 'ZONE_DELETED',
        entityType: 'Zone',
        entityId: zone.id,
        userId: request.user.id,
        metadata: { 
          type: zone.type,
          floorPlanId: zone.floorPlanId
        }
      }
    });
    
    // Broadcast to all connected clients
    fastify.ws.broadcastToNightclub(zone.floorPlan.nightclubId, {
      type: 'ZONE_DELETED',
      data: { id: zone.id }
    });
    
    return { success: true };
  });

  // Get all zones for a floor plan
  fastify.get('/floorplans/:floorPlanId/zones', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const floorPlan = await fastify.prisma.floorPlan.findUnique({
      where: { id: request.params.floorPlanId },
      include: { nightclub: true }
    });
    
    if (!floorPlan) {
      return reply.code(404).send({ error: 'Floor plan not found' });
    }
    
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id }
    });
    
    if (user.nightclubId !== floorPlan.nightclubId && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    const zones = await fastify.prisma.zone.findMany({
      where: {
        floorPlanId: floorPlan.id
      },
      include: {
        sensors: true,
        currentBracelets: {
          select: {
            id: true,
            status: true,
            lastSeen: true
          }
        }
      }
    });
    
    return zones;
  });

  // Get zone statistics
  fastify.get('/zones/:id/stats', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const zone = await fastify.prisma.zone.findUnique({
      where: { id: request.params.id },
      include: {
        floorPlan: {
          include: {
            nightclub: true
          }
        },
        currentBracelets: true,
        alerts: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        },
        emergencies: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        }
      }
    });
    
    if (!zone) {
      return reply.code(404).send({ error: 'Zone not found' });
    }
    
    // Check if user has access
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id }
    });
    
    if (user.nightclubId !== zone.floorPlan.nightclubId && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    const stats = {
      currentOccupancy: zone.currentBracelets.length,
      capacity: zone.capacity,
      occupancyPercentage: zone.capacity ? (zone.currentBracelets.length / zone.capacity) * 100 : null,
      activeAlerts: zone.alerts.length,
      activeEmergencies: zone.emergencies.length,
      lastUpdated: new Date()
    };
    
    return stats;
  });

  done();
};

export default zoneRoutes; 