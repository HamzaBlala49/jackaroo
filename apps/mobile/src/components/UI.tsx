import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, shadow, spacing } from '../theme';

/** Pressable that squashes slightly — makes every tap feel physical. */
export function TouchableScale({
  children,
  onPress,
  style,
  disabled,
  scaleTo = 0.96,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleTo?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, friction: 4, tension: 300 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 300 }).start();
  };

  return (
    <Pressable
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }, disabled && styles.disabled]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function WoodButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const variantStyle =
    variant === 'primary'
      ? styles.buttonPrimary
      : variant === 'secondary'
        ? styles.buttonSecondary
        : variant === 'danger'
          ? styles.buttonDanger
          : styles.buttonGhost;

  return (
    <TouchableScale onPress={onPress} disabled={disabled} style={[styles.button, variantStyle, style]}>
      <Text style={variant === 'ghost' ? styles.buttonGhostText : styles.buttonText}>{title}</Text>
    </TouchableScale>
  );
}

export function Screen({
  children,
  scroll,
  center,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  center?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.felt}>
        <View style={styles.feltGlow} pointerEvents="none" />
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, center && styles.center]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, center && styles.center]}>{children}</View>
        )}
      </View>
    </SafeAreaView>
  );
}

export function Panel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.feltDeep },
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  felt: {
    flex: 1,
    backgroundColor: colors.felt,
  },
  feltGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08), transparent 60%)',
    opacity: 0.6,
  },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  disabled: { opacity: 0.45 },

  button: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...shadow,
  },
  buttonPrimary: {
    backgroundColor: colors.wood,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255, 236, 200, 0.10)',
    borderWidth: 1.5,
    borderColor: colors.goldSoft,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: {
    color: colors.ivory,
    fontFamily: font.bold,
    fontSize: 17,
    textAlign: 'center',
  },
  buttonGhostText: {
    color: colors.gold,
    fontFamily: font.bold,
    fontSize: 15,
    textAlign: 'center',
  },

  panel: {
    backgroundColor: 'rgba(28, 12, 8, 0.55)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.gold,
    fontFamily: font.bold,
    fontSize: 13,
    letterSpacing: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: spacing.sm,
  },
});
