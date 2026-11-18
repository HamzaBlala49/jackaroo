import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, Text, View } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import type { BoardShape } from '@jackaroo/game-board';
import { colors, font, spacing } from './theme';
import { strings } from './i18n';
import { initSounds, setSoundEnabled } from './audio';
import { setHapticsEnabled } from './haptics';
import {
  defaultSettings,
  loadSettings,
  saveSettings,
  type Settings,
} from './state/settings';
import { HomeScreen, type GameMode } from './screens/HomeScreen';
import { SetupScreen, type PassConfig } from './screens/SetupScreen';
import { HostScreen } from './screens/HostScreen';
import { JoinScreen } from './screens/JoinScreen';
import { RulesScreen } from './screens/RulesScreen';
import { LocalGameScreen } from './screens/LocalGameScreen';

type Route =
  | { name: 'home' }
  | { name: 'setup'; mode: 'solo' | 'pass' }
  | { name: 'game-solo' }
  | { name: 'game-pass'; config: PassConfig }
  | { name: 'host' }
  | { name: 'join' }
  | { name: 'rules' };

export default function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const loaded = await loadSettings();
      setSettings(loaded);
      setSoundEnabled(loaded.sound);
      setHapticsEnabled(loaded.haptics);
      await initSounds();
      setReady(true);
    })();
  }, []);

  const changeSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      setSoundEnabled(next.sound);
      setHapticsEnabled(next.haptics);
      void saveSettings(next);
      return next;
    });
  }, []);

  const goHome = useCallback(() => setRoute({ name: 'home' }), []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.feltDeep, alignItems: 'center', justifyContent: 'center' }}>
        <ExpoStatusBar style="light" />
        <Text style={{ color: colors.gold, fontFamily: font.bold, fontSize: 22 }}>
          {strings.appName}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.feltDeep }}>
      <ExpoStatusBar style="light" />
      {route.name === 'home' ? (
        <HomeScreen
          settings={settings}
          onChange={changeSettings}
          onPlay={(mode: GameMode) => {
            if (mode === 'solo' || mode === 'pass') setRoute({ name: 'setup', mode });
            else if (mode === 'host') setRoute({ name: 'host' });
            else setRoute({ name: 'join' });
          }}
          onRules={() => setRoute({ name: 'rules' })}
        />
      ) : null}

      {route.name === 'setup' ? (
        <SetupScreen
          mode={route.mode}
          playerName={settings.playerName}
          onStartSolo={() => setRoute({ name: 'game-solo' })}
          onStartPass={(config) => setRoute({ name: 'game-pass', config })}
          onBack={goHome}
        />
      ) : null}

      {route.name === 'game-solo' ? (
        <LocalGameScreen
          players={[
            { name: settings.playerName, isBot: false },
            { name: 'روبوت 2', isBot: true },
            { name: 'روبوت 3', isBot: true },
            { name: 'روبوت 4', isBot: true },
          ]}
          onExit={goHome}
        />
      ) : null}

      {route.name === 'game-pass' ? (
        <LocalGameScreen players={route.config.players} onExit={goHome} />
      ) : null}

      {route.name === 'host' ? (
        <HostScreen
          playerName={settings.playerName}
          boardShape={settings.boardShape}
          onBack={goHome}
        />
      ) : null}

      {route.name === 'join' ? (
        <JoinScreen playerName={settings.playerName} onBack={goHome} />
      ) : null}

      {route.name === 'rules' ? <RulesScreen onBack={goHome} /> : null}
    </View>
  );
}
