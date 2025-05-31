import { z } from 'zod';
import { sanitize } from '../utils/security.js';

// Input validation schemas
const createSensorSchema = z.object({
  zoneId: z.string(),
  name: z.string().min(1),
  type: z.enum(['RFID', 'CAMERA', 'MOTION', 'PRESSURE', 'TEMPERATURE', 'OTHER']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR']).default('ACTIVE'),
  location: z.object({
    x: z.number(),
    y: z.number()
  }),
  configuration: z.record(z.any()).optional(),
  metadata: z.any().optional()
});

const updateSensorSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ERROR']).optional(),
  location: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  configuration: z.record(z.any()).optional(),
  metadata: z.any().optional()
});

const sensorDataSchema = z.object({
  timestamp: z.date().default(() => new Date()),
  readings: z.record(z.any()),
  status: z.enum(['NORMAL', 'WARNING', 'ERROR']).default('NORMAL'),
  metadata: z.any().optional()
});

const sensorRoutes = async (fastify, options, done) => {
  // Create new sensor
  fastify.post('/sensors', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = createSensorSchema.parse(request.body);
      
      // Get zone and verify access
      const zone = await fastify.prisma.zone.findUnique({
        where: { id: data.zoneId },
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
      
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });
      
      if (user.nightclubId !== zone.floorPlan.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Create sensor
      const sensor = await fastify.prisma.sensor.create({
        data: {
          ...data,
          metadata: {
            ...data.metadata,
            createdBy: request.user.id,
            createdAt: new Date()
          }
        },
        include: {
          zone: {
            include: {
              floorPlan: {
                include: {
                  nightclub: true
                }
              }
            }
          }
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'SENSOR_CREATED',
          entityType: 'Sensor',
          entityId: sensor.id,
          userId: request.user.id,
          metadata: { 
            type: sensor.type,
            zoneId: sensor.zoneId
          }
        }
      });
      
      // Broadcast to all connected clients
      fastify.ws.broadcastToNightclub(zone.floorPlan.nightclubId, {
        type: 'SENSOR_CREATED',
        data: sensor
      });
      
      return sensor;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get sensor details
  fastify.get('/sensors/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const sensor = await fastify.prisma.sensor.findUnique({
      where: { id: request.params.id },
      include: {
        zone: {
          include: {
            floorPlan: {
              include: {
                nightclub: true
              }
            }
          }
        },
        readings: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 100 // Last 100 readings
        }
      }
    });
    
    if (!sensor) {
      return reply.code(404).send({ error: 'Sensor not found' });
    }
    
    // Check if user has access
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id }
    });
    
    if (user.nightclubId !== sensor.zone.floorPlan.nightclubId && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    return sensor;
  });

  // Update sensor
  fastify.put('/sensors/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = updateSensorSchema.parse(request.body);
      
      const sensor = await fastify.prisma.sensor.findUnique({
        where: { id: request.params.id },
        include: {
          zone: {
            include: {
              floorPlan: {
                include: {
                  nightclub: true
                }
              }
            }
          }
        }
      });
      
      if (!sensor) {
        return reply.code(404).send({ error: 'Sensor not found' });
      }
      
      // Check if user has access
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });
      
      if (user.nightclubId !== sensor.zone.floorPlan.nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }
      
      // Update sensor
      const updatedSensor = await fastify.prisma.sensor.update({
        where: { id: sensor.id },
        data: {
          ...data,
          metadata: {
            ...sensor.metadata,
            ...data.metadata,
            lastUpdatedBy: request.user.id,
            lastUpdatedAt: new Date()
          }
        },
        include: {
          zone: {
            include: {
              floorPlan: {
                include: {
                  nightclub: true
                }
              }
            }
          }
        }
      });
      
      // Log the action
      await fastify.prisma.auditLog.create({
        data: {
          action: 'SENSOR_UPDATED',
          entityType: 'Sensor',
          entityId: sensor.id,
          userId: request.user.id,
          metadata: { 
            updatedFields: Object.keys(data),
            zoneId: sensor.zoneId
          }
        }
      });
      
      // Broadcast to all connected clients
      fastify.ws.broadcastToNightclub(sensor.zone.floorPlan.nightclubId, {
        type: 'SENSOR_UPDATED',
        data: updatedSensor
      });
      
      return updatedSensor;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete sensor
  fastify.delete('/sensors/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const sensor = await fastify.prisma.sensor.findUnique({
      where: { id: request.params.id },
      include: {
        zone: {
          include: {
            floorPlan: {
              include: {
                nightclub: true
              }
            }
          }
        }
      }
    });
    
    if (!sensor) {
      return reply.code(404).send({ error: 'Sensor not found' });
    }
    
    // Check if user has access
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id }
    });
    
    if (user.nightclubId !== sensor.zone.floorPlan.nightclubId && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    // Delete sensor
    await fastify.prisma.sensor.delete({
      where: { id: sensor.id }
    });
    
    // Log the action
    await fastify.prisma.auditLog.create({
      data: {
        action: 'SENSOR_DELETED',
        entityType: 'Sensor',
        entityId: sensor.id,
        userId: request.user.id,
        metadata: { 
          type: sensor.type,
          zoneId: sensor.zoneId
        }
      }
    });
    
    // Broadcast to all connected clients
    fastify.ws.broadcastToNightclub(sensor.zone.floorPlan.nightclubId, {
      type: 'SENSOR_DELETED',
      data: { id: sensor.id }
    });
    
    return { success: true };
  });

  // Submit sensor readings
  fastify.post('/sensors/:id/readings', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = sensorDataSchema.parse(request.body);
      
      const sensor = await fastify.prisma.sensor.findUnique({
        where: { id: request.params.id },
        include: {
          zone: {
            include: {
              floorPlan: {
                include: {
                  nightclub: true
                }
              }
            }
          }
        }
      });
      
      if (!sensor) {
        return reply.code(404).send({ error: 'Sensor not found' });
      }
      
      // Create sensor reading
      const reading = await fastify.prisma.sensorReading.create({
        data: {
          sensorId: sensor.id,
          timestamp: data.timestamp,
          readings: data.readings,
          status: data.status,
          metadata: data.metadata
        }
      });
      
      // Update sensor status if needed
      if (data.status !== 'NORMAL') {
        await fastify.prisma.sensor.update({
          where: { id: sensor.id },
          data: {
            status: data.status === 'ERROR' ? 'ERROR' : 'MAINTENANCE',
            metadata: {
              ...sensor.metadata,
              lastError: {
                timestamp: data.timestamp,
                status: data.status,
                readings: data.readings
              }
            }
          }
        });
        
        // Broadcast sensor status change
        fastify.ws.broadcastToNightclub(sensor.zone.floorPlan.nightclubId, {
          type: 'SENSOR_STATUS_CHANGED',
          data: {
            sensorId: sensor.id,
            status: data.status,
            timestamp: data.timestamp
          }
        });
      }
      
      // Broadcast reading to all connected clients
      fastify.ws.broadcastToNightclub(sensor.zone.floorPlan.nightclubId, {
        type: 'SENSOR_READING',
        data: {
          sensorId: sensor.id,
          reading
        }
      });
      
      return reading;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get sensor readings
  fastify.get('/sensors/:id/readings', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { startTime, endTime, limit = 100 } = request.query;
    
    const sensor = await fastify.prisma.sensor.findUnique({
      where: { id: request.params.id },
      include: {
        zone: {
          include: {
            floorPlan: {
              include: {
                nightclub: true
              }
            }
          }
        }
      }
    });
    
    if (!sensor) {
      return reply.code(404).send({ error: 'Sensor not found' });
    }
    
    // Check if user has access
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id }
    });
    
    if (user.nightclubId !== sensor.zone.floorPlan.nightclubId && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    const readings = await fastify.prisma.sensorReading.findMany({
      where: {
        sensorId: sensor.id,
        ...(startTime && endTime ? {
          timestamp: {
            gte: new Date(startTime),
            lte: new Date(endTime)
          }
        } : {})
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: Math.min(limit, 1000) // Cap at 1000 readings
    });
    
    return readings;
  });

  // Get all sensors for a zone
  fastify.get('/zones/:zoneId/sensors', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const zone = await fastify.prisma.zone.findUnique({
      where: { id: request.params.zoneId },
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
    
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id }
    });
    
    if (user.nightclubId !== zone.floorPlan.nightclubId && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Access denied' });
    }
    
    const sensors = await fastify.prisma.sensor.findMany({
      where: {
        zoneId: zone.id
      },
      include: {
        readings: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1 // Latest reading
        }
      }
    });
    
    return sensors;
  });

  done();
};

export default sensorRoutes; 