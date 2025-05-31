import { Redis } from 'ioredis';

/**
 * @typedef {Object} MetricData
 * @property {string} type - The type of metric
 * @property {number} value - The metric value
 * @property {string} nightclubId - The nightclub ID
 * @property {string} [zoneId] - Optional zone ID
 * @property {Object} [metadata] - Optional metadata
 */

/**
 * @typedef {Object} AnomalyAnalysis
 * @property {boolean} isAnomaly - Whether the metric is an anomaly
 * @property {string} severity - The severity level
 * @property {string} patterns - The patterns indicating anomaly
 * @property {string} actions - Recommended actions
 */

/**
 * @typedef {Object} BehaviorAnalysis
 * @property {string} patterns - The behavior patterns
 * @property {number} significance - The significance level (0-1)
 * @property {string} risks - Potential risks
 * @property {string} actions - Recommended actions
 */

class RealTimeProcessor {
  /**
   * @param {import('fastify').FastifyInstance} fastify - The Fastify instance
   */
  constructor(fastify) {
    this.fastify = fastify;
    this.prisma = fastify.prisma;
    this.openai = fastify.openai;
    this.ws = fastify.ws;
    
    // Initialize Redis for caching
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Initialize AI models
    this.models = new Map();
    this._initializeModels();
  }

  /**
   * Initializes AI models from the database
   * @returns {Promise<void>}
   */
  async _initializeModels() {
    // Load active AI models from database
    const activeModels = await this.prisma.aIModel.findMany({
      where: { status: 'ACTIVE' }
    });

    for (const model of activeModels) {
      this.models.set(model.type, model);
    }
  }

  /**
   * Processes a real-time metric
   * @param {MetricData} data - The metric data
   * @returns {Promise<Object>} The processed metric
   */
  async processMetric(data) {
    const { type, value, nightclubId, zoneId, metadata } = data;

    try {
      // Store metric
      const metric = await this.prisma.realTimeMetric.create({
        data: {
          type,
          value,
          nightclubId,
          zoneId,
          metadata
        }
      });

      // Update cache
      await this._updateMetricCache(metric);

      // Check for anomalies
      await this._checkAnomalies(metric);

      // Analyze behavior if applicable
      if (this._shouldAnalyzeBehavior(type)) {
        await this._analyzeBehavior(metric);
      }

      // Broadcast update
      this._broadcastMetric(metric);

      return metric;
    } catch (error) {
      this.fastify.log.error('Error processing metric:', error);
      throw error;
    }
  }

  /**
   * Checks for anomalies in a metric
   * @param {Object} metric - The metric to check
   * @returns {Promise<void>}
   */
  async _checkAnomalies(metric) {
    const model = this.models.get('ANOMALY_DETECTION');
    if (!model) return;

    try {
      // Get recent metrics for context
      const recentMetrics = await this.prisma.realTimeMetric.findMany({
        where: {
          type: metric.type,
          nightclubId: metric.nightclubId,
          zoneId: metric.zoneId,
          timestamp: {
            gte: new Date(Date.now() - 3600000) // Last hour
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      });

      // Generate AI analysis
      const analysis = await this._generateAnomalyAnalysis(metric, recentMetrics);
      
      if (analysis.isAnomaly) {
        // Create anomaly record
        const anomaly = await this.prisma.anomaly.create({
          data: {
            modelId: model.id,
            type: metric.type,
            severity: analysis.severity,
            data: analysis,
            status: 'DETECTED',
            nightclubId: metric.nightclubId,
            zoneId: metric.zoneId,
            metadata: { metricId: metric.id }
          }
        });

        // Broadcast anomaly
        this._broadcastAnomaly(anomaly);
      }
    } catch (error) {
      this.fastify.log.error('Error checking anomalies:', error);
    }
  }

  /**
   * Analyzes behavior based on a metric
   * @param {Object} metric - The metric to analyze
   * @returns {Promise<void>}
   */
  async _analyzeBehavior(metric) {
    const model = this.models.get('BEHAVIOR_ANALYSIS');
    if (!model) return;

    try {
      // Get context data
      const context = await this._getBehaviorContext(metric);
      
      // Generate behavior analysis
      const analysis = await this._generateBehaviorAnalysis(metric, context);
      
      // Store analysis
      const behaviorAnalysis = await this.prisma.behaviorAnalysis.create({
        data: {
          modelId: model.id,
          type: 'CROWD',
          data: analysis,
          nightclubId: metric.nightclubId,
          zoneId: metric.zoneId,
          metadata: { metricId: metric.id }
        }
      });

      // Broadcast analysis if significant
      if (analysis.significance > 0.7) {
        this._broadcastBehaviorAnalysis(behaviorAnalysis);
      }
    } catch (error) {
      this.fastify.log.error('Error analyzing behavior:', error);
    }
  }

  /**
   * Generates anomaly analysis using AI
   * @param {Object} metric - The current metric
   * @param {Array<Object>} recentMetrics - Recent metrics for context
   * @returns {Promise<AnomalyAnalysis>} The anomaly analysis
   */
  async _generateAnomalyAnalysis(metric, recentMetrics) {
    const prompt = `
Analyze the following metric data for anomalies:
Current Metric: ${JSON.stringify(metric)}
Recent Metrics: ${JSON.stringify(recentMetrics)}

Determine if this is an anomaly and provide:
1. Is this an anomaly? (true/false)
2. If yes, what is the severity? (LOW/MEDIUM/HIGH/CRITICAL)
3. What patterns or factors indicate this is an anomaly?
4. What actions should be taken?

Format the response as a JSON object.`;

    const completion = await this.openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an AI anomaly detection expert. Analyze metrics and identify anomalies with high accuracy."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    return JSON.parse(completion.data.choices[0].message.content);
  }

  /**
   * Generates behavior analysis using AI
   * @param {Object} metric - The current metric
   * @param {Object} context - The context data
   * @returns {Promise<BehaviorAnalysis>} The behavior analysis
   */
  async _generateBehaviorAnalysis(metric, context) {
    const prompt = `
Analyze the following behavior data:
Current Metric: ${JSON.stringify(metric)}
Context: ${JSON.stringify(context)}

Provide analysis of:
1. Behavior patterns
2. Significance level (0-1)
3. Potential risks or concerns
4. Recommended actions

Format the response as a JSON object.`;

    const completion = await this.openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an AI behavior analysis expert. Analyze patterns and provide insights for security optimization."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    });

    return JSON.parse(completion.data.choices[0].message.content);
  }

  /**
   * Gets behavior context data
   * @param {Object} metric - The current metric
   * @returns {Promise<Object>} The context data
   */
  async _getBehaviorContext(metric) {
    // Get relevant context data (occupancy, alerts, etc.)
    const [occupancy, alerts, emergencies] = await Promise.all([
      this.prisma.realTimeMetric.findMany({
        where: {
          type: 'OCCUPANCY',
          nightclubId: metric.nightclubId,
          zoneId: metric.zoneId,
          timestamp: {
            gte: new Date(Date.now() - 3600000)
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      }),
      this.prisma.alert.findMany({
        where: {
          bracelet: {
            nightclubId: metric.nightclubId,
            currentZoneId: metric.zoneId
          },
          status: 'ACTIVE'
        },
        include: {
          bracelet: true
        }
      }),
      this.prisma.emergency.findMany({
        where: {
          nightclubId: metric.nightclubId,
          bracelet: {
            currentZoneId: metric.zoneId
          },
          status: 'ACTIVE'
        },
        include: {
          bracelet: true
        }
      })
    ]);

    return {
      occupancy,
      alerts,
      emergencies
    };
  }

  /**
   * Checks if behavior should be analyzed
   * @param {string} type - The metric type
   * @returns {boolean} Whether to analyze behavior
   */
  _shouldAnalyzeBehavior(type) {
    return ['OCCUPANCY', 'MOVEMENT', 'ALERT'].includes(type);
  }

  /**
   * Updates metric cache
   * @param {Object} metric - The metric to cache
   * @returns {Promise<void>}
   */
  async _updateMetricCache(metric) {
    const cacheKey = `metric:${metric.nightclubId}:${metric.type}:${metric.zoneId || 'global'}`;
    await this.redis.set(cacheKey, JSON.stringify(metric), 'EX', 300); // 5 minutes expiry
  }

  /**
   * Broadcasts a metric update
   * @param {Object} metric - The metric to broadcast
   * @returns {void}
   */
  _broadcastMetric(metric) {
    this.ws.broadcast({
      type: 'METRIC_UPDATE',
      data: metric
    }, {
      nightclubId: metric.nightclubId
    });
  }

  /**
   * Broadcasts an anomaly detection
   * @param {Object} anomaly - The anomaly to broadcast
   * @returns {void}
   */
  _broadcastAnomaly(anomaly) {
    this.ws.broadcast({
      type: 'ANOMALY_DETECTED',
      data: anomaly
    }, {
      nightclubId: anomaly.nightclubId
    });
  }

  /**
   * Broadcasts behavior analysis
   * @param {Object} analysis - The analysis to broadcast
   * @returns {void}
   */
  _broadcastBehaviorAnalysis(analysis) {
    this.ws.broadcast({
      type: 'BEHAVIOR_ANALYSIS',
      data: analysis
    }, {
      nightclubId: analysis.nightclubId
    });
  }

  // Cache management
  async getCachedMetric(type, nightclubId, zoneId = null) {
    const cacheKey = `metric:${nightclubId}:${type}:${zoneId || 'global'}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  async invalidateCache(pattern) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }

  /**
   * Cleans up resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    await this.redis.quit();
  }
}

export default RealTimeProcessor; 