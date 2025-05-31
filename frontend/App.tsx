import React, { useEffect, useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { showCompatibilityWarning } from './utils/deviceCompatibility';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import { LanguageProvider } from './contexts/LanguageContext';

// Polyfill for process in web
if (typeof window !== 'undefined' && typeof process === 'undefined') {
  const env = {
    NODE_ENV: 'development',
    EXPO_PUBLIC_API_URL: undefined,
  };
  (window as any).process = {
    env,
    browser: true,
    version: '',
    versions: {},
  };
}

export default function App() {
  const hasShownWarning = useRef(false);

  useEffect(() => {
    // Check device compatibility on app start, but only once
    if (!hasShownWarning.current) {
      showCompatibilityWarning();
      hasShownWarning.current = true;
    }
  }, []);

  return (
    <SafeAreaProvider testID="app-root">
      <StatusBar style="light" />
      <LanguageProvider>
        <AppNavigator />
      </LanguageProvider>
    </SafeAreaProvider>
  );
} 