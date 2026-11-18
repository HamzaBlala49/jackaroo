import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type GameRoom, type GamePlayer, type User } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_ROOM_SETTINGS,
  DEFAULT_RULES,
  MAX_RECENT_ACTION_IDS,
  getTeamCount,
} from '@jackaroo/game-config';
import {
  createGame,
  createGameSnapshot,
  endSevenTurn,
  forcePass,
  makeSevenMove,
  playCard,
} from '@jackaroo/game-engine';
import {
  ROOM_CODE_ALPHABET,
  type AuthUser,
  type GameFeedEvent,
  type GameSnapshot,
  type GameState,
  type MatchResultView,
  type PlayRequest,
  type PlayerCount,
  type RoomSettings,
  type RoomView,
} from '@jackaroo/game-types';
import { randomCode, randomSeed } from '@jackaroo/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { RoomStoreService } from '../redis/room-store.service';
import { AppError, badRequest, conflict, forbidden, notFound } from '../common/app-error';
import {
  toRoomView,
  type JoinRuntimeResult,
  type LeaveRuntimeResult,
  type RoomPlayerRuntime,
  type RoomRuntime,
} from './room.types';

interface DbRoomWithRelations extends GameRoom {
  host: User;
  players: Array<GamePlayer & { user: User }>;
}

interface ActionResultLike {
  state: GameState;
  events: GameFeedEvent[];
}

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly store: RoomStoreService,
  ) {}

  // ── Reads / recovery ───────────────────────────────────────

  async getPublicRoom(code: string): Promise<RoomView> {
    return this.store.withLock(code, async () => {
      const runtime = await this.loadRuntime(code);
      return toRoomView(runtime);
    });
  }

  async getRoomForUser(code: string, userId: string): Promise<RoomRuntime> {
    return this.store.withLock(code, async () => {
      const runtime = await this.loadRuntime(code);
      this.requireMember(runtime, userId);
      return runtime;
    });
  }

  private async loadRuntime(code: string): Promise<RoomRuntime> {
    const json = await this.store.getRoomJson(code);
    if (json) {
      try {
        return JSON.parse(json) as RoomRuntime;
      } catch {
        this.logger.warn(`Corrupt room JSON for ${code}; recovering from database.`);
      }
    }
    return this.recoverRuntime(code);
  }

  private async recoverRuntime(code: string): Promise<RoomRuntime> {
    const room = (await this.prisma.gameRoom.findUnique({
      where: { code },
      include: {
        host: true,
        players: {
          where: { leftAt: null },
          include: { user: true },
          orderBy: { seat: 'asc' },
        },
        matches: {
          where: { status: { in: ['ACTIVE', 'FINISHED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })) as DbRoomWithRelations & {
      matches: Array<{ id: string; state: Prisma.JsonValue | null; startedAt: Date; endedAt: Date | null }>;
    } | null;

    if (!room || room.status === 'CLOSED') {
      throw notFound('That room could not be found.');
    }

    const match = room.matches[0];
    let game: GameState | null = null;
    if (room.status !== 'WAITING') {
      if (!match || !isGameState(match.state)) {
        if (room.status === 'PLAYING') {
          throw new AppError(
            'STATE_UNAVAILABLE',
            'The match state is temporarily unavailable. Please contact the host.',
            503,
          );
        }
      } else {
        game = match.state;
      }
    }

    const players: RoomPlayerRuntime[] = room.players.map((player) => ({
      userId: player.userId,
      displayName: player.user.displayName,
      seat: player.seat,
      teamId: player.teamId,
      ready: player.ready,
      joinedAt: player.joinedAt.toISOString(),
      connected: false,
    }));

    const runtime: RoomRuntime = {
      code: room.code,
      hostId: room.hostId,
      playerCount: room.playerCount as PlayerCount,
      status: room.status === 'PLAYING' ? 'playing' : room.status === 'FINISHED' ? 'finished' : 'waiting',
      rulesVersion: room.rulesVersion,
      rules: game?.rules ?? DEFAULT_RULES,
      settings: normalizeSettings(room.settings),
      players,
      game,
      matchId: match?.id ?? null,
      connections: {},
      recentActionIds: [],
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      startedAt: game?.startedAt ?? match?.startedAt.toISOString() ?? null,
      finishedAt: match?.endedAt?.toISOString() ?? null,
    };

    await this.store.saveRoomJson(code, JSON.stringify(runtime));
    this.logger.log(`Recovered room ${code} from database.`);
    return runtime;
  }

  private async save(runtime: RoomRuntime): Promise<void> {
    runtime.updatedAt = new Date().toISOString();
    await this.store.saveRoomJson(runtime.code, JSON.stringify(runtime));
  }

  // ── Room lifecycle ────────────────────────────────────────

  async createRoom(playerCount: PlayerCount, user: AuthUser): Promise<RoomRuntime> {
    const teamCount = getTeamCount(playerCount);
    if (teamCount < 2) throw badRequest('VALIDATION_ERROR', 'Unsupported player count.');

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = randomCode(6, ROOM_CODE_ALPHABET);
      try {
        const now = new Date();
        const room = await this.prisma.gameRoom.create({
          data: {
            code,
            hostId: user.id,
            playerCount,
            status: 'WAITING',
            rulesVersion: DEFAULT_RULES.version,
            settings: DEFAULT_ROOM_SETTINGS as unknown as Prisma.InputJsonValue,
            players: {
              create: {
                userId: user.id,
                seat: 0,
                teamId: 0,
                ready: false,
              },
            },
          },
          include: { players: true },
        });

        const runtime: RoomRuntime = {
          code,
          hostId: user.id,
          playerCount,
          status: 'waiting',
          rulesVersion: DEFAULT_RULES.version,
          rules: DEFAULT_RULES,
          settings: DEFAULT_ROOM_SETTINGS,
          players: [
            {
              userId: user.id,
              displayName: user.displayName,
              seat: 0,
              teamId: 0,
              ready: false,
              joinedAt: now.toISOString(),
              connected: false,
            },
          ],
          game: null,
          matchId: null,
          connections: {},
          recentActionIds: [],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          startedAt: null,
          finishedAt: null,
        };
        await this.save(runtime);
        return runtime;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          continue;
        }
        throw error;
      }
    }
    throw new AppError('INTERNAL_ERROR', 'Could not generate a unique room code. Please retry.', 500);
  }

  async joinRoom(code: string, user: AuthUser, socketId: string): Promise<JoinRuntimeResult> {
    return this.store.withLock(code, async () => {
      const runtime = await this.loadRuntime(code);
      if (runtime.status === 'finished') {
        const existing = runtime.players.find((player) => player.userId === user.id);
        if (!existing) {
          throw conflict('ROOM_IN_PROGRESS', 'This match has already finished.');
        }
        existing.connected = true;
        runtime.connections[user.id] = socketId;
        await this.save(runtime);
        return { runtime, resumed: true, newPlayer: false };
      }

      if (runtime.status === 'playing') {
        const existing = runtime.players.find((player) => player.userId === user.id);
        if (!existing) {
          throw conflict('ROOM_IN_PROGRESS', 'This match has already started.');
        }
        existing.connected = true;
        runtime.connections[user.id] = socketId;
        await this.save(runtime);
        return { runtime, resumed: true, newPlayer: false };
      }

      const existing = runtime.players.find((player) => player.userId === user.id);
      if (existing) {
        existing.connected = true;
        runtime.connections[user.id] = socketId;
        await this.save(runtime);
        return { runtime, resumed: true, newPlayer: false };
      }

      if (runtime.players.length >= runtime.playerCount) {
        throw conflict('ROOM_FULL', 'This room is already full.');
      }

      const occupied = new Set(runtime.players.map((player) => player.seat));
      let seat = -1;
      for (let candidate = 0; candidate < runtime.playerCount; candidate += 1) {
        if (!occupied.has(candidate)) {
          seat = candidate;
          break;
        }
      }
      if (seat < 0) throw conflict('ROOM_FULL', 'This room is already full.');

      const teamCount = getTeamCount(runtime.playerCount);
      const teamId = seat % teamCount;
      const joinedAt = new Date();
      const dbRoom = await this.prisma.gameRoom.findUnique({ where: { code } });
      if (!dbRoom) throw notFound('That room could not be found.');

      await this.prisma.gamePlayer.upsert({
        where: { roomId_userId: { roomId: dbRoom.id, userId: user.id } },
        create: {
          roomId: dbRoom.id,
          userId: user.id,
          seat,
          teamId,
          ready: false,
          leftAt: null,
        },
        update: { seat, teamId, ready: false, leftAt: null, joinedAt },
      });

      const player: RoomPlayerRuntime = {
        userId: user.id,
        displayName: user.displayName,
        seat,
        teamId,
        ready: false,
        joinedAt: joinedAt.toISOString(),
        connected: true,
      };
      runtime.players.push(player);
      runtime.connections[user.id] = socketId;
      await this.save(runtime);
      return { runtime, resumed: false, newPlayer: true };
    });
  }

  async leaveRoom(code: string, userId: string): Promise<LeaveRuntimeResult> {
    return this.store.withLock(code, async () => {
      const runtime = await this.loadRuntime(code);
      this.requireMember(runtime, userId);
      if (runtime.status === 'playing') {
        throw conflict('ROOM_IN_PROGRESS', 'You cannot leave during an active match.');
      }
      return this.removePlayer(runtime, userId);
    });
  }

  private async removePlayer(runtime: RoomRuntime, userId: string): Promise<LeaveRuntimeResult> {
    const dbRoom = await this.prisma.gameRoom.findUnique({ where: { code: runtime.code } });
    if (!dbRoom) throw notFound('That room could not be found.');

    runtime.players = runtime.players.filter((player) => player.userId !== userId);
    delete runtime.connections[userId];
    await this.prisma.gamePlayer.deleteMany({
      where: { roomId: dbRoom.id, userId },
    });

    if (runtime.players.length === 0) {
      await this.prisma.gameRoom.update({
        where: { id: dbRoom.id },
        data: { status: 'CLOSED', closedAt: new Date() },
      });
      await this.store.deleteRoom(runtime.code);
      return { runtime: null, closed: true };
    }

    if (runtime.hostId === userId) {
      const nextHost = [...runtime.players].sort((a, b) => a.seat - b.seat)[0];
      if (nextHost) {
        runtime.hostId = nextHost.userId;
        await this.prisma.gameRoom.update({
          where: { id: dbRoom.id },
          data: { hostId: nextHost.userId },
        });
      }
    }

    await this.save(runtime);
    return { runtime, closed: false };
  }

  async setReady(code: string, userId: string, ready: boolean): Promise<RoomRuntime> {
    return this.store.withLock(code, async () => {
      const runtime = await this.loadRuntime(code);
      if (runtime.status !== 'waiting') {
        throw conflict('ROOM_IN_PROGRESS', 'The match has already started.');
      }
      const player = this.requireMember(runtime, userId);
      player.ready = ready;
      const dbRoom = await this.prisma.gameRoom.findUnique({ where: { code } });
      if (!dbRoom) throw notFound('That room could not be found.');
      await this.prisma.gamePlayer.updateMany({
        where: { roomId: dbRoom.id, userId },
        data: { ready },
      });
      await this.save(runtime);
      return runtime;
    });
  }

  async startGame(code: string, userId: string): Promise<RoomRuntime> {
    return this.store.withLock(code, async () => {
      const runtime = await this.loadRuntime(code);
      if (runtime.status !== 'waiting') {
        throw conflict('ROOM_IN_PROGRESS', 'The match has already started.');
      }
      if (runtime.hostId !== userId) {
        throw new AppError('NOT_HOST', 'Only the host can start the match.', 403);
      }
      if (runtime.players.length !== runtime.playerCount) {
        throw conflict('NOT_ENOUGH_PLAYERS', 'All seats must be filled before starting.');
      }
      if (!runtime.players.every((player) => player.ready)) {
        throw conflict('PLAYERS_NOT_READY', 'Every player must be ready before starting.');
      }
      if (!runtime.players.every((player) => player.connected)) {
        throw conflict('PLAYERS_NOT_READY', 'Every player must be connected before starting.');
      }

      const sortPlayers = [...runtime.players].sort((a, b) => a.seat - b.seat);
      const matchId = randomUUID();
      const seed = randomSeed();
      const startedAt = new Date().toISOString();
      const game = createGame({
        id: matchId,
        players: sortPlayers.map((player) => ({ id: player.userId, name: player.displayName })),
        seed,
        startedAt,
        startingSeat: 0,
        rules: DEFAULT_RULES,
      });

      const dbRoom = await this.prisma.gameRoom.findUnique({ where: { code } });
      if (!dbRoom) throw notFound('That room could not be found.');

      await this.prisma.$transaction([
        this.prisma.gameMatch.create({
          data: {
            id: matchId,
            roomId: dbRoom.id,
            status: 'ACTIVE',
            playerCount: runtime.playerCount,
            rulesVersion: DEFAULT_RULES.version,
            seed,
            state: game as unknown as Prisma.InputJsonValue,
            startingSeat: 0,
            moveCount: 0,
            turnCount: 1,
            startedAt: new Date(startedAt),
          },
        }),
        this.prisma.gameRoom.update({
          where: { id: dbRoom.id },
          data: {
            status: 'PLAYING',
            startedAt: new Date(startedAt),
            closedAt: null,
            settings: runtime.settings as unknown as Prisma.InputJsonValue,
          },
        }),
      ]);

      runtime.status = 'playing';
      runtime.game = game;
      runtime.matchId = matchId;
      runtime.startedAt = startedAt;
      runtime.finishedAt = null;
      runtime.recentActionIds = [];
      runtime.players = sortPlayers.map((player) => ({ ...player, ready: true }));
      await this.save(runtime);
      return runtime;
    });
  }

  async rematch(code: string, userId: string): Promise<RoomRuntime> {
    return this.store.withLock(code, async () => {
      const runtime = await this.loadRuntime(code);
      if (runtime.hostId !== userId) {
        throw new AppError('NOT_HOST', 'Only the host can start a rematch.', 403);
      }
      if (runtime.status !== 'finished') {
        throw conflict('WRONG_PHASE', 'The current match has not finished yet.');
      }
      const dbRoom = await this.prisma.gameRoom.findUnique({ where: { code } });
      if (!dbRoom) throw notFound('That room could not be found.');

      await this.prisma.$transaction([
        this.prisma.gameRoom.update({
          where: { id: dbRoom.id },
          data: { status: 'WAITING', startedAt: null, closedAt: null },
        }),
        this.prisma.gamePlayer.updateMany({
          where: { roomId: dbRoom.id },
          data: { ready: false },
        }),
      ]);

      runtime.status = 'waiting';
      runtime.game = null;
      runtime.matchId = null;
      runtime.startedAt = null;
      runtime.finishedAt = null;
      runtime.recentActionIds = [];
      runtime.players = runtime.players.map((player) => ({ ...player, ready: false }));
      await this.save(runtime);
      return runtime;
    });
  }

  async closeRoom(code: string, userId: string): Promise<void> {
    await this.store.withLock(code, async () => {
      const runtime = await this.loadRuntime(code);
      if (runtime.hostId !== userId) {
        throw new AppError('NOT_HOST', 'Only the host can close the room.', 403);
      }
      if (runtime.status === 'playing') {
        throw conflict('INVALID_ACTION', 'You cannot close a room during an active match.');
      }
      const dbRoom = await this.prisma.gameRoom.findUnique({ where: { code } });
      if (dbRoom) {
        await this.prisma.gameRoom.update({
          where: { id: dbRoom.id },
          data: { status: 'CLOSED', closedAt: new Date() },
        });
      }
      await this.store.deleteRoom(code);
    });
  }

  // ── Presence ──────────────────────────────────────────────

  async markConnected(code: string, userId: string, socketId: string): Promise<RoomRuntime> {
    return this.store.withLock(code, async () => {
      const runtime = await this.loadRuntime(code);
      const player = this.requireMember(runtime, userId);
      player.connected = true;
      runtime.connections[userId] = socketId;
      await this.save(runtime);
      return runtime;
    });
  }

  async markDisconnected(
    code: string,
    userId: string,
    socketId: string,
  ): Promise<RoomRuntime | null> {
    return this.store.withLock(code, async () => {
      const runtime = await this.loadRuntime(code);
      const player = runtime.players.find((entry) => entry.userId === userId);
      if (!player) return null;
      if (runtime.connections[userId] && runtime.connections[userId] !== socketId) {
        return runtime;
      }
      player.connected = false;
      delete runtime.connections[userId];
      await this.save(runtime);
      return runtime;
    });
  }

  async expireWaitingPlayer(
    code: string,
    userId: string,
  ): Promise<{ runtime: RoomRuntime | null; removed: boolean; closed: boolean }> {
    return this.store.withLock(code, async () => {
      const json = await this.store.getRoomJson(code);
      if (!json) return { runtime: null, removed: false, closed: false };
      const runtime = JSON.parse(json) as RoomRuntime;
      if (runtime.status !== 'waiting') return { runtime, removed: false, closed: false };
      const player = runtime.players.find((entry) => entry.userId === userId);
      if (!player || player.connected) return { runtime, removed: false, closed: false };
      const result = await this.removePlayer(runtime, userId);
      return { runtime: result.runtime, removed: true, closed: result.closed };
    });
  }

  // ── Gameplay ──────────────────────────────────────────────

  async playCard(
    code: string,
    userId: string,
    actionId: string,
    cardId: string,
    request: PlayRequest,
  ): Promise<{ runtime: RoomRuntime; result: ActionResultLike | null; duplicate: boolean }> {
    return this.mutateGame(code, userId, actionId, (game) =>
      playCard(game, userId, cardId, request),
    );
  }

  async makeSevenMove(
    code: string,
    userId: string,
    actionId: string,
    marbleId: string,
    steps: number,
  ): Promise<{ runtime: RoomRuntime; result: ActionResultLike | null; duplicate: boolean }> {
    return this.mutateGame(code, userId, actionId, (game) =>
      makeSevenMove(game, userId, marbleId, steps),
    );
  }

  async endSevenTurn(
    code: string,
    userId: string,
    actionId: string,
  ): Promise<{ runtime: RoomRuntime; result: ActionResultLike | null; duplicate: boolean }> {
    return this.mutateGame(code, userId, actionId, (game) => endSevenTurn(game, userId));
  }

  async pass(
    code: string,
    userId: string,
    actionId: string,
    cardId: string,
  ): Promise<{ runtime: RoomRuntime; result: ActionResultLike | null; duplicate: boolean }> {
    return this.mutateGame(code, userId, actionId, (game) => forcePass(game, userId, cardId));
  }

  private async mutateGame(
    code: string,
    userId: string,
    actionId: string,
    mutate: (game: GameState) => ActionResultLike,
  ): Promise<{ runtime: RoomRuntime; result: ActionResultLike | null; duplicate: boolean }> {
    return this.store.withLock(code, async () => {
      const runtime = await this.loadRuntime(code);
      this.requireMember(runtime, userId);

      if (runtime.recentActionIds.includes(actionId)) {
        return { runtime, result: null, duplicate: true };
      }
      if (runtime.status !== 'playing' || !runtime.game || runtime.game.status !== 'active') {
        throw conflict('GAME_NOT_ACTIVE', 'This match is not active.');
      }

      const result = mutate(runtime.game);

      runtime.game = result.state;
      runtime.recentActionIds.push(actionId);
      if (runtime.recentActionIds.length > MAX_RECENT_ACTION_IDS) {
        runtime.recentActionIds.splice(
          0,
          runtime.recentActionIds.length - MAX_RECENT_ACTION_IDS,
        );
      }

      if (result.state.status === 'finished') {
        await this.finalizeMatch(runtime, result.state);
        runtime.status = 'finished';
        runtime.finishedAt = new Date().toISOString();
      } else {
        await this.persistGameSnapshot(runtime, result.state);
      }

      await this.save(runtime);
      return { runtime, result, duplicate: false };
    });
  }

  private async persistGameSnapshot(runtime: RoomRuntime, game: GameState): Promise<void> {
    if (!runtime.matchId) return;
    try {
      await this.prisma.gameMatch.update({
        where: { id: runtime.matchId },
        data: {
          state: game as unknown as Prisma.InputJsonValue,
          moveCount: game.totalMoves,
          turnCount: game.turnNumber,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist match snapshot for ${runtime.matchId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async finalizeMatch(runtime: RoomRuntime, game: GameState): Promise<void> {
    if (!runtime.matchId) throw new AppError('STATE_UNAVAILABLE', 'Missing match id.', 500);
    const matchId = runtime.matchId;
    const winnerTeamId = game.winnerTeamId;
    const endedAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.round((endedAt.getTime() - new Date(game.startedAt).getTime()) / 1000),
    );

    const participants = game.players.map((player) => {
      const runtimePlayer = runtime.players.find((entry) => entry.userId === player.id);
      return {
        userId: player.id,
        displayName: runtimePlayer?.displayName ?? player.name,
        seat: player.seat,
        teamId: player.teamId,
        won: winnerTeamId !== null && player.teamId === winnerTeamId,
        marblesHome: player.stats.marblesHome,
        captures: player.stats.captures,
        moves: player.stats.moves,
        cardsPlayed: player.stats.cardsPlayed,
      };
    });

    const room = await this.prisma.gameRoom.findUnique({ where: { code: runtime.code } });
    if (!room) throw notFound('That room could not be found.');

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.gameMatch.findUnique({
        where: { id: matchId },
        select: { status: true },
      });
      if (!existing) throw new AppError('STATE_UNAVAILABLE', 'Match not found.', 500);
      if (existing.status === 'FINISHED') return;

      await tx.gameMatch.update({
        where: { id: matchId },
        data: {
          status: 'FINISHED',
          winnerTeamId,
          endedAt,
          durationSeconds,
          moveCount: game.totalMoves,
          turnCount: game.turnNumber,
          state: game as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.gameHistory.createMany({
        data: participants.map((player) => ({
          matchId,
          userId: player.userId,
          displayName: player.displayName,
          seat: player.seat,
          teamId: player.teamId,
          won: player.won,
          marblesHome: player.marblesHome,
          captures: player.captures,
          moves: player.moves,
          cardsPlayed: player.cardsPlayed,
        })),
        skipDuplicates: true,
      });

      for (const player of participants) {
        await tx.playerStatistics.upsert({
          where: { userId: player.userId },
          create: {
            userId: player.userId,
            gamesPlayed: 1,
            gamesWon: player.won ? 1 : 0,
            marblesHome: player.marblesHome,
            captures: player.captures,
            moves: player.moves,
            cardsPlayed: player.cardsPlayed,
            totalPlaySeconds: durationSeconds,
          },
          update: {
            gamesPlayed: { increment: 1 },
            gamesWon: { increment: player.won ? 1 : 0 },
            marblesHome: { increment: player.marblesHome },
            captures: { increment: player.captures },
            moves: { increment: player.moves },
            cardsPlayed: { increment: player.cardsPlayed },
            totalPlaySeconds: { increment: durationSeconds },
          },
        });
      }

      await tx.gameRoom.update({
        where: { id: room.id },
        data: { status: 'FINISHED' },
      });
    });
  }

  // ── Views ─────────────────────────────────────────────────

  buildGameSnapshot(runtime: RoomRuntime, viewerId: string): GameSnapshot {
    if (!runtime.game || !runtime.matchId) {
      throw new AppError('STATE_UNAVAILABLE', 'No active match state.', 503);
    }
    const presence: Record<string, boolean> = {};
    for (const player of runtime.players) {
      presence[player.userId] = player.connected;
    }
    return createGameSnapshot(runtime.game, {
      code: runtime.code,
      matchId: runtime.matchId,
      viewerId,
      presence,
      finishedAt: runtime.finishedAt,
      serverTime: new Date().toISOString(),
    });
  }

  roomView(runtime: RoomRuntime): RoomView {
    return toRoomView(runtime);
  }

  // ── Results / stats ───────────────────────────────────────

  async getMatchResult(matchId: string, userId: string): Promise<MatchResultView> {
    const match = await this.prisma.gameMatch.findUnique({
      where: { id: matchId },
      include: {
        room: true,
        histories: { orderBy: { seat: 'asc' } },
      },
    });
    if (!match) throw notFound('That match could not be found.', 'STATE_UNAVAILABLE');
    if (match.status !== 'FINISHED') {
      throw conflict('WRONG_PHASE', 'This match has not finished yet.');
    }
    if (!match.histories.some((history) => history.userId === userId)) {
      throw forbidden('Only match participants can view this result.');
    }
    const endedAt = match.endedAt ?? match.startedAt;
    return {
      id: match.id,
      roomCode: match.room.code,
      playerCount: match.playerCount as PlayerCount,
      status: 'finished',
      winnerTeamId: match.winnerTeamId,
      startedAt: match.startedAt.toISOString(),
      endedAt: match.endedAt?.toISOString() ?? null,
      durationSeconds:
        match.durationSeconds ??
        Math.max(0, Math.round((endedAt.getTime() - match.startedAt.getTime()) / 1000)),
      turnCount: match.turnCount,
      moveCount: match.moveCount,
      players: match.histories.map((history) => ({
        userId: history.userId,
        displayName: history.displayName,
        seat: history.seat,
        teamId: history.teamId,
        won: history.won,
        marblesHome: history.marblesHome,
        captures: history.captures,
        moves: history.moves,
        cardsPlayed: history.cardsPlayed,
      })),
    };
  }

  async getMyStats(userId: string) {
    return this.prisma.playerStatistics.findUnique({ where: { userId } });
  }

  // ── Helpers ───────────────────────────────────────────────

  private requireMember(runtime: RoomRuntime, userId: string): RoomPlayerRuntime {
    const player = runtime.players.find((entry) => entry.userId === userId);
    if (!player) {
      throw forbidden('You are not a player in this room.');
    }
    return player;
  }
}

function normalizeSettings(value: Prisma.JsonValue): RoomSettings {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const raw = value as Record<string, unknown>;
    return {
      turnTimerSeconds:
        typeof raw.turnTimerSeconds === 'number' && raw.turnTimerSeconds > 0
          ? raw.turnTimerSeconds
          : null,
    };
  }
  return DEFAULT_ROOM_SETTINGS;
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.playerCount === 'number' &&
    Array.isArray(candidate.players) &&
    Array.isArray(candidate.teams) &&
    candidate.rules !== null &&
    typeof candidate.rules === 'object' &&
    typeof candidate.status === 'string'
  );
}

// Re-export types useful to the gateway.
export type { RoomRuntime };
