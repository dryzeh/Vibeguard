import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Insets } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, shadows, accessibility, spacing } from '../styles/theme';

const HIT_SLOP: Insets = { top: 10, bottom: 10, left: 10, right: 10 };

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <View 
      style={styles.container}
      accessibilityRole="radiogroup"
      accessibilityLabel="Language selection"
    >
      <TouchableOpacity
        style={[
          styles.languageButton,
          language === 'sv' && styles.activeButton
        ]}
        onPress={() => setLanguage('sv')}
        accessibilityLabel="Switch to Swedish"
        accessibilityRole="radio"
        accessibilityState={{ selected: language === 'sv' }}
        accessibilityHint="Double tap to switch to Swedish language"
        hitSlop={HIT_SLOP}
      >
        <Text style={[
          styles.languageText,
          language === 'sv' && styles.activeText
        ]}>
          SV
        </Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={[
          styles.languageButton,
          language === 'en' && styles.activeButton
        ]}
        onPress={() => setLanguage('en')}
        accessibilityLabel="Switch to English"
        accessibilityRole="radio"
        accessibilityState={{ selected: language === 'en' }}
        accessibilityHint="Double tap to switch to English language"
        hitSlop={HIT_SLOP}
      >
        <Text style={[
          styles.languageText,
          language === 'en' && styles.activeText
        ]}>
          EN
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    flexDirection: 'row',
    padding: 4,
    ...shadows.small,
  },
  divider: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    height: 20,
    marginHorizontal: 4,
    width: 1,
  },
  languageButton: {
    borderRadius: 16,
    minHeight: accessibility.minimumTouchableSize,
    minWidth: accessibility.minimumTouchableSize,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  languageText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeButton: {
    backgroundColor: colors.primary.medium,
  },
  activeText: {
    color: colors.text.primary,
  },
}); 