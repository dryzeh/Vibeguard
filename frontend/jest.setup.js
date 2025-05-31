import 'react-native-gesture-handler/jestSetup';

const windowDimensions = {
  width: 375,
  height: 667,
  scale: 2,
  fontScale: 1,
};

// Mock react-native first
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
    Version: 14,
  },
  Dimensions: {
    get: jest.fn().mockReturnValue({
      window: windowDimensions,
      screen: windowDimensions,
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  NativeModules: {
    StatusBarManager: {
      getHeight: jest.fn(() => 44),
      setStyle: jest.fn(),
      setHidden: jest.fn(),
    },
    SettingsManager: {
      settings: {
        AppleLocale: 'en_US',
        AppleLanguages: ['en'],
      },
      getConstants: () => ({
        settings: {
          AppleLocale: 'en_US',
          AppleLanguages: ['en'],
        },
      }),
    },
    SoundManager: {
      playTouchSound: jest.fn(),
    },
    PlatformConstants: {
      getConstants: () => ({
        isTesting: true,
        reactNativeVersion: {
          major: 0,
          minor: 71,
          patch: 8,
        },
      }),
    },
    ExponentConstants: {
      getConstants: () => ({
        statusBarHeight: 44,
        deviceId: 'test-device-id',
      }),
    },
    RNCNetInfo: {
      getCurrentState: jest.fn(),
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    },
  },
  TurboModuleRegistry: {
    get: jest.fn((name) => {
      if (name === 'SettingsManager') {
        return {
          getConstants: () => ({
            settings: {
              AppleLocale: 'en_US',
              AppleLanguages: ['en'],
            },
          }),
        };
      }
      return null;
    }),
  },
  Settings: {
    get: jest.fn(() => ({})),
    set: jest.fn(),
    watchKeys: jest.fn(),
    clearWatch: jest.fn(),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((styles) => {
      if (Array.isArray(styles)) {
        return Object.assign({}, ...styles);
      }
      return styles;
    }),
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  Image: 'Image',
  Animated: {
    View: 'Animated.View',
    createAnimatedComponent: jest.fn((component) => component),
    timing: jest.fn(),
    spring: jest.fn(),
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      interpolate: jest.fn(),
    })),
  },
  useWindowDimensions: jest.fn(() => windowDimensions),
  useColorScheme: jest.fn(() => 'light'),
  I18nManager: {
    isRTL: false,
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
  DevSettings: {
    addMenuItem: jest.fn(),
    reload: jest.fn(),
  },
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
  useNetInfo: jest.fn(() => ({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
  })),
}));

// Mock deprecated-react-native-prop-types
jest.mock('deprecated-react-native-prop-types', () => ({
  ColorPropType: jest.fn(),
  EdgeInsetsPropType: jest.fn(),
  PointPropType: jest.fn(),
  ViewPropTypes: { style: jest.fn() },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
  setStatusBarStyle: jest.fn(),
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'View',
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    statusBarHeight: 44,
    deviceId: 'test-device-id',
  },
}));

// Mock expo-font
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
  useFonts: jest.fn(() => [true, null]),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Text',
  MaterialIcons: 'Text',
  FontAwesome: 'Text',
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  downloadAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  documentDirectory: '/mock/document/directory/',
  cacheDirectory: '/mock/cache/directory/',
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  Svg: 'View',
  Circle: 'View',
  Rect: 'View',
  Path: 'View',
  Defs: 'View',
  LinearGradient: 'View',
  Stop: 'View',
  G: 'View',
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: 'View',
  useSafeAreaInsets: () => ({ top: 44, right: 0, bottom: 34, left: 0 }),
  SafeAreaView: 'View',
}));

// Mock device compatibility
jest.mock('./utils/deviceCompatibility', () => ({
  showCompatibilityWarning: jest.fn(),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useIsFocused: () => true,
  NavigationContainer: 'View',
}));

// Mock language context
jest.mock('./contexts/LanguageContext', () => ({
  LanguageProvider: 'View',
  useLanguage: () => ({
    t: (key) => key,
    setLanguage: jest.fn(),
    language: 'en',
  }),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useAnimatedStyle: () => ({}),
    withSpring: jest.fn(),
    withTiming: jest.fn(),
    withDelay: jest.fn(),
    withSequence: jest.fn(),
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedGestureHandler: jest.fn(),
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  PanGestureHandler: 'View',
  TapGestureHandler: 'View',
  State: {
    ACTIVE: 'ACTIVE',
    END: 'END',
  },
  Gesture: {
    Pan: () => ({
      onStart: jest.fn(),
      onUpdate: jest.fn(),
      onEnd: jest.fn(),
    }),
  },
}));

// Set up required global variables
global.__reanimatedWorkletInit = jest.fn();
global.ReanimatedDataMock = {
  now: () => 0,
};

// Mock console.error to fail tests on warnings
const originalConsoleError = console.error;
console.error = (...args) => {
  // Ignore specific React Native warnings that we can't fix
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Please update the following components:') ||
      args[0].includes('Warning: componentWill') ||
      args[0].includes('ReactNative.createElement') ||
      args[0].includes('Clipboard has been extracted from react-native core') ||
      args[0].includes('ImagePickerIOS has been extracted from react-native core') ||
      args[0].includes('PushNotificationIOS has been extracted from react-native core') ||
      args[0].includes('new NativeEventEmitter()'))
  ) {
    return;
  }
  originalConsoleError(...args);
}; 