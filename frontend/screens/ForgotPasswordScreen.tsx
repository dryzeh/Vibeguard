import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StyleProp,
  TextStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/Button';
import GradientBackground from '../components/GradientBackground';
import Logo from '../components/Logo';
import { colors, typography, borderRadius, shadows, spacing } from '../styles/theme';
import { api } from '../services/api';
import * as Haptics from 'expo-haptics';

type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: {
    email: string;
    token: string;
  };
};

type ForgotPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;

interface ValidationErrors {
  email?: string;
}

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'code' | 'newPassword'>('email');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const handleRequestReset = async () => {
    if (!email.trim()) {
      showToast(t('enterEmail'), 'error');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password/request', { email });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('code');
      showToast(t('resetCodeSent'), 'success');
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(t('resetRequestFailed'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      showToast(t('enterVerificationCode'), 'error');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password/verify', {
        email,
        code: verificationCode,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('newPassword');
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(t('invalidCode'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      showToast(t('enterNewPassword'), 'error');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast(t('passwordsDoNotMatch'), 'error');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password/reset', {
        email,
        code: verificationCode,
        newPassword,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('passwordResetSuccess'), 'success');
      navigation.navigate('Login');
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(t('passwordResetFailed'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      setIsLoading(true);
      try {
        await handleRequestReset();
      } catch (error) {
        console.error('Failed to request password reset:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getInputStyle = (fieldName: keyof ValidationErrors): StyleProp<TextStyle> => {
    return [
      styles.input,
      errors[fieldName] ? styles.inputError : null,
    ];
  };

  const renderEmailStep = () => (
    <View>
      <Text style={styles.label}>{t('emailAddress')}</Text>
      <TextInput
        style={getInputStyle('email')}
        placeholder={t('enterEmailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!isLoading}
        placeholderTextColor={colors.text.muted}
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      <Button
        title={t('sendResetCode')}
        onPress={handleSubmit}
        isLoading={isLoading}
        fullWidth
      />
    </View>
  );

  const renderCodeStep = () => (
    <View>
      <Text style={styles.label}>{t('verificationCode')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('enterCodePlaceholder')}
        value={verificationCode}
        onChangeText={setVerificationCode}
        keyboardType="number-pad"
        maxLength={6}
        editable={!isLoading}
        placeholderTextColor={colors.text.muted}
      />
      <Button
        title={t('verifyCode')}
        onPress={handleVerifyCode}
        isLoading={isLoading}
        fullWidth
      />
    </View>
  );

  const renderNewPasswordStep = () => (
    <View>
      <Text style={styles.label}>{t('newPassword')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('enterNewPassword')}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        editable={!isLoading}
        placeholderTextColor={colors.text.muted}
      />
      <Text style={styles.label}>{t('confirmPassword')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('confirmNewPassword')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!isLoading}
        placeholderTextColor={colors.text.muted}
      />
      <Button
        title={t('resetPassword')}
        onPress={handleResetPassword}
        isLoading={isLoading}
        fullWidth
      />
    </View>
  );

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
              size="small" 
              webStyle={styles.webLogo}
              nativeStyle={styles.nativeLogo}
            />
            <Text style={styles.title}>{t('resetPassword')}</Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? t('resetPasswordInstructions')
                : step === 'code'
                ? t('enterVerificationCodeInstructions')
                : t('enterNewPasswordInstructions')}
            </Text>

            {step === 'email' && renderEmailStep()}
            {step === 'code' && renderCodeStep()}
            {step === 'newPassword' && renderNewPasswordStep()}

            <Button
              title={t('backToLogin')}
              onPress={() => navigation.navigate('Login')}
              variant="outline"
              style={styles.backButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  backButtonText: {
    color: colors.text.secondary,
    fontSize: typography.sizes.md,
    textDecorationLine: 'underline',
  },
  container: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    maxWidth: 400,
    padding: spacing.xl,
    width: '100%',
    ...shadows.medium,
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorText: {
    color: colors.status.error,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.md,
    color: colors.text.primary,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    width: '100%',
  },
  inputError: {
    borderColor: colors.status.error,
    borderWidth: 1,
  },
  label: {
    color: colors.text.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  nativeLogo: {
    tintColor: colors.primary.medium,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.primary.medium,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    width: '100%',
  },
  submitButtonText: {
    color: colors.text.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.sizes.md,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  webLogo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
  },
}); 