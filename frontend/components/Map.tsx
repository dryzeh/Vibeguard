import React from 'react';
import { Platform, View, StyleSheet, Text, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Marker as RNMarker, Region } from 'react-native-maps';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';

export interface MapMarker {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
}

interface MapProps {
  initialRegion?: Region;
  markers?: MapMarker[];
  onPress?: (event: any) => void;
  style?: StyleProp<ViewStyle>;
}

// Web-specific map component
const WebMapView: React.FC<MapProps> = ({ markers = [], style }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Map View</Text>
      <Text style={styles.subText}>Map view is not available in web version. Please use the mobile app for full functionality.</Text>
      {markers.length > 0 && (
        <View style={styles.markersContainer}>
          <Text style={styles.sectionTitle}>Location Markers</Text>
          <View style={styles.markersList}>
            {markers.map((marker, index) => (
              <View key={index} style={styles.markerItem}>
                <Text style={styles.markerTitle}>
                  {marker.title || 'Location'}
                </Text>
                <View style={styles.coordinatesContainer}>
                  <Text style={styles.coordinatesLabel}>Coordinates:</Text>
                  <Text style={styles.coordinatesText}>{marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}</Text>
                </View>
                {marker.description && (
                  <Text style={styles.markerDescription}>
                    {marker.description}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};
WebMapView.displayName = 'WebMapView';

// Native map component
let NativeMapView: React.FC<MapProps> | null = null;
let NativeMarker: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    NativeMapView = (props: MapProps) => {
      const MapComponent = Maps.default;
      return <MapComponent {...props} />;
    };
    NativeMarker = Maps.Marker;
  } catch (error) {
    console.warn('Failed to load react-native-maps:', error);
    NativeMapView = (props: MapProps) => (
      <View style={[styles.container, props.style]}>
        <Text style={styles.errorText}>Map component not available.</Text>
      </View>
    );
  }
}

// Create platform-specific components
const MapView = Platform.OS === 'web' ? WebMapView : (NativeMapView || WebMapView);
const MarkerComponent = Platform.OS === 'web' ? () => null : (NativeMarker || (() => null));

interface CustomMarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  description?: string;
}

const CustomMarker = React.forwardRef<any, CustomMarkerProps>((props, ref) => {
  const { coordinate, title, description } = props;
  return (
    <MarkerComponent
      ref={ref}
      coordinate={coordinate}
      title={title}
      description={description}
    />
  );
});
CustomMarker.displayName = 'CustomMarker';

interface CustomCalloutProps {
  title?: string;
  description?: string;
}

const CustomCallout = React.forwardRef<any, CustomCalloutProps>((props, ref) => {
  const { title, description } = props;
  return (
    <View ref={ref} style={styles.markerContainer}>
      <Text style={styles.markerTitle}>{title}</Text>
      <Text style={styles.markerText}>{description}</Text>
    </View>
  );
});
CustomCallout.displayName = 'CustomCallout';

// Export the component with Marker
export const Map = Object.assign(MapView, {
  Marker: MarkerComponent,
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.default,
    borderRadius: borderRadius.md,
    flex: 1,
    overflow: 'hidden',
    ...shadows.small,
  },
  coordinatesContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  coordinatesLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    marginRight: spacing.xs,
  },
  coordinatesText: {
    color: colors.text.primary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
  },
  errorText: {
    color: colors.status.error,
    fontSize: typography.fontSize.md,
    padding: spacing.lg,
    textAlign: 'center',
  },
  markerContainer: {
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    ...shadows.small,
  },
  markerDescription: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  markerItem: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    ...shadows.small,
  },
  markerText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  markerTitle: {
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  markersContainer: {
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  markersList: {
    marginVertical: spacing.sm,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  subText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
});

export default Map; 