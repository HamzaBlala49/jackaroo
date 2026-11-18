import 'reflect-metadata';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { configureHttpApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { RateLimiterService } from '../src/common/rate-limiter.service';
import { RoomStoreService } from '../src/redis/room-store.service';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://jackaroo@localhost:5433/jackaroo_test?schema=public';

interface TestUser {
  id: string;
  displayName: string;
  cookie: string;
}

interface TestClient {
  user: TestUser;
  socket: Socket;
}

interface ActionResultLike {
  ok: boolean;
  data?: { state: any };
  error?: { code: string; message: string };
}

let app: INestApplication;
let prisma: PrismaService;
let rateLimiter: RateLimiterService;
let baseUrl: string;
let sockets: Socket[] = [];

beforeAll(async () => {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication({ logger: false });
  configureHttpApp(app);
  await app.listen(0);
  const address = app.getHttpServer().address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  prisma = app.get(PrismaService);
  rateLimiter = app.get(RateLimiterService);
});

afterAll(async () => {
  await app?.close();
});

beforeEach(async () => {
  rateLimiter.reset();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "GameHistory", "GameMatch", "GamePlayer", "GameRoom", "AuthSession", "PlayerStatistics", "User" RESTART IDENTITY CASCADE',
  );
});

afterEach(() => {
  for (const socket of sockets) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  sockets = [];
});

async function createGuest(name: string): Promise<TestUser> {
  const response = await request(app.getHttpServer())
    .post('/auth/guest')
    .send({ displayName: name });
  expect(response.status).toBe(201);
  const setCookie = response.headers['set-cookie'] as unknown as string[] | string;
  const rawCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const cookie = rawCookie?.split(';')[0] ?? '';
  return { id: response.body.user.id, displayName: response.body.user.displayName, cookie };
}

async function connect(user: TestUser): Promise<TestClient> {
  const socket = io(`${baseUrl}/game`, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 5000,
    extraHeaders: { Cookie: user.cookie },
  });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connect timeout')), 6000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  return { user, socket };
}

function ack<T = any>(
  socket: Socket,
  event: string,
  payload: unknown,
  timeout = 10_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Ack timeout: ${event}`)), timeout);
    socket.emit(event, payload, (response: T) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

function waitForEvent<T = any>(
  socket: Socket,
  event: string,
  predicate: (payload: T) => boolean = () => true,
  timeout = 10_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, listener);
      reject(new Error(`Event timeout: ${event}`));
    }, timeout);
    const listener = (payload: T) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, listener);
      resolve(payload);
    };
    socket.on(event, listener);
  });
}

async function createRoom(host: TestClient, playerCount = 4): Promise<string> {
  const created = await ack<any>(host.socket, 'room:create', { playerCount });
  expect(created.ok).toBe(true);
  return created.data.room.code;
}

async function readyAll(clients: TestClient[]): Promise<void> {
  for (const client of clients) {
    const response = await ack<any>(client.socket, 'room:ready', {
      ready: true,
      actionId: crypto.randomUUID(),
    });
    expect(response.ok).toBe(true);
  }
}

async function setupStartedGame(playerCount = 4): Promise<{
  clients: TestClient[];
  host: TestClient;
  code: string;
  matchId: string;
  state: any;
}> {
  const clients: TestClient[] = [];
  for (let index = 0; index < playerCount; index += 1) {
    clients.push(await connect(await createGuest(`Player ${index}`)));
  }
  const host = clients[0]!;
  const code = await createRoom(host, playerCount);
  for (let index = 1; index < playerCount; index += 1) {
    const joined = await ack<any>(clients[index]!.socket, 'room:join', { code });
    expect(joined.ok).toBe(true);
    expect(joined.data.room.players).toHaveLength(index + 1);
  }
  await readyAll(clients);
  const started = await ack<any>(host.socket, 'room:start', { actionId: crypto.randomUUID() });
  expect(started.ok).toBe(true);
  const stateResponse = await ack<any>(host.socket, 'game:request-state', { code });
  expect(stateResponse.ok).toBe(true);
  return {
    clients,
    host,
    code,
    matchId: started.data.matchId,
    state: stateResponse.data.state,
  };
}

async function requestState(client: TestClient, code: string): Promise<any> {
  const response = await ack<any>(client.socket, 'game:request-state', { code });
  expect(response.ok).toBe(true);
  return response.data.state;
}

function requestFromAction(action: any): any {
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
    default:
      throw new Error(`Unknown action ${action.kind}`);
  }
}

async function playGame(
  clients: TestClient[],
  host: TestClient,
  code: string,
  state: any,
): Promise<{ actions: number; state: any; finishedEvent: any }> {
  const finishedPromise = waitForEvent<any>(host.socket, 'game:finished', () => true, 120_000);
  let currentState = state;
  let actions = 0;

  while (currentState.status === 'active' && actions < 2000) {
    const currentClient = clients.find((client) => client.user.id === currentState.currentPlayerId);
    if (!currentClient) throw new Error('No socket for current player');
    currentState = await requestState(currentClient, code);
    if (currentState.status === 'finished') break;

    if (currentState.phase === 'seven') {
      const option = currentState.you.sevenOptions[0];
      if (option) {
        const result: ActionResultLike = await ack(currentClient.socket, 'game:make-move', {
          marbleId: option.marbleId,
          steps: option.maxSteps,
          actionId: crypto.randomUUID(),
        });
        expect(result.ok, JSON.stringify(result.error)).toBe(true);
        currentState = result.data!.state;
      } else {
        const result: ActionResultLike = await ack(currentClient.socket, 'game:end-turn', {
          actionId: crypto.randomUUID(),
        });
        expect(result.ok, JSON.stringify(result.error)).toBe(true);
        currentState = result.data!.state;
      }
      actions += 1;
      continue;
    }

    const playable = currentState.you.legalCards.find(
      (card: any) => card.actions.length > 0,
    );
    if (playable) {
      const result: ActionResultLike = await ack(currentClient.socket, 'game:play-card', {
        cardId: playable.cardId,
        action: requestFromAction(playable.actions[0]),
        actionId: crypto.randomUUID(),
      });
      expect(result.ok, JSON.stringify(result.error)).toBe(true);
      currentState = result.data!.state;
    } else {
      const result: ActionResultLike = await ack(currentClient.socket, 'game:pass', {
        cardId: currentState.you.hand[0].id,
        actionId: crypto.randomUUID(),
      });
      expect(result.ok, JSON.stringify(result.error)).toBe(true);
      currentState = result.data!.state;
    }
    actions += 1;
  }

  const finishedEvent = await finishedPromise;
  return { actions, state: currentState, finishedEvent };
}

describe('auth', () => {
  it('creates a guest session and returns it through the httpOnly cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/guest')
      .send({ displayName: 'Ada Lovelace' });
    expect(response.status).toBe(201);
    expect(response.body.user.displayName).toBe('Ada Lovelace');
    const setCookie = response.headers['set-cookie'] as unknown as string[];
    expect(setCookie[0]).toContain('jackaroo_session=');
    expect(setCookie[0]).toContain('HttpOnly');

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', setCookie[0]!.split(';')[0]!);
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(response.body.user.id);
  });

  it('rejects invalid names and unauthenticated sessions', async () => {
    const invalid = await request(app.getHttpServer())
      .post('/auth/guest')
      .send({ displayName: 'x' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const me = await request(app.getHttpServer()).get('/auth/me');
    expect(me.status).toBe(401);
  });
});

describe('private rooms and lobby', () => {
  it('supports 4, 6 and 8 seats with alternating team assignment', async () => {
    for (const playerCount of [4, 6, 8] as const) {
      rateLimiter.reset();
      const clients: TestClient[] = [];
      for (let index = 0; index < playerCount; index += 1) {
        clients.push(await connect(await createGuest(`Setup ${playerCount}-${index}`)));
      }
      const code = await createRoom(clients[0]!, playerCount);
      for (let index = 1; index < playerCount; index += 1) {
        const response = await ack<any>(clients[index]!.socket, 'room:join', { code });
        expect(response.ok).toBe(true);
      }
      const roomResponse = await request(app.getHttpServer()).get(`/rooms/${code}`);
      expect(roomResponse.status).toBe(200);
      const room = roomResponse.body.room;
      expect(room.playerCount).toBe(playerCount);
      expect(room.players).toHaveLength(playerCount);
      const teamCount = playerCount / 2;
      room.players.forEach((player: any, seat: number) => {
        expect(player.seat).toBe(seat);
        expect(player.teamId).toBe(seat % teamCount);
      });

      if (playerCount === 4) {
        const nonHost = clients[1]!;
        const notHost = await ack<any>(nonHost.socket, 'room:start', {
          actionId: crypto.randomUUID(),
        });
        expect(notHost.ok).toBe(false);
        expect(notHost.error.code).toBe('NOT_HOST');

        const notReady = await ack<any>(clients[0]!.socket, 'room:start', {
          actionId: crypto.randomUUID(),
        });
        expect(notReady.ok).toBe(false);
        expect(notReady.error.code).toBe('PLAYERS_NOT_READY');
      }

      for (const client of clients) client.socket.disconnect();
      sockets = sockets.filter((socket) => !clients.some((client) => client.socket === socket));
    }
  });

  it('rejects a full room and transfers host on leave', async () => {
    const host = await connect(await createGuest('Host One'));
    const guest = await connect(await createGuest('Guest One'));
    const code = await createRoom(host, 4);
    await ack(guest.socket, 'room:join', { code });

    const extraUsers = [
      await createGuest('Extra One'),
      await createGuest('Extra Two'),
      await createGuest('Extra Three'),
    ];
    for (let index = 0; index < 2; index += 1) {
      const extra = await connect(extraUsers[index]!);
      const response = await ack<any>(extra.socket, 'room:join', { code });
      expect(response.ok).toBe(true);
    }
    const overflow = await connect(extraUsers[2]!);
    const full = await ack<any>(overflow.socket, 'room:join', { code });
    expect(full.ok).toBe(false);
    expect(full.error.code).toBe('ROOM_FULL');

    const updated = waitForEvent<any>(
      guest.socket,
      'room:updated',
      (room) => room.hostId === guest.user.id,
    );
    const left = await ack<any>(host.socket, 'room:leave', { actionId: crypto.randomUUID() });
    expect(left.ok).toBe(true);
    const roomAfter = await updated;
    expect(roomAfter.hostId).toBe(guest.user.id);
    expect(roomAfter.players.some((player: any) => player.id === host.user.id)).toBe(false);
  });

  it('validates player counts and room codes', async () => {
    const host = await connect(await createGuest('Validator'));
    const badCount = await ack<any>(host.socket, 'room:create', { playerCount: 5 });
    expect(badCount.ok).toBe(false);
    expect(badCount.error.code).toBe('VALIDATION_ERROR');

    const badJoin = await ack<any>(host.socket, 'room:join', { code: '!!!!!!' });
    expect(badJoin.ok).toBe(false);
    expect(badJoin.error.code).toBe('VALIDATION_ERROR');

    const missing = await request(app.getHttpServer()).get('/rooms/ZZZZZZ');
    expect(missing.status).toBe(404);
  });
});

describe('match flow and server authority', () => {
  it(
    'starts a private match, keeps hands private and plays to a persisted victory',
    async () => {
      const { clients, host, code, state, matchId } = await setupStartedGame(4);
      expect(state.matchId).toBe(matchId);
      expect(state.playerCount).toBe(4);
      expect(state.phase).toBe('awaiting-card');

      const initialStates: any[] = [];
      for (const client of clients) {
        initialStates.push(await requestState(client, code));
      }
      for (let index = 0; index < clients.length; index += 1) {
        const snapshot = initialStates[index];
        expect(snapshot.you.hand).toHaveLength(4);
        expect(snapshot.deckCount + snapshot.discardCount).toBe(36);
        expect(snapshot.players.reduce((total: number, player: any) => total + player.handCount, 0) + snapshot.deckCount + snapshot.discardCount).toBe(52);
        expect(snapshot).not.toHaveProperty('deck');
        expect(snapshot).not.toHaveProperty('seed');
        expect(snapshot.players.every((player: any) => !('hand' in player))).toBe(true);

        const otherCardIds = initialStates
          .filter((_, otherIndex) => otherIndex !== index)
          .flatMap((other) => other.you.hand.map((card: any) => card.id));
        const json = JSON.stringify(snapshot);
        for (const cardId of otherCardIds) {
          expect(json).not.toContain(`"${cardId}"`);
        }
      }

      const finishedPromise = waitForEvent<any>(host.socket, 'game:finished', () => true, 180_000);
      const played = await playGame(clients, host, code, initialStates[0]);
      const finishedEvent = await finishedPromise;
      expect(finishedEvent.matchId).toBe(matchId);
      expect(played.state.status).toBe('finished');
      expect(played.state.winnerTeamId).toBeGreaterThanOrEqual(0);
      expect(played.actions).toBeGreaterThan(10);

      const resultResponse = await request(app.getHttpServer())
        .get(`/matches/${matchId}`)
        .set('Cookie', host.user.cookie);
      expect(resultResponse.status).toBe(200);
      expect(resultResponse.body.match.players).toHaveLength(4);
      expect(resultResponse.body.match.winnerTeamId).toBe(played.state.winnerTeamId);
      expect(resultResponse.body.match.durationSeconds).toBeGreaterThanOrEqual(0);

      const statsResponse = await request(app.getHttpServer())
        .get('/stats/me')
        .set('Cookie', host.user.cookie);
      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.stats.gamesPlayed).toBe(1);

      const rematch = await ack<any>(host.socket, 'room:rematch', {
        actionId: crypto.randomUUID(),
      });
      expect(rematch.ok, JSON.stringify(rematch.error)).toBe(true);
      expect(rematch.data.room.status).toBe('waiting');
      expect(rematch.data.room.players).toHaveLength(4);
      expect(rematch.data.room.players.every((player: any) => player.ready === false)).toBe(true);
    },
    200_000,
  );

  it('rejects out-of-turn moves, duplicate action ids and non-member access', async () => {
    const { clients, host, code, state } = await setupStartedGame(4);
    const currentClient = clients.find((client) => client.user.id === state.currentPlayerId)!;
    const otherClient = clients.find((client) => client.user.id !== state.currentPlayerId)!;
    const currentSnapshot = await requestState(currentClient, code);
    const otherSnapshot = await requestState(otherClient, code);

    const wrongTurn = await ack<any>(otherClient.socket, 'game:play-card', {
      cardId: otherSnapshot.you.hand[0].id,
      action: { kind: 'move', marbleId: `${otherClient.user.id}:m0`, steps: 2 },
      actionId: crypto.randomUUID(),
    });
    expect(wrongTurn.ok).toBe(false);
    expect(wrongTurn.error.code).toBe('NOT_YOUR_TURN');

    const playable = currentSnapshot.you.legalCards.find((card: any) => card.actions.length > 0);
    const actionId = crypto.randomUUID();
    let first: any;
    let second: any;
    if (playable) {
      const payload = {
        cardId: playable.cardId,
        action: requestFromAction(playable.actions[0]),
        actionId,
      };
      first = await ack<any>(currentClient.socket, 'game:play-card', payload);
      expect(first.ok, JSON.stringify(first.error)).toBe(true);
      second = await ack<any>(currentClient.socket, 'game:play-card', payload);
    } else {
      const payload = {
        cardId: currentSnapshot.you.hand[0].id,
        actionId,
      };
      first = await ack<any>(currentClient.socket, 'game:pass', payload);
      expect(first.ok, JSON.stringify(first.error)).toBe(true);
      second = await ack<any>(currentClient.socket, 'game:pass', payload);
    }
    expect(second.ok).toBe(true);
    expect(second.data.state.version).toBe(first.data.state.version);

    const outsider = await connect(await createGuest('Outsider'));
    const join = await ack<any>(outsider.socket, 'room:join', { code });
    expect(join.ok).toBe(false);
    expect(join.error.code).toBe('ROOM_IN_PROGRESS');
    const stateAccess = await ack<any>(outsider.socket, 'game:request-state', { code });
    expect(stateAccess.ok).toBe(false);
    expect(stateAccess.error.code).toBe('FORBIDDEN');
    void host;
  });

  it('restores the exact match state after a refresh/reconnect', async () => {
    const { clients, code, state } = await setupStartedGame(4);
    const target = clients.find((client) => client.user.id === state.currentPlayerId)!;
    const observer = clients.find((client) => client.user.id !== target.user.id)!;
    const before = await requestState(target, code);

    const presenceOff = waitForEvent<any>(
      observer.socket,
      'presence:updated',
      (payload) => payload.playerId === target.user.id && payload.connected === false,
    );
    target.socket.disconnect();
    sockets = sockets.filter((socket) => socket !== target.socket);
    await presenceOff;

    const reconnected = await connect(target.user);
    const joinResponse = await ack<any>(reconnected.socket, 'room:join', { code });
    expect(joinResponse.ok).toBe(true);
    expect(joinResponse.data.game).toBeDefined();
    expect(joinResponse.data.game.matchId).toBe(state.matchId);
    expect(joinResponse.data.game.version).toBe(before.version);
    expect(joinResponse.data.game.currentPlayerId).toBe(before.currentPlayerId);
    expect(joinResponse.data.game.you.hand.map((card: any) => card.id).sort()).toEqual(
      before.you.hand.map((card: any) => card.id).sort(),
    );
    expect(joinResponse.data.room.players.find((player: any) => player.id === target.user.id).connected).toBe(true);
  });

  it('recovers the live match from the database when the room snapshot is lost', async () => {
    const { clients, code, state } = await setupStartedGame(4);
    const target = clients.find((client) => client.user.id === state.currentPlayerId)!;
    const before = await requestState(target, code);

    app.get(RoomStoreService).clearMemoryForTests();
    const after = await requestState(target, code);

    expect(after.version).toBe(before.version);
    expect(after.currentPlayerId).toBe(before.currentPlayerId);
    expect(after.round).toBe(before.round);
    expect(after.you.hand.map((card: any) => card.id).sort()).toEqual(
      before.you.hand.map((card: any) => card.id).sort(),
    );
    expect(after.players.every((player: any) => player.marbles.length === 4)).toBe(true);
  });

  it('starts 6- and 8-player matches with the correct team layout', async () => {
    for (const playerCount of [6, 8] as const) {
      rateLimiter.reset();
      const { clients, state, code } = await setupStartedGame(playerCount);
      expect(state.playerCount).toBe(playerCount);
      expect(state.players).toHaveLength(playerCount);
      expect(state.teams).toHaveLength(playerCount / 2);
      const snapshot = await requestState(clients[0]!, code);
      expect(snapshot.you.hand).toHaveLength(4);
      expect(snapshot.presence && Object.keys(snapshot.presence)).toHaveLength(playerCount);
      for (const client of clients) client.socket.disconnect();
      sockets = sockets.filter((socket) => !clients.some((client) => client.socket === socket));
    }
  }, 60_000);
});
