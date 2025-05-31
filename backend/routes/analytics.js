import { z } from 'zod';
import aiAnalytics from '../services/aiAnalytics';

// Input validation schemas
const timeRangeSchema = z.enum(['24h', '7d', '30d']).default('7d');

/**
 * Analytics routes for the application
 * @param {import('fastify').FastifyInstance} fastify - The Fastify instance
 * @param {Object} options - Route options
 * @returns {void}
 */
const analyticsRoutes = async (fastify, options) => {
  // Get AI analysis for a nightclub
  fastify.get('/analytics/ai/:nightclubId', {
    onRequest: [fastify.authenticate, fastify.authenticateAdmin],
    schema: {
      querystring: z.object({
        timeRange: timeRangeSchema
      })
    }
  }, async (request, reply) => {
    try {
      const { nightclubId } = request.params;
      const { timeRange } = request.query;

      // Verify nightclub exists
      const nightclub = await fastify.prisma.nightclub.findUnique({
        where: { id: nightclubId }
      });

      if (!nightclub) {
        return reply.code(404).send({ error: 'Nightclub not found' });
      }

      // Get AI analysis
      const analysis = await aiAnalytics.analyzeEmergencyData(nightclubId, timeRange);
      
      return analysis;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to generate analysis' });
    }
  });

  // Get emergency statistics
  fastify.get('/analytics/emergencies/:nightclubId', {
    onRequest: [fastify.authenticate],
    schema: {
      querystring: z.object({
        timeRange: timeRangeSchema,
        groupBy: z.enum(['hour', 'day', 'week', 'month']).default('day')
      })
    }
  }, async (request, reply) => {
    try {
      const { nightclubId } = request.params;
      const { timeRange, groupBy } = request.query;

      // Verify access
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });

      if (user.nightclubId !== nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const startDate = aiAnalytics._getStartDate(timeRange);

      // Get emergency statistics
      const emergencies = await fastify.prisma.emergency.findMany({
        where: {
          bracelet: {
            nightclubId
          },
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

      // Group emergencies by time period
      const groupedData = emergencies.reduce((acc, emergency) => {
        const date = new Date(emergency.createdAt);
        let key;

        switch (groupBy) {
          case 'hour':
            key = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
            break;
          case 'day':
            key = date.toISOString().slice(0, 10); // YYYY-MM-DD
            break;
          case 'week':
            const week = getWeekNumber(date);
            key = `${date.getFullYear()}-W${week}`;
            break;
          case 'month':
            key = date.toISOString().slice(0, 7); // YYYY-MM
            break;
        }

        if (!acc[key]) {
          acc[key] = {
            count: 0,
            byType: {},
            byZone: {},
            byFloor: {}
          };
        }

        acc[key].count++;
        
        // Count by type
        acc[key].byType[emergency.type] = (acc[key].byType[emergency.type] || 0) + 1;
        
        // Count by zone
        const zoneName = emergency.bracelet.currentZone?.name || 'Unknown';
        acc[key].byZone[zoneName] = (acc[key].byZone[zoneName] || 0) + 1;
        
        // Count by floor
        const floorName = emergency.bracelet.currentZone?.floorPlan?.name || 'Unknown';
        acc[key].byFloor[floorName] = (acc[key].byFloor[floorName] || 0) + 1;

        return acc;
      }, {});

      return {
        timeRange: {
          start: startDate,
          end: new Date()
        },
        groupBy,
        data: groupedData
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to get emergency statistics' });
    }
  });

  // Get personnel performance metrics
  fastify.get('/analytics/personnel/:nightclubId', {
    onRequest: [fastify.authenticate],
    schema: {
      querystring: z.object({
        timeRange: timeRangeSchema
      })
    }
  }, async (request, reply) => {
    try {
      const { nightclubId } = request.params;
      const { timeRange } = request.query;

      // Verify access
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });

      if (user.nightclubId !== nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const startDate = aiAnalytics._getStartDate(timeRange);

      // Get personnel performance data
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
              emergency: {
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
                }
              }
            }
          }
        }
      });

      // Calculate performance metrics
      const performanceData = personnel.map(p => {
        const responses = p.emergencyResponses;
        const responseTimes = responses.map(r => 
          (r.createdAt - r.emergency.createdAt) / (60 * 1000) // Convert to minutes
        );

        return {
          id: p.id,
          name: p.name,
          role: p.role,
          metrics: {
            totalResponses: responses.length,
            averageResponseTime: responseTimes.length ? 
              responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
            minResponseTime: responseTimes.length ? Math.min(...responseTimes) : 0,
            maxResponseTime: responseTimes.length ? Math.max(...responseTimes) : 0,
            byEmergencyType: responses.reduce((acc, r) => {
              const type = r.emergency.type;
              acc[type] = (acc[type] || 0) + 1;
              return acc;
            }, {}),
            byZone: responses.reduce((acc, r) => {
              const zoneName = r.emergency.bracelet.currentZone?.name || 'Unknown';
              acc[zoneName] = (acc[zoneName] || 0) + 1;
              return acc;
            }, {})
          }
        };
      });

      return {
        timeRange: {
          start: startDate,
          end: new Date()
        },
        personnel: performanceData
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to get personnel performance metrics' });
    }
  });

  // Get zone analytics
  fastify.get('/analytics/zones/:nightclubId', {
    onRequest: [fastify.authenticate],
    schema: {
      querystring: z.object({
        timeRange: timeRangeSchema
      })
    }
  }, async (request, reply) => {
    try {
      const { nightclubId } = request.params;
      const { timeRange } = request.query;

      // Verify access
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user.id }
      });

      if (user.nightclubId !== nightclubId && user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const startDate = aiAnalytics._getStartDate(timeRange);

      // Get zone data with emergencies and alerts
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
          alerts: {
            where: {
              createdAt: {
                gte: startDate
              }
            }
          },
          currentBracelets: true
        }
      });

      // Calculate zone metrics
      const zoneAnalytics = zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        type: zone.type,
        floorPlan: zone.floorPlan.name,
        metrics: {
          totalEmergencies: zone.emergencies.length,
          totalAlerts: zone.alerts.length,
          currentOccupancy: zone.currentBracelets.length,
          byEmergencyType: zone.emergencies.reduce((acc, e) => {
            acc[e.type] = (acc[e.type] || 0) + 1;
            return acc;
          }, {}),
          byHour: zone.emergencies.reduce((acc, e) => {
            const hour = new Date(e.createdAt).getHours();
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
          }, {}),
          averageResponseTime: zone.emergencies.length ? 
            zone.emergencies.reduce((acc, e) => {
              if (e.responses.length > 0) {
                const responseTime = (e.responses[0].createdAt - e.createdAt) / (60 * 1000);
                return acc + responseTime;
              }
              return acc;
            }, 0) / zone.emergencies.length : 0
        }
      }));

      return {
        timeRange: {
          start: startDate,
          end: new Date()
        },
        zones: zoneAnalytics
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to get zone analytics' });
    }
  });
}

/**
 * Gets the week number for a date
 * @param {Date} date - The date to get the week number for
 * @returns {number} The week number
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export default analyticsRoutes; 