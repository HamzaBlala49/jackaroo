import {
  RANKS,
  type CardActionConfig,
  type JackarooRules,
  type PlayerCount,
  type PublicCardRule,
  type PublicRules,
  type Rank,
  type RoomSettings,
} from '@jackaroo/game-types';

export const RULES_VERSION = 'house-v1';
export const BOARD_RING_LENGTH = 72;
export const BOARD_HOME_LANE_LENGTH = 4;
export const TOTAL_ROUTE_LENGTH = BOARD_RING_LENGTH + BOARD_HOME_LANE_LENGTH;
export const MARBLES_PER_PLAYER = 4;
export const PLAYERS_PER_TEAM = 2;
export const ROOM_CODE_LENGTH = 6;
export const GAME_LOG_LIMIT = 250;
export const MAX_RECENT_ACTION_IDS = 120;

export const CARD_ACTION_CONFIG: Record<Rank, CardActionConfig> = {
  A: { kind: 'enter-or-move', distances: [1, 11] },
  K: { kind: 'enter-or-move', distances: [13] },
  Q: { kind: 'move', distance: 12 },
  J: { kind: 'swap' },
  '10': { kind: 'move', distance: 10 },
  '9': { kind: 'move', distance: 9 },
  '8': { kind: 'move', distance: 8 },
  '7': { kind: 'split', total: 7 },
  '6': { kind: 'move', distance: 6 },
  '5': { kind: 'move', distance: 5 },
  '4': { kind: 'backward', distance: 4 },
  '3': { kind: 'move', distance: 3 },
  '2': { kind: 'move', distance: 2 },
};

export const CARD_RULE_TEXT: Record<Rank, string> = {
  A: 'Bring a marble in from base, or advance one marble 1 or 11.',
  K: 'Bring a marble in from base, or advance one marble 13.',
  Q: 'Advance one marble 12.',
  J: 'Swap one of your marbles with an opponent on the main ring.',
  '10': 'Advance one marble 10.',
  '9': 'Advance one marble 9.',
  '8': 'Advance one marble 8.',
  '7': 'Split up to 7 steps across your marbles, one segment at a time.',
  '6': 'Advance one marble 6.',
  '5': 'Advance one marble 5.',
  '4': 'Move one marble 4 backward along the ring.',
  '3': 'Advance one marble 3.',
  '2': 'Advance one marble 2.',
};

export const CARD_RULE_TITLE: Record<Rank, string> = {
  A: 'Ace',
  K: 'King',
  Q: 'Queen',
  J: 'Jack',
  '10': 'Ten',
  '9': 'Nine',
  '8': 'Eight',
  '7': 'Seven',
  '6': 'Six',
  '5': 'Five',
  '4': 'Four',
  '3': 'Three',
  '2': 'Two',
};

export const DEFAULT_RULES: JackarooRules = {
  version: RULES_VERSION,
  playerCounts: [4, 6, 8],
  marblesPerPlayer: MARBLES_PER_PLAYER,
  playersPerTeam: PLAYERS_PER_TEAM,
  deckSize: 52,
  cardsPerPlayer: 4,
  allowTeamAssistance: true,
  exactHomeEntry: true,
  cardActions: CARD_ACTION_CONFIG,
  safePositions: [9, 27, 45, 63],
  board: {
    ringLength: BOARD_RING_LENGTH,
    homeLaneLength: BOARD_HOME_LANE_LENGTH,
  },
  capture: {
    scope: 'all-on-landing-cell',
    backwardsCaptures: true,
  },
  seven: {
    requireFullUse: false,
    allowSameMarbleAgain: true,
  },
  discard: {
    voluntary: false,
    fullDeckReshuffle: true,
  },
  assistance: {
    fromBase: true,
    beginsNextTurnAfterFinish: true,
  },
};

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  turnTimerSeconds: null,
};

export interface TeamPalette {
  id: number;
  name: string;
  shortName: string;
  primary: string;
  deep: string;
  pale: string;
  ink: string;
  glow: string;
}

export const TEAM_PALETTES: TeamPalette[] = [
  {
    id: 0,
    name: 'Team Emerald',
    shortName: 'Emerald',
    primary: '#35b99c',
    deep: '#0f5a4c',
    pale: '#d9f4ec',
    ink: '#062e26',
    glow: 'rgba(53, 185, 156, 0.55)',
  },
  {
    id: 1,
    name: 'Team Amber',
    shortName: 'Amber',
    primary: '#e9a23b',
    deep: '#7a4712',
    pale: '#fbe8c4',
    ink: '#3b2105',
    glow: 'rgba(233, 162, 59, 0.55)',
  },
  {
    id: 2,
    name: 'Team Sapphire',
    shortName: 'Sapphire',
    primary: '#5b8def',
    deep: '#22417f',
    pale: '#dbe6ff',
    ink: '#0b1c3f',
    glow: 'rgba(91, 141, 239, 0.55)',
  },
  {
    id: 3,
    name: 'Team Rose',
    shortName: 'Rose',
    primary: '#df6a8c',
    deep: '#7e2944',
    pale: '#fbdde6',
    ink: '#3d0d1d',
    glow: 'rgba(223, 106, 140, 0.55)',
  },
];

export function getTeamCount(playerCount: PlayerCount): number {
  return playerCount / PLAYERS_PER_TEAM;
}

export function getTeamPalette(teamId: number): TeamPalette {
  return TEAM_PALETTES[teamId % TEAM_PALETTES.length] as TeamPalette;
}

export function getPlayerCountMeta(playerCount: PlayerCount): {
  playerCount: PlayerCount;
  teams: number;
  label: string;
  description: string;
} {
  const teams = getTeamCount(playerCount);
  return {
    playerCount,
    teams,
    label: `${playerCount} players`,
    description: `${teams} teams of ${PLAYERS_PER_TEAM} · ${playerCount * MARBLES_PER_PLAYER} marbles`,
  };
}

export function getCardRuleSummary(rank: Rank): string {
  return CARD_RULE_TEXT[rank];
}

export function createPublicRules(rules: JackarooRules): PublicRules {
  const cardRules: PublicCardRule[] = RANKS.map((rank) => {
    const action = rules.cardActions[rank];
    let distances: number[] = [];
    if (action.kind === 'enter-or-move') distances = action.distances;
    else if (action.kind === 'move' || action.kind === 'backward') distances = [action.distance];
    else if (action.kind === 'split') distances = [action.total];
    return {
      rank,
      title: CARD_RULE_TITLE[rank],
      summary: CARD_RULE_TEXT[rank],
      distances,
    };
  });

  return {
    version: rules.version,
    playerCounts: [...rules.playerCounts],
    marblesPerPlayer: rules.marblesPerPlayer,
    playersPerTeam: rules.playersPerTeam,
    cardsPerPlayer: rules.cardsPerPlayer,
    deckSize: rules.deckSize,
    allowTeamAssistance: rules.allowTeamAssistance,
    exactHomeEntry: rules.exactHomeEntry,
    safePositions: [...rules.safePositions],
    ringLength: rules.board.ringLength,
    homeLaneLength: rules.board.homeLaneLength,
    cardRules,
  };
}

export const SUPPORTED_PLAYER_COUNTS: PlayerCount[] = [4, 6, 8];
