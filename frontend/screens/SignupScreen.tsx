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
  ScrollView,
  Alert,
  StyleProp,
  TextStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import GradientBackground from '../components/GradientBackground';
import Logo from '../components/Logo';
import { colors, shadows } from '../styles/theme';

type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  VerifyEmail: {
    email: string;
  };
};

type SignupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Signup'>;

interface SignupFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  clubName: string;
  phoneNumber: string;
}

interface ValidationErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  clubName?: string;
  phoneNumber?: string;
}

const SignupScreen: React.FC = () => {
  const navigation = useNavigation<SignupScreenNavigationProp>();
  const [formData, setFormData] = useState<SignupFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    clubName: '',
    phoneNumber: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    if (!formData.username) {
      newErrors.username = 'Username is required';
      isValid = false;
    }

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
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    if (!formData.clubName) {
      newErrors.clubName = 'Club name is required';
      isValid = false;
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fix the errors in the form');
      return;
    }

    try {
      setIsLoading(true);
      // Add signup logic here
      // For now, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navigate to email verification
      navigation.navigate('VerifyEmail', { email: formData.email });
    } catch (error) {
      Alert.alert('Error', 'Signup failed. Please try again.');
      console.error('Signup failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const getInputStyle = (fieldName: keyof SignupFormData): StyleProp<TextStyle> => {
    return [
      styles.input,
      errors[fieldName] ? styles.inputError : null,
    ];
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View 
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Logo 
              size="small" 
              webStyle={styles.webLogo}
              nativeStyle={styles.nativeLogo}
            />
            <Text style={styles.headerText}>Create Your Account</Text>
          </Animated.View>

          <Animated.View 
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <TextInput
              style={getInputStyle('username')}
              placeholder="Username"
              placeholderTextColor={colors.text.secondary}
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
            />
            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}

            <TextInput
              style={getInputStyle('email')}
              placeholder="Email"
              placeholderTextColor={colors.text.secondary}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <TextInput
              style={getInputStyle('password')}
              placeholder="Password"
              placeholderTextColor={colors.text.secondary}
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <TextInput
              style={getInputStyle('confirmPassword')}
              placeholder="Confirm Password"
              placeholderTextColor={colors.text.secondary}
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              secureTextEntry
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

            <TextInput
              style={getInputStyle('clubName')}
              placeholder="Club Name"
              placeholderTextColor={colors.text.secondary}
              value={formData.clubName}
              onChangeText={(text) => setFormData({ ...formData, clubName: text })}
            />
            {errors.clubName && <Text style={styles.errorText}>{errors.clubName}</Text>}

            <TextInput
              style={getInputStyle('phoneNumber')}
              placeholder="Phone Number"
              placeholderTextColor={colors.text.secondary}
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
              keyboardType="phone-pad"
            />
            {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}

            <TouchableOpacity
              style={[styles.signupButton, isLoading && styles.disabledButton]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={handleBack}
              disabled={isLoading}
            >
              <Text style={styles.loginLinkText}>Already have an account? Login</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
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
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    margin: 20,
    padding: 20,
    ...shadows.small,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
  },
  headerText: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 5,
    color: colors.text.primary,
    fontSize: 16,
    marginBottom: 5,
    padding: 15,
  },
  inputError: {
    borderColor: colors.status.error,
    borderWidth: 1,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 12,
  },
  loginLinkText: {
    color: colors.text.secondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  nativeLogo: {
    tintColor: colors.primary.medium,
  },
  signupButton: {
    alignItems: 'center',
    backgroundColor: colors.primary.medium,
    borderRadius: 5,
    marginTop: 10,
    padding: 15,
    ...shadows.small,
  },
  webLogo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
  },
});

export default SignupScreen; 