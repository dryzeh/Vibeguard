import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, typography, borderRadius, shadows, spacing } from '../styles/theme';

interface StatusCardProps {
  isOnDuty: boolean;
  activeAlerts: number;
  lastLocationUpdate: string;
  style?: StyleProp<ViewStyle>;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  isOnDuty,
  activeAlerts,
  lastLocationUpdate,
  style,
}) => {
  const formattedTime = new Date(lastLocationUpdate).toLocaleTimeString();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isOnDuty ? colors.status.success : colors.status.error }]} />
          <Text style={styles.statusText}>
            {isOnDuty ? 'On Duty' : 'Off Duty'}
          </Text>
        </View>
        <View style={styles.alertsContainer}>
          <Text style={styles.alertsLabel}>Active Alerts</Text>
          <Text style={[styles.alertsCount, { color: activeAlerts > 0 ? colors.status.error : colors.text.secondary }]}>
            {activeAlerts}
          </Text>
        </View>
      </View>

      <View style={styles.locationContainer}>
        <Text style={styles.locationLabel}>Last Location Update</Text>
        <Text style={styles.locationTime}>{formattedTime}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  alertsContainer: {
    alignItems: 'flex-end',
  },
  alertsCount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  alertsLabel: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  container: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.medium,
  },
  locationContainer: {
    borderTopColor: colors.border.default,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  locationLabel: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  locationTime: {
    color: colors.text.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statusContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    marginRight: spacing.xs,
    width: 8,
  },
  statusText: {
    color: colors.text.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
}); 