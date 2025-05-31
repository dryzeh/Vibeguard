import { z } from 'zod';
import aiAnalytics from '../services/aiAnalytics';

// Input validation schemas
const timeRangeSchema = z.enum(['24h', '7d', '30d', '90d']).default('7d');
const dashboardTypeSchema = z.enum(['OVERVIEW', 'EMERGENCIES', 'PERSONNEL', 'ZONES', 'AI_INSIGHTS']).default('OVERVIEW');

/**
 * Dashboard routes for the application
 * @param {import('fastify').FastifyInstance} fastify - The Fastify instance
 * @param {Object} options - Route options
 * @returns {void}
 */
const dashboardRoutes = async (fastify, options) => {
  // Get comprehensive dashboard data
  fastify.get('/dashboard/:nightclubId', {
    onRequest: [fastify.authenticate],
    schema: {
      querystring: z.object({
        timeRange: timeRangeSchema,
        type: dashboardTypeSchema,
        includeAI: z.boolean().default(true)
      })
    }
  }, async (request, reply) => {
    try {
      const { nightclubId } = request.params;
      const { timeRange, type, includeAI } = request.query;

      // Verify access
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });

      if (user.nightclubId !== nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const startDate = aiAnalytics._getStartDate(timeRange);

      // Get all required data in parallel
      const [
        currentStats,
        historicalData,
        personnelMetrics,
        zoneMetrics,
        aiInsights
      ] = await Promise.all([
        // Current statistics
        _getCurrentStats(fastify, nightclubId),
        
        // Historical data
        _getHistoricalData(fastify, nightclubId, startDate),
        
        // Personnel metrics
        _getPersonnelMetrics(fastify, nightclubId, startDate),
        
        // Zone metrics
        _getZoneMetrics(fastify, nightclubId, startDate),
        
        // AI insights (if requested)
        includeAI ? aiAnalytics.analyzeEmergencyData(nightclubId, timeRange) : null
      ]);

      // Compile dashboard data based on type
      const dashboardData = {
        metadata: {
          generatedAt: new Date(),
          timeRange: {
            start: startDate,
            end: new Date()
          },
          type
        },
        currentStats,
        historicalData,
        personnelMetrics,
        zoneMetrics,
        aiInsights: includeAI ? aiInsights : null,
        alerts: await _getActiveAlerts(fastify, nightclubId),
        recommendations: includeAI ? await _generateRecommendations(fastify, nightclubId, {
          currentStats,
          historicalData,
          personnelMetrics,
          zoneMetrics
        }) : null
      };

      return dashboardData;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to generate dashboard data' });
    }
  });

  // Get real-time dashboard updates
  fastify.get('/dashboard/:nightclubId/realtime', {
    onRequest: [fastify.authenticate],
    websocket: true
  }, async (connection, req) => {
    const { nightclubId } = req.params;
    
    // Verify access
    const user = await fastify.prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (user.nightclubId !== nightclubId && user.role !== 'ADMIN') {
      connection.socket.close(1008, 'Access denied');
      return;
    }

    // Subscribe to real-time updates
    const clientId = fastify.ws.addClient(connection.socket, {
      nightclubId,
      userId: user.id,
      subscriptions: ['DASHBOARD_UPDATES']
    });

    // Send initial data
    const initialData = await _getCurrentStats(fastify, nightclubId);
    connection.socket.send(JSON.stringify({
      type: 'DASHBOARD_INIT',
      data: initialData
    }));

    // Handle client disconnect
    connection.socket.on('close', () => {
      fastify.ws.removeClient(clientId);
    });
  });

  // Get AI-powered predictions
  fastify.get('/dashboard/:nightclubId/predictions', {
    onRequest: [fastify.authenticate],
    schema: {
      querystring: z.object({
        timeRange: timeRangeSchema,
        predictionType: z.enum(['EMERGENCY', 'OCCUPANCY', 'STAFFING']).default('EMERGENCY')
      })
    }
  }, async (request, reply) => {
    try {
      const { nightclubId } = request.params;
      const { timeRange, predictionType } = request.query;

      // Verify access
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });

      if (user.nightclubId !== nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const predictions = await _generatePredictions(fastify, nightclubId, predictionType, timeRange);
      return predictions;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to generate predictions' });
    }
  });
}

/**
 * Gets current statistics for a nightclub
 * @param {import('fastify').FastifyInstance} fastify - The Fastify instance
 * @param {string} nightclubId - The nightclub ID
 * @returns {Promise<Object>} The current statistics
 */
async function _getCurrentStats(fastify, nightclubId) {
  const [
    activeEmergencies,
    activeAlerts,
    activeBracelets,
    activePersonnel
  ] = await Promise.all([
    fastify.prisma.emergency.count({
      where: {
        nightclubId,
        status: 'ACTIVE'
      }
    }),
    fastify.prisma.alert.count({
      where: {
        bracelet: {
          nightclubId
        },
        status: 'ACTIVE'
      }
    }),
    fastify.prisma.bracelet.count({
      where: {
        nightclubId,
        status: 'ACTIVE'
      }
    }),
    fastify.prisma.user.count({
      where: {
        nightclubId,
        role: {
          in: ['STAFF', 'SECURITY', 'MANAGER']
        },
        status: 'ACTIVE'
      }
    })
  ]);

  return {
    activeEmergencies,
    activeAlerts,
    activeBracelets,
    activePersonnel,
    timestamp: new Date()
  };
}

/**
 * Gets historical data for a nightclub
 * @param {import('fastify').FastifyInstance} fastify - The Fastify instance
 * @param {string} nightclubId - The nightclub ID
 * @param {Date} startDate - The start date
 * @returns {Promise<Object>} The historical data
 */
async function _getHistoricalData(fastify, nightclubId, startDate) {
  const emergencies = await fastify.prisma.emergency.findMany({
    where: {
      nightclubId,
      createdAt: {
        gte: startDate
      }
    },
    include: {
      bracelet: {
        include: {
          currentZone: {
            include: {
              floorPlan: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Group by hour for trend analysis
  const hourlyData = emergencies.reduce((acc, emergency) => {
    const hour = new Date(emergency.createdAt).toISOString().slice(0, 13);
    if (!acc[hour]) {
      acc[hour] = {
        count: 0,
        byType: {},
        byZone: {}
      };
    }
    acc[hour].count++;
    acc[hour].byType[emergency.type] = (acc[hour].byType[emergency.type] || 0) + 1;
    const zoneName = emergency.bracelet.currentZone?.name || 'Unknown';
    acc[hour].byZone[zoneName] = (acc[hour].byZone[zoneName] || 0) + 1;
    return acc;
  }, {});

  return {
    hourlyData,
    totalEmergencies: emergencies.length,
    byType: emergencies.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {}),
    byZone: emergencies.reduce((acc, e) => {
      const zoneName = e.bracelet.currentZone?.name || 'Unknown';
      acc[zoneName] = (acc[zoneName] || 0) + 1;
      return acc;
    }, {})
  };
}

/**
 * Gets personnel metrics for a nightclub
 * @param {import('fastify').FastifyInstance} fastify - The Fastify instance
 * @param {string} nightclubId - The nightclub ID
 * @param {Date} startDate - The start date
 * @returns {Promise<Object>} The personnel metrics
 */
async function _getPersonnelMetrics(fastify, nightclubId, startDate) {
  const personnel = await fastify.prisma.user.findMany({
    where: {
      nightclubId,
      role: {
        in: ['STAFF', 'SECURITY', 'MANAGER']
      }
    },
    include: {
      emergencyResponses: {
        where: {
          createdAt: {
            gte: startDate
          }
        },
        include: {
          emergency: true
        }
      }
    }
  });

  return personnel.map(p => ({
    id: p.id,
    name: p.name,
    role: p.role,
    metrics: {
      totalResponses: p.emergencyResponses.length,
      averageResponseTime: p.emergencyResponses.length ? 
        p.emergencyResponses.reduce((acc, r) => {
          return acc + (r.createdAt - r.emergency.createdAt) / (60 * 1000);
        }, 0) / p.emergencyResponses.length : 0,
      byEmergencyType: p.emergencyResponses.reduce((acc, r) => {
        acc[r.emergency.type] = (acc[r.emergency.type] || 0) + 1;
        return acc;
      }, {})
    }
  }));
}

/**
 * Gets zone metrics for a nightclub
 * @param {import('fastify').FastifyInstance} fastify - The Fastify instance
 * @param {string} nightclubId - The nightclub ID
 * @param {Date} startDate - The start date
 * @returns {Promise<Object>} The zone metrics
 */
async function _getZoneMetrics(fastify, nightclubId, startDate) {
  const zones = await fastify.prisma.zone.findMany({
    where: {
      floorPlan: {
        nightclubId
      }
    },
    include: {
      floorPlan: true,
      emergencies: {
        where: {
          createdAt: {
            gte: startDate
          }
        }
      },
      currentBracelets: true,
      sensors: {
        include: {
          readings: {
            orderBy: {
              timestamp: 'desc'
            },
            take: 1
          }
        }
      }
    }
  });

  return zones.map(zone => ({
    id: zone.id,
    name: zone.name,
    type: zone.type,
    floorPlan: zone.floorPlan.name,
    metrics: {
      currentOccupancy: zone.currentBracelets.length,
      totalEmergencies: zone.emergencies.length,
      byEmergencyType: zone.emergencies.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {}),
      sensorData: zone.sensors.map(sensor => ({
        id: sensor.id,
        type: sensor.type,
        status: sensor.status,
        latestReading: sensor.readings[0] || null
      }))
    }
  }));
}

/**
 * Gets active alerts for a nightclub
 * @param {import('fastify').FastifyInstance} fastify - The Fastify instance
 * @param {string} nightclubId - The nightclub ID
 * @returns {Promise<Array<Object>>} The active alerts
 */
async function _getActiveAlerts(fastify, nightclubId) {
  return fastify.prisma.alert.findMany({
    where: {
      bracelet: {
        nightclubId
      },
      status: 'ACTIVE'
    },
    include: {
      bracelet: {
        include: {
          currentZone: {
            include: {
              floorPlan: true
            }
          }
        }
      },
      user: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

/**
 * Generates recommendations based on dashboard data
 * @param {import('fastify').FastifyInstance} fastify - The Fastify instance
 * @param {string} nightclubId - The nightclub ID
 * @param {Object} data - The dashboard data
 * @returns {Promise<Object>} The recommendations
 */
async function _generateRecommendations(fastify, nightclubId, data) {
  // Use AI to generate specific recommendations based on the dashboard data
  const prompt = `
Based on the following nightclub security data, provide specific, actionable recommendations:

Current Statistics:
${JSON.stringify(data.currentStats, null, 2)}

Historical Data:
${JSON.stringify(data.historicalData, null, 2)}

Personnel Metrics:
${JSON.stringify(data.personnelMetrics, null, 2)}

Zone Metrics:
${JSON.stringify(data.zoneMetrics, null, 2)}

Please provide recommendations for:
1. Staffing optimization
2. Security measure improvements
3. Zone management
4. Emergency response optimization
5. Resource allocation

Format the response as a JSON object with these sections.`;

  try {
    const completion = await fastify.openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an AI security optimization expert. Provide specific, actionable recommendations based on the provided data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    return JSON.parse(completion.data.choices[0].message.content);
  } catch (error) {
    fastify.log.error('Error generating recommendations:', error);
    return null;
  }
}

/**
 * Generates predictions for a nightclub
 * @param {import('fastify').FastifyInstance} fastify - The Fastify instance
 * @param {string} nightclubId - The nightclub ID
 * @param {string} predictionType - The type of prediction
 * @param {string} timeRange - The time range
 * @returns {Promise<Object>} The predictions
 */
async function _generatePredictions(fastify, nightclubId, predictionType, timeRange) {
  // Get historical data for prediction
  const startDate = aiAnalytics._getStartDate(timeRange);
  const historicalData = await _getHistoricalData(fastify, nightclubId, startDate);

  // Generate predictions based on type
  const prompt = `
Based on the following historical data, generate predictions for ${predictionType}:

Historical Data:
${JSON.stringify(historicalData, null, 2)}

Please provide predictions for:
1. Expected ${predictionType.toLowerCase()} patterns
2. High-risk time periods
3. Recommended preventive measures
4. Resource allocation suggestions

Format the response as a JSON object with these sections.`;

  try {
    const completion = await fastify.openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an AI prediction expert. Analyze historical patterns and provide accurate predictions and recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    return JSON.parse(completion.data.choices[0].message.content);
  } catch (error) {
    fastify.log.error('Error generating predictions:', error);
    return null;
  }
}

export default dashboardRoutes; 