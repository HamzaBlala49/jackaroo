import {
  createGame,
  createGameSnapshot,
  endSevenTurn,
  forcePass,
  makeSevenMove,
  playCard,
} from '@jackaroo/game-engine';
import type { GameSnapshot, GameState, PlayRequest } from '@jackaroo/game-types';
import { randomSeed } from '@jackaroo/shared-utils';
import type { BoardShape } from '@jackaroo/game-board';
import { applyBotStep } from '../game/bots';
import {
  encodeMessage,
  LAN_PORT,
  PROTOCOL_VERSION,
  type ClientMessage,
  type HostMessage,
  type LobbyPlayerInfo,
} from './protocol';

type TcpSocketLike = {
  write: (data: string) => void;
  destroy: () => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  setEncoding?: (encoding: string) => void;
};

type TcpServerLike = {
  listen: (options: { port: number; host?: string }, callback?: () => void) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  close: (callback?: (error?: Error) => void) => void;
};

export interface HostOptions {
  hostName: string;
  playerCount: 4 | 6 | 8;
  fillWithBots: boolean;
  boardShape: BoardShape;
}

export interface HostSnapshot {
  phase: 'lobby' | 'playing' | 'finished';
  players: LobbyPlayerInfo[];
  gameState: GameState | null;
  address: string;
  error: string | null;
}

interface ClientEntry {
  seat: number;
  socket: TcpSocketLike;
  name: string;
  buffer: string;
}

const BOT_DELAY_MS = 900;
const BOT_SEVEN_DELAY_MS = 700;

/**
 * Authoritative LAN host. Runs the pure game engine on this device, accepts
 * TCP connections from the other players, and broadcasts personalised
 * snapshots — each client only ever sees its own hand.
 */
export class HostServer {
  private server: TcpServerLike | null = null;
  private clients = new Map<number, ClientEntry>();
  private usedSeats = new Set<number>([0]);
  private engine: GameState | null = null;
  private botSeats: boolean[] = [];
  private matchId = '';
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private snapshotState: HostSnapshot;
  private readonly options: HostOptions;

  onUpdate: (snapshot: HostSnapshot) => void = () => undefined;
  onClientCountChange: (count: number) => void = () => undefined;

  constructor(options: HostOptions, address: string) {
    this.options = options;
    this.snapshotState = {
      phase: 'lobby',
      players: this.lobbyPlayers(),
      gameState: null,
      address,
      error: null,
    };
  }

  get snapshot(): HostSnapshot {
    return this.snapshotState;
  }

  get game(): GameState | null {
    return this.engine;
  }

  get clientCount(): number {
    return this.clients.size;
  }

  private lobbyPlayers(): LobbyPlayerInfo[] {
    const players: LobbyPlayerInfo[] = [
      { seat: 0, name: this.options.hostName, isHost: true, connected: true, isBot: false },
    ];
    for (const [seat, entry] of this.clients) {
      players.push({ seat, name: entry.name, isHost: false, connected: true, isBot: false });
    }
    return players.sort((a, b) => a.seat - b.seat);
  }

  private update(partial: Partial<HostSnapshot>): void {
    this.snapshotState = { ...this.snapshotState, ...partial };
    this.onUpdate(this.snapshotState);
  }

  private error(message: string): void {
    this.update({ error: message });
  }

  private loadTcp(): { createServer: (listener?: (socket: TcpSocketLike) => void) => TcpServerLike } | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native module (dev build only)
      const mod = require('react-native-tcp-socket') as {
        createServer: (listener?: (socket: TcpSocketLike) => void) => TcpServerLike;
      };
      return mod;
    } catch {
      this.error('اللعب عبر الشبكة يحتاج نسخة التطوير (Development Build).');
      return null;
    }
  }

  listen(): Promise<void> {
    const tcp = this.loadTcp();
    if (!tcp) {
      return Promise.reject(new Error('TCP unavailable'));
    }
    return new Promise((resolve, reject) => {
      try {
        const server = tcp.createServer((socket) => this.handleConnection(socket));
        this.server = server;
        server.on('error', (...args: unknown[]) => {
          const err = args[0];
          reject(err instanceof Error ? err : new Error(String(err)));
        });
        server.listen({ port: LAN_PORT, host: '0.0.0.0' }, () => resolve());
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  private send(socket: TcpSocketLike, message: HostMessage): void {
    try {
      socket.write(encodeMessage(message));
    } catch {
      // The client vanished mid-write.
    }
  }

  private handleConnection(socket: TcpSocketLike): void {
    socket.setEncoding?.('utf8');
    let seat = -1;
    let buffer = '';

    socket.on('data', (...args: unknown[]) => {
      const chunk = typeof args[0] === 'string' ? args[0] : String(args[0] ?? '');
      buffer += chunk;
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        let message: ClientMessage;
        try {
          message = JSON.parse(trimmed) as ClientMessage;
        } catch {
          continue;
        }

        if (message.t === 'join') {
          if (this.snapshotState.phase !== 'lobby') {
            this.send(socket, { t: 'error', code: 'ROOM_IN_PROGRESS', message: 'المباراة بدأت بالفعل' });
            continue;
          }
          const assigned = this.nextFreeSeat();
          if (assigned === null) {
            this.send(socket, { t: 'error', code: 'ROOM_FULL', message: 'الغرفة ممتلئة' });
            continue;
          }
          seat = assigned;
          this.clients.set(seat, { seat, socket, name: message.name, buffer: '' });
          this.send(socket, {
            t: 'welcome',
            v: PROTOCOL_VERSION,
            seat,
            hostName: this.options.hostName,
            playerCount: this.options.playerCount,
            boardShape: this.options.boardShape,
          });
          this.update({ players: this.lobbyPlayers() });
          this.broadcastLobby();
          this.onClientCountChange(this.clients.size);
          continue;
        }

        if (seat < 0) continue;

        if (message.t === 'action') {
          this.applyAction(seat, message).catch(() => undefined);
        } else if (message.t === 'ping') {
          this.send(socket, { t: 'pong' });
        } else if (message.t === 'bye') {
          socket.destroy();
        }
      }

      const entry = seat >= 0 ? this.clients.get(seat) : undefined;
      if (entry) entry.buffer = buffer;
    });

    socket.on('close', () => {
      if (seat >= 0) this.dropClient(seat);
    });
    socket.on('error', () => {
      if (seat >= 0) this.dropClient(seat);
    });
  }

  private nextFreeSeat(): number | null {
    for (let seat = 1; seat < this.options.playerCount; seat += 1) {
      if (!this.usedSeats.has(seat)) {
        this.usedSeats.add(seat);
        return seat;
      }
    }
    return null;
  }

  private dropClient(seat: number): void {
    const entry = this.clients.get(seat);
    if (!entry) return;
    this.clients.delete(seat);
    this.usedSeats.delete(seat);
    this.onClientCountChange(this.clients.size);

    if (this.snapshotState.phase === 'lobby') {
      this.update({ players: this.lobbyPlayers() });
      this.broadcastLobby();
      return;
    }

    // Mid-game: the seat stays, a bot silently takes over.
    if (this.engine && this.engine.status === 'active') {
      this.botSeats[seat] = true;
      const player = this.engine.players[seat];
      if (player && !player.name.includes('روبوت')) player.name = `${player.name} 🤖`;
      this.broadcastStates();
      this.scheduleBot();
    }
  }

  private broadcastLobby(): void {
    const message: HostMessage = { t: 'lobby', players: this.snapshotState.players };
    for (const entry of this.clients.values()) this.send(entry.socket, message);
  }

  startGame(): void {
    if (this.snapshotState.phase !== 'lobby') return;

    const names: string[] = [];
    const bots: boolean[] = [];
    for (let seat = 0; seat < this.options.playerCount; seat += 1) {
      if (seat === 0) {
        names.push(this.options.hostName);
        bots.push(false);
      } else {
        const client = this.clients.get(seat);
        if (client) {
          names.push(client.name);
          bots.push(false);
        } else if (this.options.fillWithBots) {
          names.push(`روبوت ${seat}`);
          bots.push(true);
        } else {
          this.error('لا يمكن البدء — مقاعد فارغة');
          return;
        }
      }
    }

    this.matchId = `lan-${Date.now()}`;
    this.botSeats = bots;
    this.engine = createGame({
      id: this.matchId,
      players: names.map((name, seat) => ({ id: `p${seat}`, name })),
      seed: randomSeed(),
      startedAt: new Date().toISOString(),
    });

    this.update({ phase: 'playing', gameState: this.engine, error: null });

    for (const [seat, entry] of this.clients) {
      this.send(entry.socket, { t: 'start', seat, matchId: this.matchId });
    }
    this.broadcastStates();
    this.scheduleBot();
  }

  private isBotSeat(seat: number): boolean {
    return this.botSeats[seat] === true;
  }

  private scheduleBot(): void {
    if (this.closed || !this.engine || this.engine.status !== 'active') return;
    const current = this.engine.players[this.engine.currentSeat];
    if (!current) return;
    if (!this.isBotSeat(current.seat)) return;

    if (this.botTimer) clearTimeout(this.botTimer);
    const delay = this.engine.phase === 'seven' ? BOT_SEVEN_DELAY_MS : BOT_DELAY_MS;
    const seat = current.seat;
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      if (!this.engine || this.engine.status !== 'active') return;
      const now = this.engine.players[this.engine.currentSeat];
      if (!now || now.seat !== seat) return;
      const { state } = applyBotStep(this.engine, now.id);
      this.engine = state;
      this.update({ gameState: state });
      this.broadcastStates();
      if (state.status === 'finished') {
        this.update({ phase: 'finished' });
        for (const entry of this.clients.values()) {
          this.send(entry.socket, { t: 'closed', reason: 'finished' });
        }
      } else {
        this.scheduleBot();
      }
    }, delay);
  }

  private async applyAction(
    seat: number,
    message: Extract<ClientMessage, { t: 'action' }>,
  ): Promise<void> {
    if (!this.engine || this.engine.status !== 'active') return;
    const playerId = `p${seat}`;
    const current = this.engine.players[this.engine.currentSeat];
    if (!current || current.id !== playerId) return;

    let next: GameState | null = null;
    try {
      if (message.kind === 'play' && message.cardId && message.request) {
        next = playCard(this.engine, playerId, message.cardId, message.request).state;
      } else if (message.kind === 'pass' && message.cardId) {
        next = forcePass(this.engine, playerId, message.cardId).state;
      } else if (message.kind === 'seven-move' && message.marbleId && message.steps) {
        next = makeSevenMove(this.engine, playerId, message.marbleId, message.steps).state;
      } else if (message.kind === 'seven-end') {
        next = endSevenTurn(this.engine, playerId).state;
      }
    } catch {
      return; // Illegal action — the caller's state simply does not advance.
    }
    if (!next) return;

    this.engine = next;
    this.update({ gameState: next });
    this.broadcastStates();
    if (next.status === 'finished') {
      this.update({ phase: 'finished' });
      for (const entry of this.clients.values()) {
        this.send(entry.socket, { t: 'closed', reason: 'finished' });
      }
    } else {
      this.scheduleBot();
    }
  }

  private snapshotFor(viewerSeat: number): GameSnapshot {
    if (!this.engine) throw new Error('No game');
    const presence: Record<string, boolean> = {};
    for (const player of this.engine.players) {
      presence[player.id] = player.seat === 0 || this.clients.has(player.seat);
    }
    return createGameSnapshot(this.engine, {
      code: 'LAN',
      matchId: this.matchId,
      viewerId: `p${viewerSeat}`,
      presence,
      finishedAt: null,
      serverTime: new Date().toISOString(),
    });
  }

  private broadcastStates(): void {
    for (const [seat, entry] of this.clients) {
      try {
        this.send(entry.socket, { t: 'state', snapshot: this.snapshotFor(seat) });
      } catch {
        // ignore
      }
    }
  }

  hostSnapshot(): GameSnapshot {
    return this.snapshotFor(0);
  }

  hostPlay(cardId: string, request: PlayRequest): void {
    void this.applyAction(0, { t: 'action', actionId: `h${Date.now()}`, kind: 'play', cardId, request });
  }

  hostPass(cardId: string): void {
    void this.applyAction(0, { t: 'action', actionId: `h${Date.now()}`, kind: 'pass', cardId });
  }

  hostSevenMove(marbleId: string, steps: number): void {
    void this.applyAction(0, {
      t: 'action',
      actionId: `h${Date.now()}`,
      kind: 'seven-move',
      marbleId,
      steps,
    });
  }

  hostSevenEnd(): void {
    void this.applyAction(0, { t: 'action', actionId: `h${Date.now()}`, kind: 'seven-end' });
  }

  close(reason = 'host-left'): void {
    this.closed = true;
    if (this.botTimer) clearTimeout(this.botTimer);
    for (const entry of this.clients.values()) {
      this.send(entry.socket, { t: 'closed', reason });
      try {
        entry.socket.destroy();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
    try {
      this.server?.close();
    } catch {
      // ignore
    }
    this.server = null;
  }
}
