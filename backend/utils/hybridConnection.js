import { EventEmitter } from 'events'
import noble from '@abandonware/noble'  // For BLE
import wifi from 'node-wifi'           // For Wi-Fi
import { createMesh } from 'mesh-network' // For mesh networking

class HybridConnectionManager extends EventEmitter {
  constructor() {
    super()
    this.devices = new Map()
    this.meshNetwork = null
    this.RSSI_THRESHOLD = -80 // dBm threshold for signal strength
    
    // Initialize both BLE and Wi-Fi
    this.initializeBLE()
    this.initializeWiFi()
    this.initializeMesh()
  }

  // Initialize BLE scanning and connection
  async initializeBLE() {
    noble.on('stateChange', async (state) => {
      if (state === 'poweredOn') {
        // Start scanning for bracelets
        await noble.startScanningAsync(['180F'], false) // Use specific service UUID for bracelets
      }
    })

    noble.on('discover', async (peripheral) => {
      const { id, address, rssi } = peripheral
      
      // Check if this is one of our bracelets
      if (this.isBraceletDevice(peripheral)) {
        this.handleBraceletDiscovery(peripheral)
      }
    })
  }

  // Initialize Wi-Fi connection management
  async initializeWiFi() {
    await wifi.init({
      iface: null // Use default WiFi interface
    })

    // Set up Wi-Fi mesh network for better coverage
    this.meshNetwork = createMesh({
      name: 'bracelet-mesh',
      port: 7777,
      seeds: [], // Mesh network seed nodes
      multicast: true
    })
  }

  // Initialize mesh networking
  initializeMesh() {
    this.meshNetwork.on('connection', (peer) => {
      console.log('New mesh node connected:', peer.id)
    })

    this.meshNetwork.on('data', (data, peer) => {
      this.handleMeshData(data, peer)
    })
  }

  // Handle bracelet discovery
  async handleBraceletDiscovery(peripheral) {
    try {
      // Connect to the bracelet
      await peripheral.connectAsync()
      
      // Discover services and characteristics
      const { characteristics } = await peripheral.discoverAllServicesAndCharacteristicsAsync()
      
      // Store device information
      this.devices.set(peripheral.id, {
        peripheral,
        characteristics,
        connectionType: 'ble',
        lastSeen: Date.now(),
        rssi: peripheral.rssi,
        batteryLevel: null
      })

      // Set up data handlers
      this.setupBraceletDataHandlers(peripheral.id, characteristics)
      
      // Monitor signal strength
      this.monitorSignalStrength(peripheral)
      
      // Check if Wi-Fi handover is needed
      this.checkWiFiHandover(peripheral.id)
      
      this.emit('bracelet:connected', {
        id: peripheral.id,
        type: 'ble',
        rssi: peripheral.rssi
      })
    } catch (error) {
      this.emit('bracelet:error', {
        id: peripheral.id,
        error: error.message
      })
    }
  }

  // Monitor signal strength and handle handovers
  monitorSignalStrength(peripheral) {
    peripheral.on('rssiUpdate', (rssi) => {
      const device = this.devices.get(peripheral.id)
      if (device) {
        device.rssi = rssi
        
        // Check if we need to switch to Wi-Fi
        if (rssi < this.RSSI_THRESHOLD) {
          this.initiateWiFiHandover(peripheral.id)
        }
      }
    })
  }

  // Initiate Wi-Fi handover for better connection
  async initiateWiFiHandover(deviceId) {
    const device = this.devices.get(deviceId)
    if (!device || device.connectionType === 'wifi') return

    try {
      // Get Wi-Fi credentials from bracelet
      const wifiCredentials = await this.getWiFiCredentials(device)
      
      // Connect to Wi-Fi
      await this.connectToWiFi(wifiCredentials)
      
      // Update connection type
      device.connectionType = 'wifi'
      this.devices.set(deviceId, device)
      
      // Set up Wi-Fi data handlers
      this.setupWiFiDataHandlers(deviceId)
      
      this.emit('bracelet:handover', {
        id: deviceId,
        from: 'ble',
        to: 'wifi'
      })
    } catch (error) {
      this.emit('bracelet:handover_error', {
        id: deviceId,
        error: error.message
      })
    }
  }

  // Setup data handlers for bracelet
  setupBraceletDataHandlers(deviceId, characteristics) {
    const emergencyCharacteristic = characteristics.find(c => 
      c.uuid === 'emergency-button-uuid'
    )
    
    if (emergencyCharacteristic) {
      emergencyCharacteristic.on('data', (data) => {
        this.handleEmergencySignal(deviceId, data)
      })
      
      // Subscribe to notifications
      emergencyCharacteristic.subscribeAsync()
    }
  }

  // Handle emergency signal from bracelet
  handleEmergencySignal(deviceId, data) {
    const device = this.devices.get(deviceId)
    if (!device) return

    // Broadcast emergency signal through mesh network
    this.meshNetwork.broadcast({
      type: 'EMERGENCY',
      deviceId,
      timestamp: Date.now(),
      location: device.lastKnownLocation,
      signalStrength: device.rssi
    })

    this.emit('bracelet:emergency', {
      id: deviceId,
      location: device.lastKnownLocation,
      timestamp: Date.now()
    })
  }

  // Get battery level
  async getBatteryLevel(deviceId) {
    const device = this.devices.get(deviceId)
    if (!device) return null

    try {
      const batteryChar = device.characteristics.find(c => 
        c.uuid === 'battery-level-uuid'
      )
      
      if (batteryChar) {
        const data = await batteryChar.readAsync()
        const batteryLevel = data.readUInt8(0)
        device.batteryLevel = batteryLevel
        return batteryLevel
      }
    } catch (error) {
      this.emit('bracelet:battery_error', {
        id: deviceId,
        error: error.message
      })
    }
    return null
  }

  // Check if device is one of our bracelets
  isBraceletDevice(peripheral) {
    // Check manufacturer data or service UUIDs
    const manufacturerData = peripheral.advertisement.manufacturerData
    if (!manufacturerData) return false

    // Check for our specific manufacturer ID
    const manufacturerId = manufacturerData.readUInt16LE(0)
    return manufacturerId === YOUR_MANUFACTURER_ID // Replace with your ID
  }

  // Get connection statistics
  getConnectionStats() {
    const stats = {
      total: this.devices.size,
      ble: 0,
      wifi: 0,
      batteryLevels: [],
      signalStrength: {
        good: 0,
        fair: 0,
        poor: 0
      }
    }

    this.devices.forEach(device => {
      // Count connection types
      stats[device.connectionType]++
      
      // Battery levels
      if (device.batteryLevel !== null) {
        stats.batteryLevels.push({
          id: device.peripheral.id,
          level: device.batteryLevel
        })
      }
      
      // Signal strength categories
      if (device.rssi >= -70) stats.signalStrength.good++
      else if (device.rssi >= -80) stats.signalStrength.fair++
      else stats.signalStrength.poor++
    })

    return stats
  }
}

export default HybridConnectionManager 