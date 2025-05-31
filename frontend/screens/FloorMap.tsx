import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { colors, typography, borderRadius, shadows, spacing, accessibility } from '../styles/theme';
import { Button } from '../components/Button';
import GradientBackground from '../components/GradientBackground';
import { RootStackParamList } from '../types/navigation';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { ColorValue } from 'react-native';

type FloorMapNavigationProp = StackNavigationProp<RootStackParamList, 'FloorMap'>;

// Add type for floor plans
type FloorPlan = {
  name: string;
  path: string;
  viewBox: string;
  rooms: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
  }>;
};

type FloorPlans = {
  [key: string]: FloorPlan;
};

const FLOOR_PLANS: FloorPlans = {
  '1': {
    name: 'Ground Floor',
    // More detailed floor plan for a venue
    path: `
      M0,0 L100,0 L100,100 L0,100 Z
      M10,10 L90,10 L90,90 L10,90 Z
      M20,20 L80,20 L80,80 L20,80 Z
      M30,30 L70,30 L70,70 L30,70 Z
      M40,40 L60,40 L60,60 L40,60 Z
    `,
    viewBox: '0 0 100 100',
    rooms: [
      { id: '1', name: 'Main Entrance', x: 5, y: 50 },
      { id: '2', name: 'Ticket Counter', x: 15, y: 40 },
      { id: '3', name: 'Coat Check', x: 15, y: 60 },
      { id: '4', name: 'Main Bar', x: 30, y: 30 },
      { id: '5', name: 'VIP Bar', x: 30, y: 70 },
      { id: '6', name: 'Dance Floor', x: 50, y: 50 },
      { id: '7', name: 'DJ Booth', x: 40, y: 40 },
      { id: '8', name: 'VIP Section', x: 70, y: 30 },
      { id: '9', name: 'Restrooms', x: 85, y: 40 },
      { id: '10', name: 'Emergency Exit', x: 95, y: 50 },
      { id: '11', name: 'Storage', x: 85, y: 60 },
      { id: '12', name: 'Staff Room', x: 70, y: 70 },
    ],
  },
  '2': {
    name: 'Upper Floor',
    path: `
      M0,0 L100,0 L100,100 L0,100 Z
      M10,10 L90,10 L90,90 L10,90 Z
      M20,20 L80,20 L80,80 L20,80 Z
      M30,30 L70,30 L70,70 L30,70 Z
    `,
    viewBox: '0 0 100 100',
    rooms: [
      { id: '13', name: 'Balcony', x: 50, y: 20 },
      { id: '14', name: 'VIP Lounge', x: 30, y: 40 },
      { id: '15', name: 'Private Bar', x: 70, y: 40 },
      { id: '16', name: 'Storage', x: 50, y: 60 },
      { id: '17', name: 'Office', x: 30, y: 70 },
      { id: '18', name: 'Emergency Exit', x: 70, y: 70 },
    ],
  },
};

interface Emergency {
  id: string;
  type: 'medical' | 'security' | 'fire' | 'other';
  location: {
    floor: string;
    x: number;
    y: number;
    description: string;
  };
  status: 'active' | 'responding' | 'resolved';
  priority: 'high' | 'medium' | 'low';
}

interface SecurityPersonnel {
  id: string;
  name: string;
  location: {
    floor: string;
    x: number;
    y: number;
  };
  status: 'available' | 'responding' | 'off-duty';
}

// Updated mock data with more realistic scenarios
const mockEmergencies: Emergency[] = [
  {
    id: '1',
    type: 'medical',
    location: { floor: '1', x: 45, y: 55, description: 'Medical emergency near dance floor' },
    status: 'active',
    priority: 'high',
  },
  {
    id: '2',
    type: 'security',
    location: { floor: '2', x: 35, y: 45, description: 'Disturbance in VIP lounge' },
    status: 'responding',
    priority: 'medium',
  },
  {
    id: '3',
    type: 'fire',
    location: { floor: '1', x: 85, y: 40, description: 'Smoke detected in restroom area' },
    status: 'active',
    priority: 'high',
  },
  {
    id: '4',
    type: 'other',
    location: { floor: '1', x: 30, y: 30, description: 'Spill at main bar' },
    status: 'active',
    priority: 'low',
  },
];

const mockPersonnel: SecurityPersonnel[] = [
  {
    id: '1',
    name: 'John Smith',
    location: { floor: '1', x: 20, y: 30 },
    status: 'available',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    location: { floor: '2', x: 35, y: 45 },
    status: 'responding',
  },
  {
    id: '3',
    name: 'Mike Wilson',
    location: { floor: '1', x: 70, y: 50 },
    status: 'available',
  },
  {
    id: '4',
    name: 'Emma Davis',
    location: { floor: '1', x: 85, y: 40 },
    status: 'responding',
  },
  {
    id: '5',
    name: 'Alex Brown',
    location: { floor: '2', x: 50, y: 20 },
    status: 'available',
  },
];

export default function FloorMap() {
  const [currentFloor, setCurrentFloor] = useState('1');
  const [selectedEmergency, setSelectedEmergency] = useState<Emergency | null>(null);
  const [scale, setScale] = useState(1);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  
  const navigation = useNavigation<FloorMapNavigationProp>();
  const { width: screenWidth } = Dimensions.get('window');
  const mapSize = screenWidth - spacing.xl * 2;

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setLocation(location);
      }
    })();
  }, []);

  const handleFloorChange = (floor: string) => {
    setCurrentFloor(floor);
    setSelectedEmergency(null);
  };

  const handleEmergencyPress = (emergency: Emergency) => {
    setSelectedEmergency(emergency);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const getEmergencyColor = (priority: Emergency['priority']) => {
    switch (priority) {
      case 'high':
        return colors.status.error;
      case 'medium':
        return colors.status.warning;
      case 'low':
        return colors.status.info;
    }
  };

  const getPersonnelColor = (status: SecurityPersonnel['status']) => {
    switch (status) {
      case 'available':
        return colors.status.success;
      case 'responding':
        return colors.status.warning;
      case 'off-duty':
        return colors.text.disabled;
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityLabel="Go back"
              accessibilityHint="Double tap to return to the previous screen"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color={colors.text.primary}
                accessibilityElementsHidden={true}
                importantForAccessibility="no"
              />
            </TouchableOpacity>
            <Text style={styles.title}>Floor Map</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SecurityDashboard')}
              style={styles.dashboardButton}
              accessibilityLabel="Go to dashboard"
              accessibilityHint="Double tap to navigate to the security dashboard"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name="home" 
                size={24} 
                color={colors.text.primary}
                accessibilityElementsHidden={true}
                importantForAccessibility="no"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.floorSelector}>
            {Object.entries(FLOOR_PLANS).map(([floor, data]) => (
              <Button
                key={floor}
                title={data.name}
                onPress={() => handleFloorChange(floor)}
                variant={currentFloor === floor ? 'primary' : 'outline'}
                size="small"
                style={styles.floorButton}
              />
            ))}
          </View>
        </View>

        <View style={styles.mapContainer}>
          <Svg
            width={mapSize}
            height={mapSize}
            viewBox={FLOOR_PLANS[currentFloor].viewBox}
            style={[styles.map, { transform: [{ scale }] }]}
          >
            {/* Floor plan */}
            <Path
              d={FLOOR_PLANS[currentFloor].path}
              fill={colors.background.surface}
              stroke={colors.border.default as ColorValue}
              strokeWidth="0.5"
            />

            {/* Room labels */}
            {FLOOR_PLANS[currentFloor].rooms.map((room) => (
              <G key={room.id}>
                <Circle
                  cx={room.x}
                  cy={room.y}
                  r="2"
                  fill={colors.primary.medium}
                />
                <SvgText
                  x={room.x + 3}
                  y={room.y}
                  fill={colors.text.primary}
                  fontSize="3"
                >
                  {room.name}
                </SvgText>
              </G>
            ))}

            {/* Security personnel */}
            {mockPersonnel
              .filter(p => p.location.floor === currentFloor)
              .map(personnel => (
                <Circle
                  key={personnel.id}
                  cx={personnel.location.x}
                  cy={personnel.location.y}
                  r="3"
                  fill={getPersonnelColor(personnel.status)}
                  stroke={colors.background.card}
                  strokeWidth="0.5"
                />
              ))}

            {/* Emergencies */}
            {mockEmergencies
              .filter(e => e.location.floor === currentFloor)
              .map(emergency => (
                <TouchableOpacity
                  key={emergency.id}
                  onPress={() => handleEmergencyPress(emergency)}
                >
                  <Circle
                    cx={emergency.location.x}
                    cy={emergency.location.y}
                    r="4"
                    fill={getEmergencyColor(emergency.priority)}
                    stroke={colors.background.card}
                    strokeWidth="0.5"
                  />
                </TouchableOpacity>
              ))}
          </Svg>

          <View style={styles.zoomControls}>
            <Button
              title="+"
              onPress={handleZoomIn}
              variant="outline"
              size="small"
              style={styles.zoomButton}
            />
            <Button
              title="-"
              onPress={handleZoomOut}
              variant="outline"
              size="small"
              style={styles.zoomButton}
            />
          </View>
        </View>

        {selectedEmergency && (
          <View style={styles.emergencyDetails}>
            <Text style={styles.emergencyTitle}>
              {selectedEmergency.type.toUpperCase()} Emergency
            </Text>
            <Text style={styles.emergencyLocation}>
              {selectedEmergency.location.description}
            </Text>
            <Text style={styles.emergencyPriority}>
              Priority: {selectedEmergency.priority}
            </Text>
            <Button
              title="Respond to Emergency"
              onPress={() => {
                // Handle emergency response
                navigation.navigate('SecurityDashboard');
              }}
              variant="primary"
              style={styles.respondButton}
            />
          </View>
        )}

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Circle r="4" fill={colors.status.success} />
            <Text style={styles.legendText}>Available Security</Text>
          </View>
          <View style={styles.legendItem}>
            <Circle r="4" fill={colors.status.warning} />
            <Text style={styles.legendText}>Responding</Text>
          </View>
          <View style={styles.legendItem}>
            <Circle r="4" fill={colors.status.error} />
            <Text style={styles.legendText}>High Priority</Text>
          </View>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    borderRadius: borderRadius.round,
    height: accessibility.minimumTouchableSize,
    justifyContent: 'center',
    width: accessibility.minimumTouchableSize,
  },
  container: {
    flex: 1,
    padding: spacing.xl,
  },
  dashboardButton: {
    alignItems: 'center',
    borderRadius: borderRadius.round,
    height: accessibility.minimumTouchableSize,
    justifyContent: 'center',
    width: accessibility.minimumTouchableSize,
  },
  emergencyDetails: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadows.medium,
  },
  emergencyLocation: {
    color: colors.text.secondary,
    fontSize: typography.sizes.md,
    marginBottom: spacing.xs,
  },
  emergencyPriority: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  emergencyTitle: {
    color: colors.text.primary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
  },
  floorButton: {
    flex: 1,
  },
  floorSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  legend: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    padding: spacing.md,
    ...shadows.medium,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  legendText: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
  },
  map: {
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.md,
  },
  mapContainer: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.medium,
  },
  respondButton: {
    marginTop: spacing.sm,
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  zoomButton: {
    borderRadius: borderRadius.round,
    height: 40,
    padding: 0,
    width: 40,
  },
  zoomControls: {
    bottom: spacing.md,
    gap: spacing.xs,
    position: 'absolute',
    right: spacing.md,
  },
}); 