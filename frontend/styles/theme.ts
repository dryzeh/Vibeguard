import { TextStyle, ViewStyle, ColorValue } from 'react-native';

// Color types
type ColorPalette = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
  success: string;
  successLight: string;
  successText: string;
  danger: string;
  warning: string;
  info: string;
  white: string;
  black: string;
  transparent: string;
  medium: string; // Added for backward compatibility
};

type BackgroundColors = {
  default: string;
  surface: string;
  card: string;
  overlay: string;
  input: string;
  inputFocused: string;
  light: string; // Added for backward compatibility
  dark: string; // Added for backward compatibility
};

type TextColors = {
  primary: string;
  secondary: string;
  muted: string;
  disabled: string;
  white: string;
  light: string; // Added for backward compatibility
  dark: string; // Added for backward compatibility
};

type StatusColors = {
  success: string;
  error: string;
  warning: string;
  info: string;
};

type BorderColors = {
  default: string;
  light: string;
  dark: string;
};

type ColorSystem = {
  primary: ColorPalette;
  secondary: ColorPalette;
  background: BackgroundColors;
  text: TextColors;
  status: StatusColors;
  border: BorderColors;
  white: string;
  black: string;
  transparent: string;
  shadow: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
};

// Typography types
type FontFamily = {
  regular: string;
  medium: string;
  bold: string;
  semibold: string;
};

type FontSize = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
};

type FontWeight = {
  regular: TextStyle['fontWeight'];
  medium: TextStyle['fontWeight'];
  semibold: TextStyle['fontWeight'];
  bold: TextStyle['fontWeight'];
};

type TypographySystem = {
  fontFamily: FontFamily;
  fontSize: FontSize;
  fontWeight: FontWeight;
  sizes: FontSize; // Added for backward compatibility
  weights: FontWeight; // Added for backward compatibility
};

// Gradient types
type GradientStop = {
  color: ColorValue;
  offset: number;
};

export type Gradient = {
  colors: readonly [ColorValue, ColorValue, ...ColorValue[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
};

type GradientSystem = {
  primary: Gradient;
  secondary: Gradient;
  success: Gradient;
  danger: Gradient;
  warning: Gradient;
  info: Gradient;
  button: Gradient;
  background: Gradient;
  backgroundDegrees: number;
};

// Accessibility types
type AccessibilitySystem = {
  minimumTapArea: number;
  minimumFontSize: number;
  minimumContrastRatio: number;
  focusRingColor: string;
  focusRingWidth: number;
  minimumTouchableSize: number;
};

// Theme colors
export const colors: ColorSystem = {
  primary: {
    primary: '#007AFF',
    primaryDark: '#0056b3',
    primaryLight: '#4da3ff',
    secondary: '#6c757d',
    secondaryDark: '#495057',
    secondaryLight: '#adb5bd',
    success: '#28a745',
    successLight: '#e8ffe8',
    successText: '#008000',
    danger: '#ff3b30',
    warning: '#ffc107',
    info: '#17a2b8',
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
    medium: '#007AFF' // Added for backward compatibility
  },
  secondary: {
    primary: '#6c757d',
    primaryDark: '#495057',
    primaryLight: '#adb5bd',
    secondary: '#007AFF',
    secondaryDark: '#0056b3',
    secondaryLight: '#4da3ff',
    success: '#28a745',
    successLight: '#e8ffe8',
    successText: '#008000',
    danger: '#ff3b30',
    warning: '#ffc107',
    info: '#17a2b8',
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',
    medium: '#6c757d' // Added for backward compatibility
  },
  background: {
    default: '#ffffff',
    surface: '#f8f9fa',
    card: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)',
    input: 'rgba(255, 255, 255, 0.1)',
    inputFocused: 'rgba(255, 255, 255, 0.15)',
    light: '#f8f9fa', // Added for backward compatibility
    dark: '#343a40' // Added for backward compatibility
  },
  text: {
    primary: '#333333',
    secondary: '#6c757d',
    muted: '#adb5bd',
    disabled: '#dee2e6',
    white: '#ffffff',
    light: '#666666', // Added for backward compatibility
    dark: '#212529' // Added for backward compatibility
  },
  status: {
    success: '#28a745',
    error: '#ff3b30',
    warning: '#ffc107',
    info: '#17a2b8'
  },
  border: {
    default: '#e0e0e0',
    light: '#eeeeee',
    dark: '#dee2e6'
  },
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  shadow: '#000000',
  success: '#28a745',
  danger: '#ff3b30',
  warning: '#ffc107',
  info: '#17a2b8'
};

// Typography system
export const typography: TypographySystem = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System'
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  }
};

// Gradient system
export const gradients: GradientSystem = {
  primary: {
    colors: [colors.primary.primary, colors.primary.primaryDark] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  secondary: {
    colors: [colors.secondary.primary, colors.secondary.primaryDark] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  success: {
    colors: [colors.status.success, colors.primary.primaryDark] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  danger: {
    colors: [colors.status.error, colors.primary.primaryDark] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  warning: {
    colors: [colors.status.warning, colors.primary.primaryDark] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  info: {
    colors: [colors.status.info, colors.primary.primaryDark] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  button: {
    colors: [colors.primary.primary, colors.primary.primaryDark] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  background: {
    colors: [colors.background.default, colors.background.surface] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  backgroundDegrees: 45,
};

// Accessibility system
export const accessibility: AccessibilitySystem = {
  minimumTapArea: 44,
  minimumFontSize: 12,
  minimumContrastRatio: 4.5,
  focusRingColor: '#007AFF',
  focusRingWidth: 2,
  minimumTouchableSize: 44
};

// Spacing system
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

// Border radius
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999
};

// Shadows
export const shadows = {
  small: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  medium: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  large: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6
  }
};

// Animations
export const animations = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeOut: 'ease-out',
    easeIn: 'ease-in'
  }
};

// Theme type
export type Theme = {
  colors: ColorSystem;
  typography: TypographySystem;
  gradients: GradientSystem;
  accessibility: AccessibilitySystem;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  animations: typeof animations;
};

// Theme object
export const theme: Theme = {
  colors,
  typography,
  gradients,
  accessibility,
  spacing,
  borderRadius,
  shadows,
  animations
};

export default theme; 