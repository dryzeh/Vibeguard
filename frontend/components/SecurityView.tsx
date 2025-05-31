import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket, WebSocketMessage } from '../hooks/useWebSocket';
import FloorPlanView from './FloorPlanView';
import EmergencyPanel from './EmergencyPanel';
import { Alert, FloorPlan, AlertType, AlertStatus, Bracelet } from '../types';
import { playEmergencyAlert } from '../utils/notifications';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '../styles/theme';
import { API_URL } from '../config';

interface SecurityViewProps {
  nightclubId: string;
  userId: string;
}

interface Zone {
  id: string;
  floorPlanId: string;
  name: string;
  floorPlan?: {
    id: string;
    name: string;
  };
  currentOccupancy?: number;
  capacity: number;
}

interface SecurityAlert {
  id: string;
  zone: Zone;
  status: 'active' | 'resolved';
  createdAt: string;
  bracelet: Bracelet;
}

interface StaffLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface LocationUpdateData {
  staffId: string;
  location: StaffLocation;
}

interface EmergencyPanelAlert {
  id: string;
  location: string;
  timestamp: string;
  status: string;
  deviceId: string;
  batteryLevel: number;
  signalStrength: number;
  zone: string;
  floorPlan: string;
  currentOccupancy: number;
  maxOccupancy: number;
}

interface AlertResolvedData {
  alertId: string;
}

type SecurityMessage = 
  | { type: 'LOCATION_UPDATE'; data: LocationUpdateData }
  | { type: 'EMERGENCY_ALERT'; data: Alert }
  | { type: 'ALERT_RESOLVED'; data: AlertResolvedData };

const convertToEmergencyPanelAlert = (alert: Alert): EmergencyPanelAlert => ({
  id: alert.id,
  location: alert.zone.name,
  timestamp: alert.createdAt,
  status: alert.status,
  deviceId: alert.bracelet.deviceId,
  batteryLevel: alert.bracelet.batteryLevel || 0,
  signalStrength: alert.bracelet.metadata?.signalStrength || 0,
  zone: alert.zone.name,
  floorPlan: alert.zone.floorPlan.name,
  currentOccupancy: alert.zone.currentOccupancy || 0,
  maxOccupancy: alert.zone.capacity
});

const SecurityView: React.FC<SecurityViewProps> = ({ nightclubId, userId }) => {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [currentFloorPlan, setCurrentFloorPlan] = useState<FloorPlan | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<Record<string, Alert>>({});
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasEmergency, setHasEmergency] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [staffLocations, setStaffLocations] = useState<Record<string, StaffLocation>>({});

  // Handle location updates
  const handleLocationUpdate = useCallback((data: LocationUpdateData) => {
    setStaffLocations(prevLocations => ({
      ...prevLocations,
      [data.staffId]: data.location
    }));
  }, []);

  // Handle emergency alerts
  const handleEmergencyAlert = useCallback((data: Alert) => {
    setActiveAlerts(prevAlerts => ({
      ...prevAlerts,
      [data.id]: data
    }));
  }, []);

  // Handle resolved alerts
  const handleAlertResolved = useCallback((data: AlertResolvedData) => {
    setActiveAlerts(prevAlerts => {
      const newAlerts = { ...prevAlerts };
      delete newAlerts[data.alertId];
      return newAlerts;
    });
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    const securityMessage = message as unknown as SecurityMessage;
    switch (securityMessage.type) {
      case 'LOCATION_UPDATE':
        handleLocationUpdate(securityMessage.data);
        break;
      case 'EMERGENCY_ALERT':
        handleEmergencyAlert(securityMessage.data);
        break;
      case 'ALERT_RESOLVED':
        handleAlertResolved(securityMessage.data);
        break;
    }
  }, [handleLocationUpdate, handleEmergencyAlert, handleAlertResolved]);

  const { sendMessage, isConnected, error: wsError, reconnect } = useWebSocket(
    `${API_URL.replace('http', 'ws')}/security`,
    {
      onMessage: handleWebSocketMessage,
      reconnectAttempts: 5,
      reconnectInterval: 1000,
    }
  );

  // Switch floor plan
  const handleFloorPlanSwitch = useCallback((floorPlanId: string) => {
    setCurrentFloorPlan(current => {
      const newFloorPlan = floorPlans.find(fp => fp.id === floorPlanId);
      return newFloorPlan || current;
    });
  }, [floorPlans]);

  // Handle emergency resolution
  const handleResolveEmergency = useCallback(async (alert: Alert) => {
    try {
      const response = await fetch(`${API_URL}/alerts/${alert.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          responderId: userId,
          resolutionDetails: {
            resolvedAt: new Date().toISOString(),
            resolvedBy: userId,
            resolutionType: 'MANUAL_RESOLVE'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to resolve emergency');
      }

      // Notify WebSocket about resolution
      sendMessage({
        type: 'ALERT_RESOLVED',
        data: { alertId: alert.id }
      });
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to resolve emergency'));
      console.error('Error resolving emergency:', error);
      throw error;
    }
  }, [userId, sendMessage]);

  // Fetch floor plans on component mount
  useEffect(() => {
    const fetchFloorPlans = async () => {
      try {
        const response = await fetch(`${API_URL}/nightclubs/${nightclubId}/floorplans`);
        if (!response.ok) {
          throw new Error('Failed to fetch floor plans');
        }
        
        const data = await response.json();
        setFloorPlans(data);
        setCurrentFloorPlan(data[0]); // Set first floor plan as default
        setHasEmergency(data.some((fp: FloorPlan) => 
          fp.zones.some(zone => 
            zone.alerts.some(alert => 
              alert.type === AlertType.EMERGENCY && 
              alert.status === AlertStatus.ACTIVE
            )
          )
        ));
        setError(null);
      } catch (error) {
        setError(error instanceof Error ? error : new Error('Failed to fetch floor plans'));
        console.error('Error fetching floor plans:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFloorPlans();
  }, [nightclubId]);

  useEffect(() => {
    if (wsError) {
      setError(wsError);
    }
  }, [wsError]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Floor Plans</Text>
        {!isConnected && (
          <View style={styles.connectionStatus}>
            <Text style={styles.connectionStatusText}>Reconnecting...</Text>
          </View>
        )}
        {hasEmergency && (
          <View style={styles.emergencyBadge}>
            <Text style={styles.emergencyText}>!</Text>
          </View>
        )}
      </View>
      <View style={styles.contentContainer}>
        {/* Floor plan navigation */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Floor Plans</Text>
          <ScrollView style={styles.floorPlanList}>
            {floorPlans.map(floorPlan => (
              <TouchableOpacity
                key={floorPlan.id}
                style={[
                  styles.floorPlanButton,
                  currentFloorPlan?.id === floorPlan.id && styles.floorPlanButtonActive
                ]}
                onPress={() => handleFloorPlanSwitch(floorPlan.id)}
              >
                <Text style={[
                  styles.floorPlanButtonText,
                  currentFloorPlan?.id === floorPlan.id && styles.floorPlanButtonTextActive
                ]}>
                  {floorPlan.name}
                </Text>
                {Object.values(activeAlerts).some((alert: Alert) => alert.zone.floorPlanId === floorPlan.id) && (
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>!</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Main content area */}
        <View style={styles.mainContent}>
          {/* Current floor plan view */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary.medium} />
              <Text style={styles.loadingText}>Loading floor plans...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error?.message || wsError?.message || 'An error occurred'}</Text>
              {wsError && (
                <TouchableOpacity style={styles.retryButton} onPress={reconnect}>
                  <Text style={styles.retryButtonText}>Reconnect</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : currentFloorPlan ? (
            <>
              <FloorPlanView
                floorPlan={currentFloorPlan}
                activeAlerts={Object.values(activeAlerts).filter(alert => 
                  alert.zone.floorPlanId === currentFloorPlan.id
                )}
                onAlertSelect={setSelectedAlert}
              />
              {selectedAlert && (
                <EmergencyPanel
                  isVisible={true}
                  alert={convertToEmergencyPanelAlert(selectedAlert)}
                  onClose={() => setSelectedAlert(null)}
                  onResolve={() => {
                    handleResolveEmergency(selectedAlert);
                    setSelectedAlert(null);
                  }}
                />
              )}
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  alertBadge: {
    alignItems: 'center',
    backgroundColor: colors.status.error,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  alertBadgeText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  connectionStatus: {
    backgroundColor: colors.status.warning,
    borderRadius: spacing.xs,
    padding: spacing.xs,
  },
  connectionStatusText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  container: {
    backgroundColor: colors.background.default,
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  emergencyBadge: {
    alignItems: 'center',
    backgroundColor: colors.status.error,
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  emergencyText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  errorContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  errorText: {
    color: colors.status.error,
    fontSize: 16,
    textAlign: 'center',
  },
  floorPlanButton: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    padding: spacing.sm,
  },
  floorPlanButtonActive: {
    backgroundColor: colors.primary.medium,
  },
  floorPlanButtonText: {
    color: colors.text.primary,
    fontSize: typography.sizes.md,
  },
  floorPlanButtonTextActive: {
    color: colors.white,
  },
  floorPlanList: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerText: {
    color: colors.text.primary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text.primary,
    fontSize: 16,
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
  },
  retryButton: {
    backgroundColor: colors.primary.medium,
    borderRadius: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  sidebar: {
    backgroundColor: colors.background.surface,
    padding: spacing.md,
    width: 250,
  },
  sidebarTitle: {
    color: colors.text.primary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
});

export default SecurityView; 