import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop, Path } from 'react-native-svg';
import type { Card as CardModel } from '@jackaroo/game-types';
import { RANK_LABEL, SUIT_SYMBOL, isRedSuit } from '@jackaroo/game-types';
import { colors, font } from '../theme';
import { TouchableScale } from './UI';

export type CardSize = 'sm' | 'md' | 'lg';

const SIZES: Record<CardSize, { w: number; h: number; corner: number; rank: number; suit: number; center: number }> = {
  sm: { w: 46, h: 64, corner: 5, rank: 11, suit: 10, center: 18 },
  md: { w: 62, h: 87, corner: 7, rank: 15, suit: 13, center: 26 },
  lg: { w: 74, h: 104, corner: 8, rank: 18, suit: 15, center: 32 },
};

export function PlayingCard({
  card,
  size = 'md',
  selected,
  disabled,
  faceDown,
  onPress,
}: {
  card?: CardModel;
  size?: CardSize;
  selected?: boolean;
  disabled?: boolean;
  faceDown?: boolean;
  onPress?: () => void;
}) {
  const s = SIZES[size];
  const red = card ? isRedSuit(card.suit) : false;
  const ink = red ? '#a23430' : '#2c1c10';

  const body = (
    <View style={styles.wrapper}>
      <Svg width={s.w} height={s.h} viewBox={`0 0 ${s.w} ${s.h}`}>
        <Defs>
          <LinearGradient id="cardFace" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#fbf3de" />
            <Stop offset="0.55" stopColor="#f3e6c8" />
            <Stop offset="1" stopColor="#e7d5ae" />
          </LinearGradient>
          <LinearGradient id="cardBack" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.woodLight} />
            <Stop offset="0.5" stopColor={colors.wood} />
            <Stop offset="1" stopColor={colors.woodDark} />
          </LinearGradient>
        </Defs>

        {faceDown || !card ? (
          <g>
            <Rect x={1} y={1} width={s.w - 2} height={s.h - 2} rx={s.corner} fill="url(#cardBack)" stroke={colors.gold} strokeWidth={1.2} />
            <Rect x={4} y={4} width={s.w - 8} height={s.h - 8} rx={s.corner - 2} fill="none" stroke="rgba(255,231,186,0.35)" strokeWidth={0.8} />
            {/* wood grain */}
            <Path d={`M ${s.w * 0.2} ${s.h * 0.18} Q ${s.w * 0.5} ${s.h * 0.3} ${s.w * 0.8} ${s.h * 0.16}`} stroke="rgba(255,231,186,0.25)" strokeWidth={0.8} fill="none" />
            <Path d={`M ${s.w * 0.15} ${s.h * 0.5} Q ${s.w * 0.5} ${s.h * 0.62} ${s.w * 0.85} ${s.h * 0.48}`} stroke="rgba(255,231,186,0.2)" strokeWidth={0.8} fill="none" />
            <Path d={`M ${s.w * 0.25} ${s.h * 0.8} Q ${s.w * 0.5} ${s.h * 0.9} ${s.w * 0.75} ${s.h * 0.78}`} stroke="rgba(255,231,186,0.16)" strokeWidth={0.8} fill="none" />
          </g>
        ) : (
          <g>
            <Rect x={1} y={1} width={s.w - 2} height={s.h - 2} rx={s.corner} fill="url(#cardFace)" stroke="rgba(122,74,36,0.7)" strokeWidth={1} />
            <Rect x={3.5} y={3.5} width={s.w - 7} height={s.h - 7} rx={s.corner - 2} fill="none" stroke="rgba(165,113,61,0.35)" strokeWidth={0.7} />
          </g>
        )}
      </Svg>

      {!faceDown && card ? (
        <View style={styles.faceOverlay} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTop]}>
            <Text style={[styles.rank, { color: ink, fontSize: s.rank }]}>{card.rank}</Text>
            <Text style={[styles.suit, { color: ink, fontSize: s.suit }]}>{SUIT_SYMBOL[card.suit]}</Text>
          </View>
          <View style={[styles.corner, styles.cornerBottom]}>
            <Text style={[styles.rank, { color: ink, fontSize: s.rank }]}>{card.rank}</Text>
            <Text style={[styles.suit, { color: ink, fontSize: s.suit }]}>{SUIT_SYMBOL[card.suit]}</Text>
          </View>
          <Text style={[styles.center, { color: ink, fontSize: s.center }]}>
            {RANK_LABEL[card.rank].charAt(0)}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <TouchableScale
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.pressable,
        selected && styles.selected,
        disabled && styles.disabled,
      ]}
    >
      {body}
    </TouchableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', height: '100%' },
  pressable: {
    borderRadius: 8,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(217, 168, 78, 0.18)',
    transform: [{ translateY: -6 }],
  },
  disabled: { opacity: 0.55 },
  faceOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  corner: {
    position: 'absolute',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cornerTop: { top: 4, right: 5 },
  cornerBottom: { bottom: 4, left: 5, transform: [{ rotate: '180deg' }] },
  rank: {
    fontFamily: font.bold,
    lineHeight: undefined,
  },
  suit: {
    fontFamily: font.regular,
    lineHeight: undefined,
    marginTop: -2,
  },
  center: {
    fontFamily: font.bold,
    opacity: 0.92,
  },
});
