import React, { useEffect, useState } from 'react';
import { Alert, FloorPlan, Zone } from '../types';
import { View, StyleSheet, Text, Dimensions, Image } from 'react-native';
import Svg, { Image as SvgImage, Path, Circle, Text as SvgText } from 'react-native-svg';
import { colors, spacing } from '../styles/theme';

interface FloorPlanViewProps {
  floorPlan: FloorPlan;
  activeAlerts: Alert[];
  onAlertSelect: (alert: Alert) => void;
}

export default function FloorPlanView({ floorPlan, activeAlerts, onAlertSelect }: FloorPlanViewProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Get image dimensions on load
  useEffect(() => {
    Image.getSize(
      floorPlan.imageUrl,
      (width: number, height: number) => {
        setImageSize({ width, height });
      },
      (error: Error) => {
        console.error('Error loading floor plan image:', error);
      }
    );
  }, [floorPlan.imageUrl]);

  // Calculate scale to fit the view
  const getScale = () => {
    if (imageSize.width === 0 || imageSize.height === 0) return 1;
    const scaleX = dimensions.width / imageSize.width;
    const scaleY = dimensions.height / imageSize.height;
    return Math.min(scaleX, scaleY);
  };

  // Get zone color based on occupancy
  const getZoneColor = (occupancyPercentage: number) => {
    if (occupancyPercentage >= 0.9) return colors.status.error;
    if (occupancyPercentage >= 0.7) return colors.status.warning;
    return colors.status.success;
  };

  // Get alert color based on type
  const getAlertColor = (alert: Alert) => {
    switch (alert.type) {
      case 'EMERGENCY':
        return colors.status.error;
      case 'BATTERY_LOW':
        return colors.status.warning;
      case 'SIGNAL_LOSS':
        return colors.text.disabled;
      default:
        return colors.text.primary;
    }
  };

  // Calculate zone center point
  const getZoneCenter = (coordinates: { x: number; y: number }[]) => {
    const x = coordinates.reduce((sum, point) => sum + point.x, 0) / coordinates.length;
    const y = coordinates.reduce((sum, point) => sum + point.y, 0) / coordinates.length;
    return { x, y };
  };

  return (
    <View 
      style={styles.container}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setDimensions({ width, height });
      }}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>Active Alerts: {activeAlerts.length}</Text>
      </View>
      
      <Svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
      >
        {/* Floor plan image */}
        <SvgImage
          href={{ uri: floorPlan.imageUrl }}
          width={imageSize.width}
          height={imageSize.height}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Zones */}
        {floorPlan.zones.map(zone => {
          const coordinates = zone.coordinates;
          const pathData = coordinates
            .map((point, index) => 
              `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`
            )
            .join(' ') + 'Z';

          const occupancyPercentage = (zone.currentOccupancy || 0) / zone.capacity;
          const center = getZoneCenter(coordinates);

          return (
            <React.Fragment key={zone.id}>
              <Path
                d={pathData}
                fill={getZoneColor(occupancyPercentage)}
                fillOpacity={0.2}
                stroke={colors.text.secondary}
                strokeWidth={2}
              />
              <SvgText
                x={center.x}
                y={center.y}
                fill={colors.text.primary}
                fontSize={14}
                textAnchor="middle"
              >
                {zone.name}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Active alerts */}
        {activeAlerts.map(alert => {
          const center = getZoneCenter(alert.zone.coordinates);
          return (
            <React.Fragment key={alert.id}>
              <Circle
                cx={center.x}
                cy={center.y}
                r={15}
                fill={getAlertColor(alert)}
                onPress={() => onAlertSelect(alert)}
              />
              {alert.status === 'ACTIVE' && (
                <Circle
                  cx={center.x}
                  cy={center.y}
                  r={20}
                  stroke={getAlertColor(alert)}
                  strokeWidth={2}
                  fill="none"
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    flexDirection: 'row',
    left: 0,
    padding: spacing.sm,
    position: 'absolute',
    top: 0,
    zIndex: 1,
  },
  headerText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: spacing.sm,
  },
}); 