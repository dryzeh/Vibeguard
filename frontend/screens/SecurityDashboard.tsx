import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/Button';
import GradientBackground from '../components/GradientBackground';
import Logo from '../components/Logo';
import { colors, typography, borderRadius, shadows, spacing } from '../styles/theme';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { RootStackParamList } from '../types/navigation';
import { EmergencyAlert } from '../components/EmergencyAlert';
import { StatusCard } from '../components/StatusCard';
import { LocationMap } from '../components/LocationMap';
import { EmergencyContacts } from '../components/EmergencyContacts';
import { Ionicons } from '@expo/vector-icons';
import { Emergency, SecurityStatus, ApiResponse } from '../types/security';
import { mockApi } from '../services/mockApi';

type SecurityDashboardNavigationProp = StackNavigationProp<RootStackParamList, 'SecurityDashboard'>;

export default function SecurityDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [status, setStatus] = useState<SecurityStatus>({
    isOnDuty: false,
    lastLocationUpdate: new Date().toISOString(),
    activeAlerts: 0,
    respondingTo: null,
  });
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  const navigation = useNavigation<SecurityDashboardNavigationProp>();
  const { showToast } = useToast();
  const { t } = useLanguage();

  // Request permissions and setup notifications
  useEffect(() => {
    const setupPermissions = async () => {
      try {
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        if (locationStatus !== 'granted') {
          showToast('Location permission is required for emergency response', 'error');
          return;
        }

        const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
        if (notificationStatus !== 'granted') {
          showToast('Notification permission is required for alerts', 'error');
          return;
        }

        // Start location updates
        await startLocationUpdates();
      } catch (error) {
        console.error('Error setting up permissions:', error);
        showToast('Failed to setup required permissions', 'error');
      }
    };

    setupPermissions();
  }, []);

  // Start location updates
  const startLocationUpdates = async () => {
    try {
      // For demo purposes, we'll use a fixed location
      const demoLocation: Location.LocationObject = {
        coords: {
          latitude: 59.3293,
          longitude: 18.0686,
          altitude: null,
          accuracy: 5,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };
      setLocation(demoLocation);

      // Simulate location updates every 5 seconds
      setInterval(() => {
        const newLocation = {
          ...demoLocation,
          coords: {
            ...demoLocation.coords,
            latitude: demoLocation.coords.latitude + (Math.random() - 0.5) * 0.0001,
            longitude: demoLocation.coords.longitude + (Math.random() - 0.5) * 0.0001,
          },
          timestamp: Date.now(),
        };
        setLocation(newLocation);
        updateSecurityLocation(newLocation);
      }, 5000);
    } catch (error) {
      console.error('Error starting location updates:', error);
      showToast('Failed to start location tracking', 'error');
    }
  };

  // Update security location
  const updateSecurityLocation = async (newLocation: Location.LocationObject) => {
    try {
      await mockApi.updateLocation(
        newLocation.coords.latitude,
        newLocation.coords.longitude
      );
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  // Load initial data
  const loadDashboardData = useCallback(async () => {
    try {
      const [emergenciesData, statusData] = await Promise.all([
        mockApi.getEmergencies(),
        mockApi.getStatus()
      ]);

      setEmergencies(emergenciesData);
      setStatus(statusData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  // Toggle duty status
  const toggleDutyStatus = async () => {
    try {
      const newStatus = !status.isOnDuty;
      await mockApi.updateDutyStatus(newStatus);
      setStatus(prev => ({ ...prev, isOnDuty: newStatus }));
      showToast(
        newStatus ? 'You are now on duty' : 'You are now off duty',
        'success'
      );
    } catch (error) {
      console.error('Error updating duty status:', error);
      showToast('Failed to update duty status', 'error');
    }
  };

  // Handle emergency response
  const handleEmergencyResponse = async (emergencyId: string) => {
    try {
      await mockApi.respondToEmergency(emergencyId);
      const [emergenciesData, statusData] = await Promise.all([
        mockApi.getEmergencies(),
        mockApi.getStatus()
      ]);
      setEmergencies(emergenciesData);
      setStatus(statusData);
      showToast('Responding to emergency', 'success');
    } catch (error) {
      console.error('Error responding to emergency:', error);
      showToast('Failed to respond to emergency', 'error');
    }
  };

  // Handle emergency resolution
  const handleEmergencyResolve = async (emergencyId: string) => {
    try {
      await mockApi.resolveEmergency(emergencyId);
      const [emergenciesData, statusData] = await Promise.all([
        mockApi.getEmergencies(),
        mockApi.getStatus()
      ]);
      setEmergencies(emergenciesData);
      setStatus(statusData);
      showToast('Emergency resolved', 'success');
    } catch (error) {
      console.error('Error resolving emergency:', error);
      showToast('Failed to resolve emergency', 'error');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('auth_token');
            navigation.navigate('Login');
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <Logo 
            size="large" 
            webStyle={styles.webLogo}
            nativeStyle={styles.nativeLogo}
          />
          <Button 
            title="Loading..." 
            isLoading={true} 
            onPress={() => {}}
          />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text.primary}
          />
        }
      >
        <View style={styles.header}>
          <Logo 
            size="small" 
            webStyle={styles.webLogo}
            nativeStyle={styles.nativeLogo}
          />
          <View style={styles.headerActions}>
            <Button
              title="Floor Map"
              onPress={() => navigation.navigate('FloorMap')}
              variant="outline"
              icon={<Ionicons name="map" size={20} color={colors.primary.medium} />}
              style={styles.floorMapButton}
            />
            <Button
              title={status.isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
              onPress={toggleDutyStatus}
              variant={status.isOnDuty ? 'danger' : 'success'}
              style={styles.dutyButton}
            />
            <Button
              title="Logout"
              onPress={handleLogout}
              variant="outline"
              style={styles.logoutButton}
            />
          </View>
        </View>

        <StatusCard
          isOnDuty={status.isOnDuty}
          activeAlerts={status.activeAlerts}
          lastLocationUpdate={status.lastLocationUpdate}
          style={styles.statusCard}
        />

        {location && (
          <LocationMap
            latitude={location.coords.latitude}
            longitude={location.coords.longitude}
            markers={emergencies.map(emergency => ({
              latitude: emergency.location.latitude,
              longitude: emergency.location.longitude,
              title: emergency.type,
              description: emergency.description,
            }))}
            style={styles.map}
          />
        )}

        <View style={styles.emergenciesSection}>
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Active Emergencies</Text>
          </View>
          {emergencies
            .filter(emergency => emergency.status === 'active')
            .map(emergency => (
              <EmergencyAlert
                key={emergency.id}
                emergency={emergency}
                onRespond={() => handleEmergencyResponse(emergency.id)}
                style={styles.emergencyAlert}
              />
            ))}
        </View>

        <View style={styles.respondingSection}>
          <View style={styles.sectionTitle}>
            <Text style={styles.sectionTitleText}>Currently Responding</Text>
          </View>
          {emergencies
            .filter(emergency => emergency.status === 'responding')
            .map(emergency => (
              <EmergencyAlert
                key={emergency.id}
                emergency={emergency}
                onResolve={() => handleEmergencyResolve(emergency.id)}
                style={styles.emergencyAlert}
              />
            ))}
        </View>

        <EmergencyContacts style={styles.contactsSection} />
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  contactsSection: {
    margin: spacing.xl,
    marginBottom: spacing.xxl,
    marginTop: 0,
  },
  container: {
    flex: 1,
  },
  dutyButton: {
    minWidth: 120,
  },
  emergenciesSection: {
    margin: spacing.xl,
    marginTop: 0,
  },
  emergencyAlert: {
    marginBottom: spacing.md,
  },
  floorMapButton: {
    minWidth: 120,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logoutButton: {
    minWidth: 100,
  },
  map: {
    borderRadius: borderRadius.lg,
    height: 300,
    margin: spacing.xl,
    marginTop: 0,
    overflow: 'hidden',
  },
  nativeLogo: {
    tintColor: colors.primary.medium,
  },
  respondingSection: {
    margin: spacing.xl,
    marginTop: 0,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  sectionTitleText: {
    color: colors.text.primary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  statusCard: {
    margin: spacing.xl,
    marginTop: 0,
  },
  webLogo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
  },
}); 