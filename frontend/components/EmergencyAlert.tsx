import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { colors, typography, borderRadius, shadows, spacing } from '../styles/theme';
import { Button } from './Button';

interface Emergency {
  id: string;
  type: 'medical' | 'security' | 'fire' | 'other';
  location: {
    latitude: number;
    longitude: number;
    description: string;
  };
  status: 'active' | 'responding' | 'resolved';
  timestamp: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface EmergencyAlertProps {
  emergency: Emergency;
  onRespond?: () => void;
  onResolve?: () => void;
  style?: StyleProp<ViewStyle>;
}

const getPriorityColor = (priority: Emergency['priority']) => {
  switch (priority) {
    case 'high':
      return colors.status.error;
    case 'medium':
      return colors.status.warning;
    case 'low':
      return colors.status.info;
  }
};

const getTypeIcon = (type: Emergency['type']) => {
  switch (type) {
    case 'medical':
      return '🏥';
    case 'security':
      return '🛡️';
    case 'fire':
      return '🔥';
    case 'other':
      return '⚠️';
  }
};

export const EmergencyAlert: React.FC<EmergencyAlertProps> = ({
  emergency,
  onRespond,
  onResolve,
  style,
}) => {
  const formattedTime = new Date(emergency.timestamp).toLocaleTimeString();
  const priorityColor = getPriorityColor(emergency.priority);
  const typeIcon = getTypeIcon(emergency.type);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.typeContainer}>
            <Text style={styles.typeIcon}>{typeIcon}</Text>
            <Text style={styles.typeText}>{emergency.type.toUpperCase()}</Text>
          </View>
          <Text style={styles.time}>{formattedTime}</Text>
        </View>

        <Text style={styles.description}>{emergency.description}</Text>
        <Text style={styles.location}>{emergency.location.description}</Text>

        <View style={styles.actions}>
          {emergency.status === 'active' && onRespond && (
            <Button
              title="Respond"
              onPress={onRespond}
              variant="primary"
              style={styles.actionButton}
            />
          )}
          {emergency.status === 'responding' && onResolve && (
            <Button
              title="Resolve"
              onPress={onResolve}
              variant="success"
              style={styles.actionButton}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    minWidth: 100,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadows.medium,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  description: {
    color: colors.text.primary,
    fontSize: typography.sizes.md,
    marginBottom: spacing.xs,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  location: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.md,
  },
  priorityIndicator: {
    width: 4,
  },
  time: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
  },
  typeContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  typeIcon: {
    fontSize: typography.sizes.lg,
    marginRight: spacing.xs,
  },
  typeText: {
    color: colors.text.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
}); 