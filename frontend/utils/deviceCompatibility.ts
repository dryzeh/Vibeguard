import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import * as Location from 'expo-location';

interface DeviceCompatibility {
  isCompatible: boolean;
  hasBLE: boolean;
  hasVibration: boolean;
  hasLocationServices: boolean;
  errors: string[];
}

export const checkDeviceCompatibility = async (): Promise<DeviceCompatibility> => {
  const compatibility: DeviceCompatibility = {
    isCompatible: true,
    hasBLE: false,
    hasVibration: false,
    hasLocationServices: false,
    errors: []
  };

  // Skip native device checks on web platform
  if (Platform.OS === 'web') {
    compatibility.hasVibration = 'vibrate' in navigator;
    compatibility.hasLocationServices = true; // Web browsers handle location permissions differently
    compatibility.hasBLE = false; // BLE not available on web
    compatibility.errors.push('Some features may be limited in web browser');
    return compatibility;
  }

  try {
    // Check OS version
    const osVersionStr = await Device.osVersion;
    const osVersion = osVersionStr ? parseInt(osVersionStr) : 0;
    
    if (Platform.OS === 'ios') {
      if (osVersion < 13) {
        compatibility.errors.push('iOS 13.0 or later is required');
        compatibility.isCompatible = false;
      }
    } else if (Platform.OS === 'android') {
      if (osVersion < 6) {
        compatibility.errors.push('Android 6.0 or later is required');
        compatibility.isCompatible = false;
      }
    }

    // Check BLE support
    const bleManager = new BleManager();
    const bleState = await bleManager.state();
    compatibility.hasBLE = bleState === 'PoweredOn';
    if (!compatibility.hasBLE) {
      compatibility.errors.push('Bluetooth Low Energy (BLE) is required and must be enabled');
      compatibility.isCompatible = false;
    }

    // Check vibration support
    compatibility.hasVibration = true; // React Native has built-in vibration support
    
    // Check location services
    if (Platform.OS === 'ios') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      compatibility.hasLocationServices = status === 'granted';
    } else {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      compatibility.hasLocationServices = status === 'granted';
    }
    
    if (!compatibility.hasLocationServices) {
      compatibility.errors.push('Location services must be enabled for emergency response');
      compatibility.isCompatible = false;
    }

    return compatibility;

  } catch (error) {
    console.error('Error checking device compatibility:', error);
    compatibility.isCompatible = false;
    compatibility.errors.push('Failed to verify device compatibility');
    return compatibility;
  }
};

// Function to show compatibility warning if needed
export const showCompatibilityWarning = async (): Promise<void> => {
  const compatibility = await checkDeviceCompatibility();
  
  if (!compatibility.isCompatible) {
    Alert.alert(
      'Device Compatibility Warning',
      `This device may not be fully compatible with the security system:\n\n${compatibility.errors.join('\n')}`,
      [
        { 
          text: 'Contact Support',
          onPress: () => {
            // Add support contact logic here
          }
        },
        {
          text: 'Continue Anyway',
          style: 'default'
        }
      ]
    );
  }
}; 