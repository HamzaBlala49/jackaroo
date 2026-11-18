import { describe, expect, it } from 'vitest';
import { getLegalCardActions, playCard } from '../src';
import { GameRuleError } from '../src/errors';
import {
  boardFor,
  createTestGame,
  giveOnlyCard,
  putMarble,
  putMarbleAtCell,
  setTurn,
  toRequest,
} from './helpers';
import { ringCellForProgress } from '@jackaroo/game-board';

describe('Jack swap', () => {
  it('exchanges physical cells between a mover and an opponent', () => {
    const state = createTestGame(4);
    const board = boardFor(state);
    setTurn(state, 0);
    putMarbleAtCell(state, 0, 0, 5);
    putMarbleAtCell(state, 1, 0, 7);
    giveOnlyCard(state, 0, 'J', 'hearts');
    const legal = getLegalCardActions(state, 'p0')[0];
    expect(legal?.actions).toHaveLength(1);
    const action = legal?.actions[0];
    expect(action?.kind).toBe('swap');

    const result = playCard(state, 'p0', 'Jh', toRequest(action!)).state;
    const ownMarble = result.players[0]?.marbles[0];
    const targetMarble = result.players[1]?.marbles[0];
    expect(ownMarble?.progress).not.toBeNull();
    expect(targetMarble?.progress).not.toBeNull();
    expect(ringCellForProgress(board, 0, ownMarble!.progress!)).toBe(7);
    expect(ringCellForProgress(board, 1, targetMarble!.progress!)).toBe(5);
    expect(result.players[0]?.stats.swaps).toBe(1);
    expect(result.players[0]?.stats.captures).toBe(0);
    expect(result.players[1]?.marbles[0]?.status).toBe('board');
  });

  it('cannot swap from a safe start cell', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 0);
    putMarbleAtCell(state, 1, 0, 7);
    giveOnlyCard(state, 0, 'J');
    expect(getLegalCardActions(state, 'p0')[0]?.actions).toHaveLength(0);
  });

  it('cannot swap a protected opponent marble', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    putMarbleAtCell(state, 0, 0, 5);
    putMarble(state, 1, 0, 0); // their start cell is protected
    giveOnlyCard(state, 0, 'J');
    expect(getLegalCardActions(state, 'p0')[0]?.actions).toHaveLength(0);
  });

  it('cannot swap with a teammate or a base/home marble', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    putMarbleAtCell(state, 0, 0, 5);
    putMarbleAtCell(state, 2, 0, 7);
    putMarble(state, 1, 0, null);
    putMarble(state, 1, 1, 73);
    giveOnlyCard(state, 0, 'J');
    expect(getLegalCardActions(state, 'p0')[0]?.actions).toHaveLength(0);
  });

  it('allows a finished player to swap a teammate marble (assistance)', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    state.players[0]!.finished = true;
    putMarbleAtCell(state, 2, 0, 5);
    putMarbleAtCell(state, 1, 0, 7);
    giveOnlyCard(state, 0, 'J');
    const legal = getLegalCardActions(state, 'p0')[0];
    const swap = legal?.actions.find((action) => action.kind === 'swap');
    expect(swap).toBeDefined();
    const result = playCard(state, 'p0', 'Jc', toRequest(swap!)).state;
    expect(result.players[2]?.marbles[0]?.status).toBe('board');
    expect(result.players[1]?.marbles[0]?.status).toBe('board');
    expect(result.players[0]?.stats.swaps).toBe(1);
  });

  it('rejects an invented swap target', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    putMarbleAtCell(state, 0, 0, 5);
    putMarbleAtCell(state, 1, 0, 7);
    giveOnlyCard(state, 0, 'J');
    expect(() =>
      playCard(state, 'p0', 'Jc', {
        kind: 'swap',
        marbleId: 'p0:m0',
        targetPlayerId: 'p1',
        targetMarbleId: 'p1:m3',
      }),
    ).toThrowError(GameRuleError);
  });
});
