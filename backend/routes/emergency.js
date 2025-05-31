import { z } from 'zod';
import { EmergencyHandler } from '../services/emergencyHandler.js';

// Input validation schemas
const createEmergencySchema = z.object({
  braceletId: z.string(),
  zoneId: z.string(),
  metadata: z.any().optional()
});

const updateEmergencySchema = z.object({
  status: z.enum(['ACTIVE', 'RESPONDING', 'ESCALATED', 'RESOLVED']).optional(),
  responderId: z.string().optional(),
  resolutionDetails: z.any().optional(),
  metadata: z.any().optional()
});

const createAlertSchema = z.object({
  braceletId: z.string(),
  zoneId: z.string(),
  type: z.enum(['EMERGENCY', 'BATTERY_LOW', 'SIGNAL_LOSS', 'ZONE_BREACH', 'TAMPERING']),
  metadata: z.any().optional()
});

const emergencyRoutes = async (fastify, options) => {
  const emergencyHandler = new EmergencyHandler(fastify.locationTracker);

  // Create new emergency
  fastify.post('/emergencies', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = createEmergencySchema.parse(request.body);
      
      // Verify bracelet and zone exist and belong to user's nightclub
      const [bracelet, zone] = await Promise.all([
        fastify.prisma.bracelet.findUnique({
          where: { id: data.braceletId },
          include: { nightclub: true }
        }),
        fastify.prisma.zone.findUnique({
          where: { id: data.zoneId },
          include: { nightclub: true }
        })
      ]);
      
      if (!bracelet || !zone) {
        return reply.code(404).send({ error: 'Bracelet or zone not found' });
      }
      
      if (bracelet.nightclubId !== zone.nightclubId) {
        return reply.code(400).send({ error: 'Bracelet and zone must belong to the same nightclub' });
      }
      
      // Check if user has access to the nightclub
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });
      
      if (user.nightclubId !== bracelet.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Create emergency
      const emergency = await fastify.prisma.emergency.create({
        data: {
          ...data,
          nightclubId: bracelet.nightclubId,
          status: 'ACTIVE',
          metadata: {
            ...data.metadata,
            createdBy: request.user.id
          }
        },
        include: {
          bracelet: true,
          zone: {
            include: {
              floorPlan: true
            }
          },
          nightclub: true
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'EMERGENCY_CREATED',
          entityType: 'Emergency',
          entityId: emergency.id,
          userId: request.user.id,
          metadata: { status: emergency.status }
        }
      });
      
      // Handle emergency
      await emergencyHandler.handleEmergency(emergency);
      
      // Broadcast to all connected clients
      fastify.websocketServer.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'EMERGENCY_CREATED',
            data: emergency
          }));
        }
      });
      
      return emergency;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get emergency details
  fastify.get('/emergencies/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const emergency = await fastify.prisma.emergency.findUnique({
      where: { id: request.params.id },
      include: {
        bracelet: true,
        zone: {
          include: {
            floorPlan: true
          }
        },
        nightclub: true,
        responder: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
    
    if (!emergency) {
      return reply.code(404).send({ error: 'Emergency not found' });
    }
    
    // Check if user has access
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id }
    });
    
    if (user.nightclubId !== emergency.nightclubId && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    return emergency;
  });

  // Update emergency status
  fastify.put('/emergencies/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = updateEmergencySchema.parse(request.body);
      
      const emergency = await fastify.prisma.emergency.findUnique({
        where: { id: request.params.id },
        include: {
          nightclub: true
        }
      });
      
      if (!emergency) {
        return reply.code(404).send({ error: 'Emergency not found' });
      }
      
      // Check if user has access
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });
      
      if (user.nightclubId !== emergency.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Update emergency
      const updatedEmergency = await fastify.prisma.emergency.update({
        where: { id: emergency.id },
        data: {
          ...data,
          resolvedAt: data.status === 'RESOLVED' ? new Date() : undefined,
          responseTime: data.status === 'RESPONDING' ? 
            Date.now() - new Date(emergency.createdAt).getTime() : 
            emergency.responseTime
        },
        include: {
          bracelet: true,
          zone: {
            include: {
              floorPlan: true
            }
          },
          nightclub: true,
          responder: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'EMERGENCY_UPDATED',
          entityType: 'Emergency',
          entityId: emergency.id,
          userId: request.user.id,
          metadata: { 
            status: updatedEmergency.status,
            updatedFields: Object.keys(data)
          }
        }
      });
      
      // Handle status change
      await emergencyHandler.handleStatusChange(updatedEmergency);
      
      // Broadcast to all connected clients
      fastify.websocketServer.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'EMERGENCY_UPDATED',
            data: updatedEmergency
          }));
        }
      });
      
      return updatedEmergency;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create alert
  fastify.post('/alerts', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = createAlertSchema.parse(request.body);
      
      // Verify bracelet and zone exist and belong to user's nightclub
      const [bracelet, zone] = await Promise.all([
        fastify.prisma.bracelet.findUnique({
          where: { id: data.braceletId },
          include: { nightclub: true }
        }),
        fastify.prisma.zone.findUnique({
          where: { id: data.zoneId },
          include: { nightclub: true }
        })
      ]);
      
      if (!bracelet || !zone) {
        return reply.code(404).send({ error: 'Bracelet or zone not found' });
      }
      
      if (bracelet.nightclubId !== zone.nightclubId) {
        return reply.code(400).send({ error: 'Bracelet and zone must belong to the same nightclub' });
      }
      
      // Check if user has access to the nightclub
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });
      
      if (user.nightclubId !== bracelet.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Create alert
      const alert = await fastify.prisma.alert.create({
        data: {
          ...data,
          userId: request.user.id,
          status: 'ACTIVE',
          metadata: {
            ...data.metadata,
            createdBy: request.user.id
          }
        },
        include: {
          bracelet: true,
          zone: {
            include: {
              floorPlan: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'ALERT_CREATED',
          entityType: 'Alert',
          entityId: alert.id,
          userId: request.user.id,
          metadata: { type: alert.type }
        }
      });
      
      // Broadcast to all connected clients
      fastify.websocketServer.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'ALERT_CREATED',
            data: alert
          }));
        }
      });
      
      return alert;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get active emergencies
  fastify.get('/emergencies/active', { onRequest: [fastify.authenticate] }, async (request) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id }
    });
    
    const where = user.role === 'ADMIN' ? {} : { nightclubId: user.nightclubId };
    
    const emergencies = await fastify.prisma.emergency.findMany({
      where: {
        ...where,
        status: {
          in: ['ACTIVE', 'RESPONDING', 'ESCALATED']
        }
      },
      include: {
        bracelet: true,
        zone: {
          include: {
            floorPlan: true
          }
        },
        nightclub: true,
        responder: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return emergencies;
  });

  // Get active alerts
  fastify.get('/alerts/active', { onRequest: [fastify.authenticate] }, async (request) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id }
    });
    
    const where = user.role === 'ADMIN' ? {} : { 
      zone: {
        nightclubId: user.nightclubId
      }
    };
    
    const alerts = await fastify.prisma.alert.findMany({
      where: {
        ...where,
        status: 'ACTIVE'
      },
      include: {
        bracelet: true,
        zone: {
          include: {
            floorPlan: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return alerts;
  });
};

export default emergencyRoutes; 