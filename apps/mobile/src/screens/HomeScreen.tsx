import React from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';
import logoIcon from '../../assets/icon.png';
import type { BoardShape } from '@jackaroo/game-board';
import { BOARD_SHAPES } from '@jackaroo/game-board';
import { colors, font, radius, spacing } from '../theme';
import { strings } from '../i18n';
import { Panel, Screen, SectionTitle, TouchableScale, WoodButton } from '../components/UI';
import type { Settings } from '../state/settings';

export type GameMode = 'solo' | 'pass' | 'host' | 'join';

export function HomeScreen({
  settings,
  onChange,
  onPlay,
  onRules,
}: {
  settings: Settings;
  onChange: (settings: Partial<Settings>) => void;
  onPlay: (mode: GameMode) => void;
  onRules: () => void;
}) {
  return (
    <Screen scroll>
      <View style={styles.header}>
        <Image source={logoIcon} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerText}>
          <Text style={styles.title}>{strings.appName}</Text>
          <Text style={styles.tagline}>{strings.appTagline}</Text>
        </View>
      </View>

      <View style={styles.modes}>
        <WoodButton title={`🎮  ${strings.playSolo}`} onPress={() => onPlay('solo')} style={styles.modeButton} />
        <WoodButton
          title={`📱  ${strings.playLocal}`}
          variant="secondary"
          onPress={() => onPlay('pass')}
          style={styles.modeButton}
        />
        <WoodButton
          title={`📡  ${strings.playLanHost}`}
          variant="secondary"
          onPress={() => onPlay('host')}
          style={styles.modeButton}
        />
        <WoodButton
          title={`🔗  ${strings.playLanJoin}`}
          variant="secondary"
          onPress={() => onPlay('join')}
          style={styles.modeButton}
        />
        <WoodButton title={`📖  ${strings.rules}`} variant="ghost" onPress={onRules} style={styles.modeButton} />
      </View>

      <Panel style={styles.settingsPanel}>
        <SectionTitle>{strings.settings}</SectionTitle>

        <Text style={styles.label}>{strings.yourName}</Text>
        <TextInput
          style={styles.input}
          value={settings.playerName}
          onChangeText={(value) => onChange({ playerName: value || 'أنت' })}
          placeholder="أنت"
          placeholderTextColor="rgba(246,234,210,0.3)"
        />

        <Text style={styles.label}>{strings.boardShape}</Text>
        <View style={styles.shapeRow}>
          {BOARD_SHAPES.map((shape: BoardShape) => (
            <TouchableScale
              key={shape}
              onPress={() => onChange({ boardShape: shape })}
              style={[
                styles.shapeChip,
                settings.boardShape === shape && styles.shapeChipActive,
              ]}
            >
              <Text
                style={[
                  styles.shapeText,
                  settings.boardShape === shape && styles.shapeTextActive,
                ]}
              >
                {strings.shapes[shape]}
              </Text>
            </TouchableScale>
          ))}
        </View>

        <TouchableScale
          onPress={() => onChange({ sound: !settings.sound })}
          style={[styles.toggleRow]}
        >
          <Text style={styles.label}>{strings.sound}</Text>
          <View style={[styles.toggle, settings.sound && styles.toggleOn]}>
            <View style={[styles.toggleKnob, settings.sound && styles.toggleKnobOn]} />
          </View>
        </TouchableScale>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  logo: { width: 86, height: 86, borderRadius: 20 },
  headerText: { flex: 1 },
  title: {
    color: colors.ivory,
    fontFamily: font.bold,
    fontSize: 40,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  tagline: {
    color: 'rgba(246,234,210,0.55)',
    fontFamily: font.regular,
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 4,
  },
  modes: { gap: spacing.md, marginBottom: spacing.xl },
  modeButton: { width: '100%' },
  settingsPanel: { gap: spacing.md },
  label: {
    color: 'rgba(246,234,210,0.8)',
    fontFamily: font.medium,
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
    flex: 1,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    color: colors.ivory,
    fontFamily: font.regular,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  shapeRow: { flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.xs },
  shapeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: 'rgba(255,236,200,0.08)',
  },
  shapeChipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(217,168,78,0.22)',
  },
  shapeText: {
    color: 'rgba(246,234,210,0.75)',
    fontFamily: font.bold,
    fontSize: 12,
  },
  shapeTextActive: { color: colors.goldPale },
  toggleRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: spacing.xs },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 3,
  },
  toggleOn: { backgroundColor: 'rgba(217,168,78,0.5)', borderColor: colors.gold },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(246,234,210,0.6)',
    alignSelf: 'flex-start',
  },
  toggleKnobOn: { alignSelf: 'flex-end', backgroundColor: colors.goldPale },
});
