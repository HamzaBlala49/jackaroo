import { createBoardModel } from '@jackaroo/game-board';
import {
  CARD_RULE_TEXT,
  DEFAULT_RULES,
  createPublicRules,
  getTeamCount,
} from '@jackaroo/game-config';
import {
  cardName,
  compareCards,
  type Card,
  type GameFeedEvent,
  type GameSnapshot,
  type GameState,
  type JackarooRules,
  type LegalCardActions,
  type PlayRequest,
  type PlayerCount,
  type PlayerGameStats,
  type PlayerState,
  type PlayerYou,
  type PublicGameState,
  type SevenOption,
  type SevenSegment,
} from '@jackaroo/game-types';
import { createShuffledDeck } from './deck';
import { GameRuleError } from './errors';
import {
  addEvent,
  addLog,
  createContext,
  getCurrentPlayer,
  getPlayerById,
  isInRotation,
  nextSeat,
  refreshDerivedState,
  requirePlayerById,
  type EngineContext,
} from './internal';
import {
  actionMatchesRequest,
  applyBackwardMove,
  applyEnter,
  applyForwardMove,
  applySwap,
  getLegalActionsForCard,
  getScopeOwner,
  locateOwnerAndMarble,
} from './moves';

export interface CreateGamePlayer {
  id: string;
  name: string;
}

export interface CreateGameInput {
  id: string;
  players: CreateGamePlayer[];
  seed: string;
  startedAt: string;
  startingSeat?: number;
  rules?: JackarooRules;
}

export interface ActionResult {
  state: GameState;
  events: GameFeedEvent[];
}

export interface PlayerGameView {
  publicState: PublicGameState;
  you: PlayerYou | null;
}

export interface SnapshotMeta {
  code: string;
  matchId: string;
  viewerId: string | null;
  presence: Record<string, boolean>;
  finishedAt: string | null;
  serverTime: string;
}

const EMPTY_STATS = (): PlayerGameStats => ({
  moves: 0,
  entries: 0,
  captures: 0,
  cardsPlayed: 0,
  passes: 0,
  swaps: 0,
  marblesHome: 0,
});

function validateRules(rules: JackarooRules, playerCount: number): asserts playerCount is PlayerCount {
  if (playerCount !== 4 && playerCount !== 6 && playerCount !== 8) {
    throw new Error('Jackaroo supports exactly 4, 6 or 8 players.');
  }
  if (!rules.playerCounts.includes(playerCount)) {
    throw new Error(`Player count ${playerCount} is disabled by the current rules.`);
  }
  if (rules.playersPerTeam !== 2) {
    throw new Error('v1 supports teams of exactly two players.');
  }
  if (playerCount % rules.playersPerTeam !== 0) {
    throw new Error('Player count must split into complete teams.');
  }
  if (rules.marblesPerPlayer < 1 || rules.cardsPerPlayer < 1) {
    throw new Error('Invalid marble/card configuration.');
  }
  if (rules.cardsPerPlayer * playerCount > rules.deckSize) {
    throw new Error('Not enough cards to deal the configured hands.');
  }
  if (rules.deckSize !== 52) {
    throw new Error('The current engine requires a standard 52-card deck.');
  }
  if (rules.board.ringLength % playerCount !== 0) {
    throw new Error('The board ring must divide evenly across seats.');
  }
  if (rules.marblesPerPlayer !== 4) {
    throw new Error('v1 supports exactly four marbles per player.');
  }
  if (!rules.exactHomeEntry) {
    throw new Error('The v1 engine only supports exact home entry.');
  }
  if (rules.discard.voluntary || !rules.discard.fullDeckReshuffle) {
    throw new Error('The v1 engine only supports forced discards and a full-deck reshuffle.');
  }
  if (!rules.assistance.beginsNextTurnAfterFinish) {
    throw new Error('The v1 engine only supports assistance beginning on the next turn.');
  }
}

function sortHand(hand: Card[]): void {
  hand.sort(compareCards);
}

function dealHands(
  state: GameState,
  rules: JackarooRules,
  deck: Card[],
): void {
  for (const player of state.players) player.hand = [];
  const recipients = state.players.filter((player) => isInRotation(player, rules));
  if (recipients.length === 0) throw new Error('No players are eligible for cards.');

  const remaining = [...deck];
  for (let cardIndex = 0; cardIndex < rules.cardsPerPlayer; cardIndex += 1) {
    for (const player of recipients) {
      const card = remaining.pop();
      if (!card) throw new Error('Deck exhausted while dealing.');
      player.hand.push(card);
    }
  }
  for (const player of recipients) sortHand(player.hand);
  state.deck = remaining;
  state.discard = [];
}

export function createGame(input: CreateGameInput): GameState {
  const rules = input.rules ?? DEFAULT_RULES;
  const playerCount = input.players.length;
  validateRules(rules, playerCount);
  if (new Set(input.players.map((player) => player.id)).size !== playerCount) {
    throw new Error('Player IDs must be unique.');
  }
  if (input.players.length * rules.marblesPerPlayer === 0) {
    throw new Error('Invalid players.');
  }

  const startingSeat = input.startingSeat ?? 0;
  if (startingSeat < 0 || startingSeat >= playerCount) {
    throw new Error('Invalid starting seat.');
  }

  const teamCount = getTeamCount(playerCount);
  const players: PlayerState[] = input.players.map((seedPlayer, seat) => {
    const trimmedName = seedPlayer.name.trim();
    if (!trimmedName) throw new Error('Every player needs a display name.');
    return {
      id: seedPlayer.id,
      name: trimmedName,
      seat,
      teamId: seat % teamCount,
      hand: [],
      marbles: Array.from({ length: rules.marblesPerPlayer }, (_, index) => ({
        id: `${seedPlayer.id}:m${index}`,
        index,
        status: 'base' as const,
        progress: null,
      })),
      finished: false,
      finishOrder: null,
      stats: EMPTY_STATS(),
    };
  });

  const teams = Array.from({ length: teamCount }, (_, teamId) => ({
    id: teamId,
    playerIds: players.filter((player) => player.teamId === teamId).map((player) => player.id),
    marblesHome: 0,
    finished: false,
  }));

  const deck = createShuffledDeck(input.seed);
  const state: GameState = {
    id: input.id,
    rulesVersion: rules.version,
    rules,
    seed: input.seed,
    status: 'active',
    phase: 'awaiting-card',
    playerCount: playerCount as PlayerCount,
    players,
    teams,
    currentSeat: startingSeat,
    startingSeat,
    round: 1,
    turnNumber: 1,
    stateVersion: 0,
    deck,
    discard: [],
    seven: null,
    log: [],
    winnerTeamId: null,
    totalMoves: 0,
    totalCaptures: 0,
    startedAt: input.startedAt,
  };

  dealHands(state, rules, deck);
  const ctx = createContext(state);
  addLog(ctx, {
    kind: 'game-started',
    text: `The match begins with ${playerCount} players.`,
  });
  const starter = state.players[startingSeat];
  if (starter) {
    addLog(ctx, {
      kind: 'turn-started',
      playerId: starter.id,
      round: 1,
      text: `${starter.name} starts round 1.`,
    });
  }
  state.log = ctx.state.log;

  return state;
}

export function getLegalCardActions(state: GameState, playerId: string): LegalCardActions[] {
  if (state.status !== 'active' || state.phase !== 'awaiting-card') return [];
  const actor = getPlayerById(state, playerId);
  if (!actor) return [];
  const current = getCurrentPlayer(state);
  if (!current || current.id !== playerId) return [];
  const ctx = createContext(state);
  return actor.hand.map((card) => ({
    cardId: card.id,
    rank: card.rank,
    actions: getLegalActionsForCard(ctx, actor, card),
  }));
}

export function playerHasAnyLegalAction(state: GameState, playerId: string): boolean {
  return getLegalCardActions(state, playerId).some((card) => card.actions.length > 0);
}

export function getSevenOptions(state: GameState, playerId: string): SevenOption[] {
  if (state.status !== 'active' || state.phase !== 'seven' || !state.seven) return [];
  if (state.seven.playerId !== playerId) return [];
  const owner = getPlayerById(state, state.seven.scopePlayerId);
  if (!owner) return [];
  const board = createBoardModel(state.playerCount, {
    ringLength: state.rules.board.ringLength,
    homeLaneLength: state.rules.board.homeLaneLength,
    safePositions: state.rules.safePositions,
  });
  const usedIds = new Set(state.seven.segments.map((segment) => segment.marbleId));
  const options: SevenOption[] = [];
  for (const marble of owner.marbles) {
    if (marble.status === 'base' || marble.progress === null) continue;
    if (!state.rules.seven.allowSameMarbleAgain && usedIds.has(marble.id)) continue;
    const maxSteps = Math.min(state.seven.remaining, board.routeLength - 1 - marble.progress);
    if (maxSteps >= 1) {
      options.push({ marbleId: marble.id, maxSteps });
    }
  }
  return options;
}

function requirePlayerTurn(
  state: GameState,
  playerId: string,
  expectedPhase: 'awaiting-card' | 'seven',
): PlayerState {
  if (state.status !== 'active' || state.phase === 'finished') {
    throw new GameRuleError('GAME_FINISHED');
  }
  if (state.phase !== expectedPhase) {
    throw new GameRuleError('WRONG_PHASE');
  }
  const current = getCurrentPlayer(state);
  if (!current || current.id !== playerId) {
    throw new GameRuleError('NOT_YOUR_TURN');
  }
  return current;
}

function removeCardFromHand(player: PlayerState, cardId: string): Card {
  const index = player.hand.findIndex((card) => card.id === cardId);
  if (index < 0) throw new GameRuleError('CARD_NOT_IN_HAND');
  const [card] = player.hand.splice(index, 1);
  if (!card) throw new GameRuleError('CARD_NOT_IN_HAND');
  return card;
}

function beginSeven(
  ctx: EngineContext,
  actor: PlayerState,
  card: Card,
): void {
  const owner = getScopeOwner(ctx, actor);
  if (!owner) throw new GameRuleError('INVALID_ACTION', 'There is no teammate to assist.');
  const config = ctx.rules.cardActions[card.rank];
  if (config.kind !== 'split') throw new GameRuleError('INVALID_ACTION');
  ctx.state.phase = 'seven';
  ctx.state.seven = {
    playerId: actor.id,
    cardId: card.id,
    scopePlayerId: owner.id,
    remaining: config.total,
    segments: [],
  };
  addLog(ctx, {
    kind: 'seven-progress',
    playerId: actor.id,
    text: `${actor.name} split 7 steps — ${config.total} steps available.`,
  });
  addEvent(ctx, {
    type: 'seven-progress',
    playerId: actor.id,
    remaining: config.total,
    segments: [],
  });
}

function advanceTurn(ctx: EngineContext): void {
  const { state, rules } = ctx;
  state.phase = 'awaiting-card';
  state.seven = null;
  if (state.status === 'finished') return;

  const rotationPlayers = state.players.filter((player) => isInRotation(player, rules));
  const allEmpty = rotationPlayers.every((player) => player.hand.length === 0);
  if (allEmpty) {
    startNextRound(ctx);
    return;
  }

  const seat = nextSeat(
    state,
    state.currentSeat,
    (player) => isInRotation(player, rules) && player.hand.length > 0,
  );
  if (seat === null) {
    startNextRound(ctx);
    return;
  }

  state.currentSeat = seat;
  state.turnNumber += 1;
  const player = state.players[seat];
  if (!player) return;
  addLog(ctx, {
    kind: 'turn-started',
    playerId: player.id,
    round: state.round,
    text: `${player.name}'s turn.`,
  });
  addEvent(ctx, { type: 'turn-started', playerId: player.id, seat, round: state.round });
}

function startNextRound(ctx: EngineContext): void {
  const { state, rules } = ctx;
  if (state.status === 'finished') return;
  const finishedRound = state.round;
  const previousStartingSeat = state.startingSeat;
  const nextRound = finishedRound + 1;

  state.round = nextRound;
  const newStarterSeat =
    nextSeat(state, previousStartingSeat, (player) => isInRotation(player, rules)) ?? 0;

  addLog(ctx, {
    kind: 'round-ended',
    round: finishedRound,
    text: `Round ${finishedRound} is complete. All 52 cards are reshuffled.`,
  });
  addEvent(ctx, {
    type: 'round-ended',
    round: finishedRound,
    nextStartingSeat: newStarterSeat,
  });

  state.startingSeat = newStarterSeat;

  const deck = createShuffledDeck(`${state.seed}:round:${nextRound}`);
  dealHands(state, rules, deck);

  state.currentSeat = newStarterSeat;
  state.turnNumber += 1;
  const starter = state.players[newStarterSeat];
  if (starter) {
    addLog(ctx, {
      kind: 'turn-started',
      playerId: starter.id,
      round: nextRound,
      text: `${starter.name} starts round ${nextRound}.`,
    });
    addEvent(ctx, {
      type: 'turn-started',
      playerId: starter.id,
      seat: newStarterSeat,
      round: nextRound,
    });
  }
}

export function playCard(
  state: GameState,
  playerId: string,
  cardId: string,
  request: PlayRequest,
): ActionResult {
  const actor = requirePlayerTurn(state, playerId, 'awaiting-card');
  const card = actor.hand.find((candidate) => candidate.id === cardId);
  if (!card) throw new GameRuleError('CARD_NOT_IN_HAND');

  const legalActions = getLegalActionsForCard(createContext(state), actor, card);
  if (!legalActions.some((action) => actionMatchesRequest(action, request))) {
    throw new GameRuleError('INVALID_ACTION', 'That action is not legal for this card.');
  }

  const next = structuredClone(state);
  const ctx = createContext(next);
  const nextActor = requirePlayerById(next, playerId);
  const playedCard = removeCardFromHand(nextActor, cardId);
  next.discard.push(playedCard);
  nextActor.stats.cardsPlayed += 1;

  addLog(ctx, {
    kind: 'card-played',
    playerId: nextActor.id,
    card: playedCard,
    text: `${nextActor.name} played the ${cardName(playedCard)}.`,
  });
  addEvent(ctx, {
    type: 'card-played',
    playerId: nextActor.id,
    card: playedCard,
    summary: CARD_RULE_TEXT[playedCard.rank],
  });

  switch (request.kind) {
    case 'enter': {
      const { player: owner, marble } = locateOwnerAndMarble(ctx, request.marbleId);
      if (owner.id !== nextActor.id && owner.teamId !== nextActor.teamId) {
        throw new GameRuleError('MARBLE_NOT_ELIGIBLE');
      }
      applyEnter(ctx, nextActor, owner, marble);
      break;
    }
    case 'move': {
      const { player: owner, marble } = locateOwnerAndMarble(ctx, request.marbleId);
      const matching = legalActions.find(
        (action) => action.kind === 'move' && action.marbleId === request.marbleId && action.steps === request.steps,
      );
      if (!matching || matching.kind !== 'move') throw new GameRuleError('INVALID_ACTION');
      if (matching.direction === 'backward') {
        applyBackwardMove(ctx, nextActor, owner, marble, request.steps);
      } else {
        applyForwardMove(ctx, nextActor, owner, marble, request.steps);
      }
      break;
    }
    case 'swap': {
      const { player: owner, marble } = locateOwnerAndMarble(ctx, request.marbleId);
      const targetPlayer = requirePlayerById(next, request.targetPlayerId);
      const targetMarble = targetPlayer.marbles.find(
        (candidate) => candidate.id === request.targetMarbleId,
      );
      if (!targetMarble) throw new GameRuleError('SWAP_TARGET_INVALID');
      applySwap(ctx, nextActor, owner, marble, targetPlayer, targetMarble);
      break;
    }
    case 'begin-seven': {
      beginSeven(ctx, nextActor, playedCard);
      break;
    }
    default:
      throw new GameRuleError('INVALID_ACTION');
  }

  if (request.kind !== 'begin-seven' && next.status !== 'finished') {
    advanceTurn(ctx);
  }

  next.stateVersion += 1;
  return { state: next, events: ctx.events };
}

export function makeSevenMove(
  state: GameState,
  playerId: string,
  marbleId: string,
  steps: number,
): ActionResult {
  requirePlayerTurn(state, playerId, 'seven');
  const seven = state.seven;
  if (!seven) throw new GameRuleError('WRONG_PHASE');
  if (!Number.isInteger(steps) || steps < 1) {
    throw new GameRuleError('INVALID_ACTION', 'Choose at least one step.');
  }
  if (steps > seven.remaining) {
    throw new GameRuleError('SPLIT_EXCEEDED');
  }
  const owner = getPlayerById(state, seven.scopePlayerId);
  if (!owner) throw new GameRuleError('STATE_UNAVAILABLE');
  const marble = owner.marbles.find((candidate) => candidate.id === marbleId);
  if (!marble) throw new GameRuleError('MARBLE_NOT_ELIGIBLE');
  if (
    !state.rules.seven.allowSameMarbleAgain &&
    seven.segments.some((segment) => segment.marbleId === marbleId)
  ) {
    throw new GameRuleError('INVALID_ACTION', 'This marble has already been used in the split.');
  }
  if (marble.status === 'base' || marble.progress === null) {
    throw new GameRuleError('MARBLE_NOT_ELIGIBLE', 'A marble in base cannot move with a 7.');
  }
  const board = createBoardModel(state.playerCount, {
    ringLength: state.rules.board.ringLength,
    homeLaneLength: state.rules.board.homeLaneLength,
    safePositions: state.rules.safePositions,
  });
  if (marble.progress + steps >= board.routeLength) {
    throw new GameRuleError('DESTINATION_INVALID', 'That move would pass the final home slot.');
  }

  const next = structuredClone(state);
  const ctx = createContext(next);
  const nextActor = requirePlayerById(next, playerId);
  const nextOwner = requirePlayerById(next, seven.scopePlayerId);
  const nextMarble = nextOwner.marbles.find((candidate) => candidate.id === marbleId);
  if (!nextMarble) throw new GameRuleError('MARBLE_NOT_ELIGIBLE');

  applyForwardMove(ctx, nextActor, nextOwner, nextMarble, steps);

  if (next.status !== 'finished' && next.seven) {
    next.seven.remaining -= steps;
    next.seven.segments.push({ marbleId, steps });
    addLog(ctx, {
      kind: 'seven-progress',
      playerId: nextActor.id,
      text: `${nextActor.name} used ${steps} ${
        steps === 1 ? 'step' : 'steps'
      } (${next.seven.remaining} left in the split).`,
    });
    addEvent(ctx, {
      type: 'seven-progress',
      playerId: nextActor.id,
      remaining: next.seven.remaining,
      segments: next.seven.segments.map((segment) => ({ ...segment })),
    });

    const actorJustFinished = nextActor.finished && seven.scopePlayerId === nextActor.id;
    if (actorJustFinished) {
      addLog(ctx, {
        kind: 'seven-progress',
        playerId: nextActor.id,
        text: `${nextActor.name} reached home; the unused split steps are forfeited.`,
      });
      advanceTurn(ctx);
    } else if (next.seven.remaining === 0) {
      advanceTurn(ctx);
    }
  }

  next.stateVersion += 1;
  return { state: next, events: ctx.events };
}

export function endSevenTurn(state: GameState, playerId: string): ActionResult {
  requirePlayerTurn(state, playerId, 'seven');
  const seven = state.seven;
  if (!seven) throw new GameRuleError('WRONG_PHASE');
  if (seven.segments.length === 0) {
    throw new GameRuleError('INVALID_ACTION', 'Use at least one step before ending the split.');
  }
  if (state.rules.seven.requireFullUse && seven.remaining > 0) {
    throw new GameRuleError('INVALID_ACTION', 'This table requires all 7 steps to be used.');
  }
  if (state.status === 'finished') throw new GameRuleError('GAME_FINISHED');

  const next = structuredClone(state);
  const ctx = createContext(next);
  const unused = next.seven?.remaining ?? 0;
  const actor = requirePlayerById(next, playerId);
  if (unused > 0) {
    addLog(ctx, {
      kind: 'seven-progress',
      playerId: actor.id,
      text: `${actor.name} ended the split with ${unused} unused ${unused === 1 ? 'step' : 'steps'}.`,
    });
  }
  advanceTurn(ctx);
  next.stateVersion += 1;
  return { state: next, events: ctx.events };
}

export function forcePass(state: GameState, playerId: string, cardId: string): ActionResult {
  const actor = requirePlayerTurn(state, playerId, 'awaiting-card');
  const card = actor.hand.find((candidate) => candidate.id === cardId);
  if (!card) throw new GameRuleError('CARD_NOT_IN_HAND');
  if (playerHasAnyLegalAction(state, playerId)) {
    throw new GameRuleError('NO_LEGAL_MOVE', 'You must play a legal card before discarding.');
  }

  const next = structuredClone(state);
  const ctx = createContext(next);
  const nextActor = requirePlayerById(next, playerId);
  const discarded = removeCardFromHand(nextActor, cardId);
  next.discard.push(discarded);
  nextActor.stats.passes += 1;
  addLog(ctx, {
    kind: 'card-discarded',
    playerId: nextActor.id,
    card: discarded,
    text: `${nextActor.name} had no legal move and discarded the ${cardName(discarded)}.`,
  });
  addEvent(ctx, {
    type: 'card-discarded',
    playerId: nextActor.id,
    card: discarded,
  });
  addEvent(ctx, { type: 'pass', playerId: nextActor.id, card: discarded });
  advanceTurn(ctx);
  next.stateVersion += 1;
  return { state: next, events: ctx.events };
}

export function toPublicGameState(
  state: GameState,
): PublicGameState {
  const current = state.status === 'active' ? getCurrentPlayer(state) : undefined;
  return {
    status: state.status,
    phase: state.phase,
    playerCount: state.playerCount,
    round: state.round,
    turnNumber: state.turnNumber,
    currentSeat: state.currentSeat,
    currentPlayerId: current?.id ?? null,
    startingSeat: state.startingSeat,
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      seat: player.seat,
      teamId: player.teamId,
      handCount: player.hand.length,
      marbles: player.marbles.map((marble) => ({ ...marble })),
      finished: player.finished,
      finishOrder: player.finishOrder,
      stats: { ...player.stats },
    })),
    teams: state.teams.map((team) => ({ ...team, playerIds: [...team.playerIds] })),
    seven: state.seven
      ? { ...state.seven, segments: state.seven.segments.map((segment) => ({ ...segment })) }
      : null,
    deckCount: state.deck.length,
    discardCount: state.discard.length,
    log: state.log.slice(-100).map((entry) => ({ ...entry })),
    winnerTeamId: state.winnerTeamId,
    totalMoves: state.totalMoves,
    totalCaptures: state.totalCaptures,
    startedAt: state.startedAt,
  };
}

export function getPlayerGameView(state: GameState, viewerId: string | null): PlayerGameView {
  const publicState = toPublicGameState(state);
  if (!viewerId) return { publicState, you: null };
  const viewer = getPlayerById(state, viewerId);
  if (!viewer) return { publicState, you: null };

  const isTurn =
    state.status === 'active' && state.phase === 'awaiting-card' && publicState.currentPlayerId === viewerId;
  const legalCards = isTurn ? getLegalCardActions(state, viewerId) : [];
  const sevenOptions =
    state.phase === 'seven' && state.seven?.playerId === viewerId
      ? getSevenOptions(state, viewerId)
      : [];

  return {
    publicState,
    you: {
      playerId: viewer.id,
      hand: viewer.hand.map((card) => ({ ...card })),
      legalCards,
      sevenOptions,
    },
  };
}

export function createGameSnapshot(state: GameState, meta: SnapshotMeta): GameSnapshot {
  const view = getPlayerGameView(state, meta.viewerId);
  const presence: Record<string, boolean> = {};
  for (const player of state.players) {
    presence[player.id] = meta.presence[player.id] ?? false;
  }
  return {
    ...view.publicState,
    code: meta.code,
    matchId: meta.matchId,
    version: state.stateVersion,
    presence,
    serverTime: meta.serverTime,
    finishedAt: meta.finishedAt,
    you: view.you,
    rules: createPublicRules(state.rules),
  };
}


/** Exposed for simulation tests that need to pick a random legal card action. */
export function legalActionCardsForPlayer(
  state: GameState,
  playerId: string,
): LegalCardActions[] {
  return getLegalCardActions(state, playerId);
}

