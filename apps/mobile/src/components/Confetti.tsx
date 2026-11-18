import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

const COLORS = [colors.gold, colors.goldPale, '#57b98a', '#e9a23b', '#df6a8c'];

/** Lightweight win confetti using the built-in Animated API (no extra deps). */
export function Confetti({ count = 46 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 37 + 11) % 100,
        delay: (i % 10) * 0.18,
        duration: 3.4 + (i % 5) * 0.5,
        drift: ((i * 29) % 120) - 60,
        size: 4 + (i % 3) * 3,
        color: COLORS[i % COLORS.length]!,
        round: i % 3 === 0,
      })),
    [count],
  );

  return (
    <View style={styles.fill} pointerEvents="none">
      {pieces.map((piece) => (
        <Piece key={`${piece.left}-${piece.delay}`} {...piece} />
      ))}
    </View>
  );
}

function Piece({
  left,
  delay,
  duration,
  drift,
  size,
  color,
  round,
}: {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  size: number;
  color: string;
  round: boolean;
}) {
  const top = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(top, {
            toValue: 110,
            duration: duration * 1000,
            delay: delay * 1000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 300, delay: delay * 1000, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: duration * 700, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(top, { toValue: -20, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, duration, opacity, top]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: `${left}%`,
        width: round ? size : size * 0.6,
        height: round ? size : size * 1.6,
        borderRadius: round ? size / 2 : 1,
        backgroundColor: color,
        opacity,
        transform: [{ translateY: top }, { translateX: drift }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 30 },
});
