import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { colors, typography, spacing } from '../styles/theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  webStyle?: StyleProp<ViewStyle>;
  nativeStyle?: StyleProp<ImageStyle>;
}

const getSize = (size: LogoProps['size'] = 'medium') => {
  switch (size) {
    case 'small':
      return 40;
    case 'large':
      return 120;
    default:
      return 80;
  }
};

export const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  webStyle,
  nativeStyle 
}) => {
  const [isWeb, setIsWeb] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    setIsWeb(Platform.OS === 'web');
  }, []);

  let logoSource: any = null;
  try {
    logoSource = require('../assets/images/vibeguard-logo.png');
  } catch (e) {
    logoSource = null;
  }

  const renderWebLogo = () => (
    <View style={[styles.webContainer, { width: getSize(size) }, webStyle]}>
      <Text style={[styles.webLogo, { fontSize: getSize(size) * 0.4 }]}>
        VibeGuard
      </Text>
    </View>
  );

  const renderNativeLogo = () => {
    if (imageError || !logoSource) {
      return renderWebLogo();
    }

    return (
      <Image
        source={logoSource}
        style={[
          styles.logo,
          { width: getSize(size), height: getSize(size) },
          nativeStyle,
        ]}
        resizeMode="contain"
        onError={() => setImageError(true)}
      />
    );
  };

  return isWeb ? renderWebLogo() : renderNativeLogo();
};

const styles = StyleSheet.create({
  logo: {
    tintColor: colors.primary.medium,
  },
  webContainer: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: 8,
    justifyContent: 'center',
    padding: spacing.sm,
  },
  webLogo: {
    color: colors.primary.medium,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
});

export default Logo; 