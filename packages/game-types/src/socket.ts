import type { AuthUser } from './views';
import type { GameFeedEvent, GameSnapshot } from './game';
import type {
  Ack,
} from './errors';
import type {
  ActionPayload,
  CreateRoomPayload,
  JoinRoomPayload,
  JoinRoomResult,
  MakeMovePayload,
  PassPayload,
  PlayCardPayload,
  ReadyPayload,
  RequestStatePayload,
  RoomView,
} from './views';

export interface ServerToClientEvents {
  'room:updated': (room: RoomView) => void;
  'room:player-joined': (payload: { player: RoomView['players'][number] }) => void;
  'room:player-left': (payload: { playerId: string; seat: number }) => void;
  'room:closed': (payload: { reason: 'host-left' | 'expired' | 'closed' }) => void;
  'game:started': (payload: { matchId: string; code: string }) => void;
  'game:state': (state: GameSnapshot) => void;
  'game:feed': (payload: { events: GameFeedEvent[]; version: number }) => void;
  'presence:updated': (payload: { playerId: string; connected: boolean }) => void;
  'game:finished': (payload: { matchId: string; code: string }) => void;
  'game:error': (payload: { code: string; message: string; details?: unknown }) => void;
}

export interface ClientToServerEvents {
  'room:create': (
    payload: CreateRoomPayload,
    ack: (response: Ack<{ room: RoomView }>) => void,
  ) => void;
  'room:join': (
    payload: JoinRoomPayload,
    ack: (response: Ack<JoinRoomResult>) => void,
  ) => void;
  'room:leave': (payload: ActionPayload, ack: (response: Ack<{ left: true }>) => void) => void;
  'room:ready': (
    payload: ReadyPayload,
    ack: (response: Ack<{ room: RoomView }>) => void,
  ) => void;
  'room:start': (
    payload: ActionPayload,
    ack: (response: Ack<{ matchId: string }>) => void,
  ) => void;
  'room:rematch': (
    payload: ActionPayload,
    ack: (response: Ack<{ room: RoomView }>) => void,
  ) => void;
  'room:close': (
    payload: ActionPayload,
    ack: (response: Ack<{ closed: true }>) => void,
  ) => void;
  'game:play-card': (
    payload: PlayCardPayload,
    ack: (response: Ack<{ state: GameSnapshot }>) => void,
  ) => void;
  'game:make-move': (
    payload: MakeMovePayload,
    ack: (response: Ack<{ state: GameSnapshot }>) => void,
  ) => void;
  'game:end-turn': (
    payload: ActionPayload,
    ack: (response: Ack<{ state: GameSnapshot }>) => void,
  ) => void;
  'game:pass': (
    payload: PassPayload,
    ack: (response: Ack<{ state: GameSnapshot }>) => void,
  ) => void;
  'game:request-state': (
    payload: RequestStatePayload,
    ack: (response: Ack<{ state: GameSnapshot }>) => void,
  ) => void;
  'presence:ping': (payload: Record<string, never>, ack: (response: Ack<{ serverTime: string }>) => void) => void;
}

export interface InterServerEvents {
  noop: () => void;
}

export interface SocketData {
  user?: AuthUser;
  roomCode?: string;
  sessionId?: string;
}
