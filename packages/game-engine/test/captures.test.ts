import { describe, expect, it } from 'vitest';
import { getLegalCardActions, playCard } from '../src';
import {
  boardFor,
  createTestGame,
  giveOnlyCard,
  putMarble,
  putMarbleAtCell,
  setTurn,
  toRequest,
} from './helpers';

function playRank(state: ReturnType<typeof createTestGame>, rank: Parameters<typeof giveOnlyCard>[2]) {
  setTurn(state, 0);
  const entry = giveOnlyCard(state, 0, rank);
  const legal = getLegalCardActions(state, 'p0').find((c) => c.cardId === entry.id);
  const action = legal?.actions[0];
  if (!action) throw new Error('No legal action');
  return playCard(state, 'p0', entry.id, toRequest(action));
}

describe('captures, safe cells and stacks', () => {
  it('captures an opponent on a normal ring cell', () => {
    const state = createTestGame(4);
    putMarble(state, 0, 0, 1);
    putMarbleAtCell(state, 1, 0, 13);
    const result = playRank(state, 'Q');
    expect(result.state.players[1]?.marbles[0]?.status).toBe('base');
    expect(result.state.players[1]?.marbles[0]?.progress).toBeNull();
    expect(result.state.players[0]?.stats.captures).toBe(1);
    expect(result.state.totalCaptures).toBe(1);
    expect(result.events.filter((event) => event.type === 'marble-captured')).toHaveLength(1);
  });

  it('captures every opponent marble on the landing cell but never teammates', () => {
    const state = createTestGame(4);
    putMarble(state, 0, 0, 1);
    putMarbleAtCell(state, 1, 0, 13);
    putMarbleAtCell(state, 1, 1, 13);
    putMarbleAtCell(state, 3, 0, 13);
    putMarbleAtCell(state, 2, 0, 13);

    const result = playRank(state, 'Q');
    expect(result.state.players[1]?.marbles[0]?.status).toBe('base');
    expect(result.state.players[1]?.marbles[1]?.status).toBe('base');
    expect(result.state.players[3]?.marbles[0]?.status).toBe('base');
    expect(result.state.players[2]?.marbles[0]?.status).toBe('board');
    expect(result.state.players[0]?.stats.captures).toBe(3);
  });

  it('does not capture on a protected starting cell', () => {
    const state = createTestGame(4);
    putMarble(state, 0, 0, 6);
    putMarble(state, 1, 0, 0); // seat 1 start = cell 18
    const result = playRank(state, 'Q');
    expect(result.state.players[0]?.marbles[0]?.progress).toBe(18);
    expect(result.state.players[1]?.marbles[0]?.status).toBe('board');
    expect(result.state.players[0]?.stats.captures).toBe(0);
  });

  it('does not capture on a neutral star cell', () => {
    const state = createTestGame(4);
    putMarble(state, 0, 0, 7);
    putMarbleAtCell(state, 1, 0, 9);
    const result = playRank(state, '2');
    expect(result.state.players[0]?.marbles[0]?.progress).toBe(9);
    expect(result.state.players[1]?.marbles[0]?.status).toBe('board');
    expect(result.state.players[0]?.stats.captures).toBe(0);
  });

  it('allows backward captures by default', () => {
    const state = createTestGame(4);
    putMarble(state, 0, 0, 8);
    putMarbleAtCell(state, 1, 0, 4);
    const result = playRank(state, '4');
    expect(result.state.players[0]?.marbles[0]?.progress).toBe(4);
    expect(result.state.players[1]?.marbles[0]?.status).toBe('base');
    expect(result.state.players[0]?.stats.captures).toBe(1);
  });

  it('allows friendly marbles to share a cell without capture', () => {
    const state = createTestGame(4);
    putMarble(state, 0, 0, 1);
    putMarbleAtCell(state, 2, 0, 7);
    putMarble(state, 0, 1, 1);
    const result = playRank(state, '6');
    expect(result.state.players[0]?.marbles[0]?.progress).toBe(7);
    expect(result.state.players[2]?.marbles[0]?.status).toBe('board');
  });

  it('sends captured marbles to base, requiring a new entry card', () => {
    const state = createTestGame(4);
    putMarble(state, 0, 0, 1);
    putMarbleAtCell(state, 1, 0, 13);
    const result = playRank(state, 'Q');
    expect(result.state.players[1]?.marbles[0]?.status).toBe('base');
    expect(result.state.players[1]?.marbles[0]?.progress).toBeNull();
    expect(result.state.players[1]?.stats.marblesHome).toBe(0);
  });

  it('can capture on the cell immediately after the mover\'s start', () => {
    const state = createTestGame(4);
    const board = boardFor(state);
    putMarble(state, 0, 0, 0);
    putMarbleAtCell(state, 1, 0, 1);
    setTurn(state, 0);
    const ace = giveOnlyCard(state, 0, 'A');
    const move = getLegalCardActions(state, 'p0')
      .find((entry) => entry.cardId === ace.id)
      ?.actions.find((action) => action.kind === 'move' && action.steps === 1);
    expect(move).toBeDefined();
    const result = playCard(state, 'p0', ace.id, toRequest(move!));
    expect(result.state.players[0]?.marbles[0]?.progress).toBe(1);
    expect(result.state.players[1]?.marbles[0]?.status).toBe('base');
    expect(board.ring[1]?.isSafe).toBe(false);
  });

  it('enters the private home lane safely on an exact move', () => {
    const state = createTestGame(4);
    putMarble(state, 0, 0, 70);
    const result = playRank(state, '5');
    expect(result.state.players[0]?.marbles[0]?.status).toBe('home');
    expect(result.state.players[0]?.marbles[0]?.progress).toBe(75);
  });
});
