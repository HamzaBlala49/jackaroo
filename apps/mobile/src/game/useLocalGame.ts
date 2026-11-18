import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createBoardModel, type BoardModel } from '@jackaroo/game-board';
import {
  createGame,
  createGameSnapshot,
  endSevenTurn,
  forcePass,
  makeSevenMove,
  playCard,
} from '@jackaroo/game-engine';
import type { GameSnapshot, GameState, PlayRequest } from '@jackaroo/game-types';
import { randomSeed } from '@jackaroo/shared-utils';
import { applyBotStep } from './bots';

export interface LocalPlayerConfig {
  name: string;
  isBot: boolean;
}

export interface LocalGameConfig {
  players: LocalPlayerConfig[];
}

export interface LocalGameApi {
  state: GameState;
  snapshot: GameSnapshot | null;
  board: BoardModel;
  /** Seat whose hand is currently visible (pass & play). */
  viewerSeat: number;
  handover: { seat: number; name: string } | null;
  confirmHandover: () => void;
  playCard: (cardId: string, request: PlayRequest) => void;
  pass: (cardId: string) => void;
  sevenMove: (marbleId: string, steps: number) => void;
  sevenEnd: () => void;
  restart: () => void;
}

const BOT_DELAY_MS = 900;
const BOT_SEVEN_DELAY_MS = 650;

export function useLocalGame(config: LocalGameConfig): LocalGameApi {
  const bots = useMemo(() => config.players.map((p) => p.isBot), [config.players]);
  const [state, setState] = useState<GameState>(() => createLocalGame(config));
  const [handover, setHandover] = useState<{ seat: number; name: string } | null>(() => {
    const first = config.players.findIndex((p) => !p.isBot);
    return first > 0 ? { seat: first, name: config.players[first]!.name } : null;
  });
  const [viewerSeat, setViewerSeat] = useState(() => {
    const first = config.players.findIndex((p) => !p.isBot);
    return first >= 0 ? first : 0;
  });

  const restart = useCallback(() => {
    const fresh = createLocalGame(config);
    setState(fresh);
    const first = config.players.findIndex((p) => !p.isBot);
    setViewerSeat(first >= 0 ? first : 0);
    setHandover(first > 0 ? { seat: first, name: config.players[first]!.name } : null);
  }, [config]);

  // Bot loop: whenever it is a bot's turn, play one step after a short delay.
  useEffect(() => {
    if (state.status !== 'active') return;
    const current = state.players[state.currentSeat];
    if (!current || !bots[current.seat]) return;

    const delay = state.phase === 'seven' ? BOT_SEVEN_DELAY_MS : BOT_DELAY_MS;
    const timer = setTimeout(() => {
      setState((prev) => {
        if (prev.status !== 'active') return prev;
        const now = prev.players[prev.currentSeat];
        if (!now || now.seat !== current.seat) return prev;
        const { state: next } = applyBotStep(prev, now.id);
        return next;
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [state, bots]);

  // Turn tracking for pass & play handovers.
  const lastHumanSeat = useRef(viewerSeat);
  useEffect(() => {
    if (state.status !== 'active') return;
    const current = state.players[state.currentSeat];
    if (!current) return;
    if (bots[current.seat]) return;
    if (current.seat === lastHumanSeat.current) return;

    // A different human takes over — hide the hand until they confirm.
    lastHumanSeat.current = current.seat;
    setViewerSeat(current.seat);
    setHandover({ seat: current.seat, name: current.name });
  }, [state, bots]);

  const confirmHandover = useCallback(() => setHandover(null), []);

  const apply = useCallback((mutate: (prev: GameState) => GameState) => {
    setState((prev) => {
      if (prev.status !== 'active') return prev;
      try {
        return mutate(prev);
      } catch {
        return prev;
      }
    });
  }, []);

  const playCardAction = useCallback(
    (cardId: string, request: PlayRequest) => {
      apply((prev) => playCard(prev, currentId(prev), cardId, request).state);
    },
    [apply],
  );

  const passAction = useCallback(
    (cardId: string) => {
      apply((prev) => forcePass(prev, currentId(prev), cardId).state);
    },
    [apply],
  );

  const sevenMoveAction = useCallback(
    (marbleId: string, steps: number) => {
      apply((prev) => makeSevenMove(prev, currentId(prev), marbleId, steps).state);
    },
    [apply],
  );

  const sevenEndAction = useCallback(() => {
    apply((prev) => endSevenTurn(prev, currentId(prev)).state);
  }, [apply]);

  const board = useMemo(
    () =>
      createBoardModel(state.playerCount, {
        ringLength: state.rules.board.ringLength,
        homeLaneLength: state.rules.board.homeLaneLength,
        safePositions: state.rules.safePositions,
      }),
    [state.playerCount, state.rules.board, state.rules.safePositions],
  );

  const snapshot = useMemo(() => {
    const viewerPlayer = state.players[viewerSeat];
    if (!viewerPlayer) return null;
    const presence: Record<string, boolean> = {};
    for (const player of state.players) presence[player.id] = true;
    return createGameSnapshot(state, {
      code: 'LOCAL',
      matchId: state.id,
      viewerId: viewerPlayer.id,
      presence,
      finishedAt: null,
      serverTime: new Date().toISOString(),
    });
  }, [state, viewerSeat]);

  return {
    state,
    snapshot,
    board,
    viewerSeat,
    handover,
    confirmHandover,
    playCard: playCardAction,
    pass: passAction,
    sevenMove: sevenMoveAction,
    sevenEnd: sevenEndAction,
    restart,
  };
}

function currentId(state: GameState): string {
  const current = state.players[state.currentSeat];
  if (!current) throw new Error('No current player');
  return current.id;
}

function createLocalGame(config: LocalGameConfig): GameState {
  return createGame({
    id: `local-${Date.now()}`,
    players: config.players.map((player, seat) => ({
      id: `p${seat}`,
      name: player.isBot ? `${player.name} 🤖` : player.name,
    })),
    seed: randomSeed(),
    startedAt: new Date().toISOString(),
  });
}
