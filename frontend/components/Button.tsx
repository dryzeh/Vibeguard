import React, { ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
  Platform,
  StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, gradients, typography, borderRadius, shadows, animations, accessibility, spacing } from '../styles/theme';
import type { ColorValue } from 'react-native';
import { GradientButton } from './GradientButton';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success';

export interface ButtonProps {
  title: ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  hapticFeedback?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean;
    busy?: boolean;
    expanded?: boolean;
  };
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
  hapticFeedback = true,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  accessibilityState,
}) => {
  // Animation value for press feedback
  const [scaleValue] = React.useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    if (hapticFeedback && Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      case 'danger':
        return styles.dangerButton;
      case 'success':
        return styles.successButton;
      default:
        return styles.primaryButton;
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return styles.smallButton;
      case 'large':
        return styles.largeButton;
      default:
        return styles.mediumButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outlineText;
      default:
        return styles.buttonText;
    }
  };

  const buttonStyles = [
    styles.button,
    getButtonStyle(),
    getSizeStyles(),
    fullWidth && styles.fullWidth,
    disabled && styles.disabledButton,
    style,
  ];

  const content = (
    <>
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'outline' ? colors.primary.medium : colors.white}
          size={size === 'small' ? 'small' : 'large'}
          testID="loading-indicator"
        />
      ) : (
        <>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </>
  );

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isLoading}
        style={buttonStyles}
        activeOpacity={0.8}
        testID={testID}
        accessibilityLabel={accessibilityLabel || (typeof title === 'string' ? title : undefined)}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        accessibilityState={{
          disabled: disabled || isLoading,
          busy: isLoading,
          ...accessibilityState,
        }}
        accessibilityActions={[
          { name: 'activate', label: 'Activate button' }
        ]}
        onAccessibilityAction={({ nativeEvent: { actionName } }) => {
          if (actionName === 'activate') {
            handlePress();
          }
        }}
      >
        {variant === 'primary' ? (
          <GradientButton style={[styles.gradient, getSizeStyles()]}>
            {content}
          </GradientButton>
        ) : (
          content
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    minWidth: accessibility.minimumTouchableSize * 2,
    minHeight: accessibility.minimumTouchableSize,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.small,
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  dangerButton: {
    backgroundColor: colors.status.error,
  },
  disabledButton: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  gradient: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  icon: {
    marginRight: 8,
  },
  largeButton: {
    minHeight: accessibility.minimumTouchableSize * 1.5,
    minWidth: accessibility.minimumTouchableSize * 3,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  mediumButton: {
    minHeight: accessibility.minimumTouchableSize * 1.2,
    minWidth: accessibility.minimumTouchableSize * 2.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderColor: colors.primary.medium,
    borderWidth: 1,
  },
  outlineText: {
    color: colors.primary.medium,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary.medium,
  },
  secondaryButton: {
    backgroundColor: colors.background.card,
  },
  smallButton: {
    minHeight: accessibility.minimumTouchableSize,
    minWidth: accessibility.minimumTouchableSize * 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  successButton: {
    backgroundColor: colors.status.success,
  },
});

export default Button; 