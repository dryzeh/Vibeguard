import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Linking,
  ActivityIndicator,
  Alert,
  StyleProp,
  TextStyle,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import GradientBackground from '../components/GradientBackground';
import Logo from '../components/Logo';
import { colors, shadows, borderRadius, spacing, accessibility } from '../styles/theme';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { mockApi } from '../services/mockApi';

const { height } = Dimensions.get('window');

type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  SecurityDashboard: undefined;
  ForgotPassword: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface LoginFormData {
  email: string;
  password: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showLogin, setShowLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  // Animation values
  const splashFadeAnim = new Animated.Value(0); // Hide splash
  const loginFadeAnim = new Animated.Value(1); // Show login form
  const logoScaleAnim = new Animated.Value(0.8); // Shrink logo
  const logoPositionAnim = new Animated.Value(-height * 0.15); // Move logo up
  const formSlideAnim = new Animated.Value(0); // No slide

  // useEffect(() => {
  //   // Start with splash screen for 2 seconds
  //   setTimeout(() => {
  //     // Animate the transition
  //     Animated.parallel([
  //       // Fade out splash screen
  //       Animated.timing(splashFadeAnim, {
  //         toValue: 0,
  //         duration: 800,
  //         useNativeDriver: true,
  //       }),
  //       // Fade in login form
  //       Animated.timing(loginFadeAnim, {
  //         toValue: 1,
  //         duration: 800,
  //         useNativeDriver: true,
  //       }),
  //       // Scale down and move logo
  //       Animated.timing(logoScaleAnim, {
  //         toValue: 0.8,
  //         duration: 800,
  //         useNativeDriver: true,
  //       }),
  //       // Move logo up
  //       Animated.timing(logoPositionAnim, {
  //         toValue: -height * 0.15,
  //         duration: 800,
  //         useNativeDriver: true,
  //       }),
  //       // Slide up form
  //       Animated.spring(formSlideAnim, {
  //         toValue: 0,
  //         tension: 50,
  //         friction: 7,
  //         useNativeDriver: true,
  //       })
  //     ]).start(() => {
  //       setShowLogin(true);
  //     });
  //   }, 2000);
  // }, []);

  useEffect(() => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    if (!formData.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    setIsFormValid(isValid);
  }, [formData]);

  const handleLogin = async () => {
    if (validateForm()) {
      try {
        setIsLoading(true);
        // Call mock API for login
        const result = await mockApi.login({
          email: formData.email,
          password: formData.password,
        });
        if (result && result.user) {
          navigation.navigate('SecurityDashboard');
        } else {
          Alert.alert(
            t('loginFailed'),
            t('checkCredentials'),
            [{ text: t('ok') }]
          );
        }
      } catch (error) {
        Alert.alert(
          t('loginFailed'),
          t('checkCredentials'),
          [{ text: t('ok') }]
        );
        console.error('Login failed:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  const handleForgotPassword = () => {
    Alert.alert(
      t('resetPassword'),
      t('contactSupport'),
      [{ text: t('ok') }]
    );
  };

  const handleLogoPress = async () => {
    const url = 'https://vibeguard.se';
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        t('websiteError'),
        t('websiteErrorMessage'),
        [{ text: t('ok') }]
      );
    }
  };

  const getInputStyle = (fieldName: keyof LoginFormData): StyleProp<TextStyle> => {
    return [
      styles.input,
      errors[fieldName] ? styles.inputError : null,
    ];
  };

  const validateForm = (): boolean => {
    return isFormValid;
  };

  const handleInputFocus = (field: keyof LoginFormData) => {
    // Focus handling is platform-specific and not critical for functionality
    // The input will still be editable and selectable on all platforms
    if (Platform.OS === 'web') {
      // For web, we can use testID for better accessibility
      const input = document.querySelector(`[data-testid="${field}-input"]`) as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }
    // On native platforms, the TextInput will handle focus automatically
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        pointerEvents="box-none"
      >
        <View style={styles.container} pointerEvents="box-none">
          <View style={styles.header} pointerEvents="box-none">
            <Pressable 
              style={styles.headerLogo} 
              onPress={handleLogoPress}
              android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
              hitSlop={10}
            >
              <Logo 
                size="small" 
                webStyle={styles.webLogo}
                nativeStyle={styles.nativeLogo}
              />
              <Text style={styles.websiteLinkSmall}>vibeguard.se</Text>
            </Pressable>
            <LanguageSelector />
          </View>

          <View style={styles.formContent} pointerEvents="box-none">
            <Text style={styles.welcomeText}>{t('welcomeBack')}</Text>
            <Text style={styles.subtitle}>{t('loginToDashboard')}</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('businessEmail')}</Text>
              <Pressable onPress={() => handleInputFocus('email')}>
                <TextInput
                  testID="email-input"
                  style={[getInputStyle('email'), styles.input]}
                  placeholder={t('enterBusinessEmail')}
                  placeholderTextColor={colors.text.secondary}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  accessibilityLabel={t('businessEmail')}
                  editable={true}
                  selectTextOnFocus={true}
                />
              </Pressable>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('password')}</Text>
              <View style={styles.passwordContainer}>
                <Pressable onPress={() => handleInputFocus('password')}>
                  <TextInput
                    testID="password-input"
                    style={[getInputStyle('password'), styles.passwordInput, styles.input]}
                    placeholder={t('enterPassword')}
                    placeholderTextColor={colors.text.secondary}
                    value={formData.password}
                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    textContentType="password"
                    accessibilityLabel={t('password')}
                    editable={true}
                    selectTextOnFocus={true}
                  />
                </Pressable>
                <Pressable 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityLabel={showPassword ? t('hidePassword') : t('showPassword')}
                  hitSlop={10}
                >
                  <Text style={styles.eyeIconText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </Pressable>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <Pressable
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
              accessibilityLabel={t('forgotPassword')}
              hitSlop={10}
            >
              <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                (isLoading || !isFormValid) && styles.disabledButton,
                pressed && styles.pressedButton,
              ]}
              onPress={handleLogin}
              disabled={isLoading || !isFormValid}
              accessibilityLabel={t('loginButton')}
              accessibilityHint={isFormValid ? t('loginButtonHint') : t('loginButtonDisabledHint')}
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading || !isFormValid, busy: isLoading }}
              accessibilityActions={[
                { name: 'activate', label: t('loginButton') }
              ]}
              onAccessibilityAction={({ nativeEvent: { actionName } }) => {
                if (actionName === 'activate' && !isLoading && isFormValid) {
                  handleLogin();
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isLoading ? (
                <ActivityIndicator 
                  color={colors.text.primary}
                  accessibilityElementsHidden={true}
                  importantForAccessibility="no"
                />
              ) : (
                <Text style={styles.buttonText}>{t('loginButton')}</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.signupLink}
              onPress={handleSignup}
              disabled={isLoading}
              accessibilityLabel={t('newToVibeGuard')}
              accessibilityHint={t('signupHint')}
              accessibilityRole="link"
              accessibilityState={{ disabled: isLoading }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.signupText}>{t('newToVibeGuard')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  buttonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorText: {
    color: colors.status.error,
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
  eyeIcon: {
    cursor: Platform.OS === 'web' ? 'pointer' : 'default',
    padding: 5,
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  eyeIconText: {
    fontSize: 20,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    cursor: Platform.OS === 'web' ? 'pointer' : 'default',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: colors.text.secondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  formContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 25,
    ...shadows.medium,
    zIndex: 2,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  headerLogo: {
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 2,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    color: colors.text.primary,
    cursor: Platform.OS === 'web' ? 'text' : 'default',
    fontSize: 16,
    minHeight: 50,
    padding: 15,
    ...shadows.small,
  },
  inputContainer: {
    marginBottom: 20,
    zIndex: 2,
  },
  inputError: {
    borderColor: colors.status.error,
    borderWidth: 1,
  },
  inputLabel: {
    color: colors.text.primary,
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loginButton: {
    alignItems: 'center',
    backgroundColor: colors.primary.medium,
    borderRadius: borderRadius.md,
    cursor: Platform.OS === 'web' ? 'pointer' : 'default',
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: accessibility.minimumTouchableSize * 1.2,
    minWidth: accessibility.minimumTouchableSize * 2.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.small,
  },
  nativeLogo: {
    tintColor: colors.primary.medium,
  },
  passwordContainer: {
    position: 'relative',
    zIndex: 2,
  },
  passwordInput: {
    paddingRight: 50,
  },
  pressedButton: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  signupLink: {
    alignItems: 'center',
    cursor: Platform.OS === 'web' ? 'pointer' : 'default',
    marginTop: spacing.lg,
    minHeight: accessibility.minimumTouchableSize,
    minWidth: accessibility.minimumTouchableSize * 2,
    padding: spacing.sm,
  },
  signupText: {
    color: colors.text.secondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 16,
    marginBottom: 25,
    textAlign: 'center',
  },
  webLogo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
  },
  websiteLink: {
    color: colors.text.primary,
    fontSize: 18,
    marginTop: 10,
    opacity: 0.9,
    textDecorationLine: 'underline',
  },
  websiteLinkSmall: {
    color: colors.text.primary,
    fontSize: 14,
    marginTop: 5,
    opacity: 0.9,
    textDecorationLine: 'underline',
  },
  welcomeText: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
}); 