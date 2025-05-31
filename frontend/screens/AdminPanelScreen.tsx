import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/Button';
import TextInput from '../components/TextInput';
import GradientBackground from '../components/GradientBackground';
import { colors, typography, borderRadius, shadows, spacing } from '../styles/theme';
import { api } from '../services/api';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { RootStackParamList } from '../types/navigation';
import { ApiResponse } from '../services/api';
import { AppConfig } from '../types/config';

type AdminPanelScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AdminPanel'>;

const initialConfig: AppConfig = {
  appName: '',
  primaryColor: '',
  secondaryColor: '',
  logo: '',
  welcomeMessage: '',
  supportEmail: '',
  privacyPolicyUrl: '',
  termsOfServiceUrl: '',
};

export default function AdminPanelScreen() {
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const navigation = useNavigation<AdminPanelScreenNavigationProp>();
  const { showToast } = useToast();

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const adminToken = await SecureStore.getItemAsync('admin_token');
      if (!adminToken) {
        navigation.navigate('AdminLogin');
        return;
      }

      const response = await api.get<ApiResponse<AppConfig>>('/admin/config', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setConfig(response.data);
    } catch (error) {
      showToast('Failed to load configuration', 'error');
      navigation.navigate('AdminLogin');
    } finally {
      setIsLoading(false);
    }
  }, [navigation, showToast]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('admin_token');
            navigation.navigate('AdminLogin');
          }
        }
      ]
    );
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showToast('Sorry, we need camera roll permissions to update the logo', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setConfig(prev => ({ ...prev, logo: `data:image/png;base64,${base64}` }));
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const adminToken = await SecureStore.getItemAsync('admin_token');
      await api.put('/admin/config', config, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      showToast('Configuration saved successfully', 'success');
    } catch (error) {
      showToast('Failed to save configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetConfig = async () => {
    setIsSaving(true);
    try {
      const adminToken = await SecureStore.getItemAsync('admin_token');
      await api.post('/admin/config/reset', {}, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      await loadConfig();
      showToast('Configuration reset to defaults', 'success');
    } catch (error) {
      showToast('Failed to reset configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset Configuration',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset',
          style: 'destructive',
          onPress: handleResetConfig
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <Button 
            title="Loading..." 
            isLoading={true} 
            onPress={() => {}} 
          />
        </View>
      </GradientBackground>
    );
  }

  const renderConfigField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    props: Record<string, unknown> = {}
  ) => (
    <TextInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      {...props}
    />
  );

  return (
    <GradientBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutButton}
          />
        </View>

        <View style={styles.section}>
          {renderConfigField(
            'App Name',
            config.appName,
            (text) => setConfig(prev => ({ ...prev, appName: text })),
            { placeholder: 'Enter app name' }
          )}

          {renderConfigField(
            'Primary Color',
            config.primaryColor,
            (text) => setConfig(prev => ({ ...prev, primaryColor: text })),
            { placeholder: 'Enter primary color (hex)' }
          )}

          {renderConfigField(
            'Secondary Color',
            config.secondaryColor,
            (text) => setConfig(prev => ({ ...prev, secondaryColor: text })),
            { placeholder: 'Enter secondary color (hex)' }
          )}

          <View style={styles.logoSection}>
            {config.logo ? (
              <Image
                source={{ uri: config.logo }}
                style={styles.logoPreview}
                resizeMode="contain"
              />
            ) : null}
            <Button
              title="Change Logo"
              onPress={handleImagePick}
              variant="secondary"
              style={styles.logoButton}
            />
          </View>

          {renderConfigField(
            'Welcome Message',
            config.welcomeMessage,
            (text) => setConfig(prev => ({ ...prev, welcomeMessage: text })),
            { placeholder: 'Enter welcome message', multiline: true }
          )}

          {renderConfigField(
            'Support Email',
            config.supportEmail,
            (text) => setConfig(prev => ({ ...prev, supportEmail: text })),
            { placeholder: 'Enter support email', keyboardType: 'email-address' }
          )}

          {renderConfigField(
            'Privacy Policy URL',
            config.privacyPolicyUrl,
            (text) => setConfig(prev => ({ ...prev, privacyPolicyUrl: text })),
            { placeholder: 'Enter privacy policy URL', keyboardType: 'url' }
          )}

          {renderConfigField(
            'Terms of Service URL',
            config.termsOfServiceUrl,
            (text) => setConfig(prev => ({ ...prev, termsOfServiceUrl: text })),
            { placeholder: 'Enter terms of service URL', keyboardType: 'url' }
          )}
        </View>

        <View style={styles.footer}>
          <Button
            title="Save Changes"
            onPress={handleSaveConfig}
            isLoading={isSaving}
            fullWidth
            style={styles.saveButton}
          />
          <Button
            title="Reset to Defaults"
            onPress={confirmReset}
            variant="danger"
            fullWidth
            style={styles.resetButton}
          />
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  footer: {
    marginTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoButton: {
    minWidth: 150,
  },
  logoPreview: {
    backgroundColor: colors.background.surface,
    borderRadius: borderRadius.md,
    height: 100,
    marginBottom: spacing.md,
    width: 100,
  },
  logoSection: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  logoutButton: {
    minWidth: 100,
  },
  resetButton: {
    marginTop: spacing.md,
  },
  saveButton: {
    marginBottom: spacing.md,
  },
  section: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.medium,
  },
}); 