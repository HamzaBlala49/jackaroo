import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Card } from '@jackaroo/game-types';
import { colors, font, radius, spacing } from '../theme';
import { strings } from '../i18n';
import { PlayingCard } from './Card';
import { TouchableScale } from './UI';

export interface TrayAction {
  key: string;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export interface HandTrayProps {
  hand: Card[];
  legalCardIds: Set<string>;
  selectedCardId: string | null;
  onSelectCard: (cardId: string | null) => void;
  promptTitle: string;
  promptDetail: string;
  tone: 'you' | 'wait' | 'danger' | 'seven';
  actions: TrayAction[];
  pending?: boolean;
}

export function HandTray({
  hand,
  legalCardIds,
  selectedCardId,
  onSelectCard,
  promptTitle,
  promptDetail,
  tone,
  actions,
  pending,
}: HandTrayProps) {
  const toneColor =
    tone === 'danger' ? colors.danger : tone === 'wait' ? 'rgba(246,234,210,0.5)' : colors.gold;

  return (
    <View style={styles.tray}>
      <View style={styles.promptRow}>
        <View style={[styles.promptDot, { backgroundColor: toneColor }]} />
        <View style={styles.promptText}>
          <Text style={styles.promptTitle}>{promptTitle}</Text>
          <Text style={styles.promptDetail}>{promptDetail}</Text>
        </View>
      </View>

      <View style={styles.cardsRow}>
        {/* RTL: render cards right-to-left */}
        {[...hand].reverse().map((card) => {
          const legal = legalCardIds.has(card.id);
          const selected = selectedCardId === card.id;
          return (
            <PlayingCard
              key={card.id}
              card={card}
              size="md"
              selected={selected}
              disabled={pending}
              onPress={() => onSelectCard(selected ? null : card.id)}
            />
          );
        })}
        {hand.length === 0 ? (
          <Text style={styles.empty}>{strings.cardsLeft(0)}</Text>
        ) : null}
      </View>

      {actions.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsRow}
        >
          {[...actions].reverse().map((action) => (
            <TouchableScale
              key={action.key}
              onPress={action.onPress}
              disabled={action.disabled || pending}
              style={[
                styles.actionButton,
                action.variant === 'primary' && styles.actionPrimary,
                action.variant === 'danger' && styles.actionDanger,
                (action.disabled || pending) && styles.actionDisabled,
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  action.variant === 'primary' && styles.actionTextPrimary,
                ]}
              >
                {action.label}
              </Text>
            </TouchableScale>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    backgroundColor: 'rgba(24,10,6,0.88)',
    borderTopWidth: 1,
    borderTopColor: colors.goldSoft,
    paddingTop: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  promptRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  promptDot: { width: 8, height: 8, borderRadius: 4, marginLeft: spacing.sm },
  promptText: { flex: 1 },
  promptTitle: {
    color: colors.ivory,
    fontFamily: font.bold,
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  promptDetail: {
    color: 'rgba(246,234,210,0.5)',
    fontFamily: font.regular,
    fontSize: 11,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 1,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'nowrap',
  },
  empty: {
    color: 'rgba(246,234,210,0.35)',
    fontFamily: font.regular,
    fontSize: 12,
    padding: spacing.lg,
  },
  actionsRow: { gap: spacing.sm, paddingTop: spacing.sm, paddingHorizontal: 2 },
  actionButton: {
    backgroundColor: 'rgba(255,236,200,0.10)',
    borderWidth: 1,
    borderColor: colors.goldSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    minWidth: 86,
    alignItems: 'center',
  },
  actionPrimary: {
    backgroundColor: colors.wood,
    borderColor: colors.gold,
  },
  actionDanger: {
    backgroundColor: 'rgba(201,86,79,0.25)',
    borderColor: colors.danger,
  },
  actionDisabled: { opacity: 0.4 },
  actionText: {
    color: colors.ivory,
    fontFamily: font.bold,
    fontSize: 13,
    textAlign: 'center',
  },
  actionTextPrimary: { color: '#fff' },
});
