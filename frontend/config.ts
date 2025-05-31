// API Configuration
const isDevelopment = (() => {
  if (typeof window !== 'undefined') {
    // Web platform
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
  }
  // Native platform (Expo on phone)
  return typeof __DEV__ !== 'undefined' ? __DEV__ : false;
})();

// Get local IP address for development (demo on phone via Expo)
const getLocalIpAddress = () => {
  // For demo on phone, use your computer's local network IP (e.g. 10.0.0.8)
  return '10.0.0.8'; // Demo: use your actual local network IP
};
export const API_URL = "http://192.168.1.10:3001";
  ? `http://${getLocalIpAddress()}:3001`  // Demo: use local network IP (e.g. 10.0.0.8) for Expo on phone
  : 'https://api.vibeguard.se';

// Auth Configuration
export const AUTH_CONFIG = {
  tokenExpiryBuffer: 300, // 5 minutes in seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

// App Configuration
export const APP_CONFIG = {
  version: '1.0.0',
  buildNumber: '1',
  minPasswordLength: 8,
  maxPasswordLength: 128,
  sessionTimeout: 3600, // 1 hour in seconds
  apiTimeout: 5000, // 5 seconds for faster feedback
};

// Feature Flags
export const FEATURES = {
  biometricAuth: true,
  emailVerification: true,
  passwordReset: true,
  rememberMe: true,
  analytics: true,
  crash_reporting: true,
};

// Analytics Configuration
export const ANALYTICS_CONFIG = {
  enabled: true,
  sampleRate: 100, // percentage
  errorSampleRate: 100, // percentage
};

// Cache Configuration
export const CACHE_CONFIG = {
  maxAge: 3600, // 1 hour in seconds
  maxSize: 50 * 1024 * 1024, // 50MB
  version: '1',
};

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  enabled: true,
  defaultChannel: 'default',
  channels: {
    default: {
      name: 'Default',
      description: 'Default notification channel',
      importance: 4,
      vibration: true,
    },
    security: {
      name: 'Security',
      description: 'Security-related notifications',
      importance: 5,
      vibration: true,
      sound: true,
    },
  },
}; 