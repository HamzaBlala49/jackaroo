import type { Rank } from './cards';

export type PlayerCount = 4 | 6 | 8;

export interface EnterOrMoveAction {
  kind: 'enter-or-move';
  /** Forward distances offered by the card, e.g. Ace = [1, 11]. */
  distances: number[];
}

export interface MoveAction {
  kind: 'move';
  distance: number;
}

export interface BackwardAction {
  kind: 'backward';
  distance: number;
}

export interface SplitAction {
  kind: 'split';
  total: number;
}

export interface SwapAction {
  kind: 'swap';
}

export type CardActionConfig =
  | EnterOrMoveAction
  | MoveAction
  | BackwardAction
  | SplitAction
  | SwapAction;

export interface BoardRules {
  ringLength: number;
  homeLaneLength: number;
}

export interface CaptureRules {
  /**
   * v1 default: every opposing marble on the landing cell is sent back to base.
   * `none` is reserved for a peaceful house-rule variant.
   */
  scope: 'all-on-landing-cell' | 'none';
  backwardsCaptures: boolean;
}

export interface SevenRules {
  requireFullUse: boolean;
  allowSameMarbleAgain: boolean;
}

export interface DiscardRules {
  voluntary: false | true;
  fullDeckReshuffle: boolean;
}

export interface AssistanceRules {
  fromBase: boolean;
  beginsNextTurnAfterFinish: boolean;
}

/**
 * The complete, serialisable rule set for one match.
 * See docs/02-rules.md for the v1 defaults and regional variations.
 */
export interface JackarooRules {
  version: string;
  playerCounts: PlayerCount[];
  marblesPerPlayer: number;
  playersPerTeam: number;
  deckSize: number;
  cardsPerPlayer: number;
  allowTeamAssistance: boolean;
  exactHomeEntry: boolean;
  cardActions: Record<Rank, CardActionConfig>;
  /** Extra neutral safe ring cells (start cells and home lanes are always safe). */
  safePositions: number[];
  board: BoardRules;
  capture: CaptureRules;
  seven: SevenRules;
  discard: DiscardRules;
  assistance: AssistanceRules;
}

export interface RoomSettings {
  /** Reserved for a future release; null means no auto-play timer. */
  turnTimerSeconds: number | null;
}

/** Server-derived lifecycle state of a room. Mirrors Prisma's RoomStatus. */
export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'closed';

export type MatchStatus = 'active' | 'finished' | 'abandoned';
