import React from 'react';
import { View, StyleSheet, Modal, Text } from 'react-native';
import { Button } from './Button';
import { colors, spacing, borderRadius } from '../styles/theme';

interface EmergencyPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onResolve: () => void;
  alert: {
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
  };
}

export default function EmergencyPanel({
  isVisible,
  onClose,
  onResolve,
  alert,
}: EmergencyPanelProps) {
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Emergency Alert</Text>
            <Text style={styles.subtitle}>{alert.location}</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>{alert.timestamp}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[styles.infoValue, styles.statusText]}>
                {alert.status}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Device Information</Text>
            <View style={styles.details}>
              <Text style={styles.detailLabel}>Device ID:</Text>
              <Text style={styles.detailValue}>{alert.deviceId}</Text>
              <Text style={styles.detailLabel}>Battery Level:</Text>
              <Text style={styles.detailValue}>
                {alert.batteryLevel}
                <Text>%</Text>
              </Text>
              <Text style={styles.detailLabel}>Signal Strength:</Text>
              <Text style={styles.detailValue}>{alert.signalStrength}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Details</Text>
            <View style={styles.details}>
              <Text style={styles.detailLabel}>Zone:</Text>
              <Text style={styles.detailValue}>{alert.zone}</Text>
              <Text style={styles.detailLabel}>Floor Plan:</Text>
              <Text style={styles.detailValue}>{alert.floorPlan}</Text>
              <Text style={styles.detailLabel}>Current Occupancy:</Text>
              <Text style={styles.detailValue}>
                {alert.currentOccupancy}
                <Text>/</Text>
                {alert.maxOccupancy}
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Resolve Emergency"
              onPress={onResolve}
              variant="primary"
              style={styles.resolveButton}
            />
            <Button
              title="Close"
              onPress={onClose}
              variant="secondary"
              style={styles.closeButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backgroundSvg: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
  closeButton: {
    backgroundColor: colors.background.surface,
  },
  detailLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  detailValue: {
    color: colors.text.primary,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  details: {
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  infoItem: {
    flex: 1,
    padding: spacing.sm,
  },
  infoLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  infoValue: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '600',
  },
  modalContent: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    maxHeight: '90%',
    maxWidth: 500,
    padding: spacing.xl,
    width: '90%',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  resolveButton: {
    marginRight: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  statusText: {
    color: colors.status.warning,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 16,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
}); 