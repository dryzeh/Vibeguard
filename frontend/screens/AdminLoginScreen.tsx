import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput as RNTextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/Button';
import GradientBackground from '../components/GradientBackground';
import Logo from '../components/Logo';
import { colors, typography, borderRadius, shadows, spacing } from '../styles/theme';
import { api } from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { RootStackParamList } from '../types/navigation';
import { AxiosResponse } from 'axios';

type AdminLoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AdminLogin'>;

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
}

export default function AdminLoginScreen() {
  const navigation = useNavigation<AdminLoginScreenNavigationProp>();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const validateInputs = () => {
    if (!formData.email || !formData.password) {
      showToast('Please fill in all fields', 'error');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      const response: AxiosResponse<LoginResponse> = await api.post('/admin/login', formData);
      if (response.data?.token) {
        await SecureStore.setItemAsync('admin_token', response.data.token);
        navigation.navigate('AdminPanel');
        showToast('Login successful', 'success');
      }
    } catch (error) {
      showToast('Invalid credentials', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Logo 
              size="large" 
              webStyle={styles.webLogo}
              nativeStyle={styles.nativeLogo}
            />
            <Text style={styles.title}>Admin Login</Text>
            <View style={styles.form}>
              <RNTextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.text.secondary}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <RNTextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.text.secondary}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
                autoComplete="password"
              />
              <Button
                title="Login"
                onPress={handleLogin}
                isLoading={isLoading}
                style={styles.loginButton}
              />
              <Button
                title="Back to Login"
                onPress={() => navigation.navigate('Login')}
                variant="outline"
                style={styles.backButton}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginTop: spacing.sm,
  },
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  form: {
    marginTop: spacing.xl,
    maxWidth: 400,
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadows.small,
  },
  loginButton: {
    marginTop: spacing.md,
  },
  nativeLogo: {
    tintColor: colors.primary.medium,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xl,
  },
  webLogo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
  },
}); 