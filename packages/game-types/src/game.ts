import type { Card, Rank } from './cards';
import type { JackarooRules, PlayerCount } from './rules';

export type GameStatus = 'active' | 'finished';
export type GamePhase = 'awaiting-card' | 'seven' | 'finished';
export type MarbleStatus = 'base' | 'board' | 'home';
export type MoveDirection = 'forward' | 'backward';

export interface MarbleState {
  id: string;
  index: number;
  status: MarbleStatus;
  /** Owner-relative route index: ring 0..71, home 72..75, base null. */
  progress: number | null;
}

export interface PlayerGameStats {
  moves: number;
  entries: number;
  captures: number;
  cardsPlayed: number;
  passes: number;
  swaps: number;
  marblesHome: number;
}

export interface PlayerState {
  id: string;
  name: string;
  seat: number;
  teamId: number;
  hand: Card[];
  marbles: MarbleState[];
  finished: boolean;
  finishOrder: number | null;
  stats: PlayerGameStats;
}

export interface TeamState {
  id: number;
  playerIds: string[];
  marblesHome: number;
  finished: boolean;
}

export interface SevenSegment {
  marbleId: string;
  steps: number;
}

/**
 * Server-only phase data for the 7 card. `scopePlayerId` freezes whose
 * marbles may be moved for the lifetime of this seven (self, or a teammate
 * if the player had already finished when the 7 was played).
 */
export interface SevenRuntime {
  playerId: string;
  cardId: string;
  scopePlayerId: string;
  remaining: number;
  segments: SevenSegment[];
}

export type GameLogKind =
  | 'game-started'
  | 'turn-started'
  | 'card-played'
  | 'card-discarded'
  | 'marble-entered'
  | 'marble-moved'
  | 'marble-captured'
  | 'marble-home'
  | 'swap'
  | 'seven-progress'
  | 'player-finished'
  | 'round-ended'
  | 'game-finished';

export interface GameLogEntry {
  seq: number;
  kind: GameLogKind;
  text: string;
  playerId?: string;
  targetPlayerId?: string;
  card?: Card;
  teamId?: number;
  round?: number;
}

/**
 * Complete authoritative match state. NEVER send this to clients:
 * it contains every hand and the remaining deck order.
 */
export interface GameState {
  id: string;
  rulesVersion: string;
  /** Full server-side rules snapshot; keep in sync with the room/match. */
  rules: JackarooRules;
  /** Server-only shuffle seed. Never include in a client snapshot. */
  seed: string;
  status: GameStatus;
  phase: GamePhase;
  playerCount: PlayerCount;
  players: PlayerState[];
  teams: TeamState[];
  currentSeat: number;
  startingSeat: number;
  round: number;
  turnNumber: number;
  stateVersion: number;
  deck: Card[];
  discard: Card[];
  seven: SevenRuntime | null;
  log: GameLogEntry[];
  winnerTeamId: number | null;
  totalMoves: number;
  totalCaptures: number;
  startedAt: string;
}

export type PlayRequest =
  | { kind: 'enter'; marbleId: string }
  | { kind: 'move'; marbleId: string; steps: number }
  | { kind: 'swap'; marbleId: string; targetPlayerId: string; targetMarbleId: string }
  | { kind: 'begin-seven' };

export type LegalAction =
  | {
      kind: 'enter';
      cardId: string;
      marbleId: string;
      toCell: number;
    }
  | {
      kind: 'move';
      cardId: string;
      marbleId: string;
      steps: number;
      direction: MoveDirection;
      fromProgress: number;
      toProgress: number;
    }
  | {
      kind: 'swap';
      cardId: string;
      marbleId: string;
      targetPlayerId: string;
      targetMarbleId: string;
    }
  | {
      kind: 'begin-seven';
      cardId: string;
      maxSteps: number;
    };

export interface LegalCardActions {
  cardId: string;
  rank: Rank;
  actions: LegalAction[];
}

export interface SevenOption {
  marbleId: string;
  maxSteps: number;
}

export interface PublicPlayerState {
  id: string;
  name: string;
  seat: number;
  teamId: number;
  handCount: number;
  marbles: MarbleState[];
  finished: boolean;
  finishOrder: number | null;
  stats: PlayerGameStats;
}

export interface PublicTeamState {
  id: number;
  playerIds: string[];
  marblesHome: number;
  finished: boolean;
}

export interface PublicGameState {
  status: GameStatus;
  phase: GamePhase;
  playerCount: PlayerCount;
  round: number;
  turnNumber: number;
  currentSeat: number;
  currentPlayerId: string | null;
  startingSeat: number;
  players: PublicPlayerState[];
  teams: PublicTeamState[];
  seven: SevenRuntime | null;
  deckCount: number;
  discardCount: number;
  log: GameLogEntry[];
  winnerTeamId: number | null;
  totalMoves: number;
  totalCaptures: number;
  startedAt: string;
}

export interface PublicCardRule {
  rank: Rank;
  title: string;
  summary: string;
  distances: number[];
}

export interface PublicRules {
  version: string;
  playerCounts: PlayerCount[];
  marblesPerPlayer: number;
  playersPerTeam: number;
  cardsPerPlayer: number;
  deckSize: number;
  allowTeamAssistance: boolean;
  exactHomeEntry: boolean;
  safePositions: number[];
  ringLength: number;
  homeLaneLength: number;
  cardRules: PublicCardRule[];
}

export interface PlayerYou {
  playerId: string;
  hand: Card[];
  legalCards: LegalCardActions[];
  sevenOptions: SevenOption[];
}

/** Personalized snapshot sent over the wire. */
export interface GameSnapshot extends PublicGameState {
  code: string;
  matchId: string;
  version: number;
  presence: Record<string, boolean>;
  serverTime: string;
  finishedAt: string | null;
  you: PlayerYou | null;
  rules: PublicRules;
}

export type GameFeedEvent =
  | { type: 'turn-started'; playerId: string; seat: number; round: number }
  | { type: 'card-played'; playerId: string; card: Card; summary: string }
  | { type: 'card-discarded'; playerId: string; card: Card }
  | { type: 'marble-entered'; playerId: string; marbleId: string; toCell: number }
  | {
      type: 'marble-moved';
      playerId: string;
      marbleId: string;
      fromProgress: number;
      toProgress: number;
      direction: MoveDirection;
    }
  | {
      type: 'marble-captured';
      ownerId: string;
      marbleId: string;
      byPlayerId: string;
      fromCell: number;
    }
  | { type: 'marble-home'; playerId: string; marbleId: string; slot: number }
  | {
      type: 'swap';
      playerId: string;
      marbleId: string;
      targetPlayerId: string;
      targetMarbleId: string;
    }
  | {
      type: 'seven-progress';
      playerId: string;
      remaining: number;
      segments: SevenSegment[];
    }
  | { type: 'pass'; playerId: string; card: Card }
  | { type: 'player-finished'; playerId: string; teamId: number }
  | { type: 'round-ended'; round: number; nextStartingSeat: number }
  | { type: 'game-finished'; winningTeamId: number; playerIds: string[] };

export interface PlayerSummarySeed {
  id: string;
  name: string;
}
