import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';
import { strings } from '../i18n';
import { Panel, SectionTitle } from './UI';

export function RulesContent() {
  const s = strings.rulesSections;
  return (
    <View style={styles.fill}>
      <Panel>
        <SectionTitle>{s.goal.title}</SectionTitle>
        <Text style={styles.body}>{s.goal.body}</Text>
      </Panel>

      <Panel style={styles.gap}>
        <SectionTitle>{s.teams.title}</SectionTitle>
        <Text style={styles.body}>{s.teams.body}</Text>
      </Panel>

      <Panel style={styles.gap}>
        <SectionTitle>{s.cards.title}</SectionTitle>
        <Text style={styles.body}>{s.cards.body}</Text>
        <View style={styles.cardsList}>
          {s.cardsList.map(([rank, text]) => (
            <View key={rank} style={styles.cardRow}>
              <Text style={styles.cardRank}>{rank}</Text>
              <Text style={styles.cardText}>{text}</Text>
            </View>
          ))}
        </View>
      </Panel>

      <Panel style={styles.gap}>
        <SectionTitle>{s.capture.title}</SectionTitle>
        <Text style={styles.body}>{s.capture.body}</Text>
      </Panel>

      <Panel style={styles.gap}>
        <SectionTitle>{s.home.title}</SectionTitle>
        <Text style={styles.body}>{s.home.body}</Text>
      </Panel>

      <Panel style={styles.gap}>
        <SectionTitle>{s.win.title}</SectionTitle>
        <Text style={styles.body}>{s.win.body}</Text>
      </Panel>

      <Panel style={styles.gap}>
        <SectionTitle>{s.shapes.title}</SectionTitle>
        <Text style={styles.body}>{s.shapes.body}</Text>
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  gap: { marginTop: spacing.md },
  body: {
    color: 'rgba(246,234,210,0.85)',
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cardsList: { marginTop: spacing.md, gap: spacing.sm },
  cardRow: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  cardRank: {
    color: colors.gold,
    fontFamily: font.bold,
    fontSize: 13,
    minWidth: 78,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cardText: {
    color: 'rgba(246,234,210,0.8)',
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 21,
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
