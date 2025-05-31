import React from 'react';
import { StyleSheet, ViewStyle, StyleProp, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, Gradient } from '../styles/theme';

type GradientKey = Exclude<keyof typeof gradients, 'backgroundDegrees'>;

interface GradientButtonProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gradient?: GradientKey;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  style,
  gradient = 'button',
}) => {
  const selectedGradient = gradients[gradient] as Gradient;
  
  // Cast the colors array to the expected tuple type for expo-linear-gradient
  const gradientColors = selectedGradient.colors as unknown as [string, string, ...string[]];

  return (
    <LinearGradient
      colors={gradientColors}
      start={selectedGradient.start}
      end={selectedGradient.end}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
}); 