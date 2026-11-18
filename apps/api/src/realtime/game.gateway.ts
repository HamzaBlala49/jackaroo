import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  Ack as SocketAckDecorator,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import {
  actionPayloadSchema,
  createRoomPayloadSchema,
  joinRoomPayloadSchema,
  makeMovePayloadSchema,
  passPayloadSchema,
  playCardPayloadSchema,
  readyPayloadSchema,
  requestStatePayloadSchema,
  type Ack,
  type ErrorPayload,
  type GameErrorCode,
  type RoomView,
  type GameFeedEvent,
  type InterServerEvents,
  type JoinRoomResult,
  type ServerToClientEvents,
  type ClientToServerEvents,
  type SocketData,
} from '@jackaroo/game-types';
import { GameRuleError } from '@jackaroo/game-engine';
import { ZodError } from 'zod';
import { AuthService } from '../auth/auth.service';
import { RateLimiterService } from '../common/rate-limiter.service';
import { AppError } from '../common/app-error';
import { RoomsService } from '../rooms/rooms.service';
import type { RoomRuntime } from '../rooms/room.types';

type GameNamespace = Namespace<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type AckCallback<T> = (response: Ack<T>) => void;

const WAITING_DISCONNECT_GRACE_MS = 20_000;

@WebSocketGateway({
  namespace: '/game',
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 200_000,
})
@Injectable()
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  private readonly logger = new Logger(GameGateway.name);
  private readonly disconnectTimers = new Map<string, NodeJS.Timeout>();

  @WebSocketServer()
  private server!: GameNamespace;

  constructor(
    private readonly auth: AuthService,
    private readonly rateLimiter: RateLimiterService,
    private readonly rooms: RoomsService,
  ) {}

  afterInit(server: GameNamespace): void {
    server.use(async (socket, next) => {
      try {
        const authToken =
          typeof socket.handshake.auth?.token === 'string'
            ? socket.handshake.auth.token
            : undefined;
        const cookieToken = this.auth.extractTokenFromCookieHeader(
          socket.handshake.headers.cookie,
        );
        const token = authToken ?? cookieToken;
        const result = await this.auth.authenticateToken(token);
        socket.data.user = result.user;
        socket.data.sessionId = result.sessionId;
        next();
      } catch (error) {
        this.logger.warn(
          `Socket authentication failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        next(new Error('AUTH_REQUIRED'));
      }
    });
  }

  handleConnection(socket: GameSocket): void {
    this.logger.debug(`Socket connected: ${socket.id}`);
  }

  async handleDisconnect(socket: GameSocket): Promise<void> {
    const user = socket.data.user;
    const code = socket.data.roomCode;
    if (!user || !code) return;
    try {
      const runtime = await this.rooms.markDisconnected(code, user.id, socket.id);
      if (!runtime) return;
      const player = runtime.players.find((entry) => entry.userId === user.id);
      if (!player || player.connected) return;

      this.server.to(channel(code)).emit('presence:updated', {
        playerId: user.id,
        connected: false,
      });
      this.broadcastRoom(runtime);
      if (runtime.status === 'waiting') {
        this.scheduleWaitingExpiry(code, user.id);
      }
    } catch (error) {
      if (!(error instanceof AppError && error.code === 'ROOM_NOT_FOUND')) {
        this.logger.warn(
          `Presence update on disconnect failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  onModuleDestroy(): void {
    for (const timer of this.disconnectTimers.values()) clearTimeout(timer);
    this.disconnectTimers.clear();
  }

  // ── Room events ────────────────────────────────────────────

  @SubscribeMessage('room:create')
  async handleRoomCreate(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
    @SocketAckDecorator() ack: AckCallback<{ room: RoomView }>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const user = this.requireUser(socket);
      this.rateLimiter.consume(`room:create:${user.id}`, 6, 60_000);
      const { playerCount } = this.parse(createRoomPayloadSchema, body);
      await this.detachFromCurrentRoom(socket);
      const created = await this.rooms.createRoom(playerCount, user);
      await this.attachToRoom(socket, created.code);
      this.clearDisconnectTimer(created.code, user.id);
      const runtime = await this.rooms.markConnected(created.code, user.id, socket.id);
      this.broadcastRoom(runtime);
      return { ok: true, data: { room: this.rooms.roomView(runtime) } };
    });
  }

  @SubscribeMessage('room:join')
  async handleRoomJoin(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
    @SocketAckDecorator() ack: AckCallback<JoinRoomResult>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const user = this.requireUser(socket);
      this.rateLimiter.consume(`room:join:${user.id}`, 60, 60_000);
      const { code } = this.parse(joinRoomPayloadSchema, body);
      if (socket.data.roomCode && socket.data.roomCode !== code) {
        await this.detachFromCurrentRoom(socket);
      }

      const { runtime, newPlayer } = await this.rooms.joinRoom(code, user, socket.id);
      await this.attachToRoom(socket, runtime.code);
      this.clearDisconnectTimer(runtime.code, user.id);

      const result: JoinRoomResult = { room: this.rooms.roomView(runtime) };
      if (runtime.game && runtime.matchId) {
        result.game = this.rooms.buildGameSnapshot(runtime, user.id);
        result.matchId = runtime.matchId;
      }

      this.broadcastRoom(runtime);
      if (newPlayer) {
        const joined = runtime.players.find((player) => player.userId === user.id);
        if (joined) {
          this.server.to(channel(runtime.code)).emit('room:player-joined', {
            player: {
              id: joined.userId,
              displayName: joined.displayName,
              seat: joined.seat,
              teamId: joined.teamId,
              ready: joined.ready,
              isHost: runtime.hostId === joined.userId,
              connected: true,
            },
          });
        }
      }
      this.server.to(channel(runtime.code)).emit('presence:updated', {
        playerId: user.id,
        connected: true,
      });

      if (runtime.game && runtime.matchId) {
        this.server
          .to(socket.id)
          .emit('game:state', this.rooms.buildGameSnapshot(runtime, user.id));
      }
      return { ok: true, data: result };
    });
  }

  @SubscribeMessage('room:leave')
  async handleRoomLeave(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
    @SocketAckDecorator() ack: AckCallback<{ left: true }>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const user = this.requireUser(socket);
      const code = this.requireRoomCode(socket);
      this.parse(actionPayloadSchema, body);
      const result = await this.rooms.leaveRoom(code, user.id);
      this.clearDisconnectTimer(code, user.id);
      await socket.leave(channel(code));
      socket.data.roomCode = undefined;
      if (result.runtime) {
        this.server.to(channel(code)).emit('room:player-left', {
          playerId: user.id,
          seat: 0,
        });
        this.broadcastRoom(result.runtime);
      }
      return { ok: true, data: { left: true as const } };
    });
  }

  @SubscribeMessage('room:ready')
  async handleRoomReady(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
    @SocketAckDecorator() ack: AckCallback<{ room: RoomView }>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const user = this.requireUser(socket);
      const code = this.requireRoomCode(socket);
      const payload = this.parse(readyPayloadSchema, body);
      const runtime = await this.rooms.setReady(code, user.id, payload.ready);
      this.broadcastRoom(runtime);
      return { ok: true, data: { room: this.rooms.roomView(runtime) } };
    });
  }

  @SubscribeMessage('room:start')
  async handleRoomStart(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
    @SocketAckDecorator() ack: AckCallback<{ matchId: string }>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const user = this.requireUser(socket);
      const code = this.requireRoomCode(socket);
      this.parse(actionPayloadSchema, body);
      this.rateLimiter.consume(`room:start:${user.id}`, 6, 60_000);
      const runtime = await this.rooms.startGame(code, user.id);
      if (!runtime.matchId) {
        throw new AppError('STATE_UNAVAILABLE', 'The match could not be created.', 500);
      }
      this.broadcastRoom(runtime);
      this.server.to(channel(code)).emit('game:started', {
        matchId: runtime.matchId,
        code,
      });
      this.broadcastGameState(runtime);
      return { ok: true, data: { matchId: runtime.matchId } };
    });
  }

  @SubscribeMessage('room:rematch')
  async handleRoomRematch(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
    @SocketAckDecorator() ack: AckCallback<{ room: RoomView }>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const user = this.requireUser(socket);
      const code = this.requireRoomCode(socket);
      this.parse(actionPayloadSchema, body);
      const runtime = await this.rooms.rematch(code, user.id);
      this.broadcastRoom(runtime);
      return { ok: true, data: { room: this.rooms.roomView(runtime) } };
    });
  }

  @SubscribeMessage('room:close')
  async handleRoomClose(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
    @SocketAckDecorator() ack: AckCallback<{ closed: true }>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const user = this.requireUser(socket);
      const code = this.requireRoomCode(socket);
      this.parse(actionPayloadSchema, body);
      await this.rooms.closeRoom(code, user.id);
      this.server.to(channel(code)).emit('room:closed', { reason: 'closed' });
      const sockets = await this.server.in(channel(code)).fetchSockets();
      for (const entry of sockets) {
        entry.data.roomCode = undefined;
        await entry.leave(channel(code));
        this.clearDisconnectTimer(code, entry.data.user?.id ?? '');
      }
      socket.data.roomCode = undefined;
      return { ok: true, data: { closed: true as const } };
    });
  }

  // ── Gameplay events ────────────────────────────────────────

  @SubscribeMessage('game:play-card')
  async handlePlayCard(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
    @SocketAckDecorator() ack: AckCallback<{ state: import('@jackaroo/game-types').GameSnapshot }>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const user = this.requireUser(socket);
      const code = this.requireRoomCode(socket);
      this.rateLimiter.consume(`game:${user.id}`, 300, 10_000);
      const payload = this.parse(playCardPayloadSchema, body);
      const outcome = await this.rooms.playCard(
        code,
        user.id,
        payload.actionId,
        payload.cardId,
        payload.action,
      );
      return this.finishGameAction(socket, outcome);
    });
  }

  @SubscribeMessage('game:make-move')
  async handleMakeMove(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
    @SocketAckDecorator() ack: AckCallback<{ state: import('@jackaroo/game-types').GameSnapshot }>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const user = this.requireUser(socket);
      const code = this.requireRoomCode(socket);
      this.rateLimiter.consume(`game:${user.id}`, 300, 10_000);
      const payload = this.parse(makeMovePayloadSchema, body);
      const outcome = await this.rooms.makeSevenMove(
        code,
        user.id,
        payload.actionId,
        payload.marbleId,
        payload.steps,
      );
      return this.finishGameAction(socket, outcome);
    });
  }

  @SubscribeMessage('game:end-turn')
  async handleEndTurn(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
    @SocketAckDecorator() ack: AckCallback<{ state: import('@jackaroo/game-types').GameSnapshot }>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const user = this.requireUser(socket);
      const code = this.requireRoomCode(socket);
      const payload = this.parse(actionPayloadSchema, body);
      const outcome = await this.rooms.endSevenTurn(code, user.id, payload.actionId);
      return this.finishGameAction(socket, outcome);
    });
  }

  @SubscribeMessage('game:pass')
  async handlePass(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
    @SocketAckDecorator() ack: AckCallback<{ state: import('@jackaroo/game-types').GameSnapshot }>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const user = this.requireUser(socket);
      const code = this.requireRoomCode(socket);
      const payload = this.parse(passPayloadSchema, body);
      const outcome = await this.rooms.pass(code, user.id, payload.actionId, payload.cardId);
      return this.finishGameAction(socket, outcome);
    });
  }

  @SubscribeMessage('game:request-state')
  async handleRequestState(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
    @SocketAckDecorator() ack: AckCallback<{ state: import('@jackaroo/game-types').GameSnapshot }>,
  ): Promise<void> {
    await this.respond(ack, async () => {
      const user = this.requireUser(socket);
      const { code } = this.parse(requestStatePayloadSchema, body);
      const runtime = await this.rooms.getRoomForUser(code, user.id);
      if (!runtime.game || !runtime.matchId) {
        throw new AppError('STATE_UNAVAILABLE', 'The match state is not available.', 503);
      }
      const state = this.rooms.buildGameSnapshot(runtime, user.id);
      return { ok: true, data: { state } };
    });
  }

  @SubscribeMessage('presence:ping')
  async handlePresencePing(
    @SocketAckDecorator() ack: AckCallback<{ serverTime: string }>,
  ): Promise<void> {
    ack?.({ ok: true, data: { serverTime: new Date().toISOString() } });
  }

  // ── Shared action finishing ────────────────────────────────

  private async finishGameAction(
    socket: GameSocket,
    outcome: Awaited<ReturnType<RoomsService['playCard']>>,
  ): Promise<Ack<{ state: import('@jackaroo/game-types').GameSnapshot }>> {
    const user = this.requireUser(socket);
    const runtime = outcome.runtime;
    if (outcome.duplicate) {
      return { ok: true, data: { state: this.rooms.buildGameSnapshot(runtime, user.id) } };
    }

    const snapshot = this.rooms.buildGameSnapshot(runtime, user.id);
    if (outcome.result && outcome.result.events.length > 0) {
      this.server.to(channel(runtime.code)).emit('game:feed', {
        events: outcome.result.events as GameFeedEvent[],
        version: outcome.result.state.stateVersion,
      });
    }
    this.broadcastGameState(runtime);
    this.broadcastRoom(runtime);

    if (runtime.status === 'finished' && runtime.matchId) {
      this.server.to(channel(runtime.code)).emit('game:finished', {
        matchId: runtime.matchId,
        code: runtime.code,
      });
    }

    return { ok: true, data: { state: snapshot } };
  }

  // ── Broadcast helpers ──────────────────────────────────────

  private broadcastRoom(runtime: RoomRuntime): void {
    this.server.to(channel(runtime.code)).emit('room:updated', this.rooms.roomView(runtime));
  }

  private broadcastGameState(runtime: RoomRuntime): void {
    if (!runtime.game || !runtime.matchId) return;
    for (const player of runtime.players) {
      const socketId = runtime.connections[player.userId];
      if (!socketId) continue;
      try {
        this.server.to(socketId).emit('game:state', this.rooms.buildGameSnapshot(runtime, player.userId));
      } catch (error) {
        this.logger.warn(
          `Could not send snapshot to ${player.userId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  // ── Socket / room helpers ──────────────────────────────────

  private requireUser(socket: GameSocket) {
    if (!socket.data.user) throw new AppError('AUTH_REQUIRED', 'Sign in to continue.', 401);
    return socket.data.user;
  }

  private requireRoomCode(socket: GameSocket): string {
    if (!socket.data.roomCode) {
      throw new AppError('ROOM_NOT_FOUND', 'Join a room first.', 404);
    }
    return socket.data.roomCode;
  }

  private async attachToRoom(socket: GameSocket, code: string): Promise<void> {
    await socket.join(channel(code));
    socket.data.roomCode = code;
  }

  private async detachFromCurrentRoom(socket: GameSocket): Promise<void> {
    const oldCode = socket.data.roomCode;
    if (!oldCode) return;
    const user = socket.data.user;
    if (!user) return;
    const result = await this.rooms.leaveRoom(oldCode, user.id).catch((error) => {
      throw error;
    });
    await socket.leave(channel(oldCode));
    socket.data.roomCode = undefined;
    this.clearDisconnectTimer(oldCode, user.id);
    if (result.runtime) {
      this.broadcastRoom(result.runtime);
      this.server.to(channel(oldCode)).emit('room:player-left', {
        playerId: user.id,
        seat: 0,
      });
    }
  }

  private scheduleWaitingExpiry(code: string, userId: string): void {
    const key = `${code}:${userId}`;
    this.clearDisconnectTimer(code, userId);
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(key);
      void this.expireWaitingPlayer(code, userId);
    }, WAITING_DISCONNECT_GRACE_MS);
    this.disconnectTimers.set(key, timer);
  }

  private clearDisconnectTimer(code: string, userId: string): void {
    if (!userId) return;
    const key = `${code}:${userId}`;
    const timer = this.disconnectTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(key);
    }
  }

  private async expireWaitingPlayer(code: string, userId: string): Promise<void> {
    try {
      const result = await this.rooms.expireWaitingPlayer(code, userId);
      if (!result.removed) return;
      if (result.closed) {
        this.server.to(channel(code)).emit('room:closed', { reason: 'expired' });
        return;
      }
      if (result.runtime) {
        this.server.to(channel(code)).emit('room:player-left', { playerId: userId, seat: 0 });
        this.broadcastRoom(result.runtime);
      }
    } catch (error) {
      this.logger.warn(
        `Waiting-room expiry failed for ${code}/${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // ── Error / validation plumbing ────────────────────────────

  private parse<T>(
    schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: ZodError } },
    value: unknown,
  ): T {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new AppError(
        'VALIDATION_ERROR',
        result.error.issues[0]?.message ?? 'Invalid request.',
        400,
        result.error.issues,
      );
    }
    return result.data;
  }

  private async respond<T>(
    ack: AckCallback<T> | undefined,
    fn: () => Promise<Ack<T>>,
  ): Promise<void> {
    try {
      const response = await fn();
      ack?.(response);
    } catch (error) {
      const payload = this.errorPayload(error);
      this.logger.warn(`Socket action failed [${payload.code}]: ${payload.message}`);
      ack?.({ ok: false, error: payload });
    }
  }

  private errorPayload(error: unknown): ErrorPayload {
    if (error instanceof AppError) {
      return { code: error.code, message: error.message, details: error.details };
    }
    if (error instanceof GameRuleError) {
      return { code: error.code, message: error.message, details: error.details };
    }
    if (error instanceof ZodError) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.issues[0]?.message ?? 'Invalid request.',
        details: error.issues,
      };
    }
    this.logger.error(
      'Unhandled socket error',
      error instanceof Error ? error.stack : String(error),
    );
    return { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' };
  }
}

function channel(code: string): string {
  return `room:${code}`;
}
