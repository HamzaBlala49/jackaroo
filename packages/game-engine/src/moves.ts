import {
  ringCellForProgress,
  type BoardModel,
} from '@jackaroo/game-board';
import {
  cardName,
  type Card,
  type LegalAction,
  type MarbleState,
  type PlayRequest,
  type PlayerState,
} from '@jackaroo/game-types';
import { GameRuleError } from './errors';
import {
  addEvent,
  addLog,
  findMarble,
  getTeammate,
  isInRotation,
  refreshDerivedState,
  type EngineContext,
} from './internal';

export function getScopeOwner(ctx: EngineContext, actor: PlayerState): PlayerState | undefined {
  if (!actor.finished) return actor;
  if (!ctx.rules.allowTeamAssistance) return undefined;
  const teammate = getTeammate(ctx.state, actor);
  if (!teammate || teammate.finished) return undefined;
  return teammate;
}

function isOnRing(marble: MarbleState): marble is MarbleState & { progress: number } {
  return marble.status === 'board' && marble.progress !== null && marble.progress < Number.MAX_SAFE_INTEGER;
}

function isSafeRingCell(board: BoardModel, seat: number, progress: number): boolean {
  if (progress >= board.ringLength) return true;
  const cell = ringCellForProgress(board, seat, progress);
  return board.ring[cell]?.isSafe ?? true;
}

function canEnter(actor: PlayerState, owner: PlayerState, rules: EngineContext['rules']): boolean {
  if (actor.id !== owner.id && !rules.assistance.fromBase) return false;
  return owner.marbles.some((marble) => marble.status === 'base');
}

function splitCapacity(ctx: EngineContext, owner: PlayerState): number {
  return owner.marbles.reduce((total, marble) => {
    if (marble.status === 'base' || marble.progress === null) return total;
    return total + Math.max(0, ctx.board.routeLength - 1 - marble.progress);
  }, 0);
}

export function getLegalActionsForCard(
  ctx: EngineContext,
  actor: PlayerState,
  card: Card,
): LegalAction[] {
  const owner = getScopeOwner(ctx, actor);
  if (!owner) return [];
  if (!isInRotation(actor, ctx.rules)) return [];

  const config = ctx.rules.cardActions[card.rank];
  const actions: LegalAction[] = [];

  switch (config.kind) {
    case 'enter-or-move': {
      if (canEnter(actor, owner, ctx.rules)) {
        for (const marble of owner.marbles) {
          if (marble.status !== 'base') continue;
          const station = ctx.board.stations[owner.seat];
          if (!station) continue;
          actions.push({
            kind: 'enter',
            cardId: card.id,
            marbleId: marble.id,
            toCell: station.startIndex,
          });
        }
      }
      for (const distance of config.distances) {
        for (const marble of owner.marbles) {
          if (marble.status === 'base' || marble.progress === null) continue;
          const toProgress = marble.progress + distance;
          if (toProgress >= ctx.board.routeLength) continue;
          actions.push({
            kind: 'move',
            cardId: card.id,
            marbleId: marble.id,
            steps: distance,
            direction: 'forward',
            fromProgress: marble.progress,
            toProgress,
          });
        }
      }
      break;
    }
    case 'move': {
      for (const marble of owner.marbles) {
        if (marble.status === 'base' || marble.progress === null) continue;
        const toProgress = marble.progress + config.distance;
        if (toProgress >= ctx.board.routeLength) continue;
        actions.push({
          kind: 'move',
          cardId: card.id,
          marbleId: marble.id,
          steps: config.distance,
          direction: 'forward',
          fromProgress: marble.progress,
          toProgress,
        });
      }
      break;
    }
    case 'backward': {
      for (const marble of owner.marbles) {
        if (!isOnRing(marble) || marble.progress >= ctx.board.ringLength) continue;
        if (marble.progress - config.distance < 0) continue;
        actions.push({
          kind: 'move',
          cardId: card.id,
          marbleId: marble.id,
          steps: config.distance,
          direction: 'backward',
          fromProgress: marble.progress,
          toProgress: marble.progress - config.distance,
        });
      }
      break;
    }
    case 'split': {
      const capacity = splitCapacity(ctx, owner);
      if (capacity <= 0) break;
      if (ctx.rules.seven.requireFullUse && capacity < config.total) break;
      actions.push({
        kind: 'begin-seven',
        cardId: card.id,
        maxSteps: Math.min(config.total, capacity),
      });
      break;
    }
    case 'swap': {
      const teamId = owner.teamId;
      const sources = owner.marbles.filter(
        (marble) =>
          isOnRing(marble) &&
          marble.progress < ctx.board.ringLength &&
          !isSafeRingCell(ctx.board, owner.seat, marble.progress),
      );
      for (const source of sources) {
        for (const opponent of ctx.state.players) {
          if (opponent.teamId === teamId) continue;
          for (const target of opponent.marbles) {
            if (
              !isOnRing(target) ||
              target.progress >= ctx.board.ringLength ||
              isSafeRingCell(ctx.board, opponent.seat, target.progress)
            ) {
              continue;
            }
            actions.push({
              kind: 'swap',
              cardId: card.id,
              marbleId: source.id,
              targetPlayerId: opponent.id,
              targetMarbleId: target.id,
            });
          }
        }
      }
      break;
    }
    default:
      break;
  }

  return actions;
}

export function actionMatchesRequest(action: LegalAction, request: PlayRequest): boolean {
  switch (request.kind) {
    case 'enter':
      return action.kind === 'enter' && action.marbleId === request.marbleId;
    case 'move':
      return (
        action.kind === 'move' &&
        action.marbleId === request.marbleId &&
        action.steps === request.steps
      );
    case 'swap':
      return (
        action.kind === 'swap' &&
        action.marbleId === request.marbleId &&
        action.targetPlayerId === request.targetPlayerId &&
        action.targetMarbleId === request.targetMarbleId
      );
    case 'begin-seven':
      return action.kind === 'begin-seven';
    default:
      return false;
  }
}

export function findLegalAction(
  actions: LegalAction[],
  request: PlayRequest,
): LegalAction | undefined {
  return actions.find((action) => actionMatchesRequest(action, request));
}

function displayMarbleOwner(actor: PlayerState, owner: PlayerState): string {
  return actor.id === owner.id ? 'a marble' : `${owner.name}'s marble`;
}

export function applyEnter(
  ctx: EngineContext,
  actor: PlayerState,
  owner: PlayerState,
  marble: MarbleState,
): void {
  if (marble.status !== 'base') {
    throw new GameRuleError('MARBLE_NOT_ELIGIBLE', 'Only a marble in base can enter.');
  }
  marble.status = 'board';
  marble.progress = 0;
  actor.stats.moves += 1;
  actor.stats.entries += 1;
  ctx.state.totalMoves += 1;
  const startCell = ctx.board.stations[owner.seat]?.startIndex ?? 0;
  addLog(ctx, {
    kind: 'marble-entered',
    playerId: actor.id,
    targetPlayerId: owner.id,
    text: `${actor.name} brought ${actor.id === owner.id ? 'a marble' : `${owner.name}'s marble`} onto the board.`,
  });
  addEvent(ctx, {
    type: 'marble-entered',
    playerId: owner.id,
    marbleId: marble.id,
    toCell: startCell,
  });
  refreshDerivedState(ctx);
}

export function captureAtDestination(
  ctx: EngineContext,
  actor: PlayerState,
  owner: PlayerState,
  destinationCell: number,
): number {
  if (ctx.rules.capture.scope === 'none') return 0;
  const cell = ctx.board.ring[destinationCell];
  if (!cell || cell.isSafe) return 0;

  let capturedCount = 0;
  for (const opponent of ctx.state.players) {
    if (opponent.teamId === owner.teamId) continue;
    for (const target of opponent.marbles) {
      if (target.status !== 'board' || target.progress === null) continue;
      if (target.progress >= ctx.board.ringLength) continue;
      const targetCell = ringCellForProgress(ctx.board, opponent.seat, target.progress);
      if (targetCell !== destinationCell) continue;

      target.status = 'base';
      target.progress = null;
      capturedCount += 1;
      actor.stats.captures += 1;
      ctx.state.totalCaptures += 1;
      addLog(ctx, {
        kind: 'marble-captured',
        playerId: actor.id,
        targetPlayerId: opponent.id,
        text: `${actor.name} captured ${opponent.name}'s marble and sent it back to base.`,
      });
      addEvent(ctx, {
        type: 'marble-captured',
        ownerId: opponent.id,
        marbleId: target.id,
        byPlayerId: actor.id,
        fromCell: destinationCell,
      });
    }
  }
  return capturedCount;
}

function addDestinationEventsAndLogs(
  ctx: EngineContext,
  actor: PlayerState,
  owner: PlayerState,
  marble: MarbleState,
  fromProgress: number,
  toProgress: number,
  direction: 'forward' | 'backward',
): void {
  const distance = Math.abs(toProgress - fromProgress);
  addLog(ctx, {
    kind: 'marble-moved',
    playerId: actor.id,
    targetPlayerId: owner.id,
    text: `${actor.name} moved ${displayMarbleOwner(actor, owner)} ${distance} ${
      distance === 1 ? 'step' : 'steps'
    } ${direction}.`,
  });
  addEvent(ctx, {
    type: 'marble-moved',
    playerId: owner.id,
    marbleId: marble.id,
    fromProgress,
    toProgress,
    direction,
  });

  if (fromProgress < ctx.board.ringLength && toProgress >= ctx.board.ringLength) {
    addLog(ctx, {
      kind: 'marble-home',
      playerId: owner.id,
      text: `${owner.name}'s marble entered the home lane.`,
    });
    addEvent(ctx, {
      type: 'marble-home',
      playerId: owner.id,
      marbleId: marble.id,
      slot: toProgress - ctx.board.ringLength,
    });
  }

  if (toProgress === ctx.board.routeLength - 1) {
    addLog(ctx, {
      kind: 'marble-home',
      playerId: owner.id,
      text: `${owner.name}'s marble reached home.`,
    });
    addEvent(ctx, {
      type: 'marble-home',
      playerId: owner.id,
      marbleId: marble.id,
      slot: ctx.board.homeLaneLength - 1,
    });
  }
}

export function applyForwardMove(
  ctx: EngineContext,
  actor: PlayerState,
  owner: PlayerState,
  marble: MarbleState,
  steps: number,
): void {
  if (marble.status === 'base' || marble.progress === null) {
    throw new GameRuleError('MARBLE_NOT_ELIGIBLE', 'That marble must enter before it can move.');
  }
  if (!Number.isInteger(steps) || steps < 1) {
    throw new GameRuleError('INVALID_ACTION', 'Steps must be a positive whole number.');
  }
  const fromProgress = marble.progress;
  const toProgress = fromProgress + steps;
  if (toProgress >= ctx.board.routeLength) {
    throw new GameRuleError('DESTINATION_INVALID', 'That move would pass the final home slot.');
  }

  marble.progress = toProgress;
  marble.status = toProgress >= ctx.board.ringLength ? 'home' : 'board';
  actor.stats.moves += 1;
  ctx.state.totalMoves += 1;

  addDestinationEventsAndLogs(
    ctx,
    actor,
    owner,
    marble,
    fromProgress,
    toProgress,
    'forward',
  );

  if (toProgress < ctx.board.ringLength) {
    const destinationCell = ringCellForProgress(ctx.board, owner.seat, toProgress);
    captureAtDestination(ctx, actor, owner, destinationCell);
  }

  refreshDerivedState(ctx);
}

export function applyBackwardMove(
  ctx: EngineContext,
  actor: PlayerState,
  owner: PlayerState,
  marble: MarbleState,
  steps: number,
): void {
  if (marble.status !== 'board' || marble.progress === null) {
    throw new GameRuleError('MARBLE_NOT_ELIGIBLE', 'Backward movement is only available on the ring.');
  }
  if (marble.progress >= ctx.board.ringLength) {
    throw new GameRuleError('MARBLE_NOT_ELIGIBLE', 'A marble cannot move backward out of its home lane.');
  }
  if (marble.progress - steps < 0) {
    throw new GameRuleError('DESTINATION_INVALID', 'That backward move would pass the starting cell.');
  }

  const fromProgress = marble.progress;
  const toProgress = fromProgress - steps;
  marble.progress = toProgress;
  actor.stats.moves += 1;
  ctx.state.totalMoves += 1;

  addDestinationEventsAndLogs(
    ctx,
    actor,
    owner,
    marble,
    fromProgress,
    toProgress,
    'backward',
  );

  if (ctx.rules.capture.backwardsCaptures) {
    const destinationCell = ringCellForProgress(ctx.board, owner.seat, toProgress);
    captureAtDestination(ctx, actor, owner, destinationCell);
  }

  refreshDerivedState(ctx);
}

export function applySwap(
  ctx: EngineContext,
  actor: PlayerState,
  owner: PlayerState,
  marble: MarbleState,
  targetPlayer: PlayerState,
  targetMarble: MarbleState,
): void {
  if (
    marble.progress === null ||
    marble.status !== 'board' ||
    targetMarble.progress === null ||
    targetMarble.status !== 'board' ||
    marble.progress >= ctx.board.ringLength ||
    targetMarble.progress >= ctx.board.ringLength
  ) {
    throw new GameRuleError('SWAP_TARGET_INVALID', 'Only marbles on the main ring can be swapped.');
  }
  if (owner.teamId === targetPlayer.teamId) {
    throw new GameRuleError('SWAP_TARGET_INVALID', 'Teammates cannot be swapped.');
  }

  const sourceCell = ringCellForProgress(ctx.board, owner.seat, marble.progress);
  const targetCell = ringCellForProgress(ctx.board, targetPlayer.seat, targetMarble.progress);
  const sourceStation = ctx.board.stations[owner.seat];
  const targetStation = ctx.board.stations[targetPlayer.seat];
  if (!sourceStation || !targetStation) {
    throw new GameRuleError('SWAP_TARGET_INVALID');
  }

  // Exchange physical board cells, then recompute owner-relative progress.
  marble.progress =
    ((targetCell - sourceStation.startIndex) % ctx.board.ringLength + ctx.board.ringLength) %
    ctx.board.ringLength;
  targetMarble.progress =
    ((sourceCell - targetStation.startIndex) % ctx.board.ringLength + ctx.board.ringLength) %
    ctx.board.ringLength;
  marble.status = 'board';
  targetMarble.status = 'board';

  actor.stats.moves += 1;
  actor.stats.swaps += 1;
  ctx.state.totalMoves += 1;

  addLog(ctx, {
    kind: 'swap',
    playerId: actor.id,
    targetPlayerId: targetPlayer.id,
    text: `${actor.name} swapped ${actor.id === owner.id ? 'a marble' : `${owner.name}'s marble`} with ${targetPlayer.name}.`,
  });
  addEvent(ctx, {
    type: 'swap',
    playerId: actor.id,
    marbleId: marble.id,
    targetPlayerId: targetPlayer.id,
    targetMarbleId: targetMarble.id,
  });

  refreshDerivedState(ctx);
}

export function cardPlayedLabel(card: Card, cardId: string): string {
  return `${cardName(card)} (${cardId})`;
}

export function locateOwnerAndMarble(
  ctx: EngineContext,
  marbleId: string,
): { player: PlayerState; marble: MarbleState } {
  const found = findMarble(ctx.state, marbleId);
  if (!found) throw new GameRuleError('MARBLE_NOT_ELIGIBLE', 'That marble could not be found.');
  return found;
}
