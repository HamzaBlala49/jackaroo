import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';
import { strings } from '../i18n';
import { Panel, Screen, SectionTitle, TouchableScale, WoodButton } from '../components/UI';

export interface SoloConfig {
  playerName: string;
}

export interface PassConfig {
  players: { name: string; isBot: boolean }[];
}

export function SetupScreen({
  mode,
  playerName,
  onStartSolo,
  onStartPass,
  onBack,
}: {
  mode: 'solo' | 'pass';
  playerName: string;
  onStartSolo: () => void;
  onStartPass: (config: PassConfig) => void;
  onBack: () => void;
}) {
  const [humanCount, setHumanCount] = useState(2);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>
          {mode === 'solo' ? strings.playSolo : strings.playLocal}
        </Text>
        <WoodButton title={strings.back} variant="ghost" onPress={onBack} style={styles.back} />
      </View>

      {mode === 'solo' ? (
        <Panel>
          <Text style={styles.body}>
            ستلعب ضد ثلاثة روبوتات ذكية على نفس قوانين جيكارو. جاهز؟
          </Text>
          <WoodButton title={strings.start} onPress={onStartSolo} style={styles.start} />
        </Panel>
      ) : (
        <Panel>
          <SectionTitle>{strings.playersCount}</SectionTitle>
          <View style={styles.countRow}>
            {[2, 3, 4].map((count) => (
              <TouchableScale
                key={count}
                onPress={() => setHumanCount(count)}
                style={[styles.countChip, humanCount === count && styles.countChipActive]}
              >
                <Text style={[styles.countText, humanCount === count && styles.countTextActive]}>
                  {count}
                </Text>
              </TouchableScale>
            ))}
          </View>
          <Text style={styles.body}>
            {`اللاعبون يتناوبون على هذا الجهاز. ${4 - humanCount > 0 ? `سيكتمل الباقي بـ ${4 - humanCount} روبوت.` : ''}`}
          </Text>
          <WoodButton
            title={strings.start}
            onPress={() =>
              onStartPass({
                players: Array.from({ length: 4 }, (_, index) => ({
                  name:
                    index === 0
                      ? playerName
                      : index < humanCount
                        ? `لاعب ${index + 1}`
                        : `روبوت ${index + 1}`,
                  isBot: index >= humanCount,
                })),
              })
            }
            style={styles.start}
          />
        </Panel>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    marginTop: spacing.xl,
  },
  title: {
    color: colors.ivory,
    fontFamily: font.bold,
    fontSize: 28,
    textAlign: 'right',
    writingDirection: 'rtl',
    flex: 1,
  },
  back: { minHeight: 38 },
  body: {
    color: 'rgba(246,234,210,0.8)',
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  countRow: { flexDirection: 'row-reverse', gap: spacing.md, marginBottom: spacing.md },
  countChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: 'rgba(255,236,200,0.08)',
  },
  countChipActive: { borderColor: colors.gold, backgroundColor: 'rgba(217,168,78,0.22)' },
  countText: { color: 'rgba(246,234,210,0.8)', fontFamily: font.bold, fontSize: 20 },
  countTextActive: { color: colors.goldPale },
  start: { marginTop: spacing.md },
});
