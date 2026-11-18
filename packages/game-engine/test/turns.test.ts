import { describe, expect, it } from 'vitest';
import {
  forcePass,
  getLegalCardActions,
  playCard,
} from '../src';
import { GameRuleError } from '../src/errors';
import {
  createTestGame,
  giveOnlyCard,
  putMarble,
  setHand,
  setTurn,
  toRequest,
  card,
} from './helpers';

describe('turns, passing and validation', () => {
  it('rejects actions from the wrong player', () => {
    const state = createTestGame(4);
    setTurn(state, 1);
    giveOnlyCard(state, 0, 'Q');
    putMarble(state, 0, 0, 0);
    expect(getLegalCardActions(state, 'p0')).toHaveLength(0);
    expect(() =>
      playCard(state, 'p0', 'Qc', { kind: 'move', marbleId: 'p0:m0', steps: 12 }),
    ).toThrowError(GameRuleError);
    try {
      playCard(state, 'p0', 'Qc', { kind: 'move', marbleId: 'p0:m0', steps: 12 });
    } catch (error) {
      expect((error as GameRuleError).code).toBe('NOT_YOUR_TURN');
    }
  });

  it('rejects a card that is not in the hand', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    setHand(state, 0, [card('2')]);
    putMarble(state, 0, 0, 0);
    expect(() =>
      playCard(state, 'p0', 'Qc', { kind: 'move', marbleId: 'p0:m0', steps: 12 }),
    ).toThrowError(GameRuleError);
    try {
      playCard(state, 'p0', 'Qc', { kind: 'move', marbleId: 'p0:m0', steps: 12 });
    } catch (error) {
      expect((error as GameRuleError).code).toBe('CARD_NOT_IN_HAND');
    }
  });

  it('forces a discard only when no card has a legal action', () => {
    let state = createTestGame(4);
    setTurn(state, 0);
    setHand(state, 0, [card('2'), card('5')]);
    state = forcePass(state, 'p0', '2c').state;
    expect(state.players[0]?.hand.map((entry) => entry.id)).toEqual(['5c']);
    expect(state.currentSeat).toBe(1);
    expect(state.players[0]?.stats.passes).toBe(1);
  });

  it('rejects a pass while the player has any legal move', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    setHand(state, 0, [card('2'), card('5')]);
    putMarble(state, 0, 0, 0);
    expect(() => forcePass(state, 'p0', '2c')).toThrowError(GameRuleError);
    try {
      forcePass(state, 'p0', '2c');
    } catch (error) {
      expect((error as GameRuleError).code).toBe('NO_LEGAL_MOVE');
    }
  });

  it('skips players who have emptied their hand', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    setHand(state, 0, [card('Q')]);
    setHand(state, 1, []);
    putMarble(state, 0, 0, 0);
    const result = playCard(state, 'p0', 'Qc', { kind: 'move', marbleId: 'p0:m0', steps: 12 });
    expect(result.state.currentSeat).toBe(2);
  });

  it('cannot end a split with a different player', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 0);
    giveOnlyCard(state, 0, '7');
    const action = getLegalCardActions(state, 'p0')[0]?.actions[0];
    const next = playCard(state, 'p0', '7c', toRequest(action!)).state;
    expect(() => playCard(next, 'p1', '7c', { kind: 'begin-seven' })).toThrowError(GameRuleError);
  });

  it('rejects any play after the game has finished', () => {
    const state = createTestGame(4);
    state.status = 'finished';
    state.phase = 'finished';
    setTurn(state, 0);
    giveOnlyCard(state, 0, '2');
    putMarble(state, 0, 0, 0);
    try {
      playCard(state, 'p0', '2c', { kind: 'move', marbleId: 'p0:m0', steps: 2 });
      throw new Error('Expected an error');
    } catch (error) {
      expect((error as GameRuleError).code).toBe('GAME_FINISHED');
    }
  });

  it('awards the turn to the next seat and logs the transition', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    const queen = giveOnlyCard(state, 0, 'Q');
    putMarble(state, 0, 0, 0);
    const result = playCard(state, 'p0', queen.id, {
      kind: 'move',
      marbleId: 'p0:m0',
      steps: 12,
    });
    expect(result.state.currentSeat).toBe(1);
    expect(result.state.turnNumber).toBe(2);
    expect(result.events.some((event) => event.type === 'turn-started')).toBe(true);
    expect(result.state.log.some((entry) => entry.kind === 'turn-started')).toBe(true);
  });
});
