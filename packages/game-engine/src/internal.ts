import { createBoardModel, type BoardModel } from '@jackaroo/game-board';
import { GAME_LOG_LIMIT } from '@jackaroo/game-config';
import type {
  GameFeedEvent,
  GameLogEntry,
  GameState,
  JackarooRules,
  MarbleState,
  PlayerState,
} from '@jackaroo/game-types';

export interface EngineContext {
  state: GameState;
  rules: JackarooRules;
  board: BoardModel;
  events: GameFeedEvent[];
}

export function createContext(state: GameState): EngineContext {
  return {
    state,
    rules: state.rules,
    board: createBoardModel(state.playerCount, {
      ringLength: state.rules.board.ringLength,
      homeLaneLength: state.rules.board.homeLaneLength,
      safePositions: state.rules.safePositions,
    }),
    events: [],
  };
}

export function addLog(
  ctx: EngineContext,
  entry: Omit<GameLogEntry, 'seq'>,
): GameLogEntry {
  const seq = (ctx.state.log[ctx.state.log.length - 1]?.seq ?? 0) + 1;
  const logEntry: GameLogEntry = { ...entry, seq };
  ctx.state.log.push(logEntry);
  if (ctx.state.log.length > GAME_LOG_LIMIT) {
    ctx.state.log.splice(0, ctx.state.log.length - GAME_LOG_LIMIT);
  }
  return logEntry;
}

export function addEvent(ctx: EngineContext, event: GameFeedEvent): void {
  ctx.events.push(event);
}

export function getPlayerById(state: GameState, playerId: string): PlayerState | undefined {
  return state.players.find((player) => player.id === playerId);
}

export function requirePlayerById(state: GameState, playerId: string): PlayerState {
  const player = getPlayerById(state, playerId);
  if (!player) throw new Error(`Unknown player ${playerId}`);
  return player;
}

export function getCurrentPlayer(state: GameState): PlayerState | undefined {
  return state.players[state.currentSeat];
}

export function getTeammate(state: GameState, player: PlayerState): PlayerState | undefined {
  return state.players.find(
    (candidate) => candidate.teamId === player.teamId && candidate.id !== player.id,
  );
}

export function findMarble(
  state: GameState,
  marbleId: string,
): { player: PlayerState; marble: MarbleState } | undefined {
  for (const player of state.players) {
    const marble = player.marbles.find((candidate) => candidate.id === marbleId);
    if (marble) return { player, marble };
  }
  return undefined;
}

export function isInRotation(player: PlayerState, rules: JackarooRules): boolean {
  return !(player.finished && !rules.allowTeamAssistance);
}

export function nextSeat(
  state: GameState,
  fromSeat: number,
  predicate: (player: PlayerState) => boolean,
): number | null {
  for (let offset = 1; offset <= state.playerCount; offset += 1) {
    const seat = (fromSeat + offset) % state.playerCount;
    const player = state.players[seat];
    if (player && predicate(player)) return seat;
  }
  return null;
}

export function countHomeMarbles(player: PlayerState, routeLength: number): number {
  const finalProgress = routeLength - 1;
  return player.marbles.filter(
    (marble) => marble.progress !== null && marble.progress >= finalProgress,
  ).length;
}

/**
 * Recomputes team totals, finished players, team victory and the finished phase.
 * Idempotent; safe to call after every state-changing effect.
 */
export function refreshDerivedState(ctx: EngineContext): void {
  const { state, rules } = ctx;

  for (const player of state.players) {
    player.stats.marblesHome = countHomeMarbles(player, ctx.board.routeLength);
    const allHome = player.marbles.every(
      (marble) => marble.progress !== null && marble.progress >= ctx.board.routeLength - 1,
    );
    if (allHome && !player.finished) {
      const finishOrder = state.players.filter((other) => other.finished).length + 1;
      player.finished = true;
      player.finishOrder = finishOrder;
      addLog(ctx, {
        kind: 'player-finished',
        playerId: player.id,
        text: `${player.name} finished all ${player.marbles.length} marbles.`,
      });
      addEvent(ctx, { type: 'player-finished', playerId: player.id, teamId: player.teamId });

      if (!rules.allowTeamAssistance && player.hand.length > 0) {
        state.discard.push(...player.hand);
        player.hand = [];
        addLog(ctx, {
          kind: 'player-finished',
          playerId: player.id,
          text: `${player.name} sits out; team assistance is disabled in this table's rules.`,
        });
      }
    }
  }

  const requiredMarbles = rules.marblesPerPlayer * rules.playersPerTeam;
  for (const team of state.teams) {
    const teamHome = state.players
      .filter((player) => player.teamId === team.id)
      .reduce((total, player) => total + countHomeMarbles(player, ctx.board.routeLength), 0);
    team.marblesHome = teamHome;
    team.finished = teamHome >= requiredMarbles;
  }

  if (state.status === 'active') {
    const winningTeam = state.teams.find((team) => team.finished);
    if (winningTeam) {
      state.status = 'finished';
      state.phase = 'finished';
      state.winnerTeamId = winningTeam.id;
      state.seven = null;
      addLog(ctx, {
        kind: 'game-finished',
        teamId: winningTeam.id,
        text: `${teamName(winningTeam.id)} wins the match!`,
      });
      addEvent(ctx, {
        type: 'game-finished',
        winningTeamId: winningTeam.id,
        playerIds: winningTeam.playerIds,
      });
    }
  }
}

export function teamName(teamId: number): string {
  const names = ['Team Emerald', 'Team Amber', 'Team Sapphire', 'Team Rose'];
  return names[teamId] ?? `Team ${teamId + 1}`;
}
