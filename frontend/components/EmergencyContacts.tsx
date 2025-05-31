import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, StyleProp, ViewStyle } from 'react-native';
import { colors, typography, borderRadius, shadows, spacing } from '../styles/theme';

interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  isAvailable: boolean;
}

interface EmergencyContactsProps {
  style?: StyleProp<ViewStyle>;
}

// Mock data for demo
const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'John Smith',
    role: 'Head of Security',
    phone: '+46701234567',
    isAvailable: true,
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    role: 'Medical Response',
    phone: '+46702345678',
    isAvailable: true,
  },
  {
    id: '3',
    name: 'Mike Wilson',
    role: 'Fire Safety Officer',
    phone: '+46703456789',
    isAvailable: false,
  },
];

export const EmergencyContacts: React.FC<EmergencyContactsProps> = ({ style }) => {
  const handleCall = async (phone: string) => {
    try {
      const url = `tel:${phone}`;
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error making phone call:', error);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Emergency Contacts</Text>
      
      {mockContacts.map(contact => (
        <TouchableOpacity
          key={contact.id}
          style={styles.contactCard}
          onPress={() => handleCall(contact.phone)}
          disabled={!contact.isAvailable}
        >
          <View style={styles.contactInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{contact.name}</Text>
              <View style={[styles.statusDot, { backgroundColor: contact.isAvailable ? colors.status.success : colors.status.error }]} />
            </View>
            <Text style={styles.role}>{contact.role}</Text>
            <Text style={[styles.phone, !contact.isAvailable && styles.unavailable]}>
              {contact.phone}
            </Text>
          </View>
          <Text style={styles.callButton}>Call</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  callButton: {
    color: colors.primary.medium,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  contactCard: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.medium,
  },
  name: {
    color: colors.text.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    marginRight: spacing.xs,
  },
  nameContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  phone: {
    color: colors.primary.medium,
    fontSize: typography.sizes.sm,
  },
  role: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.lg,
  },
  unavailable: {
    color: colors.text.disabled,
  },
}); 