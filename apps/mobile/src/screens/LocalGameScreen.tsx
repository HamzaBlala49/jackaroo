import React, { useMemo } from 'react';
import { Text } from 'react-native';
import { createBoardModel } from '@jackaroo/game-board';
import { colors, font, spacing } from '../theme';
import { strings } from '../i18n';
import { Panel, Screen, WoodButton } from '../components/UI';
import { Confetti } from '../components/Confetti';
import { GameScreen } from './GameScreen';
import { useLocalGame } from '../game/useLocalGame';

export function LocalGameScreen({
  players,
  onExit,
}: {
  players: { name: string; isBot: boolean }[];
  onExit: () => void;
}) {
  const game = useLocalGame({ players });
  const viewerId = `p${game.viewerSeat}`;

  const board = useMemo(
    () =>
      createBoardModel(game.state.playerCount, {
        ringLength: game.state.rules.board.ringLength,
        homeLaneLength: game.state.rules.board.homeLaneLength,
        safePositions: game.state.rules.safePositions,
      }),
    [game.state.playerCount, game.state.rules.board, game.state.rules.safePositions],
  );

  if (!game.snapshot) {
    return (
      <Screen center>
        <Panel style={{ width: 280 }}>
          <WoodButton title={strings.menu} onPress={onExit} />
        </Panel>
      </Screen>
    );
  }

  if (game.state.status === 'finished') {
    const winnerTeam = game.state.winnerTeamId;
    const teamName = winnerTeam !== null ? colors.teams[winnerTeam % colors.teams.length]?.name : strings.appName;
    const durationSeconds = Math.max(
      0,
      Math.round((Date.now() - new Date(game.state.startedAt).getTime()) / 1000),
    );

    return (
      <Screen center>
        <Confetti />
        <Panel style={{ width: '100%', maxWidth: 340 }}>
          <Text
            style={{
              color: colors.ivory,
              fontFamily: font.bold,
              fontSize: 26,
              textAlign: 'center',
              writingDirection: 'rtl',
              marginBottom: spacing.md,
            }}
          >
            {strings.winner(teamName)}
          </Text>
          <Text
            style={{
              color: 'rgba(246,234,210,0.7)',
              fontFamily: font.regular,
              fontSize: 14,
              textAlign: 'center',
              writingDirection: 'rtl',
              marginBottom: spacing.sm,
            }}
          >
            {`${strings.matchTime}: ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, '0')}`}
          </Text>
          <Text
            style={{
              color: 'rgba(246,234,210,0.7)',
              fontFamily: font.regular,
              fontSize: 14,
              textAlign: 'center',
              writingDirection: 'rtl',
              marginBottom: spacing.lg,
            }}
          >
            {`${strings.moves}: ${game.state.totalMoves} · ${strings.captures}: ${game.state.totalCaptures}`}
          </Text>
          <WoodButton title={strings.again} onPress={game.restart} style={{ marginBottom: spacing.sm }} />
          <WoodButton title={strings.menu} variant="secondary" onPress={onExit} />
        </Panel>
      </Screen>
    );
  }

  return (
    <GameScreen
      snapshot={game.snapshot}
      board={board}
      viewerId={viewerId}
      handover={game.handover}
      onConfirmHandover={game.confirmHandover}
      onPlayCard={game.playCard}
      onPass={game.pass}
      onSevenMove={game.sevenMove}
      onSevenEnd={game.sevenEnd}
      onExit={onExit}
    />
  );
}
