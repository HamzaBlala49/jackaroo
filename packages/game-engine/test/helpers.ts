import {
  createBoardModel,
  progressForRingCell,
  type BoardModel,
} from '@jackaroo/game-board';
import { createStandardDeck, createGame, type GameState } from '@jackaroo/game-engine';
import {
  DEFAULT_RULES,
  TOTAL_ROUTE_LENGTH,
} from '@jackaroo/game-config';
import type {
  Card,
  GameFeedEvent,
  JackarooRules,
  LegalAction,
  PlayRequest,
  PlayerCount,
  Rank,
  Suit,
} from '@jackaroo/game-types';

const STANDARD_DECK = createStandardDeck();

export const card = (rank: Rank, suit: Suit = 'clubs'): Card => {
  const found = STANDARD_DECK.find((candidate) => candidate.rank === rank && candidate.suit === suit);
  if (!found) throw new Error(`Missing card ${rank}${suit}`);
  return { ...found };
};

export function createTestGame(
  playerCount: PlayerCount = 4,
  rules: JackarooRules = DEFAULT_RULES,
): GameState {
  return createGame({
    id: `game-${playerCount}`,
    players: Array.from({ length: playerCount }, (_, seat) => ({
      id: `p${seat}`,
      name: `Player ${seat}`,
    })),
    seed: 'test-seed',
    startedAt: '2026-01-01T00:00:00.000Z',
    rules,
  });
}

export function boardFor(state: GameState, rules: JackarooRules = state.rules): BoardModel {
  return createBoardModel(state.playerCount, {
    ringLength: rules.board.ringLength,
    homeLaneLength: rules.board.homeLaneLength,
    safePositions: rules.safePositions,
  });
}

export function setTurn(state: GameState, seat: number): void {
  state.currentSeat = seat;
}

export function setHand(state: GameState, seat: number, cards: Card[]): void {
  const player = state.players[seat];
  if (!player) throw new Error(`No player at seat ${seat}`);
  player.hand = cards.map((entry) => ({ ...entry }));
}

export function giveOnlyCard(state: GameState, seat: number, rank: Rank, suit: Suit = 'clubs'): Card {
  const entry = card(rank, suit);
  setHand(state, seat, [entry]);
  return entry;
}

export function putMarble(
  state: GameState,
  seat: number,
  index: number,
  progress: number | null,
): void {
  const marble = state.players[seat]?.marbles[index];
  if (!marble) throw new Error(`No marble ${index} for seat ${seat}`);
  marble.progress = progress;
  marble.status =
    progress === null
      ? 'base'
      : progress >= DEFAULT_RULES.board.ringLength
        ? 'home'
        : 'board';
}

export function putMarbleAtCell(
  state: GameState,
  seat: number,
  index: number,
  cell: number,
  rules: JackarooRules = DEFAULT_RULES,
): void {
  const board = boardFor(state, rules);
  putMarble(state, seat, index, progressForRingCell(board, seat, cell));
}

export function allHome(state: GameState, seat: number): void {
  state.players[seat]?.marbles.forEach((marble) => {
    marble.status = 'home';
    marble.progress = TOTAL_ROUTE_LENGTH - 1;
  });
}

export function allBase(state: GameState, seat: number): void {
  state.players[seat]?.marbles.forEach((marble) => {
    marble.status = 'base';
    marble.progress = null;
  });
}

export function toRequest(action: LegalAction): PlayRequest {
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

export function eventsOfType<T extends GameFeedEvent['type']>(
  events: GameFeedEvent[],
  type: T,
): Extract<GameFeedEvent, { type: T }>[] {
  return events.filter((event): event is Extract<GameFeedEvent, { type: T }> => event.type === type);
}
