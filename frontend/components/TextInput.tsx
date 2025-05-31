import React, { forwardRef, useState } from 'react';
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  View,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
  AccessibilityInfo,
  Platform,
  AccessibilityRole,
  RegisteredStyle,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
  helperTextStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onValidation?: (value: string) => string | undefined;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

const TextInput = forwardRef<RNTextInput, TextInputProps>(({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  helperTextStyle,
  leftIcon,
  rightIcon,
  onValidation,
  validateOnBlur = true,
  validateOnChange = false,
  onBlur,
  onChangeText,
  value,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>(error);
  const [isValidating, setIsValidating] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    if (Platform.OS === 'web') {
      // Announce focus for screen readers
      AccessibilityInfo.announceForAccessibility(`${label || 'Input'} focused`);
    }
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (validateOnBlur && onValidation && value) {
      setIsValidating(true);
      const validationError = onValidation(value);
      setLocalError(validationError);
      setIsValidating(false);
    }
    onBlur?.(e);
  };

  const handleChangeText = (text: string) => {
    if (validateOnChange && onValidation) {
      setIsValidating(true);
      const validationError = onValidation(text);
      setLocalError(validationError);
      setIsValidating(false);
    }
    onChangeText?.(text);
  };

  const getInputContainerStyle = (): StyleProp<ViewStyle> => {
    const containerStyles: StyleProp<ViewStyle>[] = [styles.inputContainer];
    if (isFocused) {
      containerStyles.push(styles.inputContainerFocused);
    }
    if (localError) {
      containerStyles.push(styles.inputContainerError);
    }
    if (containerStyle) {
      containerStyles.push(containerStyle);
    }
    return containerStyles;
  };

  const getInputStyle = (): StyleProp<TextStyle> => {
    const inputStyles: StyleProp<TextStyle>[] = [styles.input];
    if (leftIcon) {
      inputStyles.push(styles.inputWithLeftIcon);
    }
    if (rightIcon) {
      inputStyles.push(styles.inputWithRightIcon);
    }
    if (localError) {
      inputStyles.push(styles.inputError);
    }
    if (inputStyle) {
      inputStyles.push(inputStyle);
    }
    return inputStyles;
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={[styles.label, labelStyle]}
          accessibilityRole="text"
        >
          {label}
        </Text>
      )}
      <View style={getInputContainerStyle()}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            {leftIcon}
          </View>
        )}
        <RNTextInput
          ref={ref}
          style={getInputStyle()}
          placeholderTextColor={colors.text.muted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={handleChangeText}
          value={value}
          accessibilityLabel={label}
          accessibilityRole="none"
          accessibilityState={{
            disabled: props.editable === false,
          }}
          {...props}
        />
        {rightIcon && (
          <View style={styles.rightIconContainer}>
            {rightIcon}
          </View>
        )}
      </View>
      {localError && (
        <Text
          style={[styles.errorText, errorStyle]}
          accessibilityRole="alert"
        >
          {localError}
        </Text>
      )}
      {helperText && !localError && (
        <Text
          style={[styles.helperText, helperTextStyle]}
          accessibilityRole="text"
        >
          {helperText}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.status.error as string,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  helperText: {
    color: colors.text.secondary as string,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  input: {
    color: colors.text.primary,
    flex: 1,
    fontSize: typography.fontSize.md,
    minHeight: 44,
    padding: spacing.md,
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: colors.background.input,
    borderColor: colors.border.default as string,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    ...shadows.small,
  },
  inputContainerError: {
    borderColor: colors.status.error as string,
  },
  inputContainerFocused: {
    backgroundColor: colors.background.inputFocused,
    borderColor: colors.primary.medium as string,
  },
  inputError: {
    color: colors.status.error as string,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: spacing.xl,
  },
  label: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  leftIconContainer: {
    paddingLeft: spacing.md,
  },
  rightIconContainer: {
    position: 'absolute',
    right: spacing.md,
  },
});

TextInput.displayName = 'TextInput';

export default TextInput; 