import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @typedef {Object} AnalyticsData
 * @property {Array<Emergency>} emergencies
 * @property {Array<Alert>} alerts
 * @property {Array<Zone>} zones
 * @property {Array<FloorPlan>} floorPlans
 * @property {Array<User>} personnel
 * @property {Object} timeRange
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {Object} assessment
 * @property {Array<string>} recommendations
 * @property {Object} metadata
 */

class AIAnalyticsService {
  constructor() {
    // Make OpenAI optional for demo
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      console.warn('OpenAI API key not found. AI analytics will be disabled.');
      this.openai = null;
    }
  }

  /**
   * Analyzes emergency data for a nightclub
   * @param {string} nightclubId - The ID of the nightclub
   * @param {string} timeRange - The time range for analysis ('24h', '7d', '30d')
   * @returns {Promise<AnalysisResult>} The analysis result
   */
  async analyzeEmergencyData(nightclubId, timeRange = '7d') {
    const startDate = this._getStartDate(timeRange);
    
    // Fetch all relevant data
    const data = await this._fetchAnalyticsData(nightclubId, startDate);
    
    // Generate AI analysis
    const analysis = await this._generateAnalysis(data);
    
    // Store the analysis
    await this._storeAnalysis(nightclubId, analysis);
    
    return analysis;
  }

  /**
   * Fetches analytics data for analysis
   * @param {string} nightclubId - The ID of the nightclub
   * @param {Date} startDate - The start date for data collection
   * @returns {Promise<AnalyticsData>} The collected analytics data
   */
  async _fetchAnalyticsData(nightclubId, startDate) {
    const [
      emergencies,
      alerts,
      zones,
      floorPlans,
      personnel
    ] = await Promise.all([
      // Get all emergencies
      prisma.emergency.findMany({
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
          },
          responses: {
            include: {
              user: true
            }
          }
        }
      }),
      
      // Get all alerts
      prisma.alert.findMany({
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
        }
      }),
      
      // Get all zones with their types
      prisma.zone.findMany({
        where: {
          floorPlan: {
            nightclubId
          }
        },
        include: {
          floorPlan: true,
          currentBracelets: true
        }
      }),
      
      // Get all floor plans
      prisma.floorPlan.findMany({
        where: {
          nightclubId
        },
        include: {
          zones: true
        }
      }),
      
      // Get personnel data
      prisma.user.findMany({
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
            }
          }
        }
      })
    ]);

    return {
      emergencies,
      alerts,
      zones,
      floorPlans,
      personnel,
      timeRange: {
        start: startDate,
        end: new Date()
      }
    };
  }

  /**
   * Generates AI analysis from the collected data
   * @param {AnalyticsData} data - The analytics data
   * @returns {Promise<AnalysisResult>} The analysis result
   */
  async _generateAnalysis(data) {
    const prompt = this._createAnalysisPrompt(data);
    
    try {
      if (!this.openai) {
        // Return mock analysis for demo
        return {
          assessment: "AI analysis is disabled in demo mode",
          recommendations: [
            "Enable AI analysis by setting OPENAI_API_KEY environment variable",
            "This is a demo mode with mock data"
          ],
          metadata: {
            generatedAt: new Date(),
            timeRange: data.timeRange,
            metrics: {
              totalEmergencies: data.emergencies.length,
              totalAlerts: data.alerts.length,
              averageResponseTime: this._calculateResponseTimes(data.emergencies).average,
              zoneIncidents: this._countByZone(data.emergencies, data.zones),
              personnelPerformance: this._analyzePersonnelPerformance(data.personnel)
            }
          }
        };
      }

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an AI security analytics expert. Analyze the provided data and give detailed insights, recommendations, and actionable improvements for nightclub security management."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const analysis = completion.choices[0].message.content;
      
      // Parse the AI response into structured data
      return this._parseAnalysis(analysis, data);
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      throw new Error('Failed to generate AI analysis');
    }
  }

  /**
   * Creates the analysis prompt for the AI
   * @param {AnalyticsData} data - The analytics data
   * @returns {string} The formatted prompt
   */
  _createAnalysisPrompt(data) {
    const {
      emergencies,
      alerts,
      zones,
      floorPlans,
      personnel,
      timeRange
    } = data;

    // Calculate key metrics
    const totalEmergencies = emergencies.length;
    const totalAlerts = alerts.length;
    const emergencyTypes = this._countByType(emergencies, 'type');
    const zoneIncidents = this._countByZone(emergencies, zones);
    const responseTimes = this._calculateResponseTimes(emergencies);
    const personnelPerformance = this._analyzePersonnelPerformance(personnel);

    return `
Analyze the following security data for a nightclub and provide detailed insights and recommendations:

Time Period: ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}

Key Metrics:
- Total Emergencies: ${totalEmergencies}
- Total Alerts: ${totalAlerts}
- Emergency Types: ${JSON.stringify(emergencyTypes)}
- Zone Incidents: ${JSON.stringify(zoneIncidents)}
- Average Response Time: ${responseTimes.average} minutes
- Personnel Performance: ${JSON.stringify(personnelPerformance)}

Please provide:
1. Overall Security Assessment
2. High-Risk Areas Analysis
3. Personnel Performance Analysis
4. Response Time Analysis
5. Specific Recommendations for:
   - Staff Training
   - Security Measures
   - Zone Management
   - Emergency Response
6. Actionable Improvements
7. Success Metrics to Track

Format the response as a structured JSON object with these sections.`;
  }

  /**
   * Parses the AI response into structured data
   * @param {string} aiResponse - The raw AI response
   * @param {AnalyticsData} data - The original analytics data
   * @returns {AnalysisResult} The parsed analysis result
   */
  _parseAnalysis(aiResponse, data) {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : this._parseUnstructuredResponse(aiResponse);

      // Add metadata and metrics
      return {
        ...analysis,
        metadata: {
          generatedAt: new Date(),
          timeRange: data.timeRange,
          metrics: {
            totalEmergencies: data.emergencies.length,
            totalAlerts: data.alerts.length,
            averageResponseTime: this._calculateResponseTimes(data.emergencies).average,
            zoneIncidents: this._countByZone(data.emergencies, data.zones),
            personnelPerformance: this._analyzePersonnelPerformance(data.personnel)
          }
        }
      };
    } catch (error) {
      console.error('Error parsing AI analysis:', error);
      return this._parseUnstructuredResponse(aiResponse);
    }
  }

  /**
   * Parses unstructured AI response
   * @param {string} response - The unstructured response
   * @returns {AnalysisResult} The parsed result
   */
  _parseUnstructuredResponse(response) {
    // Fallback parsing for unstructured responses
    return {
      assessment: response,
      recommendations: [],
      metadata: {
        generatedAt: new Date(),
        parsingError: true
      }
    };
  }

  /**
   * Stores the analysis in the database
   * @param {string} nightclubId - The ID of the nightclub
   * @param {AnalysisResult} analysis - The analysis result
   * @returns {Promise<void>}
   */
  async _storeAnalysis(nightclubId, analysis) {
    await prisma.analyticsReport.create({
      data: {
        nightclubId,
        report: analysis,
        type: 'AI_ANALYSIS',
        metadata: {
          generatedAt: new Date(),
          timeRange: analysis.metadata.timeRange
        }
      }
    });
  }

  /**
   * Gets the start date based on the time range
   * @param {string} timeRange - The time range ('24h', '7d', '30d')
   * @returns {Date} The start date
   */
  _getStartDate(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Counts items by type
   * @param {Array<Object>} items - The items to count
   * @param {string} typeField - The field to count by
   * @returns {Object} The count by type
   */
  _countByType(items, typeField) {
    return items.reduce((acc, item) => {
      const type = item[typeField];
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Counts emergencies by zone
   * @param {Array<Emergency>} emergencies - The emergencies to count
   * @param {Array<Zone>} zones - The zones to count by
   * @returns {Array<Object>} The count by zone
   */
  _countByZone(emergencies, zones) {
    const zoneMap = new Map(zones.map(zone => [zone.id, {
      name: zone.name,
      type: zone.type,
      count: 0
    }]));

    emergencies.forEach(emergency => {
      const zoneId = emergency.bracelet.currentZone?.id;
      if (zoneId && zoneMap.has(zoneId)) {
        zoneMap.get(zoneId).count++;
      }
    });

    return Array.from(zoneMap.values());
  }

  /**
   * Calculates response times for emergencies
   * @param {Array<Emergency>} emergencies - The emergencies to analyze
   * @returns {Object} The response time statistics
   */
  _calculateResponseTimes(emergencies) {
    const responseTimes = emergencies
      .filter(e => e.responses.length > 0)
      .map(e => {
        const firstResponse = e.responses[0];
        return (firstResponse.createdAt - e.createdAt) / (60 * 1000); // Convert to minutes
      });

    return {
      average: responseTimes.length ? 
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      min: responseTimes.length ? Math.min(...responseTimes) : 0,
      max: responseTimes.length ? Math.max(...responseTimes) : 0
    };
  }

  /**
   * Analyzes personnel performance
   * @param {Array<User>} personnel - The personnel to analyze
   * @returns {Array<Object>} The performance metrics
   */
  _analyzePersonnelPerformance(personnel) {
    return personnel.map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      responseCount: p.emergencyResponses.length,
      averageResponseTime: this._calculateResponseTimes(p.emergencyResponses).average
    }));
  }
}

export default new AIAnalyticsService(); 