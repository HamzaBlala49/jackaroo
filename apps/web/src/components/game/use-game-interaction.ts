'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type {
  Card,
  GameSnapshot,
  LegalAction,
  PlayRequest,
} from '@jackaroo/game-types';
import type { BoardPreview } from '@/components/board/game-board';
import { useGameActions } from '@/hooks/use-game-actions';
import { useGameStore } from '@/stores/game-store';
import { useUiStore } from '@/stores/ui-store';
import { soundManager } from '@/lib/sound';

function toRequest(action: LegalAction): PlayRequest {
  switch (action.kind) {
    case 'enter':
      return { kind: 'enter', marbleId: action.marbleId };
    case 'move':
      return { kind: 'move', marbleId: action.marbleId, steps: action.steps };
    case 'swap':
      return {
        kind: 'swap',
        marbleId: action.marbleId,
        targetPlayerId: action.targetPlayerId,
        targetMarbleId: action.targetMarbleId,
      };
    case 'begin-seven':
      return { kind: 'begin-seven' };
  }
}

function actionPreview(action: LegalAction): BoardPreview | null {
  switch (action.kind) {
    case 'enter':
      return { kind: 'enter', marbleId: action.marbleId };
    case 'move':
      return { kind: 'move', marbleId: action.marbleId, toProgress: action.toProgress };
    case 'swap':
      return { kind: 'swap', marbleId: action.marbleId, targetMarbleId: action.targetMarbleId };
    case 'begin-seven':
      return null;
  }
}

function hasMarbleId(action: LegalAction): action is Exclude<LegalAction, { kind: 'begin-seven' }> {
  return action.kind !== 'begin-seven';
}

function findMarbleOwner(snapshot: GameSnapshot, marbleId: string) {
  for (const player of snapshot.players) {
    const marble = player.marbles.find((entry) => entry.id === marbleId);
    if (marble) return { player, marble };
  }
  return null;
}

export type InteractionPromptTone = 'your-turn' | 'waiting' | 'danger' | 'seven';

export function useGameInteraction(code: string) {
  const snapshot = useGameStore((state) => state.snapshot);
  const actions = useGameActions(code);
  const selectedCardId = useUiStore((state) => state.selectedCardId);
  const focusedMarbleId = useUiStore((state) => state.focusedMarbleId);
  const swapSourceMarbleId = useUiStore((state) => state.swapSourceMarbleId);
  const sevenMarbleId = useUiStore((state) => state.sevenMarbleId);
  const sevenSteps = useUiStore((state) => state.sevenSteps);
  const setSelectedCard = useUiStore((state) => state.setSelectedCard);
  const setFocusedMarble = useUiStore((state) => state.setFocusedMarble);
  const setSwapSource = useUiStore((state) => state.setSwapSource);
  const setSevenSelection = useUiStore((state) => state.setSevenSelection);
  const setSevenSteps = useUiStore((state) => state.setSevenSteps);
  const clearAll = useUiStore((state) => state.clearAll);

  const [hoveredMarbleId, setHoveredMarbleId] = React.useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = React.useState<LegalAction | null>(null);

  const you = snapshot?.you ?? null;
  const currentPlayer = snapshot?.currentPlayerId
    ? snapshot.players.find((player) => player.id === snapshot.currentPlayerId)
    : undefined;
  const isMyTurn = Boolean(snapshot && you && snapshot.currentPlayerId === you.playerId);
  const hand = you?.hand ?? [];
  const legalCards = you?.legalCards ?? [];
  const phase = snapshot?.phase ?? 'finished';
  const inSeven = phase === 'seven';
  const seven = snapshot?.seven ?? null;
  const sevenOptions = you?.sevenOptions ?? [];
  const selectedCard = hand.find((card) => card.id === selectedCardId) ?? null;
  const selectedActions = React.useMemo(
    () => legalCards.find((card) => card.cardId === selectedCardId)?.actions ?? [],
    [legalCards, selectedCardId],
  );
  const hasAnyLegalAction = legalCards.some((card) => card.actions.length > 0);
  const forcedDiscard = isMyTurn && phase === 'awaiting-card' && !hasAnyLegalAction;
  const canInteract = Boolean(isMyTurn && !actions.pending && snapshot);

  React.useEffect(() => {
    if (!snapshot) return;
    if (!isMyTurn) clearAll();
  }, [clearAll, isMyTurn, snapshot]);

  React.useEffect(() => {
    if (phase !== 'awaiting-card' && selectedCardId) setSelectedCard(null);
  }, [phase, selectedCardId, setSelectedCard]);

  React.useEffect(() => {
    if (selectedCardId && !selectedCard) setSelectedCard(null);
  }, [selectedCard, selectedCardId, setSelectedCard]);

  React.useEffect(() => {
    if (sevenMarbleId && !sevenOptions.some((option) => option.marbleId === sevenMarbleId)) {
      setSevenSelection(null, 1);
    }
  }, [sevenMarbleId, sevenOptions, setSevenSelection]);

  const sourceIds = React.useMemo(() => {
    if (!canInteract) return [];
    if (inSeven) return sevenOptions.map((option) => option.marbleId);
    if (phase !== 'awaiting-card' || !selectedCard) return [];
    const ids = new Set<string>();
    for (const action of selectedActions) {
      if (action.kind === 'move' || action.kind === 'swap') ids.add(action.marbleId);
    }
    return [...ids];
  }, [canInteract, inSeven, phase, selectedActions, selectedCard, sevenOptions]);

  const enterIds = React.useMemo(() => {
    if (!canInteract || phase !== 'awaiting-card' || !selectedCard) return [];
    return selectedActions.filter((action) => action.kind === 'enter').map((action) => action.marbleId);
  }, [canInteract, phase, selectedActions, selectedCard]);

  const targetIds = React.useMemo(() => {
    if (!canInteract || phase !== 'awaiting-card' || !selectedCard || !swapSourceMarbleId) {
      return [];
    }
    return selectedActions
      .filter(
        (action): action is Extract<LegalAction, { kind: 'swap' }> =>
          action.kind === 'swap' && action.marbleId === swapSourceMarbleId,
      )
      .map((action) => action.targetMarbleId);
  }, [canInteract, phase, selectedActions, selectedCard, swapSourceMarbleId]);

  const focusedActions = React.useMemo(() => {
    if (!focusedMarbleId || !selectedCard) return [];
    return selectedActions
      .filter(hasMarbleId)
      .filter((action) => action.marbleId === focusedMarbleId);
  }, [focusedMarbleId, selectedActions, selectedCard]);

  const preview = React.useMemo<BoardPreview | null>(() => {
    if (!snapshot || !canInteract) return null;
    if (inSeven) {
      const activeId = hoveredMarbleId ?? sevenMarbleId;
      if (!activeId) return null;
      const option = sevenOptions.find((entry) => entry.marbleId === activeId);
      const owner = findMarbleOwner(snapshot, activeId);
      if (!option || !owner || owner.marble.progress === null) return null;
      const steps = Math.min(sevenSteps, option.maxSteps);
      if (steps < 1) return null;
      return {
        kind: 'move',
        marbleId: activeId,
        toProgress: owner.marble.progress + steps,
      };
    }
    if (phase !== 'awaiting-card' || !selectedCard) return null;
    if (hoveredAction) return actionPreview(hoveredAction);
    const activeId = hoveredMarbleId ?? focusedMarbleId;
    if (!activeId) return null;

    if (swapSourceMarbleId) {
      const targetAction = selectedActions.find(
        (action) =>
          action.kind === 'swap' &&
          action.marbleId === swapSourceMarbleId &&
          action.targetMarbleId === activeId,
      );
      if (targetAction) return actionPreview(targetAction);
      return null;
    }

    const activeActions = selectedActions.filter(hasMarbleId).filter((action) => action.marbleId === activeId);
    const enter = activeActions.find((action) => action.kind === 'enter');
    if (enter) return actionPreview(enter);
    const move = activeActions.find((action) => action.kind === 'move');
    if (move) return actionPreview(move);
    return null;
  }, [
    canInteract,
    focusedMarbleId,
    hoveredAction,
    hoveredMarbleId,
    inSeven,
    phase,
    selectedActions,
    selectedCard,
    sevenMarbleId,
    sevenOptions,
    sevenSteps,
    snapshot,
    swapSourceMarbleId,
  ]);

  const playAction = React.useCallback(
    async (action: LegalAction, card: Card | null = selectedCard) => {
      if (!card) return false;
      const ok = await actions.playCard(card.id, toRequest(action));
      if (ok) {
        setHoveredAction(null);
        setHoveredMarbleId(null);
      }
      return ok;
    },
    [actions, selectedCard],
  );

  const selectCard = React.useCallback(
    (card: Card) => {
      if (!canInteract || phase !== 'awaiting-card') return;
      const cardActions = legalCards.find((entry) => entry.cardId === card.id)?.actions ?? [];
      if (!forcedDiscard && cardActions.length === 0) {
        toast.info('That card has no legal move right now.');
        return;
      }
      soundManager.play('click');
      setSelectedCard(selectedCardId === card.id ? null : card.id);
      setHoveredAction(null);
      setHoveredMarbleId(null);
    },
    [canInteract, forcedDiscard, legalCards, phase, selectedCardId, setSelectedCard],
  );

  const handleMarbleHover = React.useCallback(
    (marbleId: string | null) => {
      setHoveredMarbleId(marbleId);
      if (!marbleId) return;
      setHoveredAction(null);
    },
    [],
  );

  const handleMarbleClick = React.useCallback(
    (marbleId: string) => {
      if (!canInteract || !snapshot) return;
      soundManager.play('click');

      if (inSeven) {
        const option = sevenOptions.find((entry) => entry.marbleId === marbleId);
        if (!option) return;
        setSevenSelection(marbleId, Math.min(sevenSteps, option.maxSteps));
        setHoveredAction(null);
        return;
      }

      if (phase !== 'awaiting-card' || !selectedCard) return;

      if (swapSourceMarbleId && targetIds.includes(marbleId)) {
        const action = selectedActions.find(
          (entry) =>
            entry.kind === 'swap' &&
            entry.marbleId === swapSourceMarbleId &&
            entry.targetMarbleId === marbleId,
        );
        if (action) void playAction(action);
        return;
      }

      const marbleActions = selectedActions.filter(hasMarbleId).filter((action) => action.marbleId === marbleId);
      const enter = marbleActions.find((action) => action.kind === 'enter');
      if (enter) {
        void playAction(enter);
        return;
      }
      const swap = marbleActions.filter(
        (action): action is Extract<LegalAction, { kind: 'swap' }> => action.kind === 'swap',
      );
      if (swap.length > 0) {
        if (swapSourceMarbleId === marbleId) {
          setSwapSource(null);
          setFocusedMarble(null);
        } else {
          setSwapSource(marbleId);
          setFocusedMarble(marbleId);
        }
        setHoveredAction(null);
        return;
      }
      const moves = marbleActions.filter(
        (action): action is Extract<LegalAction, { kind: 'move' }> => action.kind === 'move',
      );
      if (moves.length === 1) {
        void playAction(moves[0]!);
        return;
      }
      if (moves.length > 1) {
        setFocusedMarble(marbleId);
        setHoveredAction(moves[0] ?? null);
      }
    },
    [
      canInteract,
      inSeven,
      phase,
      playAction,
      selectedActions,
      selectedCard,
      setFocusedMarble,
      setSevenSelection,
      setSwapSource,
      sevenOptions,
      sevenSteps,
      snapshot,
      swapSourceMarbleId,
      targetIds,
    ],
  );

  const startSeven = React.useCallback(async () => {
    if (!selectedCard) return;
    const action = selectedActions.find((entry) => entry.kind === 'begin-seven');
    if (!action) return;
    await playAction(action);
  }, [playAction, selectedActions, selectedCard]);

  const confirmSeven = React.useCallback(async () => {
    if (!sevenMarbleId) return;
    const option = sevenOptions.find((entry) => entry.marbleId === sevenMarbleId);
    if (!option) return;
    const steps = Math.min(sevenSteps, option.maxSteps);
    setHoveredAction(null);
    setHoveredMarbleId(null);
    await actions.makeSevenMove(sevenMarbleId, steps);
  }, [actions, sevenMarbleId, sevenOptions, sevenSteps]);

  const endSeven = React.useCallback(async () => {
    await actions.endSevenTurn();
  }, [actions]);

  const discardSelected = React.useCallback(async () => {
    if (!selectedCard || !forcedDiscard) return;
    await actions.pass(selectedCard.id);
  }, [actions, forcedDiscard, selectedCard]);

  const cancelSelection = React.useCallback(() => {
    setSelectedCard(null);
    setHoveredAction(null);
    setHoveredMarbleId(null);
  }, [setSelectedCard]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectedCardId) cancelSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelSelection, selectedCardId]);

  const selectedSevenOption = sevenOptions.find((option) => option.marbleId === sevenMarbleId);
  const eyeSevenMax = selectedSevenOption?.maxSteps ?? Math.max(1, seven?.remaining ?? 1);

  const prompt: {
    title: string;
    detail: string;
    tone: InteractionPromptTone;
  } = React.useMemo(() => {
    if (!snapshot) return { title: '', detail: '', tone: 'waiting' };
    if (snapshot.status === 'finished') {
      return { title: 'The table has spoken.', detail: 'Final scores are on the way.', tone: 'your-turn' };
    }
    if (!isMyTurn) {
      return {
        title: currentPlayer ? `${currentPlayer.name}'s turn` : 'Waiting for the table',
        detail: inSeven
          ? `${currentPlayer?.name ?? 'A player'} is splitting seven steps.`
          : 'You can inspect the board and the rules while you wait.',
        tone: 'waiting',
      };
    }
    if (inSeven) {
      return {
        title: sevenMarbleId ? 'Choose the split steps' : 'Distribute your seven',
        detail: sevenMarbleId
          ? `Move ${sevenSteps} of ${seven?.remaining ?? 0} remaining steps.`
          : `${seven?.remaining ?? 0} steps remain. Choose a marble to move.`,
        tone: 'seven',
      };
    }
    if (forcedDiscard) {
      return {
        title: 'No legal moves',
        detail: 'Choose one card to discard face-up. The turn will pass.',
        tone: 'danger',
      };
    }
    if (!selectedCard) {
      return {
        title: 'Your turn',
        detail: 'Choose a card. The table only shows moves you can actually make.',
        tone: 'your-turn',
      };
    }
    if (selectedCard.rank === '7') {
      return {
        title: 'Seven, split',
        detail: `Play the 7 to open a split of up to ${seven?.remaining ?? 7} steps.`,
        tone: 'seven',
      };
    }
    if (selectedActions.some((action) => action.kind === 'enter')) {
      return {
        title: 'Enter the board',
        detail: 'Choose a highlighted marble in base, or move an existing marble.',
        tone: 'your-turn',
      };
    }
    if (selectedActions.some((action) => action.kind === 'swap')) {
      return {
        title: swapSourceMarbleId ? 'Choose an opponent' : 'Choose your marble',
        detail: swapSourceMarbleId
          ? 'Highlighted opponent marbles can trade cells with yours.'
          : 'Select one of your unprotected marbles to swap.',
        tone: 'your-turn',
      };
    }
    return {
      title: 'Choose a marble',
      detail: 'Highlighted marbles have a legal move for this card.',
      tone: 'your-turn',
    };
  }, [
    forcedDiscard,
    inSeven,
    isMyTurn,
    currentPlayer,
    selectedActions,
    selectedCard,
    seven,
    sevenMarbleId,
    sevenSteps,
    snapshot,
    swapSourceMarbleId,
  ]);

  return {
    snapshot,
    you,
    hand,
    currentPlayer,
    isMyTurn,
    phase,
    inSeven,
    seven,
    sevenOptions,
    sevenMarbleId,
    sevenSteps,
    sevenMax: eyeSevenMax,
    sevenSegments: seven?.segments ?? [],
    selectedCard,
    selectedCardId,
    selectedActions,
    forcedDiscard,
    hasAnyLegalAction,
    sourceIds,
    enterIds,
    targetIds,
    focusedActions,
    focusedMarbleId,
    swapSourceMarbleId,
    preview,
    prompt,
    pending: actions.pending,
    selectCard,
    handleMarbleClick,
    handleMarbleHover,
    playAction,
    startSeven,
    confirmSeven,
    endSeven,
    discardSelected,
    cancelSelection,
    setSevenSteps,
    setHoveredAction,
    hoveredAction,
  };
}
