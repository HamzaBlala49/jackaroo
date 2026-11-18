import { describe, expect, it } from 'vitest';
import {
  createGameSnapshot,
  getLegalCardActions,
  getSevenOptions,
  playCard,
  toPublicGameState,
} from '../src';
import { createTestGame, giveOnlyCard, putMarble, setTurn, toRequest } from './helpers';

function snapshotFor(
  state: ReturnType<typeof createTestGame>,
  viewerId: string | null,
) {
  return createGameSnapshot(state, {
    code: 'ABC234',
    matchId: 'match-1',
    viewerId,
    presence: { p0: true, p1: false, p2: true, p3: true },
    finishedAt: null,
    serverTime: '2026-01-01T00:00:10.000Z',
  });
}

describe('client snapshots and privacy', () => {
  it('exposes only the viewer hand and public hand counts', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 0);
    giveOnlyCard(state, 0, 'Q');
    const snapshot = snapshotFor(state, 'p0');
    expect(snapshot.you?.hand).toHaveLength(1);
    expect(snapshot.you?.hand[0]?.id).toBe('Qc');
    expect(snapshot.you?.legalCards).toHaveLength(1);
    expect(snapshot.you?.legalCards[0]?.actions).toHaveLength(1);
    expect(snapshot.players.find((player) => player.id === 'p1')?.handCount).toBe(4);
    expect(snapshot.players.find((player) => player.id === 'p1')).not.toHaveProperty('hand');
    expect(snapshot).not.toHaveProperty('deck');
    expect(snapshot).not.toHaveProperty('seed');
    expect(snapshot).not.toHaveProperty('discard');
  });

  it('does not leak any opponent card into the serialized snapshot', () => {
    const state = createTestGame(8);
    const opponentCardIds = state.players
      .filter((player) => player.id !== state.players[0]?.id)
      .flatMap((player) => player.hand.map((card) => card.id));
    const json = JSON.stringify(snapshotFor(state, 'p0'));
    for (const cardId of opponentCardIds) {
      expect(json).not.toContain(`"${cardId}"`);
    }
    expect(json).not.toContain(state.seed);
  });

  it('gives non-current players no legal actions but keeps their hand', () => {
    const state = createTestGame(4);
    setTurn(state, 1);
    const snapshot = snapshotFor(state, 'p0');
    expect(snapshot.you?.hand).toHaveLength(4);
    expect(snapshot.you?.legalCards).toHaveLength(0);
    expect(snapshot.currentPlayerId).toBe('p1');
  });

  it('supports spectators without a hand', () => {
    const snapshot = snapshotFor(createTestGame(4), null);
    expect(snapshot.you).toBeNull();
  });

  it('reports presence and rules for the in-game rule sheet', () => {
    const snapshot = snapshotFor(createTestGame(6), 'p0');
    expect(snapshot.presence).toEqual({ p0: true, p1: false, p2: true, p3: true, p4: false, p5: false });
    expect(snapshot.rules.ringLength).toBe(72);
    expect(snapshot.rules.homeLaneLength).toBe(4);
    expect(snapshot.rules.cardRules).toHaveLength(13);
    expect(snapshot.rules.allowTeamAssistance).toBe(true);
  });

  it('provides seven options only to the splitting player', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 0);
    giveOnlyCard(state, 0, '7');
    const action = getLegalCardActions(state, 'p0')[0]?.actions[0];
    const next = playCard(state, 'p0', '7c', toRequest(action!)).state;
    const actorSnapshot = snapshotFor(next, 'p0');
    expect(actorSnapshot.phase).toBe('seven');
    expect(actorSnapshot.you?.sevenOptions[0]?.maxSteps).toBe(7);
    expect(actorSnapshot.you?.legalCards).toHaveLength(0);
    expect(actorSnapshot.seven?.segments).toEqual([]);

    const otherSnapshot = snapshotFor(next, 'p1');
    expect(otherSnapshot.you?.sevenOptions).toHaveLength(0);
    expect(getSevenOptions(next, 'p1')).toHaveLength(0);
  });

  it('never includes private fields in the public state', () => {
    const publicState = toPublicGameState(createTestGame(4));
    const json = JSON.stringify(publicState);
    expect(json).not.toContain('"deck"');
    expect(json).not.toContain('"seed"');
    expect(publicState.players[0]).not.toHaveProperty('hand');
    expect(publicState.players[0]?.handCount).toBe(4);
  });

  it('tracks the monotonic state version', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 0);
    giveOnlyCard(state, 0, 'Q');
    const before = snapshotFor(state, 'p0');
    const next = playCard(state, 'p0', 'Qc', {
      kind: 'move',
      marbleId: 'p0:m0',
      steps: 12,
    }).state;
    const after = snapshotFor(next, 'p0');
    expect(after.version).toBe(before.version + 1);
  });
});
