import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
  onDismiss?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onHide,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [toastType, setToastType] = useState<ToastType>(type);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const show = useCallback((msg: string, toastType: ToastType = 'info') => {
    setMessageText(msg);
    setToastType(toastType);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    if (onHide) {
      onHide();
    }
  }, [onHide]);

  const handleDismiss = useCallback(() => {
    hide();
    if (onDismiss) {
      onDismiss();
    }
  }, [hide, onDismiss]);

  useEffect(() => {
    if (message) {
      show(message, type);
    }
  }, [message, type, show]);

  useEffect(() => {
    if (visible) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        hide();
      }, duration);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, duration, hide]);

  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    switch (toastType) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      default:
        return 'information-circle';
    }
  };

  const getBackgroundColor = (): string => {
    switch (toastType) {
      case 'success':
        return colors.status.success;
      case 'error':
        return colors.status.error;
      case 'warning':
        return colors.status.warning;
      case 'info':
      default:
        return colors.status.info;
    }
  };

  const getIconColor = (): string => {
    return colors.white;
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          opacity: visible ? 1 : 0,
          transform: [{ translateY: visible ? 0 : -20 }],
        },
      ]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <Ionicons
          name={getIconName()}
          size={24}
          color={getIconColor()}
          style={styles.icon}
        />
        <Text
          style={styles.message}
          numberOfLines={2}
        >
          {messageText}
        </Text>
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          accessibilityLabel="Dismiss notification"
        >
          <Ionicons
            name="close"
            size={20}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    padding: spacing.xs,
  },
  container: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 20,
    padding: spacing.md,
    position: 'absolute',
    right: 20,
    top: Platform.OS === 'ios' ? 50 : 30,
    zIndex: 1000,
    ...shadows.medium,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  icon: {
    marginRight: spacing.sm,
  },
  message: {
    color: colors.white,
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginRight: spacing.sm,
  },
});

export default Toast; 