import { describe, expect, it } from 'vitest';
import {
  endSevenTurn,
  getLegalCardActions,
  getSevenOptions,
  makeSevenMove,
  playCard,
} from '../src';
import { GameRuleError } from '../src/errors';
import {
  createTestGame,
  giveOnlyCard,
  putMarble,
  putMarbleAtCell,
  setTurn,
  toRequest,
} from './helpers';

function beginSeven(state: ReturnType<typeof createTestGame>) {
  setTurn(state, 0);
  giveOnlyCard(state, 0, '7', 'diamonds');
  const card = getLegalCardActions(state, 'p0')[0];
  const action = card?.actions.find((entry) => entry.kind === 'begin-seven');
  if (!action) throw new Error('7 was not playable');
  return playCard(state, 'p0', '7d', toRequest(action)).state;
}

describe('seven split', () => {
  it('starts a split phase and stays on the same turn', () => {
    const state = createTestGame(4);
    putMarble(state, 0, 0, 0);
    const next = beginSeven(state);
    expect(next.phase).toBe('seven');
    expect(next.currentSeat).toBe(0);
    expect(next.seven?.remaining).toBe(7);
    expect(next.seven?.segments).toHaveLength(0);
    expect(next.discard.map((card) => card.id)).toContain('7d');
    expect(getLegalCardActions(next, 'p0')).toHaveLength(0);
    expect(getSevenOptions(next, 'p0')[0]?.maxSteps).toBe(7);
  });

  it('applies segments, reduces remaining steps and allows an early end', () => {
    let state = createTestGame(4);
    putMarble(state, 0, 0, 0);
    putMarble(state, 0, 1, 0);
    state = beginSeven(state);

    let result = makeSevenMove(state, 'p0', 'p0:m0', 2);
    state = result.state;
    expect(state.seven?.remaining).toBe(5);
    expect(state.seven?.segments).toEqual([{ marbleId: 'p0:m0', steps: 2 }]);

    result = makeSevenMove(state, 'p0', 'p0:m1', 3);
    state = result.state;
    expect(state.seven?.remaining).toBe(2);
    expect(state.players[0]?.marbles[0]?.progress).toBe(2);
    expect(state.players[0]?.marbles[1]?.progress).toBe(3);

    const ended = endSevenTurn(state, 'p0');
    expect(ended.state.phase).toBe('awaiting-card');
    expect(ended.state.currentSeat).toBe(1);
    expect(ended.state.seven).toBeNull();
    expect(ended.state.players[0]?.stats.cardsPlayed).toBe(1);
    expect(ended.state.players[0]?.stats.moves).toBe(2);
    expect(ended.state.log.some((entry) => entry.text.includes('unused'))).toBe(true);
  });

  it('auto-ends the turn after all 7 steps are used', () => {
    let state = createTestGame(4);
    putMarble(state, 0, 0, 0);
    state = beginSeven(state);
    for (let step = 0; step < 7; step += 1) {
      expect(state.phase).toBe('seven');
      state = makeSevenMove(state, 'p0', 'p0:m0', 1).state;
    }
    expect(state.players[0]?.marbles[0]?.progress).toBe(7);
    expect(state.phase).toBe('awaiting-card');
    expect(state.currentSeat).toBe(1);
    expect(state.seven).toBeNull();
  });

  it('rejects a segment larger than the remaining split', () => {
    let state = createTestGame(4);
    putMarble(state, 0, 0, 0);
    state = beginSeven(state);
    expect(() => makeSevenMove(state, 'p0', 'p0:m0', 8)).toThrowError(GameRuleError);
    try {
      makeSevenMove(state, 'p0', 'p0:m0', 8);
    } catch (error) {
      expect((error as GameRuleError).code).toBe('SPLIT_EXCEEDED');
    }
  });

  it('is not playable when no marble can take a step', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    giveOnlyCard(state, 0, '7');
    expect(getLegalCardActions(state, 'p0')[0]?.actions).toHaveLength(0);
  });

  it('captures during a split segment', () => {
    let state = createTestGame(4);
    putMarble(state, 0, 0, 0);
    putMarbleAtCell(state, 1, 0, 3);
    state = beginSeven(state);
    const result = makeSevenMove(state, 'p0', 'p0:m0', 3);
    state = result.state;
    expect(state.players[1]?.marbles[0]?.status).toBe('base');
    expect(state.players[0]?.stats.captures).toBe(1);
    expect(result.events.some((event) => event.type === 'marble-captured')).toBe(true);
  });

  it('supports entering the home lane and exact destination limits', () => {
    const state = createTestGame(4);
    putMarble(state, 0, 0, 71);
    const next = beginSeven(state);
    expect(getSevenOptions(next, 'p0')[0]?.maxSteps).toBe(4);
    const result = makeSevenMove(next, 'p0', 'p0:m0', 4);
    expect(result.state.players[0]?.marbles[0]?.progress).toBe(75);
    expect(result.state.players[0]?.marbles[0]?.status).toBe('home');
  });

  it('rejects splitting past the final home slot', () => {
    let state = createTestGame(4);
    putMarble(state, 0, 0, 72);
    state = beginSeven(state);
    expect(() => makeSevenMove(state, 'p0', 'p0:m0', 5)).toThrowError(GameRuleError);
    try {
      makeSevenMove(state, 'p0', 'p0:m0', 5);
    } catch (error) {
      expect((error as GameRuleError).code).toBe('DESTINATION_INVALID');
    }
  });

  it('lets a finished player split a teammate marble', () => {
    let state = createTestGame(4);
    setTurn(state, 0);
    state.players[0]!.finished = true;
    putMarble(state, 2, 0, 0);
    state = beginSeven(state);
    expect(state.seven?.scopePlayerId).toBe('p2');
    const option = getSevenOptions(state, 'p0')[0];
    expect(option?.marbleId).toBe('p2:m0');
    const result = makeSevenMove(state, 'p0', 'p2:m0', 2);
    expect(result.state.players[2]?.marbles[0]?.progress).toBe(2);
  });

  it('requires at least one segment before ending the split', () => {
    let state = createTestGame(4);
    putMarble(state, 0, 0, 0);
    state = beginSeven(state);
    expect(() => endSevenTurn(state, 'p0')).toThrowError(GameRuleError);
  });
});
