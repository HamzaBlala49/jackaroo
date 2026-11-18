import { describe, expect, it } from 'vitest';
import {
  createGame,
  endSevenTurn,
  forcePass,
  getLegalCardActions,
  getSevenOptions,
  makeSevenMove,
  playCard,
} from '../src';
import { createSeededRng } from '@jackaroo/shared-utils';
import type { Card, GameState, LegalAction, PlayRequest } from '@jackaroo/game-types';

/**
 * Plays a full, deterministic match for every supported table size using only
 * server-legal actions. This guards the turn/round/win pipeline end to end.
 */
function playFullMatch(playerCount: 4 | 6 | 8, seed: string): GameState {
  let state = createGame({
    id: `full-${playerCount}`,
    players: Array.from({ length: playerCount }, (_, seat) => ({
      id: `p${seat}`,
      name: `Player ${seat}`,
    })),
    seed,
    startedAt: '2026-01-01T00:00:00.000Z',
  });

  const rng = createSeededRng(`${seed}:sim`);
  let guard = 0;

  while (state.status === 'active' && guard < 5000) {
    guard += 1;
    const current = state.players.find((player) => player.seat === state.currentSeat);
    if (!current) throw new Error('No current player');

    if (state.phase === 'seven' && state.seven) {
      const options = getSevenOptions(state, current.id);
      if (options.length > 0) {
        const option = options[Math.floor(rng() * options.length)]!;
        state = makeSevenMove(state, current.id, option.marbleId, 1).state;
      } else {
        state = endSevenTurn(state, current.id).state;
      }
      continue;
    }

    const legal = getLegalCardActions(state, current.id);
    const playable = legal.filter((card) => card.actions.length > 0);
    if (playable.length === 0) {
      const card = current.hand[0];
      if (!card) throw new Error('Current player has no cards to discard');
      state = forcePass(state, current.id, card.id).state;
      continue;
    }

    const cardEntry = playable[Math.floor(rng() * playable.length)]!;
    const action = pickAction(cardEntry.actions, rng);
    state = playCard(state, current.id, cardEntry.cardId, action).state;

    // Resolve any seven that was just opened so the loop always ends the turn.
    let sevenGuard = 0;
    while (state.phase === 'seven' && state.status === 'active' && sevenGuard < 30) {
      sevenGuard += 1;
      const options = getSevenOptions(state, current.id);
      if (options.length === 0) {
        state = endSevenTurn(state, current.id).state;
        break;
      }
      const option = options[Math.floor(rng() * options.length)]!;
      state = makeSevenMove(state, current.id, option.marbleId, 1).state;
    }
    if (state.phase === 'seven' && state.status === 'active') {
      state = endSevenTurn(state, current.id).state;
    }
  }

  if (guard >= 5000) throw new Error('Simulation did not finish');
  return state;
}

function pickAction(actions: LegalAction[], rng: () => number): PlayRequest {
  const action = actions[Math.floor(rng() * actions.length)]!;
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

function countCards(state: GameState): number {
  return (
    state.deck.length +
    state.discard.length +
    state.players.reduce((total, player) => total + player.hand.length, 0)
  );
}

describe('full match simulation', () => {
  it.each([4, 6, 8] as const)('plays a %i-player match to a team victory', (playerCount) => {
    const state = playFullMatch(playerCount, `full-match-${playerCount}`);

    expect(state.status).toBe('finished');
    expect(state.phase).toBe('finished');
    expect(state.winnerTeamId).not.toBeNull();
    expect(state.winnerTeamId).toBeGreaterThanOrEqual(0);
    expect(state.winnerTeamId).toBeLessThan(playerCount / 2);

    const winner = state.teams.find((team) => team.id === state.winnerTeamId);
    expect(winner?.marblesHome).toBe(8);
    expect(winner?.finished).toBe(true);

    for (const player of state.players) {
      expect(player.marbles).toHaveLength(4);
      expect(player.marbles.every((marble) => marble.progress === 75)).toBe(
        player.teamId === state.winnerTeamId,
      );
    }

    expect(countCards(state)).toBe(52);
    expect(state.round).toBeGreaterThan(1);
    expect(state.totalMoves).toBeGreaterThan(0);
    expect(state.log.some((entry) => entry.kind === 'game-finished')).toBe(true);
  });

  it('keeps matches deterministic for a fixed seed', () => {
    const first = playFullMatch(4, 'deterministic');
    const second = playFullMatch(4, 'deterministic');
    expect(first.totalMoves).toBe(second.totalMoves);
    expect(first.winnerTeamId).toBe(second.winnerTeamId);
    expect(first.log.map((entry) => entry.seq)).toEqual(second.log.map((entry) => entry.seq));
  });

  it('never leaks a card or marble across a long match', () => {
    const state = playFullMatch(8, 'conservation-8');
    const marbleIds = state.players.flatMap((player) => player.marbles.map((marble) => marble.id));
    expect(new Set(marbleIds).size).toBe(32);
    expect(countCards(state)).toBe(52);
    const cardIds = [
      ...state.deck.map((card: Card) => card.id),
      ...state.discard.map((card: Card) => card.id),
      ...state.players.flatMap((player) => player.hand.map((card: Card) => card.id)),
    ];
    expect(new Set(cardIds).size).toBe(52);
  });
});
