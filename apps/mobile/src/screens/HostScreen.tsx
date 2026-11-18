import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Network from 'expo-network';
import { createBoardModel, type BoardModel } from '@jackaroo/game-board';
import type { GameSnapshot, PlayRequest } from '@jackaroo/game-types';
import { colors, font, spacing } from '../theme';
import { strings } from '../i18n';
import { Panel, Screen, SectionTitle, WoodButton } from '../components/UI';
import { GameScreen } from './GameScreen';
import { HostServer, type HostSnapshot } from '../net/HostServer';

export function HostScreen({
  playerName,
  boardShape,
  onBack,
}: {
  playerName: string;
  boardShape: BoardModel['shape'];
  onBack: () => void;
}) {
  const [address, setAddress] = useState('…');
  const [fillWithBots, setFillWithBots] = useState(true);
  const [hostSnapshot, setHostSnapshot] = useState<HostSnapshot | null>(null);
  const serverRef = useRef<HostServer | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ip = await Network.getIpAddressAsync();
        if (!cancelled) setAddress(ip || 'غير معروف');
      } catch {
        if (!cancelled) setAddress('غير معروف');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureServer = useCallback((): HostServer | null => {
    if (serverRef.current) return serverRef.current;
    const server = new HostServer(
      { hostName: playerName, playerCount: 4, fillWithBots, boardShape },
      address,
    );
    server.onUpdate = (snapshot) => setHostSnapshot(snapshot);
    serverRef.current = server;
    server
      .listen()
      .then(() => setHostSnapshot(server.snapshot))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'تعذر بدء الاستضافة'));
    return server;
  }, [address, boardShape, fillWithBots, playerName]);

  useEffect(() => {
    return () => {
      serverRef.current?.close();
      serverRef.current = null;
    };
  }, []);

  const start = () => {
    const server = ensureServer();
    if (!server) return;
    server.startGame();
    setStarted(true);
  };

  if (started && serverRef.current) {
    return (
      <HostGameScreen
        server={serverRef.current}
        onExit={() => {
          serverRef.current?.close();
          serverRef.current = null;
          onBack();
        }}
      />
    );
  }

  const players = hostSnapshot?.players ?? [
    { seat: 0, name: playerName, isHost: true, connected: true, isBot: false },
  ];
  const humanCount = players.filter((p) => !p.isBot).length;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={styles.title}>{strings.playLanHost}</Text>
        <WoodButton title={strings.back} variant="ghost" onPress={onBack} style={styles.back} />
      </View>

      <Panel style={styles.gapPanel}>
        <SectionTitle>{strings.hostingOn}</SectionTitle>
        <Text style={styles.ip}>{address}:4242</Text>
        <Text style={styles.hint}>{strings.joinInstructions}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Panel>

      <Panel style={styles.gapPanel}>
        <SectionTitle>{strings.playersInRoom}</SectionTitle>
        {players.map((player) => (
          <View key={player.seat} style={styles.playerRow}>
            <Text style={styles.playerName}>
              {player.name}
              {player.isHost ? ` · ${strings.host}` : ''}
            </Text>
            <View style={[styles.dot, { backgroundColor: player.connected ? colors.success : colors.offline }]} />
          </View>
        ))}
        <Text style={styles.hint}>
          {humanCount < 4
            ? strings.waitingForPlayers
            : 'الغرفة جاهزة'}
        </Text>
      </Panel>

      <Panel style={styles.gapPanel}>
        <WoodButton
          title={strings.fillWithBots}
          variant={fillWithBots ? 'primary' : 'secondary'}
          onPress={() => setFillWithBots((v) => !v)}
        />
      </Panel>

      <WoodButton
        title={strings.startGame}
        onPress={start}
        style={styles.start}
        disabled={hostSnapshot?.error != null}
      />
    </Screen>
  );
}

function HostGameScreen({ server, onExit }: { server: HostServer; onExit: () => void }) {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(() =>
    server.game ? server.hostSnapshot() : null,
  );

  useEffect(() => {
    server.onUpdate = () => {
      setSnapshot(server.game ? server.hostSnapshot() : null);
    };
    return () => {
      server.onUpdate = () => undefined;
    };
  }, [server]);

  const board = useMemo(() => {
    const game = server.game;
    if (!game) {
      return createBoardModel(4, { shape: 'circle' });
    }
    return createBoardModel(game.playerCount, {
      ringLength: game.rules.board.ringLength,
      homeLaneLength: game.rules.board.homeLaneLength,
      safePositions: game.rules.safePositions,
    });
  }, [server, snapshot]);

  return (
    <GameScreen
      snapshot={snapshot}
      board={board}
      viewerId="p0"
      onPlayCard={(cardId, request: PlayRequest) => server.hostPlay(cardId, request)}
      onPass={(cardId) => server.hostPass(cardId)}
      onSevenMove={(marbleId, steps) => server.hostSevenMove(marbleId, steps)}
      onSevenEnd={() => server.hostSevenEnd()}
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
  gapPanel: { marginBottom: spacing.md },
  ip: {
    color: colors.goldPale,
    fontFamily: font.bold,
    fontSize: 22,
    textAlign: 'center',
    marginVertical: spacing.sm,
    letterSpacing: 1,
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
  playerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 6,
  },
  playerName: {
    color: colors.ivory,
    fontFamily: font.medium,
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  start: { marginTop: spacing.lg },
});
