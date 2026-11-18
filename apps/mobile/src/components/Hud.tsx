import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { GameSnapshot } from '@jackaroo/game-types';
import { colors, font, radius, spacing, teamPalette } from '../theme';
import { strings } from '../i18n';

export function TurnBanner({ snapshot, viewerId }: { snapshot: GameSnapshot; viewerId: string | null }) {
  const current = snapshot.players.find((p) => p.id === snapshot.currentPlayerId);
  const team = current ? teamPalette(current.teamId) : null;
  const isYou = snapshot.currentPlayerId === viewerId;
  const inSeven = snapshot.phase === 'seven';

  return (
    <View style={[styles.banner, isYou && styles.bannerYou]}>
      <View style={[styles.teamDot, { backgroundColor: team?.primary ?? colors.gold }]} />
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle}>
          {snapshot.status === 'finished'
            ? strings.noWinner
            : isYou
              ? strings.yourTurn
              : current
                ? strings.turnOf(current.name.split(' ')[0])
                : ''}
        </Text>
        <Text style={styles.bannerDetail}>
          {snapshot.status === 'finished'
            ? strings.appName
            : inSeven
              ? strings.sevenLeft(snapshot.seven?.remaining ?? 0)
              : strings.round(snapshot.round)}
        </Text>
      </View>
    </View>
  );
}

export function PlayerChips({ snapshot, viewerId }: { snapshot: GameSnapshot; viewerId: string | null }) {
  const players = [...snapshot.players].sort((a, b) => a.seat - b.seat);
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {players.map((player) => {
          const team = teamPalette(player.teamId);
          const isCurrent = snapshot.currentPlayerId === player.id;
          const isYou = player.id === viewerId;
          return (
            <View
              key={player.id}
              style={[
                styles.chip,
                { borderColor: isCurrent ? team.primary : 'rgba(255,255,255,0.12)' },
                isCurrent && { shadowColor: team.primary, elevation: 6 },
              ]}
            >
              <View style={[styles.chipAvatar, { backgroundColor: team.deep, borderColor: team.primary }]}>
                <Text style={[styles.chipInitials, { color: team.pale }]}>
                  {player.name.replace('روبوت', '🤖').slice(0, 2)}
                </Text>
              </View>
              <View style={styles.chipInfo}>
                <Text style={styles.chipName} numberOfLines={1}>
                  {player.name}
                  {isYou ? ` · ${strings.youTag}` : ''}
                </Text>
                <Text style={styles.chipCards}>{strings.cardsLeft(player.handCount)}</Text>
              </View>
              {isCurrent ? <View style={[styles.currentDot, { backgroundColor: team.primary }]} /> : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(28,12,8,0.6)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  bannerYou: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(217,168,78,0.14)',
  },
  teamDot: { width: 10, height: 10, borderRadius: 5, marginLeft: spacing.sm },
  bannerText: { flex: 1 },
  bannerTitle: {
    color: colors.ivory,
    fontFamily: font.bold,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bannerDetail: {
    color: 'rgba(246,234,210,0.55)',
    fontFamily: font.regular,
    fontSize: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 1,
  },

  chipsRow: { paddingHorizontal: spacing.sm, gap: spacing.sm },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(28,12,8,0.65)',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    minWidth: 108,
  },
  chipAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  chipInitials: { fontFamily: font.bold, fontSize: 10 },
  chipInfo: { flex: 1, alignItems: 'flex-end' },
  chipName: {
    color: 'rgba(246,234,210,0.9)',
    fontFamily: font.medium,
    fontSize: 11,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  chipCards: {
    color: 'rgba(246,234,210,0.45)',
    fontFamily: font.regular,
    fontSize: 9,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  currentDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
});
