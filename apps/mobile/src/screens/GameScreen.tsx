import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BoardModel } from '@jackaroo/game-board';
import type { GameSnapshot, PlayRequest } from '@jackaroo/game-types';
import { colors, font, radius, spacing } from '../theme';
import { strings } from '../i18n';
import { playSound } from '../audio';
import { hapticLight, hapticMedium, hapticSuccess } from '../haptics';
import { GameBoard, type BoardPreviewInfo } from '../components/Board';
import { HandTray, type TrayAction } from '../components/HandTray';
import { PlayerChips, TurnBanner } from '../components/Hud';
import { Confetti } from '../components/Confetti';
import { Panel, Screen, WoodButton } from '../components/UI';

export interface GameScreenProps {
  snapshot: GameSnapshot | null;
  board: BoardModel;
  viewerId: string;
  handover?: { seat: number; name: string } | null;
  onConfirmHandover?: () => void;
  onPlayCard: (cardId: string, request: PlayRequest) => void;
  onPass: (cardId: string) => void;
  onSevenMove: (marbleId: string, steps: number) => void;
  onSevenEnd: () => void;
  onExit: () => void;
}

export function GameScreen({
  snapshot,
  board,
  viewerId,
  handover,
  onConfirmHandover,
  onPlayCard,
  onPass,
  onSevenMove,
  onSevenEnd,
  onExit,
}: GameScreenProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [focusedMarbleId, setFocusedMarbleId] = useState<string | null>(null);
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);
  const [sevenMarbleId, setSevenMarbleId] = useState<string | null>(null);
  const [sevenSteps, setSevenSteps] = useState(1);

  const prev = useRef<GameSnapshot | null>(null);

  // Sound + haptics from snapshot diffs.
  useEffect(() => {
    if (!snapshot) return;
    const previous = prev.current;
    prev.current = snapshot;

    if (!previous) return;
    if (snapshot.status === 'finished' && previous.status !== 'finished') {
      playSound('win');
      hapticSuccess();
      return;
    }
    if (snapshot.totalCaptures > previous.totalCaptures) {
      playSound('capture');
      hapticMedium();
      return;
    }
    if (snapshot.totalMoves > previous.totalMoves) {
      const someoneHome = snapshot.players.some(
        (p, i) => p.stats.marblesHome > (previous.players[i]?.stats.marblesHome ?? 0),
      );
      if (someoneHome) {
        playSound('home');
        hapticLight();
      } else {
        playSound('move');
        hapticLight();
      }
      return;
    }
    if (snapshot.turnNumber !== previous.turnNumber) {
      playSound('card', 0.6);
    }
  }, [snapshot]);

  const you = snapshot?.you ?? null;
  const isMyTurn = snapshot?.currentPlayerId === viewerId && snapshot?.status === 'active';
  const phase = snapshot?.phase ?? 'finished';
  const inSeven = phase === 'seven';
  const mySeven = inSeven && isMyTurn;

  const legalCards = you?.legalCards ?? [];
  const selectedLegal = useMemo(
    () => legalCards.find((c) => c.cardId === selectedCardId)?.actions ?? [],
    [legalCards, selectedCardId],
  );
  const legalCardIds = useMemo(
    () => new Set(legalCards.filter((c) => c.actions.length > 0).map((c) => c.cardId)),
    [legalCards],
  );
  const forcedDiscard = isMyTurn && phase === 'awaiting-card' && legalCardIds.size === 0;

  const selectedCard = you?.hand.find((c) => c.id === selectedCardId) ?? null;

  const sourceIds = useMemo(() => {
    if (mySeven) return (you?.sevenOptions ?? []).map((o) => o.marbleId);
    if (!selectedCardId || !isMyTurn) return [];
    return selectedLegal
      .filter((a) => a.kind === 'move' || a.kind === 'swap' || a.kind === 'enter')
      .map((a) => (a as { marbleId: string }).marbleId);
  }, [isMyTurn, mySeven, selectedCardId, selectedLegal, you]);

  const enterIds = useMemo(() => {
    if (!selectedCardId || !isMyTurn) return [];
    return selectedLegal
      .filter((a) => a.kind === 'enter')
      .map((a) => (a as { marbleId: string }).marbleId);
  }, [isMyTurn, selectedCardId, selectedLegal]);

  const targetIds = useMemo(() => {
    if (!selectedCardId || !isMyTurn || !swapSourceId) return [];
    return selectedLegal
      .filter((a) => a.kind === 'swap' && (a as { marbleId: string }).marbleId === swapSourceId)
      .map((a) => (a as { targetMarbleId: string }).targetMarbleId);
  }, [isMyTurn, selectedCardId, selectedLegal, swapSourceId]);

  const focusedActions = useMemo(
    () => (focusedMarbleId ? selectedLegal.filter((a) => (a as { marbleId?: string }).marbleId === focusedMarbleId) : []),
    [focusedMarbleId, selectedLegal],
  );

  const preview: BoardPreviewInfo | null = useMemo(() => {
    if (mySeven && sevenMarbleId) {
      const option = (you?.sevenOptions ?? []).find((o) => o.marbleId === sevenMarbleId);
      if (!option) return null;
      const marble = snapshot?.players.flatMap((p) => p.marbles).find((m) => m.id === sevenMarbleId);
      if (!marble || marble.progress === null) return null;
      return { marbleId: sevenMarbleId, toProgress: marble.progress + Math.min(sevenSteps, option.maxSteps) };
    }
    if (!isMyTurn || !selectedCardId) return null;
    const move = focusedActions.find((a) => a.kind === 'move');
    if (move && move.kind === 'move') return { marbleId: move.marbleId, toProgress: move.toProgress };
    const enterAction = focusedActions.find((a) => a.kind === 'enter');
    if (enterAction && enterAction.kind === 'enter') {
      const marble = snapshot?.players.flatMap((p) => p.marbles).find((m) => m.id === enterAction.marbleId);
      if (marble) return { marbleId: marble.id, toProgress: 0 };
    }
    return null;
  }, [focusedActions, isMyTurn, mySeven, selectedCardId, sevenMarbleId, sevenSteps, snapshot, you]);

  const handleMarblePress = (marbleId: string) => {
    if (!isMyTurn) return;
    hapticLight();

    if (mySeven) {
      const option = (you?.sevenOptions ?? []).find((o) => o.marbleId === marbleId);
      if (!option) return;
      setSevenMarbleId(marbleId);
      setSevenSteps(1);
      return;
    }

    if (!selectedCardId) return;

    if (swapSourceId && targetIds.includes(marbleId)) {
      const action = selectedLegal.find(
        (a) => a.kind === 'swap' && (a as { marbleId: string }).marbleId === swapSourceId && (a as { targetMarbleId: string }).targetMarbleId === marbleId,
      );
      if (action && action.kind === 'swap') {
        onPlayCard(selectedCardId, {
          kind: 'swap',
          marbleId: action.marbleId,
          targetPlayerId: action.targetPlayerId,
          targetMarbleId: action.targetMarbleId,
        });
        resetSelection();
      }
      return;
    }

    const marbleActions = selectedLegal.filter((a) => (a as { marbleId?: string }).marbleId === marbleId);
    const enter = marbleActions.find((a) => a.kind === 'enter');
    if (enter && enter.kind === 'enter') {
      onPlayCard(selectedCardId, { kind: 'enter', marbleId: enter.marbleId });
      resetSelection();
      return;
    }
    const moves = marbleActions.filter((a) => a.kind === 'move');
    if (moves.length === 1 && moves[0]?.kind === 'move') {
      onPlayCard(selectedCardId, { kind: 'move', marbleId: moves[0].marbleId, steps: moves[0].steps });
      resetSelection();
      return;
    }
    if (moves.length > 1) {
      setFocusedMarbleId(marbleId);
      return;
    }
    const swaps = marbleActions.filter((a) => a.kind === 'swap');
    if (swaps.length > 0) {
      if (swapSourceId === marbleId) {
        setSwapSourceId(null);
        setFocusedMarbleId(null);
      } else {
        setSwapSourceId(marbleId);
        setFocusedMarbleId(marbleId);
      }
    }
  };

  const resetSelection = () => {
    setSelectedCardId(null);
    setFocusedMarbleId(null);
    setSwapSourceId(null);
    setSevenMarbleId(null);
    setSevenSteps(1);
  };

  const prompt = useMemo(() => {
    if (snapshot?.status === 'finished') {
      return { title: strings.noWinner, detail: strings.appName, tone: 'wait' as const };
    }
    if (mySeven) {
      return {
        title: sevenMarbleId ? strings.splitHint : strings.sevenTitle,
        detail: strings.sevenLeft(snapshot?.seven?.remaining ?? 0),
        tone: 'seven' as const,
      };
    }
    if (!isMyTurn) {
      const current = snapshot?.players.find((p) => p.id === snapshot?.currentPlayerId);
      return {
        title: current ? strings.turnOf(current.name) : strings.appName,
        detail: strings.round(snapshot?.round ?? 1),
        tone: 'wait' as const,
      };
    }
    if (forcedDiscard) {
      return { title: strings.noMoves, detail: strings.discardHint, tone: 'danger' as const };
    }
    if (!selectedCardId) {
      return { title: strings.yourTurn, detail: strings.yourHand, tone: 'you' as const };
    }
    if (selectedCard?.rank === '7') {
      return { title: strings.sevenTitle, detail: strings.splitHint, tone: 'seven' as const };
    }
    if (enterIds.length > 0) {
      return { title: strings.enterBoard, detail: strings.chooseMarble, tone: 'you' as const };
    }
    if (selectedLegal.some((a) => a.kind === 'swap')) {
      return {
        title: swapSourceId ? strings.chooseTarget : strings.chooseSwap,
        detail: strings.chooseMarble,
        tone: 'you' as const,
      };
    }
    return { title: strings.chooseMarble, detail: strings.yourHand, tone: 'you' as const };
  }, [
    enterIds.length,
    forcedDiscard,
    isMyTurn,
    mySeven,
    selectedCard?.rank,
    selectedCardId,
    selectedLegal,
    sevenMarbleId,
    snapshot,
    swapSourceId,
  ]);

  const actions: TrayAction[] = useMemo(() => {
    if (mySeven) {
      const option = (you?.sevenOptions ?? []).find((o) => o.marbleId === sevenMarbleId);
      const list: TrayAction[] = [];
      if (option) {
        for (let step = 1; step <= option.maxSteps; step += 1) {
          list.push({
            key: `seven-${step}`,
            label: `${step}`,
            variant: 'secondary',
            onPress: () => setSevenSteps(step),
          });
        }
        list.push({
          key: 'seven-move',
          label: strings.moveSteps(sevenSteps),
          variant: 'primary',
          onPress: () => {
            if (sevenMarbleId) onSevenMove(sevenMarbleId, Math.min(sevenSteps, option.maxSteps));
            setSevenMarbleId(null);
            setSevenSteps(1);
          },
        });
      }
      if ((snapshot?.seven?.segments.length ?? 0) > 0) {
        list.push({
          key: 'seven-end',
          label: strings.endSeven,
          variant: 'danger',
          onPress: () => {
            onSevenEnd();
            resetSelection();
          },
        });
      }
      return list;
    }

    if (forcedDiscard) {
      if (!selectedCardId) return [];
      return [
        {
          key: 'discard',
          label: strings.discard,
          variant: 'danger',
          onPress: () => {
            if (selectedCardId) onPass(selectedCardId);
            resetSelection();
          },
        },
      ];
    }

    if (selectedCard?.rank === '7' && isMyTurn) {
      const action = selectedLegal.find((a) => a.kind === 'begin-seven');
      if (!action) return [];
      return [
        {
          key: 'start-seven',
          label: strings.sevenTitle,
          variant: 'primary',
          onPress: () => {
            if (selectedCardId) onPlayCard(selectedCardId, { kind: 'begin-seven' });
            resetSelection();
          },
        },
      ];
    }

    if (focusedActions.length > 1) {
      return focusedActions
        .filter((a) => a.kind === 'move' || a.kind === 'enter')
        .map((action, index) => ({
          key: `choice-${index}`,
          label:
            action.kind === 'move'
              ? action.direction === 'backward'
                ? strings.backSteps(action.steps)
                : strings.moveSteps(action.steps)
              : strings.enterBoard,
          variant: 'primary' as const,
          onPress: () => {
            if (action.kind === 'move') {
              onPlayCard(selectedCardId!, { kind: 'move', marbleId: action.marbleId, steps: action.steps });
            } else if (action.kind === 'enter') {
              onPlayCard(selectedCardId!, { kind: 'enter', marbleId: action.marbleId });
            }
            resetSelection();
          },
        }));
    }

    if (swapSourceId) {
      return [
        {
          key: 'cancel-swap',
          label: strings.back,
          variant: 'secondary',
          onPress: () => {
            setSwapSourceId(null);
            setFocusedMarbleId(null);
          },
        },
      ];
    }

    return [];
  }, [
    focusedActions,
    forcedDiscard,
    isMyTurn,
    onPass,
    onPlayCard,
    onSevenEnd,
    onSevenMove,
    selectedCard?.rank,
    selectedCardId,
    selectedLegal,
    sevenMarbleId,
    sevenSteps,
    snapshot,
    you,
  ]);

  if (!snapshot) {
    return (
      <Screen center>
        <Text style={styles.loading}>{strings.connecting}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        <View style={styles.headerActions}>
          <WoodButton title={strings.rules} variant="ghost" onPress={() => undefined} style={styles.rulesGhost} />
          <WoodButton title={strings.exit} variant="ghost" onPress={onExit} style={styles.rulesGhost} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <PlayerChips snapshot={snapshot} viewerId={viewerId} />
        <TurnBanner snapshot={snapshot} viewerId={viewerId} />

        <View style={styles.boardWrap}>
          <GameBoard
            board={board}
            players={snapshot.players}
            size={boardWidth}
            highlights={{
              sourceIds,
              enterIds,
              targetIds,
              focusedId: focusedMarbleId ?? swapSourceId ?? sevenMarbleId,
            }}
            preview={preview}
            onMarblePress={handleMarblePress}
          />
        </View>
      </ScrollView>

      <HandTray
        hand={you?.hand ?? []}
        legalCardIds={forcedDiscard ? new Set((you?.hand ?? []).map((c) => c.id)) : legalCardIds}
        selectedCardId={selectedCardId}
        onSelectCard={(cardId) => {
          setSelectedCardId(cardId);
          setFocusedMarbleId(null);
          setSwapSourceId(null);
          setSevenMarbleId(null);
          playSound('card', 0.7);
        }}
        promptTitle={prompt.title}
        promptDetail={prompt.detail}
        tone={prompt.tone}
        actions={actions}
        pending={false}
      />

      {/* Pass & play handover */}
      {handover ? (
        <View style={styles.overlay}>
          <Panel style={styles.handoverPanel}>
            <Text style={styles.handoverTitle}>{strings.passDevice(handover.name)}</Text>
            <WoodButton title={strings.imReady} onPress={onConfirmHandover} />
          </Panel>
        </View>
      ) : null}

      {/* Victory */}
      {snapshot.status === 'finished' ? (
        <View style={styles.overlay}>
          <Confetti />
          <Panel style={styles.handoverPanel}>
            <Text style={styles.handoverTitle}>
              {strings.winner(teamName(snapshot.winnerTeamId))}
            </Text>
            <WoodButton title={strings.menu} onPress={onExit} />
          </Panel>
        </View>
      ) : null}
    </Screen>
  );
}

function teamName(teamId: number | null): string {
  if (teamId === null) return strings.appName;
  return colors.teams[teamId % colors.teams.length]?.name ?? strings.appName;
}

// Board sizing: use a fixed reasonable width; the board scales via the SVG viewBox.
const boardWidth = 340;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 0,
  },
  headerActions: { flexDirection: 'row-reverse', gap: spacing.xs },
  rulesGhost: { minHeight: 36, paddingVertical: 6, paddingHorizontal: spacing.md },
  scroll: { padding: spacing.md, paddingBottom: spacing.lg },
  boardWrap: { alignItems: 'center', marginTop: spacing.sm },
  loading: {
    color: 'rgba(246,234,210,0.6)',
    fontFamily: font.regular,
    fontSize: 14,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20,6,4,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 40,
  },
  handoverPanel: { width: '100%', maxWidth: 340, borderRadius: radius.lg },
  handoverTitle: {
    color: colors.ivory,
    fontFamily: font.bold,
    fontSize: 20,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: spacing.lg,
  },
});
