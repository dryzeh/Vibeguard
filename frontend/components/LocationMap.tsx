import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Map, MapMarker } from './Map';
import { colors, borderRadius, shadows } from '../styles/theme';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
  markers?: MapMarker[];
  onPress?: (event: any) => void;
  style?: StyleProp<ViewStyle>;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  latitude,
  longitude,
  latitudeDelta = 0.01,
  longitudeDelta = 0.01,
  markers = [],
  onPress,
  style,
}) => {
  const mapProps = {
    style: styles.map,
    initialRegion: {
      latitude,
      longitude,
      latitudeDelta,
      longitudeDelta,
    },
    markers,
    onPress,
  };

  return (
    <View style={[styles.container, style]}>
      <Map {...mapProps} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    flex: 1,
    overflow: 'hidden',
    ...shadows.small,
  },
  map: {
    flex: 1,
  },
});

export default LocationMap; 