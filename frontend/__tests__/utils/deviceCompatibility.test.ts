import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import * as Location from 'expo-location';
import { checkDeviceCompatibility, showCompatibilityWarning } from '../../utils/deviceCompatibility';

// Mock the required modules
const mockOsVersion = jest.fn();
jest.mock('expo-device', () => ({
  osVersion: mockOsVersion
}));
jest.mock('react-native-ble-plx');
jest.mock('expo-location');

describe('Device Compatibility Tests', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Device.osVersion
    mockOsVersion.mockResolvedValue('14.0');
    
    // Mock BleManager
    (BleManager as jest.Mock).mockImplementation(() => ({
      state: jest.fn().mockResolvedValue('PoweredOn')
    }));
    
    // Mock Location permissions
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  });

  it('should pass all compatibility checks on a supported iOS device', async () => {
    Platform.OS = 'ios';
    
    const result = await checkDeviceCompatibility();
    
    expect(result.isCompatible).toBe(true);
    expect(result.hasBLE).toBe(true);
    expect(result.hasVibration).toBe(true);
    expect(result.hasLocationServices).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail compatibility check on old iOS version', async () => {
    Platform.OS = 'ios';
    mockOsVersion.mockResolvedValue('12.0');
    
    const result = await checkDeviceCompatibility();
    
    expect(result.isCompatible).toBe(false);
    expect(result.errors).toContain('iOS 13.0 or later is required');
  });

  it('should fail when BLE is not available', async () => {
    (BleManager as jest.Mock).mockImplementation(() => ({
      state: jest.fn().mockResolvedValue('PoweredOff')
    }));
    
    const result = await checkDeviceCompatibility();
    
    expect(result.isCompatible).toBe(false);
    expect(result.hasBLE).toBe(false);
    expect(result.errors).toContain('Bluetooth Low Energy (BLE) is required and must be enabled');
  });

  it('should fail when location services are not granted', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    
    const result = await checkDeviceCompatibility();
    
    expect(result.isCompatible).toBe(false);
    expect(result.hasLocationServices).toBe(false);
    expect(result.errors).toContain('Location services must be enabled for emergency response');
  });

  it('should show alert when device is not compatible', async () => {
    // Mock Alert.alert
    const mockAlert = jest.spyOn(Alert, 'alert');
    Platform.OS = 'ios';
    mockOsVersion.mockResolvedValue('12.0');
    
    await showCompatibilityWarning();
    
    expect(mockAlert).toHaveBeenCalled();
    expect(mockAlert.mock.calls[0][0]).toBe('Device Compatibility Warning');
    expect(mockAlert.mock.calls[0][1]).toContain('iOS 13.0 or later is required');
  });
}); 