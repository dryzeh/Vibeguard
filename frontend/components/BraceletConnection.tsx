import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import * as Location from 'expo-location';

interface BraceletConnectionProps {
  onConnectionComplete: (device: Device) => void;
}

const BraceletConnection: React.FC<BraceletConnectionProps> = ({ onConnectionComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const bleManager = new BleManager();

  useEffect(() => {
    // Request permissions on component mount
    requestPermissions();
    return () => {
      bleManager.destroy();
    };
  }, []);

  const requestPermissions = async () => {
    try {
      // Request location permissions (required for BLE scanning on Android)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required for BLE scanning');
        return false;
      }
      return true;
    } catch (error) {
      setError('Failed to request permissions');
      return false;
    }
  };

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setDevices([]);
      setError(null);

      // Clear previous scan results
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) return;

      // Start scanning with specific service UUID for bracelets
      await bleManager.startDeviceScan(
        ['180F'], // Replace with your bracelet's service UUID
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            setError(error.message);
            setIsScanning(false);
            return;
          }

          if (device && !devices.find(d => d.id === device.id)) {
            setDevices(prev => [...prev, device]);
          }
        }
      );

      // Stop scanning after 10 seconds
      setTimeout(() => {
        bleManager.stopDeviceScan();
        setIsScanning(false);
      }, 10000);
    } catch (error) {
      setError('Failed to start scanning');
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device: Device) => {
    try {
      setSelectedDevice(device);
      setConnectionStatus('connecting');
      setError(null);

      const connectedDevice = await device.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();
      
      setConnectionStatus('connected');
      onConnectionComplete(connectedDevice);
    } catch (error) {
      setError('Failed to connect to device');
      setConnectionStatus('disconnected');
      setSelectedDevice(null);
    }
  };

  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      testID={`device-item-${item.id}`}
      style={[
        styles.deviceItem,
        selectedDevice?.id === item.id && styles.selectedDevice
      ]}
      onPress={() => connectToDevice(item)}
      disabled={connectionStatus === 'connecting'}
    >
      <Text style={styles.deviceName}>
        {item.name || 'Unknown Device'}
      </Text>
      <Text style={styles.deviceId}>
        ID: {item.id}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Connect Bracelet</Text>
        {error && (
          <Text style={styles.error} testID="error-message">{error}</Text>
        )}
      </View>

      <TouchableOpacity
        testID="refresh-button"
        style={styles.scanButton}
        onPress={startScanning}
        disabled={isScanning}
      >
        <Text style={styles.scanButtonText}>
          {isScanning ? 'Scanning...' : 'Scan for Devices'}
        </Text>
      </TouchableOpacity>

      {isScanning && (
        <ActivityIndicator 
          testID="scanning-indicator"
          style={styles.spinner} 
          size="large" 
        />
      )}

      <View style={styles.deviceList} testID="device-list">
        <FlatList
          data={devices}
          renderItem={renderDeviceItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {isScanning ? 'Searching for devices...' : 'No devices found'}
            </Text>
          }
        />
      </View>

      {connectionStatus === 'connecting' && (
        <View style={styles.connectingOverlay}>
          <ActivityIndicator size="large" />
          <Text style={styles.connectingText}>Connecting...</Text>
        </View>
      )}

      {connectionStatus === 'connected' && (
        <View style={styles.connectedStatus} testID="device-status-connected">
          <Text style={styles.connectedText}>Connected!</Text>
          <TouchableOpacity
            testID="disconnect-button"
            style={styles.disconnectButton}
            onPress={() => {
              selectedDevice?.cancelConnection();
              setConnectionStatus('disconnected');
              setSelectedDevice(null);
            }}
          >
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  connectedStatus: {
    alignItems: 'center',
    backgroundColor: '#e8ffe8',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    padding: 16,
  },
  connectedText: {
    color: '#008000',
    fontSize: 16,
    fontWeight: '600',
  },
  connectingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  connectingText: {
    fontSize: 16,
    marginTop: 16,
  },
  container: {
    backgroundColor: '#fff',
    flex: 1,
    padding: 16,
  },
  deviceId: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  deviceItem: {
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    padding: 16,
  },
  deviceList: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 6,
    padding: 8,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: '#666',
    marginTop: 32,
    textAlign: 'center',
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  header: {
    marginBottom: 16,
  },
  scanButton: {
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedDevice: {
    backgroundColor: '#f0f0f0',
  },
  spinner: {
    marginVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
}); 