import { EventEmitter } from 'events'

class LocationTracker extends EventEmitter {
  constructor() {
    super()
    this.activeEmergencyLocations = new Map() // Only track during emergencies
    this.zoneOccupancy = new Map()
    
    // Configuration
    this.EMERGENCY_LOCATION_TTL = 300000 // 5 minutes max tracking during emergency
    this.MAX_ZONE_CAPACITY = new Map()
    this.CROWDING_THRESHOLD = 0.8 // 80% of max capacity
  }

  // Update device location - ONLY during active emergencies
  updateLocation(deviceId, zoneId, coordinates, accuracy) {
    const timestamp = Date.now()
    
    // Only store location if there's an active emergency for this device
    if (!this.activeEmergencyLocations.has(deviceId)) {
      return;
    }
    
    // Store minimal location data
    this.activeEmergencyLocations.set(deviceId, {
      zoneId,
      timestamp
    })
    
    // Update zone occupancy without tracking individuals
    this.updateZoneOccupancy(zoneId)
    
    // Emit location update with minimal data
    this.emit('location:update', {
      deviceId,
      zoneId,
      timestamp
    })

    // Schedule automatic location tracking cleanup
    this.scheduleLocationCleanup(deviceId)
  }

  // Start tracking for emergency
  startEmergencyTracking(deviceId) {
    this.activeEmergencyLocations.set(deviceId, {
      startTime: Date.now()
    })

    // Ensure tracking stops after maximum duration
    setTimeout(() => {
      this.stopTracking(deviceId)
    }, this.EMERGENCY_LOCATION_TTL)
  }

  // Stop tracking device
  stopTracking(deviceId) {
    this.activeEmergencyLocations.delete(deviceId)
    this.emit('tracking:stopped', { deviceId })
  }

  // Schedule cleanup of location data
  scheduleLocationCleanup(deviceId) {
    const locationData = this.activeEmergencyLocations.get(deviceId)
    if (!locationData) return

    const timeTracking = Date.now() - locationData.startTime
    if (timeTracking >= this.EMERGENCY_LOCATION_TTL) {
      this.stopTracking(deviceId)
    }
  }

  // Update zone occupancy (anonymous count only)
  updateZoneOccupancy(zoneId) {
    const currentOccupancy = Array.from(this.activeEmergencyLocations.values())
      .filter(loc => loc.zoneId === zoneId).length
    
    this.zoneOccupancy.set(zoneId, currentOccupancy)
    
    // Check if we're approaching capacity
    const maxCapacity = this.MAX_ZONE_CAPACITY.get(zoneId)
    if (maxCapacity && currentOccupancy >= maxCapacity * this.CROWDING_THRESHOLD) {
      this.emit('zone:crowding', {
        zoneId,
        currentOccupancy,
        maxCapacity,
        percentage: (currentOccupancy / maxCapacity) * 100
      })
    }
  }

  // Get current location for a device - ONLY if active emergency
  getDeviceLocation(deviceId) {
    // Only return location if there's an active emergency
    if (!this.activeEmergencyLocations.has(deviceId)) {
      return null;
    }
    return this.activeEmergencyLocations.get(deviceId)
  }

  // Get zone occupancy (anonymous count only)
  getZoneOccupancy(zoneId) {
    return {
      current: this.zoneOccupancy.get(zoneId) || 0,
      max: this.MAX_ZONE_CAPACITY.get(zoneId),
      percentage: this.calculateOccupancyPercentage(zoneId)
    }
  }

  // Calculate occupancy percentage
  calculateOccupancyPercentage(zoneId) {
    const current = this.zoneOccupancy.get(zoneId) || 0
    const max = this.MAX_ZONE_CAPACITY.get(zoneId)
    
    if (!max) return 0
    return (current / max) * 100
  }

  // Set maximum capacity for a zone
  setZoneCapacity(zoneId, capacity) {
    this.MAX_ZONE_CAPACITY.set(zoneId, capacity)
  }
}

export default LocationTracker 