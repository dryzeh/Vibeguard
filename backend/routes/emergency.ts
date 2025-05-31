import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import EmergencyHandler from '../services/emergencyHandler.js';
import { FastifyInstanceWithLocationTracker, RoutePluginWithLocationTracker, AuthenticatedRequest, AuthenticatedRouteHandler } from '../types/fastify.js';
import { FastifyReply, FastifyPluginOptions, RouteGenericInterface } from 'fastify';
import { AlertType, AlertStatus, EmergencyStatus } from '@prisma/client';

// Input validation schemas
const createEmergencySchema = z.object({
  braceletId: z.string(),
  zoneId: z.string(),
  type: z.enum(['EMERGENCY', 'BATTERY_LOW', 'SIGNAL_LOSS', 'ZONE_BREACH', 'TAMPERING']),
  metadata: z.any().optional()
});

const updateEmergencySchema = z.object({
  metadata: z.any().optional(),
  status: z.enum(['ACTIVE', 'RESPONDING', 'ESCALATED', 'RESOLVED']).optional(),
  responderId: z.string().optional(),
  resolutionDetails: z.any().optional()
});

const createAlertSchema = z.object({
  braceletId: z.string(),
  zoneId: z.string(),
  type: z.enum(['EMERGENCY', 'BATTERY_LOW', 'SIGNAL_LOSS', 'ZONE_BREACH', 'TAMPERING'] as const),
  metadata: z.any().optional()
});

// Route types
type CreateEmergencyBody = z.infer<typeof createEmergencySchema>;
type UpdateEmergencyBody = z.infer<typeof updateEmergencySchema>;
type CreateAlertBody = z.infer<typeof createAlertSchema>;

// Define route generic interfaces
interface CreateEmergencyRoute extends RouteGenericInterface {
  Body: z.infer<typeof createEmergencySchema>;
}

interface GetEmergencyRoute extends RouteGenericInterface {
  Params: { id: string };
}

interface UpdateEmergencyRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: z.infer<typeof updateEmergencySchema>;
}

interface GetActiveEmergenciesRoute extends RouteGenericInterface {
  Params: { nightclubId: string };
}

interface CreateAlertRoute extends RouteGenericInterface {
  Body: z.infer<typeof createAlertSchema>;
}

const emergencyRoutes: RoutePluginWithLocationTracker = function (
  fastify: FastifyInstanceWithLocationTracker,
  options: FastifyPluginOptions,
  done: (err?: Error) => void
) {
  const emergencyHandler = new EmergencyHandler(fastify.locationTracker);

  // Create new emergency
  fastify.post<CreateEmergencyRoute>('/emergencies', {
    schema: {
      body: zodToJsonSchema(createEmergencySchema)
    },
    preHandler: [fastify.authenticate]
  }, async (request: AuthenticatedRequest<CreateEmergencyRoute>, reply: FastifyReply) => {
    try {
      const data = createEmergencySchema.parse(request.body);
      const emergency = await emergencyHandler.handleEmergency(data.braceletId, data.zoneId);
      return reply.code(201).send(emergency);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create emergency' });
    }
  });

  // Get emergency by ID
  fastify.get<GetEmergencyRoute>('/emergencies/:id', {
    schema: {
      params: zodToJsonSchema(z.object({
        id: z.string()
      }))
    },
    preHandler: [fastify.authenticate]
  }, async (request: AuthenticatedRequest<GetEmergencyRoute>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const emergency = await emergencyHandler.getEmergencyStatus(id);
      if (!emergency) {
        return reply.code(404).send({ error: 'Emergency not found' });
      }
      return reply.send(emergency);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to get emergency' });
    }
  });

  // Update emergency
  fastify.patch<UpdateEmergencyRoute>('/emergencies/:id', {
    schema: {
      params: zodToJsonSchema(z.object({
        id: z.string()
      })),
      body: zodToJsonSchema(updateEmergencySchema)
    },
    preHandler: [fastify.authenticate]
  }, async (request: AuthenticatedRequest<UpdateEmergencyRoute>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const data = updateEmergencySchema.parse(request.body);
      let emergency;
      if (data.status === 'ESCALATED') {
        emergency = await emergencyHandler.escalateEmergency(id, data.metadata);
      } else if (data.status === 'RESOLVED') {
        emergency = await emergencyHandler.resolveEmergency(id, data.resolutionDetails);
      } else {
        return reply.code(400).send({ error: 'Invalid status update' });
      }
      if (!emergency) {
        return reply.code(404).send({ error: 'Emergency not found' });
      }
      return reply.send(emergency);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to update emergency' });
    }
  });

  // Get active emergencies for nightclub
  fastify.get<GetActiveEmergenciesRoute>('/nightclubs/:nightclubId/emergencies/active', {
    schema: {
      params: zodToJsonSchema(z.object({
        nightclubId: z.string()
      }))
    },
    preHandler: [fastify.authenticate]
  }, async (request: AuthenticatedRequest<GetActiveEmergenciesRoute>, reply: FastifyReply) => {
    try {
      const emergencies = await emergencyHandler.getActiveEmergencies();
      return reply.send(emergencies);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to get active emergencies' });
    }
  });

  // Create alert
  fastify.post<CreateAlertRoute>('/alerts', { 
    schema: {
      body: zodToJsonSchema(createAlertSchema)
    },
    preHandler: [fastify.authenticate] 
  }, async (request: AuthenticatedRequest<CreateAlertRoute>, reply: FastifyReply) => {
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
      
      if (!user) {
        return reply.code(401).send({ error: 'User not found' });
      }
      
      if (user.nightclubId !== bracelet.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Create alert
      const alert = await fastify.prisma.alert.create({
        data: {
          type: data.type as AlertType,
          status: AlertStatus.ACTIVE,
          braceletId: data.braceletId,
          userId: request.user.id,
          zoneId: data.zoneId,
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
          user: true
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
      
      // Handle alert
      await emergencyHandler.handleEmergency(alert);
      
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

  done();
};

export default emergencyRoutes; 