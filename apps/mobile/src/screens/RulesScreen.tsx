import React from 'react';
import { Text, View } from 'react-native';
import { colors, font, spacing } from '../theme';
import { strings } from '../i18n';
import { Screen, WoodButton } from '../components/UI';
import { RulesContent } from '../components/RulesContent';

export function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg, marginTop: spacing.xl }}>
        <Text
          style={{
            color: colors.ivory,
            fontFamily: font.bold,
            fontSize: 28,
            textAlign: 'right',
            writingDirection: 'rtl',
            flex: 1,
          }}
        >
          {strings.rules}
        </Text>
        <WoodButton title={strings.back} variant="ghost" onPress={onBack} style={{ minHeight: 38 }} />
      </View>
      <RulesContent />
    </Screen>
  );
}
