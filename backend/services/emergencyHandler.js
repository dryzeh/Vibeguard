import { EventEmitter } from 'events'
import { PrismaClient } from '@prisma/client'

class EmergencyHandler extends EventEmitter {
  constructor(locationTracker) {
    super()
    this.prisma = new PrismaClient()
    this.locationTracker = locationTracker
    this.activeEmergencies = new Map()
    this.responders = new Map()
    
    // Configuration
    this.EMERGENCY_TIMEOUT = 300000 // 5 minutes
    this.RESPONSE_TIME_THRESHOLD = 120000 // 2 minutes
    this.MAX_CONCURRENT_EMERGENCIES = 10
  }

  // Handle new emergency signal
  async handleEmergency(deviceId, zoneId) {
    const timestamp = Date.now()
    
    try {
      // Create emergency record with minimal data
      const emergency = await this.prisma.emergency.create({
        data: {
          deviceId,
          zoneId,
          status: 'ACTIVE',
          timestamp: new Date(timestamp),
          // Only store essential data for emergency response
          metadata: {
            emergencyInitiated: timestamp
          }
        },
        include: {
          device: true,
          zone: {
            include: {
              floorPlan: true
            }
          }
        }
      })
      
      // Store only active emergency info in memory
      this.activeEmergencies.set(emergency.id, {
        ...emergency,
        responseStartTime: null,
        nearbyResponders: []
      })
      
      // Find nearest security personnel
      const nearbyResponders = await this.findNearbyResponders(zoneId)
      
      // Update emergency with responders
      this.activeEmergencies.get(emergency.id).nearbyResponders = nearbyResponders
      
      // Notify all relevant parties
      this.notifyEmergency(emergency, nearbyResponders)
      
      // Start monitoring response time
      this.monitorResponseTime(emergency.id)
      
      return emergency
    } catch (error) {
      this.emit('emergency:error', {
        deviceId,
        zoneId,
        error: error.message
      })
      throw error
    }
  }

  // Find nearby security personnel
  async findNearbyResponders(zoneId) {
    // Get all security personnel in and around the zone
    const zoneDevices = this.locationTracker.getDevicesInZone(zoneId)
    const securityPersonnel = await this.prisma.user.findMany({
      where: {
        role: 'SECURITY',
        status: 'ACTIVE'
      }
    })
    
    // Match security personnel with their devices
    const responders = securityPersonnel
      .map(person => {
        const device = zoneDevices.find(d => d.deviceId === person.deviceId)
        if (device) {
          return {
            ...person,
            location: device,
            distance: this.calculateDistance(device.coordinates, zoneId)
          }
        }
        return null
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
    
    return responders
  }

  // Calculate distance between points
  calculateDistance(coordinates, targetZoneId) {
    // Implement distance calculation based on your coordinate system
    // This is a placeholder implementation
    return 0
  }

  // Notify all relevant parties of emergency
  notifyEmergency(emergency, responders) {
    // Emit emergency notification
    this.emit('emergency:new', {
      emergency,
      responders
    })
    
    // Notify each responder
    responders.forEach(responder => {
      this.emit('emergency:notify_responder', {
        emergencyId: emergency.id,
        responderId: responder.id,
        location: emergency.zone
      })
    })
    
    // Notify management
    this.emit('emergency:notify_management', {
      emergency,
      responderCount: responders.length
    })
  }

  // Monitor response time
  monitorResponseTime(emergencyId) {
    const emergency = this.activeEmergencies.get(emergencyId)
    if (!emergency) return
    
    const checkInterval = setInterval(() => {
      const current = this.activeEmergencies.get(emergencyId)
      if (!current || current.status !== 'ACTIVE') {
        clearInterval(checkInterval)
        return
      }
      
      const responseTime = Date.now() - emergency.timestamp
      if (responseTime > this.RESPONSE_TIME_THRESHOLD) {
        this.handleSlowResponse(emergencyId, responseTime)
      }
    }, 10000) // Check every 10 seconds
  }

  // Handle slow response time
  async handleSlowResponse(emergencyId, responseTime) {
    const emergency = this.activeEmergencies.get(emergencyId)
    if (!emergency) return
    
    // Escalate emergency
    await this.escalateEmergency(emergencyId, {
      reason: 'SLOW_RESPONSE',
      responseTime
    })
    
    // Find additional responders
    const additionalResponders = await this.findNearbyResponders(emergency.zoneId)
    
    // Notify management of escalation
    this.emit('emergency:escalated', {
      emergencyId,
      responseTime,
      additionalResponders
    })
  }

  // Escalate emergency
  async escalateEmergency(emergencyId, details) {
    try {
      const emergency = await this.prisma.emergency.update({
        where: { id: emergencyId },
        data: {
          status: 'ESCALATED',
          escalationDetails: details
        }
      })
      
      this.activeEmergencies.set(emergencyId, {
        ...this.activeEmergencies.get(emergencyId),
        ...emergency
      })
      
      return emergency
    } catch (error) {
      this.emit('emergency:escalation_error', {
        emergencyId,
        error: error.message
      })
      throw error
    }
  }

  // Mark emergency as resolved and clean up data
  async resolveEmergency(emergencyId, resolution) {
    try {
      // Update emergency status
      const emergency = await this.prisma.emergency.update({
        where: { id: emergencyId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          // Store only essential resolution data
          resolutionDetails: {
            timeResolved: Date.now(),
            resolutionType: resolution.type
          }
        }
      })
      
      // Clean up location tracking data
      if (emergency.deviceId) {
        this.locationTracker.stopTracking(emergency.deviceId)
      }
      
      // Remove from active emergencies
      this.activeEmergencies.delete(emergencyId)
      
      // Notify about resolution
      this.emit('emergency:resolved', {
        emergencyId,
        resolutionTime: emergency.resolvedAt
      })
      
      // Schedule data cleanup
      this.scheduleDataCleanup(emergencyId)
      
      return emergency
    } catch (error) {
      this.emit('emergency:resolution_error', {
        emergencyId,
        error: error.message
      })
      throw error
    }
  }

  // Schedule cleanup of emergency data
  async scheduleDataCleanup(emergencyId) {
    // Keep data only for the legally required period
    const RETENTION_PERIOD = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
    
    setTimeout(async () => {
      try {
        // Remove detailed location data
        await this.prisma.emergency.update({
          where: { id: emergencyId },
          data: {
            // Keep only essential audit data
            metadata: {
              emergencyOccurred: true,
              dataRemoved: new Date()
            }
          }
        })
      } catch (error) {
        console.error('Error cleaning up emergency data:', error)
      }
    }, RETENTION_PERIOD)
  }

  // Get active emergency status
  getEmergencyStatus(emergencyId) {
    return this.activeEmergencies.get(emergencyId)
  }

  // Get all active emergencies
  getActiveEmergencies() {
    return Array.from(this.activeEmergencies.values())
  }

  // Get emergency statistics (anonymized)
  async getEmergencyStats(timeframe) {
    const stats = {
      total: 0,
      resolved: 0,
      escalated: 0,
      averageResponseTime: 0,
      byZone: new Map()
    }
    
    try {
      // Get only anonymized statistics
      const emergencies = await this.prisma.emergency.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - timeframe)
          }
        },
        select: {
          status: true,
          timestamp: true,
          resolvedAt: true,
          zoneId: true
        }
      })
      
      stats.total = emergencies.length
      stats.resolved = emergencies.filter(e => e.status === 'RESOLVED').length
      stats.escalated = emergencies.filter(e => e.status === 'ESCALATED').length
      
      // Calculate average response time without identifying information
      const responseTimes = emergencies
        .filter(e => e.resolvedAt)
        .map(e => e.resolvedAt.getTime() - e.timestamp.getTime())
      
      if (responseTimes.length > 0) {
        stats.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      }
      
      // Group by zone without personal data
      emergencies.forEach(emergency => {
        const zoneStats = stats.byZone.get(emergency.zoneId) || {
          total: 0,
          resolved: 0,
          escalated: 0
        }
        
        zoneStats.total++
        if (emergency.status === 'RESOLVED') zoneStats.resolved++
        if (emergency.status === 'ESCALATED') zoneStats.escalated++
        
        stats.byZone.set(emergency.zoneId, zoneStats)
      })
      
      return stats
    } catch (error) {
      this.emit('emergency:stats_error', {
        error: error.message
      })
      throw error
    }
  }
}

export default EmergencyHandler 