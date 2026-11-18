import { describe, expect, it } from 'vitest';
import { createGame, forcePass } from '../src';
import { createStandardDeck } from '../src/deck';
import { card, createTestGame, setHand, allBase } from './helpers';

describe('game setup and dealing', () => {
  it.each([4, 6, 8] as const)('sets up a valid %i-player match', (playerCount) => {
    const state = createTestGame(playerCount);
    const teamCount = playerCount / 2;

    expect(state.playerCount).toBe(playerCount);
    expect(state.players).toHaveLength(playerCount);
    expect(state.teams).toHaveLength(teamCount);
    expect(state.status).toBe('active');
    expect(state.phase).toBe('awaiting-card');
    expect(state.round).toBe(1);
    expect(state.currentSeat).toBe(0);
    expect(state.startingSeat).toBe(0);
    expect(state.winnerTeamId).toBeNull();

    for (const player of state.players) {
      expect(player.hand).toHaveLength(4);
      expect(player.marbles).toHaveLength(4);
      expect(player.marbles.every((marble) => marble.status === 'base')).toBe(true);
      expect(player.finished).toBe(false);
    }
    for (const team of state.teams) {
      expect(team.playerIds).toHaveLength(2);
      expect(team.marblesHome).toBe(0);
    }
    expect(state.deck).toHaveLength(52 - 4 * playerCount);
    expect(state.discard).toHaveLength(0);
  });

  it('deals unique cards with a stable seeded order', () => {
    const first = createTestGame(8);
    const second = createTestGame(8);
    const firstHands = first.players.map((player) => player.hand.map((entry) => entry.id));
    const secondHands = second.players.map((player) => player.hand.map((entry) => entry.id));
    expect(firstHands).toEqual(secondHands);

    const allIds = [
      ...first.players.flatMap((player) => player.hand.map((entry) => entry.id)),
      ...first.deck.map((entry) => entry.id),
    ];
    expect(new Set(allIds).size).toBe(52);

    const otherSeed = createGame({
      id: 'different',
      players: Array.from({ length: 4 }, (_, seat) => ({ id: `p${seat}`, name: `P${seat}` })),
      seed: 'another-seed',
      startedAt: '2026-01-01T00:00:00Z',
    });
    expect(otherSeed.players.map((player) => player.hand.map((c) => c.id))).not.toEqual(
      firstHands.slice(0, 4),
    );
  });

  it('assigns teams by alternating seats', () => {
    const state = createTestGame(8);
    expect(state.players.map((player) => player.teamId)).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
  });

  it('honours an explicit starting seat', () => {
    const state = createGame({
      id: 'start-seat',
      players: Array.from({ length: 6 }, (_, seat) => ({ id: `p${seat}`, name: `P${seat}` })),
      seed: 'start',
      startedAt: '2026-01-01T00:00:00Z',
      startingSeat: 3,
    });
    expect(state.currentSeat).toBe(3);
    expect(state.startingSeat).toBe(3);
  });

  it('rejects unsupported player counts and duplicate player ids', () => {
    expect(() =>
      createGame({
        id: 'bad',
        players: Array.from({ length: 5 }, (_, seat) => ({ id: `p${seat}`, name: `P${seat}` })),
        seed: 'x',
        startedAt: '2026-01-01T00:00:00Z',
      }),
    ).toThrow(/4, 6 or 8/);

    expect(() =>
      createGame({
        id: 'dup',
        players: [
          { id: 'same', name: 'A' },
          { id: 'same', name: 'B' },
          { id: 'p2', name: 'C' },
          { id: 'p3', name: 'D' },
        ],
        seed: 'x',
        startedAt: '2026-01-01T00:00:00Z',
      }),
    ).toThrow(/unique/);
  });

  it('reshuffles and redeals after everyone has emptied their hand, rotating the start', () => {
    let state = createTestGame(4);
    for (const seat of [0, 1, 2, 3]) {
      allBase(state, seat);
      setHand(state, seat, [card('2')]);
      state.currentSeat = seat;
      state = forcePass(state, `p${seat}`, '2c').state;
    }

    expect(state.round).toBe(2);
    expect(state.startingSeat).toBe(1);
    expect(state.currentSeat).toBe(1);
    expect(state.discard).toHaveLength(0);
    for (const player of state.players) {
      expect(player.hand).toHaveLength(4);
    }
    expect(state.deck).toHaveLength(52 - 16);
    const allCards = [
      ...state.players.flatMap((player) => player.hand),
      ...state.deck,
      ...state.discard,
    ];
    expect(allCards).toHaveLength(52);
    expect(new Set(allCards.map((entry) => entry.id)).size).toBe(52);
    expect(state.log.some((entry) => entry.kind === 'round-ended')).toBe(true);
  });

  it('builds a 52-card standard deck exactly once', () => {
    const deck = createStandardDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((entry) => entry.id)).size).toBe(52);
    expect(deck.every((entry) => entry.id.length >= 2)).toBe(true);
  });
});
