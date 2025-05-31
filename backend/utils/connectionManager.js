import { EventEmitter } from 'events'
import WebSocket from 'ws'  // Add WebSocket import

class ConnectionManager extends EventEmitter {
  constructor() {
    super()
    this.connections = new Map()
    this.heartbeats = new Map()
    this.reconnectAttempts = new Map()
    this.connectionQuality = new Map()
    this.backupConnections = new Map()
    
    // Configuration
    this.HEARTBEAT_INTERVAL = 30000 // 30 seconds
    this.HEARTBEAT_TIMEOUT = 45000  // 45 seconds
    this.MAX_RECONNECT_ATTEMPTS = 10 // Increased from 5
    this.RECONNECT_INTERVAL = 3000  // Reduced to 3 seconds
    this.QUALITY_CHECK_INTERVAL = 10000 // 10 seconds
    this.SIGNAL_STRENGTH_THRESHOLD = -70 // dBm
    this.BACKUP_CONNECTION_TIMEOUT = 2000 // 2 seconds
    
    // Start global monitoring
    this.startQualityMonitoring()
  }

  // Start global quality monitoring
  startQualityMonitoring() {
    setInterval(() => {
      const connections = Array.from(this.connections.values())
      
      // Check all connections
      connections.forEach(connection => {
        if (connection.status === 'connected') {
          const quality = this.calculateConnectionQuality(connection)
          
          // Update connection quality
          connection.connectionQuality = quality
          
          // Check for degraded connections
          if (quality < 50) {
            this.handlePoorConnectionQuality(connection.braceletId, quality)
          }
          
          // Log quality metrics
          this.emit('connection:quality_check', {
            braceletId: connection.braceletId,
            quality,
            activeSocket: connection.activeSocket,
            signalStrength: connection.signalStrength
          })
        }
      })
      
      // Generate overall health report
      const stats = this.getStatistics()
      this.emit('connection:health_report', stats)
      
      // Alert if too many connections are poor quality
      if (stats.qualityDistribution.poor > (stats.total * 0.2)) { // More than 20% poor
        this.emit('connection:quality_alert', {
          message: 'High number of poor quality connections detected',
          stats: stats.qualityDistribution
        })
      }
    }, this.QUALITY_CHECK_INTERVAL)
  }

  // Initialize primary connection
  async initializePrimaryConnection(braceletId) {
    const connection = this.connections.get(braceletId)
    if (!connection) return

    try {
      const primarySocket = new WebSocket(process.env.PRIMARY_WEBSOCKET_URL)
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Primary connection timeout'))
        }, this.BACKUP_CONNECTION_TIMEOUT)

        primarySocket.onopen = () => {
          clearTimeout(timeout)
          connection.primarySocket = primarySocket
          connection.activeSocket = 'primary'
          this.connections.set(braceletId, connection)
          
          this.emit('bracelet:primary_connected', { braceletId })
          resolve(primarySocket)
        }

        primarySocket.onerror = (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      })
    } catch (error) {
      this.emit('bracelet:primary_failed', { braceletId, error })
      throw error
    }
  }

  // Setup backup heartbeat monitoring
  setupBackupHeartbeat(braceletId) {
    const connection = this.connections.get(braceletId)
    if (!connection || !connection.backupSocket) return

    // Send initial heartbeat
    try {
      connection.backupSocket.send(JSON.stringify({ 
        type: 'BACKUP_HEARTBEAT',
        timestamp: Date.now()
      }))
    } catch (error) {
      this.emit('bracelet:backup_heartbeat_failed', { braceletId, error })
    }

    // Setup backup heartbeat interval
    const backupHeartbeatInterval = setInterval(() => {
      if (!connection.backupSocket) {
        clearInterval(backupHeartbeatInterval)
        return
      }

      try {
        connection.backupSocket.send(JSON.stringify({ 
          type: 'BACKUP_HEARTBEAT',
          timestamp: Date.now()
        }))
      } catch (error) {
        this.emit('bracelet:backup_heartbeat_failed', { braceletId, error })
        this.handleBackupConnectionError(braceletId, error)
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  // Handle backup connection error
  handleBackupConnectionError(braceletId, error) {
    const connection = this.connections.get(braceletId)
    if (!connection) return

    this.emit('bracelet:backup_error', { 
      braceletId, 
      error 
    })

    // Clear backup connection
    connection.backupSocket = null
    this.connections.set(braceletId, connection)

    // Try to establish new backup connection
    this.initializeBackupConnection(braceletId)
  }

  // Register a new bracelet connection with redundancy
  async addConnection(braceletId, primarySocket) {
    try {
      // Set up primary connection
      const connection = {
        primarySocket,
        backupSocket: null,
        status: 'connected',
        lastHeartbeat: Date.now(),
        signalStrength: null,
        activeSocket: 'primary',
        lastQualityCheck: Date.now(),
        connectionQuality: 100
      }
      
      this.connections.set(braceletId, connection)
      
      // Setup heartbeat monitoring
      this.setupHeartbeat(braceletId)
      
      // Setup connection quality monitoring
      this.setupQualityMonitoring(braceletId)
      
      // Reset reconnect attempts
      this.reconnectAttempts.delete(braceletId)
      
      // Emit connection event
      this.emit('bracelet:connected', { braceletId })
      
      // Initialize backup connection
      await this.initializeBackupConnection(braceletId)
      
      return true
    } catch (error) {
      this.handleConnectionError(braceletId, error)
      return false
    }
  }

  // Initialize backup WebSocket connection
  async initializeBackupConnection(braceletId) {
    const connection = this.connections.get(braceletId)
    if (!connection) return

    try {
      // Create backup WebSocket connection
      const backupSocket = await this.createBackupSocket(braceletId)
      
      connection.backupSocket = backupSocket
      this.connections.set(braceletId, connection)
      
      // Setup backup heartbeat
      this.setupBackupHeartbeat(braceletId)
    } catch (error) {
      this.emit('bracelet:backup_failed', { braceletId, error })
    }
  }

  // Create backup WebSocket connection
  async createBackupSocket(braceletId) {
    // Implementation would depend on your WebSocket setup
    // This is a placeholder for the actual implementation
    return new Promise((resolve, reject) => {
      try {
        // Create new WebSocket connection
        const backupSocket = new WebSocket(process.env.BACKUP_WEBSOCKET_URL)
        
        const timeout = setTimeout(() => {
          reject(new Error('Backup connection timeout'))
        }, this.BACKUP_CONNECTION_TIMEOUT)
        
        backupSocket.onopen = () => {
          clearTimeout(timeout)
          resolve(backupSocket)
        }
        
        backupSocket.onerror = (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  // Enhanced heartbeat monitoring
  setupHeartbeat(braceletId) {
    this.clearHeartbeat(braceletId)

    const heartbeatInterval = setInterval(() => {
      const connection = this.connections.get(braceletId)
      if (!connection) {
        this.clearHeartbeat(braceletId)
        return
      }

      const timeSinceLastHeartbeat = Date.now() - connection.lastHeartbeat
      if (timeSinceLastHeartbeat > this.HEARTBEAT_TIMEOUT) {
        // Try switching to backup connection before timeout
        if (connection.backupSocket && connection.activeSocket === 'primary') {
          this.switchToBackupConnection(braceletId)
        } else {
          this.handleHeartbeatTimeout(braceletId)
        }
      } else {
        // Send heartbeat request to active socket
        try {
          const activeSocket = connection.activeSocket === 'primary' 
            ? connection.primarySocket 
            : connection.backupSocket
            
          activeSocket.send(JSON.stringify({ 
            type: 'HEARTBEAT',
            timestamp: Date.now()
          }))
        } catch (error) {
          this.handleConnectionError(braceletId, error)
        }
      }
    }, this.HEARTBEAT_INTERVAL)

    this.heartbeats.set(braceletId, heartbeatInterval)
  }

  // Switch to backup connection
  async switchToBackupConnection(braceletId) {
    const connection = this.connections.get(braceletId)
    if (!connection || !connection.backupSocket) return

    try {
      // Switch to backup socket
      connection.activeSocket = 'backup'
      this.connections.set(braceletId, connection)
      
      // Notify about failover
      this.emit('bracelet:failover', { 
        braceletId,
        fromSocket: 'primary',
        toSocket: 'backup'
      })
      
      // Try to re-establish primary connection
      this.initializePrimaryConnection(braceletId)
    } catch (error) {
      this.handleConnectionError(braceletId, error)
    }
  }

  // Monitor connection quality
  setupQualityMonitoring(braceletId) {
    const qualityInterval = setInterval(() => {
      const connection = this.connections.get(braceletId)
      if (!connection) {
        clearInterval(qualityInterval)
        return
      }

      // Calculate connection quality based on multiple factors
      const quality = this.calculateConnectionQuality(connection)
      connection.connectionQuality = quality
      
      // Update last quality check timestamp
      connection.lastQualityCheck = Date.now()
      
      // If quality is poor, try to improve connection
      if (quality < 50) {
        this.handlePoorConnectionQuality(braceletId, quality)
      }
      
      this.emit('bracelet:quality_update', {
        braceletId,
        quality,
        activeSocket: connection.activeSocket,
        signalStrength: connection.signalStrength
      })
    }, this.QUALITY_CHECK_INTERVAL)
  }

  // Calculate connection quality (0-100)
  calculateConnectionQuality(connection) {
    const factors = {
      signalStrength: this.calculateSignalStrengthScore(connection.signalStrength),
      latency: this.calculateLatencyScore(connection),
      stability: this.calculateStabilityScore(connection)
    }
    
    return Math.floor(
      (factors.signalStrength * 0.4) + 
      (factors.latency * 0.3) + 
      (factors.stability * 0.3)
    )
  }

  // Calculate signal strength score (0-100)
  calculateSignalStrengthScore(signalStrength) {
    if (!signalStrength) return 50 // Default score
    
    // Convert dBm to score (typical WiFi range: -50 to -90 dBm)
    const score = Math.max(0, Math.min(100, 
      ((signalStrength + 90) / 40) * 100
    ))
    
    return Math.floor(score)
  }

  // Calculate latency score (0-100)
  calculateLatencyScore(connection) {
    const latency = Date.now() - connection.lastHeartbeat
    // Convert latency to score (0-1000ms range)
    const score = Math.max(0, Math.min(100,
      (1 - (latency / 1000)) * 100
    ))
    
    return Math.floor(score)
  }

  // Calculate connection stability score (0-100)
  calculateStabilityScore(connection) {
    const reconnectCount = this.reconnectAttempts.get(connection) || 0
    const score = Math.max(0, Math.min(100,
      (1 - (reconnectCount / this.MAX_RECONNECT_ATTEMPTS)) * 100
    ))
    
    return Math.floor(score)
  }

  // Handle poor connection quality
  async handlePoorConnectionQuality(braceletId, quality) {
    const connection = this.connections.get(braceletId)
    if (!connection) return

    // If on primary connection, try switching to backup
    if (connection.activeSocket === 'primary' && connection.backupSocket) {
      await this.switchToBackupConnection(braceletId)
    }
    // If on backup connection, try re-establishing primary
    else if (connection.activeSocket === 'backup') {
      await this.initializePrimaryConnection(braceletId)
    }

    this.emit('bracelet:poor_quality', {
      braceletId,
      quality,
      activeSocket: connection.activeSocket
    })
  }

  // Enhanced error handling
  handleConnectionError(braceletId, error) {
    const connection = this.connections.get(braceletId)
    if (!connection) return

    this.emit('bracelet:error', { 
      braceletId, 
      error,
      activeSocket: connection.activeSocket
    })

    // If primary socket error, try switching to backup
    if (connection.activeSocket === 'primary' && connection.backupSocket) {
      this.switchToBackupConnection(braceletId)
    } else {
      this.removeConnection(braceletId)
    }
  }

  // Get detailed connection status
  getConnectionStatus(braceletId) {
    const connection = this.connections.get(braceletId)
    if (!connection) return {
      status: 'disconnected',
      quality: 0,
      activeSocket: null,
      signalStrength: null
    }

    return {
      status: connection.status,
      quality: connection.connectionQuality,
      activeSocket: connection.activeSocket,
      signalStrength: connection.signalStrength,
      lastHeartbeat: connection.lastHeartbeat,
      hasBackup: !!connection.backupSocket
    }
  }

  // Get enhanced statistics
  getStatistics() {
    const total = this.connections.size
    const connections = Array.from(this.connections.values())
    
    const stats = {
      total,
      active: connections.filter(conn => conn.status === 'connected').length,
      disconnected: total - connections.filter(conn => conn.status === 'connected').length,
      reconnecting: this.reconnectAttempts.size,
      usingBackup: connections.filter(conn => conn.activeSocket === 'backup').length,
      averageQuality: this.calculateAverageQuality(connections),
      qualityDistribution: this.calculateQualityDistribution(connections)
    }

    return stats
  }

  // Calculate average connection quality
  calculateAverageQuality(connections) {
    if (connections.length === 0) return 0
    
    const totalQuality = connections.reduce((sum, conn) => 
      sum + (conn.connectionQuality || 0), 0)
    
    return Math.floor(totalQuality / connections.length)
  }

  // Calculate quality distribution
  calculateQualityDistribution(connections) {
    return {
      excellent: connections.filter(conn => conn.connectionQuality >= 80).length,
      good: connections.filter(conn => conn.connectionQuality >= 60 && conn.connectionQuality < 80).length,
      fair: connections.filter(conn => conn.connectionQuality >= 40 && conn.connectionQuality < 60).length,
      poor: connections.filter(conn => conn.connectionQuality < 40).length
    }
  }

  // Handle bracelet disconnection
  removeConnection(braceletId) {
    const connection = this.connections.get(braceletId)
    if (connection) {
      connection.status = 'disconnected'
      this.connections.delete(braceletId)
      this.clearHeartbeat(braceletId)
      this.emit('bracelet:disconnected', { braceletId })
      
      // Attempt to reconnect
      this.attemptReconnect(braceletId)
    }
  }

  // Setup heartbeat monitoring for a bracelet
  setupHeartbeat(braceletId) {
    this.clearHeartbeat(braceletId) // Clear any existing heartbeat

    const heartbeatInterval = setInterval(() => {
      const connection = this.connections.get(braceletId)
      if (!connection) {
        this.clearHeartbeat(braceletId)
        return
      }

      const timeSinceLastHeartbeat = Date.now() - connection.lastHeartbeat
      if (timeSinceLastHeartbeat > this.HEARTBEAT_TIMEOUT) {
        this.handleHeartbeatTimeout(braceletId)
      } else {
        // Send heartbeat request
        try {
          connection.socket.send(JSON.stringify({ type: 'HEARTBEAT' }))
        } catch (error) {
          this.handleConnectionError(braceletId, error)
        }
      }
    }, this.HEARTBEAT_INTERVAL)

    this.heartbeats.set(braceletId, heartbeatInterval)
  }

  // Clear heartbeat monitoring
  clearHeartbeat(braceletId) {
    const interval = this.heartbeats.get(braceletId)
    if (interval) {
      clearInterval(interval)
      this.heartbeats.delete(braceletId)
    }
  }

  // Handle heartbeat timeout
  handleHeartbeatTimeout(braceletId) {
    const connection = this.connections.get(braceletId)
    if (connection) {
      connection.status = 'timeout'
      this.emit('bracelet:timeout', { braceletId })
      this.removeConnection(braceletId)
    }
  }

  // Update bracelet signal strength
  updateSignalStrength(braceletId, signalStrength) {
    const connection = this.connections.get(braceletId)
    if (connection) {
      connection.signalStrength = signalStrength
      connection.lastHeartbeat = Date.now()
      this.emit('bracelet:signal_update', { 
        braceletId, 
        signalStrength 
      })
    }
  }

  // Get all active connections
  getActiveConnections() {
    const active = new Map()
    for (const [braceletId, connection] of this.connections) {
      if (connection.status === 'connected') {
        active.set(braceletId, connection)
      }
    }
    return active
  }

  // Attempt to reconnect
  async attemptReconnect(braceletId) {
    const attempts = this.reconnectAttempts.get(braceletId) || 0
    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.emit('bracelet:reconnect_failed', { braceletId })
      return
    }

    this.reconnectAttempts.set(braceletId, attempts + 1)
    
    setTimeout(() => {
      this.emit('bracelet:reconnecting', { 
        braceletId, 
        attempt: attempts + 1 
      })
    }, this.RECONNECT_INTERVAL)
  }
} 