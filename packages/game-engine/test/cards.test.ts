import { describe, expect, it } from 'vitest';
import {
  getLegalCardActions,
  playCard,
} from '../src';
import { GameRuleError } from '../src/errors';
import {
  boardFor,
  createTestGame,
  giveOnlyCard,
  putMarble,
  setHand,
  setTurn,
  toRequest,
} from './helpers';

function actionsFor(state: ReturnType<typeof createTestGame>, seat: number) {
  return getLegalCardActions(state, `p${seat}`);
}

function playOnlyMove(
  state: ReturnType<typeof createTestGame>,
  seat: number,
  stepChoice?: number,
): ReturnType<typeof playCard> {
  const legal = actionsFor(state, seat).find((entry) => entry.actions.length > 0);
  if (!legal) throw new Error('No legal card');
  const moveActions = legal.actions.filter(
    (action) => action.kind === 'move' && (stepChoice === undefined || action.steps === stepChoice),
  );
  const action = moveActions[0] ?? (stepChoice === undefined ? legal.actions[0] : undefined);
  if (!action) throw new Error('No legal action');
  return playCard(state, `p${seat}`, legal.cardId, toRequest(action));
}

describe('card effects and movement', () => {
  it('lets an Ace bring a marble into base and ends the turn', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    const ace = giveOnlyCard(state, 0, 'A', 'spades');
    const legal = actionsFor(state, 0).find((entry) => entry.cardId === ace.id);
    expect(legal?.actions.filter((action) => action.kind === 'enter')).toHaveLength(4);

    const enter = legal?.actions.find((action) => action.kind === 'enter');
    expect(enter).toBeDefined();
    const result = playCard(state, 'p0', ace.id, toRequest(enter!));
    const next = result.state;
    expect(next.players[0]?.marbles[0]?.status).toBe('board');
    expect(next.players[0]?.marbles[0]?.progress).toBe(0);
    expect(next.players[0]?.stats.entries).toBe(1);
    expect(next.players[0]?.hand).toHaveLength(0);
    expect(next.currentSeat).toBe(1);
    expect(next.discard.map((c) => c.id)).toContain(ace.id);
    expect(result.events.some((event) => event.type === 'marble-entered')).toBe(true);
  });

  it('does not let other cards enter from base', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    giveOnlyCard(state, 0, 'Q');
    expect(actionsFor(state, 0)[0]?.actions).toHaveLength(0);
  });

  it('supports both Ace distances and King 13', () => {
    let state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 0);
    giveOnlyCard(state, 0, 'A');
    expect(
      actionsFor(state, 0)[0]?.actions.filter((action) => action.kind === 'move').map((a) => a.kind === 'move' && a.steps),
    ).toEqual([1, 11]);
    state = playOnlyMove(state, 0, 11).state;
    expect(state.players[0]?.marbles[0]?.progress).toBe(11);

    state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 2);
    giveOnlyCard(state, 0, 'K');
    state = playOnlyMove(state, 0).state;
    expect(state.players[0]?.marbles[0]?.progress).toBe(15);
  });

  it.each([
    ['Q', 12],
    ['10', 10],
    ['9', 9],
    ['8', 8],
    ['6', 6],
    ['5', 5],
    ['3', 3],
    ['2', 2],
  ] as const)('%s advances exactly %i steps forward', (rank, distance) => {
    let state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 1);
    giveOnlyCard(state, 0, rank);
    const legal = actionsFor(state, 0)[0];
    expect(legal?.actions).toHaveLength(1);
    state = playCard(state, 'p0', legal!.cardId, toRequest(legal!.actions[0]!)).state;
    expect(state.players[0]?.marbles[0]?.progress).toBe(1 + distance);
  });

  it('moves one marble exactly 4 backward', () => {
    let state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 6);
    giveOnlyCard(state, 0, '4');
    const action = actionsFor(state, 0)[0]?.actions[0];
    expect(action?.kind).toBe('move');
    state = playCard(state, 'p0', '4c', toRequest(action!)).state;
    expect(state.players[0]?.marbles[0]?.progress).toBe(2);
  });

  it('rejects backward moves below the start and from home', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 3);
    giveOnlyCard(state, 0, '4');
    expect(actionsFor(state, 0)[0]?.actions).toHaveLength(0);

    const homeState = createTestGame(4);
    setTurn(homeState, 0);
    putMarble(homeState, 0, 0, 73);
    giveOnlyCard(homeState, 0, '4');
    expect(actionsFor(homeState, 0)[0]?.actions).toHaveLength(0);
  });

  it('requires exact home entry and never overshoots slot 4', () => {
    const noOvershoot = createTestGame(4);
    setTurn(noOvershoot, 0);
    putMarble(noOvershoot, 0, 0, 71);
    giveOnlyCard(noOvershoot, 0, '5');
    expect(actionsFor(noOvershoot, 0)[0]?.actions).toHaveLength(0);

    const exact = createTestGame(4);
    setTurn(exact, 0);
    putMarble(exact, 0, 0, 70);
    giveOnlyCard(exact, 0, '5');
    const action = actionsFor(exact, 0)[0]?.actions[0];
    expect(action).toBeDefined();
    const result = playCard(exact, 'p0', '5c', toRequest(action!)).state;
    expect(result.players[0]?.marbles[0]?.progress).toBe(75);
    expect(result.players[0]?.marbles[0]?.status).toBe('home');
  });

  it('allows forward movement within the home lane but not past it', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 74);
    giveOnlyCard(state, 0, 'A');
    const moves = actionsFor(state, 0)[0]?.actions.filter((action) => action.kind === 'move');
    expect(moves?.map((action) => action.kind === 'move' && action.steps)).toEqual([1]);
  });

  it('rejects an invalid movement distance sent by a client', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 0);
    giveOnlyCard(state, 0, 'Q');
    expect(() =>
      playCard(state, 'p0', 'Qc', { kind: 'move', marbleId: 'p0:m0', steps: 4 }),
    ).toThrowError(GameRuleError);
    try {
      playCard(state, 'p0', 'Qc', { kind: 'move', marbleId: 'p0:m0', steps: 4 });
    } catch (error) {
      expect((error as GameRuleError).code).toBe('INVALID_ACTION');
    }
  });

  it('enters the home lane after a full lap and reaches the final slot exactly', () => {
    let state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 69);
    giveOnlyCard(state, 0, '6');
    const action = actionsFor(state, 0)[0]?.actions[0];
    state = playCard(state, 'p0', '6c', toRequest(action!)).state;
    expect(state.players[0]?.marbles[0]?.progress).toBe(75);
    expect(state.players[0]?.marbles[0]?.status).toBe('home');
    expect(state.players[0]?.stats.marblesHome).toBe(1);
  });

  it('never mutates the input state', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    putMarble(state, 0, 0, 2);
    giveOnlyCard(state, 0, 'Q');
    const before = structuredClone(state);
    const action = actionsFor(state, 0)[0]?.actions[0];
    playCard(state, 'p0', 'Qc', toRequest(action!));
    expect(state).toEqual(before);
  });
});
