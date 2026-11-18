import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { createBoardModel } from '@jackaroo/game-board';
import type { GameSnapshot, PlayRequest } from '@jackaroo/game-types';
import { colors, font, radius, spacing } from '../theme';
import { strings } from '../i18n';
import { Panel, Screen, SectionTitle, WoodButton } from '../components/UI';
import { GameScreen } from './GameScreen';
import { ClientConnection, type ClientSnapshot } from '../net/ClientConnection';

export function JoinScreen({
  playerName,
  onBack,
}: {
  playerName: string;
  onBack: () => void;
}) {
  const [ip, setIp] = useState('');
  const [client] = useState(() => new ClientConnection());
  const [state, setState] = useState<ClientSnapshot>(client.snapshot);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    client.onUpdate = (next) => setState(next);
    return () => {
      client.close();
    };
  }, [client]);

  const connect = async () => {
    const host = ip.trim();
    if (!host) return;
    setConnecting(true);
    try {
      await client.connect(host, playerName);
    } catch {
      // error already reflected in state
    } finally {
      setConnecting(false);
    }
  };

  // Once the host starts the match, swap to the game view.
  if (state.status === 'playing' && state.snapshot) {
    return (
      <ClientGameScreen
        client={client}
        onExit={() => {
          client.close();
          onBack();
        }}
      />
    );
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{strings.playLanJoin}</Text>
        <WoodButton title={strings.back} variant="ghost" onPress={onBack} style={styles.back} />
      </View>

      <Panel>
        <SectionTitle>{strings.hostAddress}</SectionTitle>
        <TextInput
          style={styles.input}
          value={ip}
          onChangeText={setIp}
          placeholder="192.168.1.5"
          placeholderTextColor="rgba(246,234,210,0.3)"
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>{strings.joinInstructions}</Text>

        {state.status === 'error' || state.error ? (
          <Text style={styles.error}>{state.error ?? strings.connectionFailed}</Text>
        ) : null}

        {state.status === 'lobby' ? (
          <View style={styles.connectedBox}>
            <Text style={styles.connected}>{strings.connected}</Text>
            {state.lobbyPlayers.map((player) => (
              <Text key={player.seat} style={styles.player}>
                {player.name}
                {player.isHost ? ` · ${strings.host}` : ''}
              </Text>
            ))}
          </View>
        ) : null}

        <WoodButton
          title={connecting ? strings.connecting : strings.confirm}
          onPress={connect}
          disabled={connecting || !ip.trim()}
          style={styles.connect}
        />
      </Panel>
    </Screen>
  );
}

function ClientGameScreen({ client, onExit }: { client: ClientConnection; onExit: () => void }) {
  const [state, setState] = useState<ClientSnapshot>(client.snapshot);

  useEffect(() => {
    client.onUpdate = (next) => setState(next);
    return () => {
      client.onUpdate = () => undefined;
    };
  }, [client]);

  const board = useMemo(() => {
    const snapshot: GameSnapshot | null = state.snapshot;
    if (!snapshot) return createBoardModel(4, { shape: 'circle' });
    return createBoardModel(snapshot.playerCount, {
      ringLength: snapshot.rules.ringLength,
      homeLaneLength: snapshot.rules.homeLaneLength,
      safePositions: snapshot.rules.safePositions,
    });
  }, [state.snapshot]);

  const viewerId = state.snapshot?.you?.playerId ?? '';

  if (state.status === 'closed') {
    return (
      <Screen center>
        <Panel style={styles.closedPanel}>
          <Text style={styles.closedText}>{state.error ?? strings.hostLeft}</Text>
          <WoodButton title={strings.menu} onPress={onExit} />
        </Panel>
      </Screen>
    );
  }

  return (
    <GameScreen
      snapshot={state.snapshot}
      board={board}
      viewerId={viewerId}
      onPlayCard={(cardId: string, request: PlayRequest) => client.playCard(cardId, request)}
      onPass={(cardId: string) => client.pass(cardId)}
      onSevenMove={(marbleId: string, steps: number) => client.sevenMove(marbleId, steps)}
      onSevenEnd={() => client.sevenEnd()}
      onExit={onExit}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  },
  title: {
    color: colors.ivory,
    fontFamily: font.bold,
    fontSize: 26,
    textAlign: 'right',
    writingDirection: 'rtl',
    flex: 1,
  },
  back: { minHeight: 38 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldSoft,
    color: colors.ivory,
    fontFamily: font.regular,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    textAlign: 'center',
  },
  hint: {
    color: 'rgba(246,234,210,0.5)',
    fontFamily: font.regular,
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontFamily: font.regular,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  connectedBox: { marginTop: spacing.md, alignItems: 'center', gap: 4 },
  connected: {
    color: colors.success,
    fontFamily: font.bold,
    fontSize: 13,
    marginBottom: 4,
  },
  player: {
    color: 'rgba(246,234,210,0.8)',
    fontFamily: font.regular,
    fontSize: 13,
  },
  connect: { marginTop: spacing.md },
  closedPanel: { width: '100%', maxWidth: 320 },
  closedText: {
    color: colors.ivory,
    fontFamily: font.bold,
    fontSize: 16,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: spacing.lg,
  },
});
