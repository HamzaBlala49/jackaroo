import {
  createBoardModel,
  ringCellForProgress,
} from '@jackaroo/game-board';
import {
  endSevenTurn,
  forcePass,
  getLegalCardActions,
  getSevenOptions,
  makeSevenMove,
  playCard,
} from '@jackaroo/game-engine';
import type {
  GameState,
  LegalAction,
  MarbleState,
  PlayRequest,
  PlayerState,
} from '@jackaroo/game-types';

/**
 * Bot heuristics. Bots only ever use actions the engine itself advertises,
 * so they can never cheat — they simply pick from the legal list.
 */

export type BotStep =
  | { kind: 'play'; cardId: string; request: PlayRequest }
  | { kind: 'pass'; cardId: string }
  | { kind: 'seven-move'; marbleId: string; steps: number }
  | { kind: 'seven-end' }
  | { kind: 'wait' };

interface CellOccupant {
  playerId: string;
  teamId: number;
  marbleId: string;
}

function buildOccupancy(state: GameState): Map<number, CellOccupant[]> {
  const board = createBoardModel(state.playerCount, {
    ringLength: state.rules.board.ringLength,
    homeLaneLength: state.rules.board.homeLaneLength,
    safePositions: state.rules.safePositions,
  });
  const map = new Map<number, CellOccupant[]>();
  for (const player of state.players) {
    for (const marble of player.marbles) {
      if (marble.status !== 'board' || marble.progress === null) continue;
      if (marble.progress >= board.ringLength) continue;
      const cell = ringCellForProgress(board, player.seat, marble.progress);
      const list = map.get(cell) ?? [];
      list.push({ playerId: player.id, teamId: player.teamId, marbleId: marble.id });
      map.set(cell, list);
    }
  }
  return map;
}

function boardModel(state: GameState) {
  return createBoardModel(state.playerCount, {
    ringLength: state.rules.board.ringLength,
    homeLaneLength: state.rules.board.homeLaneLength,
    safePositions: state.rules.safePositions,
  });
}

function progressForCell(state: GameState, seat: number, cell: number): number {
  const board = boardModel(state);
  const station = board.stations[seat];
  if (!station) return 0;
  return ((cell - station.startIndex) % board.ringLength + board.ringLength) % board.ringLength;
}

function actionScore(
  state: GameState,
  player: PlayerState,
  action: LegalAction,
  occupancy: Map<number, CellOccupant[]>,
): number {
  const board = boardModel(state);
  const marble = player.marbles.find((m) => m.id === (action as { marbleId?: string }).marbleId);

  if (action.kind === 'enter') {
    const onBoard = player.marbles.filter((m) => m.status !== 'base').length;
    return 100 + (4 - onBoard) * 12 + Math.random() * 4;
  }

  if (action.kind === 'move') {
    if (!marble || marble.progress === null) return 0;
    let score = 20 + marble.progress * 0.4;
    if (action.direction === 'backward') score = 14;

    if (action.toProgress >= board.routeLength - 1) return 140; // finish a marble
    if (marble.progress < board.ringLength && action.toProgress >= board.ringLength) {
      score += 45; // enter the home lane
    }

    if (action.toProgress < board.ringLength) {
      const cell = ringCellForProgress(board, player.seat, action.toProgress);
      const occupants = occupancy.get(cell) ?? [];
      const opponents = occupants.filter((o) => o.teamId !== player.teamId);
      if (opponents.length > 0) score += 60 + opponents.length * 15;
    }
    return score + Math.random() * 6;
  }

  if (action.kind === 'swap') {
    const own = marble;
    const target = state.players
      .flatMap((p) => p.marbles.map((m) => ({ player: p, marble: m })))
      .find((entry) => entry.marble.id === action.targetMarbleId);
    if (!own || !target || own.progress === null || target.marble.progress === null) return 0;
    const board2 = boardModel(state);
    const ownCell = ringCellForProgress(board2, player.seat, own.progress);
    const targetCell = ringCellForProgress(board2, target.player.seat, target.marble.progress);
    const newOwn = progressForCell(state, player.seat, targetCell);
    const newTarget = progressForCell(state, target.player.seat, ownCell);
    const gain = newOwn - own.progress;
    const theirLoss = target.marble.progress - newTarget;
    return 30 + gain * 1.6 + theirLoss * 0.8 + Math.random() * 5;
  }

  if (action.kind === 'begin-seven') {
    return 72 + Math.random() * 6;
  }

  return 0;
}

export function chooseBotStep(state: GameState, playerId: string): BotStep {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { kind: 'wait' };

  if (state.phase === 'seven') {
    const options = getSevenOptions(state, playerId);
    if (options.length === 0) return { kind: 'seven-end' };
    const occupancy = buildOccupancy(state);
    const board = boardModel(state);
    let best = options[0]!;
    let bestScore = -1;
    for (const option of options) {
      const marble = player.marbles.find((m) => m.id === option.marbleId);
      if (!marble || marble.progress === null) continue;
      let score = 20 + marble.progress * 0.4;
      const dest = marble.progress + option.maxSteps;
      if (dest >= board.routeLength - 1) score += 90;
      else if (marble.progress < board.ringLength && dest >= board.ringLength) score += 40;
      else if (dest < board.ringLength) {
        const cell = ringCellForProgress(board, player.seat, dest);
        const opponents = (occupancy.get(cell) ?? []).filter((o) => o.teamId !== player.teamId);
        if (opponents.length > 0) score += 55;
      }
      if (score > bestScore) {
        bestScore = score;
        best = option;
      }
    }
    return { kind: 'seven-move', marbleId: best.marbleId, steps: best.maxSteps };
  }

  const legal = getLegalCardActions(state, playerId);
  const playable = legal.filter((entry) => entry.actions.length > 0);
  if (playable.length === 0) {
    const card = player.hand[0];
    if (!card) return { kind: 'wait' };
    return { kind: 'pass', cardId: card.id };
  }

  const occupancy = buildOccupancy(state);
  let bestCard = playable[0]!;
  let bestAction = bestCard.actions[0]!;
  let bestScore = -Infinity;

  for (const entry of playable) {
    for (const action of entry.actions) {
      const score = actionScore(state, player, action, occupancy);
      if (score > bestScore) {
        bestScore = score;
        bestCard = entry;
        bestAction = action;
      }
    }
  }

  const request: PlayRequest =
    bestAction.kind === 'enter'
      ? { kind: 'enter', marbleId: bestAction.marbleId }
      : bestAction.kind === 'move'
        ? { kind: 'move', marbleId: bestAction.marbleId, steps: bestAction.steps }
        : bestAction.kind === 'swap'
          ? {
              kind: 'swap',
              marbleId: bestAction.marbleId,
              targetPlayerId: bestAction.targetPlayerId,
              targetMarbleId: bestAction.targetMarbleId,
            }
          : { kind: 'begin-seven' };

  return { kind: 'play', cardId: bestCard.cardId, request };
}

/** Applies one bot step; returns the next state plus whether the turn is done. */
export function applyBotStep(state: GameState, playerId: string): {
  state: GameState;
  done: boolean;
} {
  const step = chooseBotStep(state, playerId);
  switch (step.kind) {
    case 'play':
      return { state: playCard(state, playerId, step.cardId, step.request).state, done: true };
    case 'pass':
      return { state: forcePass(state, playerId, step.cardId).state, done: true };
    case 'seven-move': {
      const next = makeSevenMove(state, playerId, step.marbleId, step.steps).state;
      const finished = next.phase !== 'seven' || next.status === 'finished';
      return { state: next, done: finished };
    }
    case 'seven-end':
      return { state: endSevenTurn(state, playerId).state, done: true };
    default:
      return { state, done: true };
  }
}


export function marbleOwner(state: GameState, marble: MarbleState): PlayerState | undefined {
  return state.players.find((p) => p.marbles.some((m) => m.id === marble.id));
}
