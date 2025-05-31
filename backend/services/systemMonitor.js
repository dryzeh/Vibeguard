import { EventEmitter } from 'events'
import os from 'os'

class SystemMonitor extends EventEmitter {
  constructor(hybridConnection, locationTracker, emergencyHandler) {
    super()
    this.hybridConnection = hybridConnection
    this.locationTracker = locationTracker
    this.emergencyHandler = emergencyHandler
    
    this.metrics = {
      system: new Map(),
      connections: new Map(),
      emergencies: new Map(),
      performance: new Map()
    }
    
    // Configuration
    this.METRICS_INTERVAL = 5000 // 5 seconds
    this.ALERT_THRESHOLDS = {
      cpu: 80, // 80% usage
      memory: 85, // 85% usage
      connectionDropRate: 5, // 5% in 5 minutes
      responseTime: 2000 // 2 seconds
    }
    
    this.startMonitoring()
  }

  // Start all monitoring processes
  startMonitoring() {
    this.monitorSystem()
    this.monitorConnections()
    this.monitorEmergencies()
    this.monitorPerformance()
  }

  // Monitor system resources
  monitorSystem() {
    setInterval(() => {
      const metrics = {
        timestamp: Date.now(),
        cpu: this.getCPUUsage(),
        memory: this.getMemoryUsage(),
        uptime: process.uptime(),
        loadAverage: os.loadavg()
      }
      
      this.metrics.system.set('current', metrics)
      
      // Check for system alerts
      this.checkSystemAlerts(metrics)
      
      this.emit('monitor:system', metrics)
    }, this.METRICS_INTERVAL)
  }

  // Monitor connection health
  monitorConnections() {
    setInterval(() => {
      const stats = this.hybridConnection.getConnectionStats()
      const metrics = {
        timestamp: Date.now(),
        total: stats.total,
        active: stats.active,
        disconnected: stats.disconnected,
        quality: {
          good: stats.signalStrength.good,
          fair: stats.signalStrength.fair,
          poor: stats.signalStrength.poor
        },
        dropRate: this.calculateDropRate(stats)
      }
      
      this.metrics.connections.set('current', metrics)
      
      // Check for connection alerts
      this.checkConnectionAlerts(metrics)
      
      this.emit('monitor:connections', metrics)
    }, this.METRICS_INTERVAL)
  }

  // Monitor emergency response system
  monitorEmergencies() {
    setInterval(async () => {
      const activeEmergencies = this.emergencyHandler.getActiveEmergencies()
      const stats = await this.emergencyHandler.getEmergencyStats(3600000) // Last hour
      
      const metrics = {
        timestamp: Date.now(),
        active: activeEmergencies.length,
        responseTime: stats.averageResponseTime,
        resolved: stats.resolved,
        escalated: stats.escalated
      }
      
      this.metrics.emergencies.set('current', metrics)
      
      // Check for emergency system alerts
      this.checkEmergencyAlerts(metrics)
      
      this.emit('monitor:emergencies', metrics)
    }, this.METRICS_INTERVAL)
  }

  // Monitor system performance
  monitorPerformance() {
    setInterval(() => {
      const metrics = {
        timestamp: Date.now(),
        responseTime: this.calculateAverageResponseTime(),
        throughput: this.calculateThroughput(),
        errorRate: this.calculateErrorRate()
      }
      
      this.metrics.performance.set('current', metrics)
      
      // Check for performance alerts
      this.checkPerformanceAlerts(metrics)
      
      this.emit('monitor:performance', metrics)
    }, this.METRICS_INTERVAL)
  }

  // Get CPU usage percentage
  getCPUUsage() {
    const cpus = os.cpus()
    const usage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b)
      const idle = cpu.times.idle
      return acc + ((total - idle) / total) * 100
    }, 0)
    
    return usage / cpus.length
  }

  // Get memory usage percentage
  getMemoryUsage() {
    const total = os.totalmem()
    const free = os.freemem()
    return ((total - free) / total) * 100
  }

  // Calculate connection drop rate
  calculateDropRate(stats) {
    const previousStats = this.metrics.connections.get('previous')
    if (!previousStats) return 0
    
    const timeDiff = stats.timestamp - previousStats.timestamp
    const disconnections = stats.disconnected - previousStats.disconnected
    
    return (disconnections / stats.total) * 100
  }

  // Calculate average response time
  calculateAverageResponseTime() {
    // Implementation depends on your response time tracking
    return 0
  }

  // Calculate system throughput
  calculateThroughput() {
    // Implementation depends on your request tracking
    return 0
  }

  // Calculate error rate
  calculateErrorRate() {
    // Implementation depends on your error tracking
    return 0
  }

  // Check system alerts
  checkSystemAlerts(metrics) {
    if (metrics.cpu > this.ALERT_THRESHOLDS.cpu) {
      this.emit('alert:system', {
        type: 'HIGH_CPU',
        value: metrics.cpu,
        threshold: this.ALERT_THRESHOLDS.cpu
      })
    }
    
    if (metrics.memory > this.ALERT_THRESHOLDS.memory) {
      this.emit('alert:system', {
        type: 'HIGH_MEMORY',
        value: metrics.memory,
        threshold: this.ALERT_THRESHOLDS.memory
      })
    }
  }

  // Check connection alerts
  checkConnectionAlerts(metrics) {
    if (metrics.dropRate > this.ALERT_THRESHOLDS.connectionDropRate) {
      this.emit('alert:connections', {
        type: 'HIGH_DROP_RATE',
        value: metrics.dropRate,
        threshold: this.ALERT_THRESHOLDS.connectionDropRate
      })
    }
    
    if (metrics.quality.poor > (metrics.total * 0.2)) {
      this.emit('alert:connections', {
        type: 'POOR_CONNECTION_QUALITY',
        value: metrics.quality.poor,
        total: metrics.total
      })
    }
  }

  // Check emergency alerts
  checkEmergencyAlerts(metrics) {
    if (metrics.responseTime > this.ALERT_THRESHOLDS.responseTime) {
      this.emit('alert:emergencies', {
        type: 'SLOW_RESPONSE',
        value: metrics.responseTime,
        threshold: this.ALERT_THRESHOLDS.responseTime
      })
    }
    
    if (metrics.active > 5) { // More than 5 concurrent emergencies
      this.emit('alert:emergencies', {
        type: 'HIGH_EMERGENCY_LOAD',
        value: metrics.active
      })
    }
  }

  // Check performance alerts
  checkPerformanceAlerts(metrics) {
    if (metrics.errorRate > 5) { // More than 5% error rate
      this.emit('alert:performance', {
        type: 'HIGH_ERROR_RATE',
        value: metrics.errorRate
      })
    }
    
    if (metrics.responseTime > this.ALERT_THRESHOLDS.responseTime) {
      this.emit('alert:performance', {
        type: 'HIGH_LATENCY',
        value: metrics.responseTime,
        threshold: this.ALERT_THRESHOLDS.responseTime
      })
    }
  }

  // Get current system health
  getSystemHealth() {
    return {
      system: this.metrics.system.get('current'),
      connections: this.metrics.connections.get('current'),
      emergencies: this.metrics.emergencies.get('current'),
      performance: this.metrics.performance.get('current')
    }
  }

  // Get historical metrics
  getHistoricalMetrics(type, duration) {
    // Implementation depends on your metrics storage
    return []
  }
}

export default SystemMonitor 