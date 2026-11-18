import type { GameSnapshot, PlayRequest } from '@jackaroo/game-types';
import {
  encodeMessage,
  LAN_PORT,
  PROTOCOL_VERSION,
  type HostMessage,
  type LobbyPlayerInfo,
} from './protocol';

type TcpSocketLike = {
  write: (data: string) => void;
  destroy: () => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  setEncoding?: (encoding: string) => void;
};

type ConnectOptions = { port: number; host: string; connectTimeout?: number };

type TcpModule = {
  createConnection: (
    options: ConnectOptions,
    callback?: () => void,
  ) => TcpSocketLike;
};

export type ClientStatus = 'idle' | 'connecting' | 'lobby' | 'playing' | 'error' | 'closed';

export interface ClientSnapshot {
  status: ClientStatus;
  seat: number | null;
  lobbyPlayers: LobbyPlayerInfo[];
  snapshot: GameSnapshot | null;
  error: string | null;
}

/**
 * LAN client. Connects to the host, joins the lobby and mirrors the
 * personalised snapshots the host broadcasts.
 */
export class ClientConnection {
  private socket: TcpSocketLike | null = null;
  private buffer = '';
  private closedByUser = false;
  private state: ClientSnapshot = {
    status: 'idle',
    seat: null,
    lobbyPlayers: [],
    snapshot: null,
    error: null,
  };

  onUpdate: (state: ClientSnapshot) => void = () => undefined;

  get snapshot(): ClientSnapshot {
    return this.state;
  }

  private update(partial: Partial<ClientSnapshot>): void {
    this.state = { ...this.state, ...partial };
    this.onUpdate(this.state);
  }

  private loadTcp(): TcpModule | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native module (dev build only)
      const mod = require('react-native-tcp-socket') as TcpModule;
      return mod;
    } catch {
      this.update({ status: 'error', error: 'اللعب عبر الشبكة يحتاج نسخة التطوير.' });
      return null;
    }
  }

  connect(host: string, name: string): Promise<void> {
    const tcp = this.loadTcp();
    if (!tcp) return Promise.reject(new Error('TCP unavailable'));

    this.closedByUser = false;
    this.update({ status: 'connecting', error: null, snapshot: null, seat: null, lobbyPlayers: [] });

    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        this.update({ status: 'error', error: message });
        reject(new Error(message));
      };

      try {
        const socket = tcp.createConnection(
          { port: LAN_PORT, host, connectTimeout: 6000 },
          () => {
            if (settled) return;
            settled = true;
            this.socket = socket;
            socket.write(encodeMessage({ t: 'join', v: PROTOCOL_VERSION, name }));
            this.update({ status: 'lobby' });
            resolve();
          },
        );

        socket.on('error', (...args: unknown[]) => {
          const err = args[0];
          fail(err instanceof Error ? err.message : 'تعذر الاتصال');
        });

        socket.on('close', () => {
          if (this.closedByUser) return;
          this.update({ status: 'closed', error: 'انقطع الاتصال بالمضيف' });
        });

        socket.setEncoding?.('utf8');
        socket.on('data', (...args: unknown[]) => {
          const chunk = typeof args[0] === 'string' ? args[0] : String(args[0] ?? '');
          this.buffer += chunk;
          const parts = this.buffer.split('\n');
          this.buffer = parts.pop() ?? '';
          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            try {
              this.handleMessage(JSON.parse(trimmed) as HostMessage);
            } catch {
              // Ignore malformed lines.
            }
          }
        });
      } catch (error) {
        fail(error instanceof Error ? error.message : 'تعذر الاتصال');
      }
    });
  }

  private handleMessage(message: HostMessage): void {
    switch (message.t) {
      case 'welcome':
        this.update({ seat: message.seat });
        break;
      case 'lobby':
        this.update({ lobbyPlayers: message.players, status: 'lobby' });
        break;
      case 'start':
        this.update({ status: 'playing' });
        break;
      case 'state':
        this.update({ snapshot: message.snapshot, status: 'playing' });
        break;
      case 'error':
        this.update({ error: message.message });
        break;
      case 'closed':
        this.update({ status: 'closed', error: 'انتهت المباراة أو أغلق المضيف الغرفة' });
        this.close();
        break;
      default:
        break;
    }
  }

  playCard(cardId: string, request: PlayRequest): void {
    this.send({
      t: 'action',
      actionId: `c${Date.now()}`,
      kind: 'play',
      cardId,
      request,
    });
  }

  pass(cardId: string): void {
    this.send({ t: 'action', actionId: `c${Date.now()}`, kind: 'pass', cardId });
  }

  sevenMove(marbleId: string, steps: number): void {
    this.send({
      t: 'action',
      actionId: `c${Date.now()}`,
      kind: 'seven-move',
      marbleId,
      steps,
    });
  }

  sevenEnd(): void {
    this.send({ t: 'action', actionId: `c${Date.now()}`, kind: 'seven-end' });
  }

  private send(message: unknown): void {
    if (!this.socket) return;
    try {
      this.socket.write(encodeMessage(message));
    } catch {
      // The connection died; the close handler updates the UI.
    }
  }

  close(): void {
    this.closedByUser = true;
    if (this.socket) {
      try {
        this.send({ t: 'bye' });
        this.socket.destroy();
      } catch {
        // ignore
      }
    }
    this.socket = null;
  }
}
