import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, TOTAL_ROUTE_LENGTH } from '@jackaroo/game-config';
import {
  getLegalCardActions,
  playCard,
} from '../src';
import {
  allBase,
  allHome,
  createTestGame,
  giveOnlyCard,
  putMarble,
  setHand,
  setTurn,
  card,
} from './helpers';

describe('finishing, assistance and winning', () => {
  it('finishes a player when all four marbles are home, without ending the match', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    allHome(state, 0);
    putMarble(state, 0, 3, TOTAL_ROUTE_LENGTH - 3); // two steps from home
    giveOnlyCard(state, 0, '2');
    const result = playCard(state, 'p0', '2c', {
      kind: 'move',
      marbleId: 'p0:m3',
      steps: 2,
    }).state;
    expect(result.players[0]?.finished).toBe(true);
    expect(result.players[0]?.finishOrder).toBe(1);
    expect(result.players[0]?.stats.marblesHome).toBe(4);
    expect(result.teams[0]?.marblesHome).toBe(4);
    expect(result.teams[0]?.finished).toBe(false);
    expect(result.status).toBe('active');
  });

  it('ends the match immediately when the second teammate completes the team', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    allHome(state, 2);
    allHome(state, 0);
    putMarble(state, 0, 3, TOTAL_ROUTE_LENGTH - 3);
    giveOnlyCard(state, 0, '2');
    const result = playCard(state, 'p0', '2c', {
      kind: 'move',
      marbleId: 'p0:m3',
      steps: 2,
    });
    expect(result.state.status).toBe('finished');
    expect(result.state.phase).toBe('finished');
    expect(result.state.winnerTeamId).toBe(0);
    expect(result.state.teams[0]?.marblesHome).toBe(8);
    expect(result.state.teams[0]?.finished).toBe(true);
    expect(result.events.some((event) => event.type === 'game-finished')).toBe(true);
    expect(getLegalCardActions(result.state, 'p0')).toHaveLength(0);
  });

  it('lets a finished player bring a teammate marble in with an Ace', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    state.players[0]!.finished = true;
    state.players[0]!.finishOrder = 1;
    allBase(state, 2);
    giveOnlyCard(state, 0, 'A');
    const legal = getLegalCardActions(state, 'p0')[0];
    const enter = legal?.actions.find(
      (action) => action.kind === 'enter' && action.marbleId === 'p2:m0',
    );
    expect(enter).toBeDefined();
    const result = playCard(state, 'p0', 'Ac', {
      kind: 'enter',
      marbleId: 'p2:m0',
    }).state;
    expect(result.players[2]?.marbles[0]?.status).toBe('board');
    expect(result.players[0]?.stats.entries).toBe(1);
  });

  it('lets a finished player move teammate marbles with a 7', () => {
    const state = createTestGame(4);
    setTurn(state, 0);
    state.players[0]!.finished = true;
    putMarble(state, 2, 0, 10);
    giveOnlyCard(state, 0, '7');
    const begin = getLegalCardActions(state, 'p0')[0]?.actions[0];
    const afterBegin = playCard(state, 'p0', '7c', { kind: 'begin-seven' }).state;
    expect(afterBegin.seven?.scopePlayerId).toBe('p2');
    expect(afterBegin.seven?.remaining).toBe(7);
    expect(begin?.kind).toBe('begin-seven');
  });

  it('removes a finished player from the rotation when assistance is disabled', () => {
    const rules = { ...DEFAULT_RULES, allowTeamAssistance: false };
    const state = createTestGame(4, rules);
    setTurn(state, 0);
    allHome(state, 0);
    putMarble(state, 0, 3, TOTAL_ROUTE_LENGTH - 3);
    setHand(state, 0, [card('2'), card('Q')]);
    const result = playCard(state, 'p0', '2c', {
      kind: 'move',
      marbleId: 'p0:m3',
      steps: 2,
    }).state;
    expect(result.players[0]?.finished).toBe(true);
    expect(result.players[0]?.hand).toHaveLength(0);
    const extraCards = result.discard.filter((entry) => entry.id === 'Qc');
    expect(extraCards).toHaveLength(1);
  });

  it('does not allow a finished player to move teammate marbles when assistance is disabled', () => {
    const rules = { ...DEFAULT_RULES, allowTeamAssistance: false };
    const state = createTestGame(4, rules);
    setTurn(state, 0);
    state.players[0]!.finished = true;
    putMarble(state, 2, 0, 10);
    giveOnlyCard(state, 0, '5');
    expect(getLegalCardActions(state, 'p0')[0]?.actions).toHaveLength(0);
  });

  it('uses finish order across both teams', () => {
    const state = createTestGame(4);
    setTurn(state, 1);
    allHome(state, 1);
    putMarble(state, 1, 3, TOTAL_ROUTE_LENGTH - 3);
    giveOnlyCard(state, 1, '2');
    const result = playCard(state, 'p1', '2c', {
      kind: 'move',
      marbleId: 'p1:m3',
      steps: 2,
    }).state;
    expect(result.players[1]?.finishOrder).toBe(1);
  });
});
