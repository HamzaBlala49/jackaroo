import type { GameSnapshot } from './game';
import type { PlayerCount, RoomSettings, RoomStatus } from './rules';

export interface AuthUser {
  id: string;
  displayName: string;
}

export interface RoomPlayerView {
  id: string;
  displayName: string;
  seat: number;
  teamId: number;
  ready: boolean;
  isHost: boolean;
  connected: boolean;
}

export interface RoomSeatView {
  seat: number;
  teamId: number;
  player: RoomPlayerView | null;
}

export interface RoomView {
  code: string;
  hostId: string;
  playerCount: PlayerCount;
  status: RoomStatus;
  rulesVersion: string;
  players: RoomPlayerView[];
  seats: RoomSeatView[];
  settings: RoomSettings;
  createdAt: string;
}

export interface JoinRoomResult {
  room: RoomView;
  game?: GameSnapshot;
  matchId?: string;
}

export interface MatchPlayerResult {
  userId: string;
  displayName: string;
  seat: number;
  teamId: number;
  won: boolean;
  marblesHome: number;
  captures: number;
  moves: number;
  cardsPlayed: number;
}

export interface MatchResultView {
  id: string;
  roomCode: string;
  playerCount: PlayerCount;
  status: 'finished' | 'abandoned';
  winnerTeamId: number | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  turnCount: number;
  moveCount: number;
  players: MatchPlayerResult[];
}

export interface UserStatsView {
  gamesPlayed: number;
  gamesWon: number;
  marblesHome: number;
  captures: number;
  moves: number;
  cardsPlayed: number;
  totalPlaySeconds: number;
}

export interface CreateRoomPayload {
  playerCount: PlayerCount;
}

export interface JoinRoomPayload {
  code: string;
}

export interface ReadyPayload {
  ready: boolean;
  actionId: string;
}

export interface ActionPayload {
  actionId: string;
}

export interface LeaveRoomPayload {
  actionId: string;
}

export interface PlayCardPayload {
  cardId: string;
  action:
    | { kind: 'enter'; marbleId: string }
    | { kind: 'move'; marbleId: string; steps: number }
    | { kind: 'swap'; marbleId: string; targetPlayerId: string; targetMarbleId: string }
    | { kind: 'begin-seven' };
  actionId: string;
}

export interface MakeMovePayload {
  marbleId: string;
  steps: number;
  actionId: string;
}

export interface PassPayload {
  cardId: string;
  actionId: string;
}

export interface RequestStatePayload {
  code: string;
}

export interface JoinRoomResponse {
  room: RoomView;
}
