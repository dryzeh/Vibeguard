import React from 'react';
import { View, StyleSheet, Dimensions, StyleProp, ViewStyle, ColorValue } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, gradients } from '../styles/theme';

interface GradientBackgroundProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({ children, style }) => {
  const { width, height } = Dimensions.get('window');
  const gradientColors = gradients.background.colors;

  return (
    <View style={[styles.container, style]} pointerEvents="box-none">
      <View style={styles.backgroundContainer} pointerEvents="none">
        <Svg
          height={height}
          width={width}
          style={styles.backgroundSvg}
          pointerEvents="none"
        >
          <Defs>
            <LinearGradient 
              id="grad" 
              x1="0" 
              y1="0" 
              x2="1" 
              y2="1"
              gradientTransform={`rotate(${gradients.backgroundDegrees})`}
            >
              {gradientColors.map((color: ColorValue, index: number) => (
                <Stop
                  key={index}
                  offset={String(index / (gradientColors.length - 1))}
                  stopColor={color.toString()}
                  stopOpacity="1"
                />
              ))}
            </LinearGradient>
          </Defs>
          
          <Path
            d={`
              M0 0
              L${width} 0
              L${width} ${height}
              L0 ${height}
              Z
            `}
            fill="url(#grad)"
          />
          
          {/* Overlay pattern for depth */}
          <Path
            d={`
              M0 ${height * 0.3}
              C${width * 0.3} ${height * 0.25}
              ${width * 0.7} ${height * 0.35}
              ${width} ${height * 0.3}
              L${width} ${height}
              L0 ${height}
              Z
            `}
            fill="url(#grad)"
            opacity="0.4"
          />
        </Svg>
      </View>
      
      <View style={styles.content} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  backgroundSvg: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
});

export default GradientBackground; 