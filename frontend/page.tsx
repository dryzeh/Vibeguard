'use client';

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from './styles/theme';
import SecurityView from './components/SecurityView';

export default function Page() {
  const [user, setUser] = React.useState<{ id: string; role: string; nightclubId: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isSecurityStaff, setIsSecurityStaff] = React.useState(false);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
          setIsSecurityStaff(userData.role === 'SECURITY');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Please log in to continue</Text>
      </View>
    );
  }

  if (!isSecurityStaff) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Access denied. Security staff only.</Text>
      </View>
    );
  }

  if (!user?.nightclubId || !user?.id) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>User data is incomplete. Please contact support.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SecurityView
        nightclubId={user.nightclubId}
        userId={user.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background.default,
    flex: 1,
    justifyContent: 'center',
  },
  text: {
    color: colors.text.primary,
    fontSize: typography.sizes.lg,
    padding: spacing.md,
    textAlign: 'center',
  },
});
