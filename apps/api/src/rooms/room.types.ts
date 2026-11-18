import type {
  GameState,
  JackarooRules,
  PlayerCount,
  RoomSettings,
  RoomView,
} from '@jackaroo/game-types';

export interface RoomPlayerRuntime {
  userId: string;
  displayName: string;
  seat: number;
  teamId: number;
  ready: boolean;
  joinedAt: string;
  connected: boolean;
}

export interface RoomRuntime {
  code: string;
  hostId: string;
  playerCount: PlayerCount;
  status: 'waiting' | 'playing' | 'finished';
  rulesVersion: string;
  rules: JackarooRules;
  settings: RoomSettings;
  players: RoomPlayerRuntime[];
  game: GameState | null;
  matchId: string | null;
  connections: Record<string, string>;
  recentActionIds: string[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface JoinRuntimeResult {
  runtime: RoomRuntime;
  resumed: boolean;
  newPlayer: boolean;
}

export interface LeaveRuntimeResult {
  runtime: RoomRuntime | null;
  closed: boolean;
}

export function toRoomView(runtime: RoomRuntime): RoomView {
  const sorted = [...runtime.players].sort((a, b) => a.seat - b.seat);
  const seats = Array.from({ length: runtime.playerCount }, (_, seat) => {
    const teamCount = runtime.playerCount / 2;
    const player = sorted.find((entry) => entry.seat === seat);
    return {
      seat,
      teamId: seat % teamCount,
      player: player
        ? {
            id: player.userId,
            displayName: player.displayName,
            seat: player.seat,
            teamId: player.teamId,
            ready: player.ready,
            isHost: runtime.hostId === player.userId,
            connected: player.connected,
          }
        : null,
    };
  });

  return {
    code: runtime.code,
    hostId: runtime.hostId,
    playerCount: runtime.playerCount,
    status: runtime.status,
    rulesVersion: runtime.rulesVersion,
    players: sorted.map((player) => ({
      id: player.userId,
      displayName: player.displayName,
      seat: player.seat,
      teamId: player.teamId,
      ready: player.ready,
      isHost: runtime.hostId === player.userId,
      connected: player.connected,
    })),
    seats,
    settings: runtime.settings,
    createdAt: runtime.createdAt,
  };
}
