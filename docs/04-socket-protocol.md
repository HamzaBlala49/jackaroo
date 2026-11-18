# Jackaroo Online — Socket & REST Contracts (Phase 1)

Namespace: `/game` (Socket.IO). Transports: WebSocket preferred, polling fallback. Auth: httpOnly JWT cookie sent on the handshake (`withCredentials: true`); the server also accepts `auth.token` for native/test clients.

## 1. Envelope

```ts
type Ack<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: GameErrorCode | ApiErrorCode; message: string; details?: unknown } };
```

Every mutating client event carries a client-generated `actionId` (UUID v4). The server deduplicates within the room's recent-action window.

## 2. Client → server

| Event | Payload | Ack data |
| --- | --- | --- |
| `room:create` | `{ playerCount: 4|6|8; displayName?: string }` | `{ room: RoomView }` |
| `room:join` | `{ code: string }` | `{ room: RoomView; game?: GameSnapshot }` |
| `room:leave` | `{ actionId: string }` | `{ left: true }` |
| `room:ready` | `{ ready: boolean; actionId: string }` | `{ room: RoomView }` |
| `room:start` | `{ actionId: string }` | `{ matchId: string }` |
| `room:rematch` | `{ actionId: string }` | `{ room: RoomView }` |
| `room:close` | `{ actionId: string }` | `{ closed: true }` |
| `game:play-card` | `{ cardId: string; action: PlayRequest; actionId: string }` | `{ state: GameSnapshot }` |
| `game:make-move` | `{ marbleId: string; steps: number; actionId: string }` | `{ state: GameSnapshot }` (seven phase) |
| `game:end-turn` | `{ actionId: string }` | `{ state: GameSnapshot }` (seven phase only) |
| `game:pass` | `{ cardId: string; actionId: string }` | `{ state: GameSnapshot }` (no-legal-move forced discard) |
| `game:request-state` | `{ code: string }` | `{ state: GameSnapshot }` |
| `presence:ping` | `{}` | `{ serverTime: string }` |

### `PlayRequest` union

```ts
type PlayRequest =
  | { kind: 'enter'; marbleId: string }
  | { kind: 'move'; marbleId: string; steps: number }      // steps validated against the card
  | { kind: 'swap'; marbleId: string; targetPlayerId: string; targetMarbleId: string }
  | { kind: 'begin-seven' };                                // 7 only; turn stays open
```

## 3. Server → client

| Event | Payload | Audience |
| --- | --- | --- |
| `room:updated` | `RoomView` | room |
| `room:player-joined` | `{ player: RoomPlayerView }` | room |
| `room:player-left` | `{ playerId: string; seat: number }` | room |
| `room:closed` | `{ reason: 'host-left' \| 'expired' \| 'closed' }` | room |
| `game:started` | `{ matchId: string; code: string }` | room |
| `game:state` | `GameSnapshot` | **per-socket personalized** |
| `game:feed` | `{ events: GameFeedEvent[]; stateVersion: number }` | room (public facts only) |
| `presence:updated` | `{ playerId: string; connected: boolean }` | room |
| `game:finished` | `{ matchId: string }` | room |
| `game:error` | `{ code; message; details? }` | socket (non-ack errors / kicked) |

`game:state` always includes `version` (monotonic state counter) and `serverTime`. The client ignores stale versions.

### `GameFeedEvent`

```ts
type GameFeedEvent =
  | { type: 'turn-started'; playerId: string; seat: number; round: number }
  | { type: 'card-played'; playerId: string; card: Card; label: string }
  | { type: 'card-discarded'; playerId: string; card: Card }
  | { type: 'marble-entered'; playerId: string; marbleId: string; toCell: number }
  | { type: 'marble-moved'; playerId: string; marbleId: string; fromProgress: number; toProgress: number; cells: number[] }
  | { type: 'marble-captured'; ownerId: string; marbleId: string; byPlayerId: string; fromCell: number }
  | { type: 'marble-home'; playerId: string; marbleId: string; slot: number }
  | { type: 'swap'; playerId: string; marbleId: string; targetPlayerId: string; targetMarbleId: string }
  | { type: 'seven-progress'; playerId: string; remaining: number; moves: SevenSegment[] }
  | { type: 'pass'; playerId: string; card: Card }
  | { type: 'player-finished'; playerId: string }
  | { type: 'round-ended'; round: number; nextStartingSeat: number }
  | { type: 'game-finished'; winningTeamId: number; playerIds: string[] };
```

## 4. View types (summary)

```ts
interface RoomView {
  code: string;
  hostId: string;
  playerCount: 4 | 6 | 8;
  status: 'waiting' | 'playing' | 'finished' | 'closed';
  rulesVersion: string;
  players: Array<{
    id: string; displayName: string; seat: number; teamId: number;
    ready: boolean; isHost: boolean; connected: boolean;
  }>;
  seats: Array<{ seat: number; teamId: number; player: RoomPlayerView | null }>;
  createdAt: string;
}

interface GameSnapshot {
  code: string;
  version: number;
  matchId: string;
  status: 'active' | 'finished';
  round: number;
  turnNumber: number;
  turnPlayerId: string | null;
  phase: 'awaiting-card' | 'seven' | 'finished';
  seven: { playerId: string; remaining: number; segments: SevenSegment[] } | null;
  players: PublicPlayerState[];    // handCount, marbles, finished, stats
  teams: PublicTeamState[];
  log: PublicLogEntry[];
  winnerTeamId: number | null;
  deckCount: number;
  discardCount: number;
  startedAt: string;
  finishedAt: string | null;
  you: {
    playerId: string;
    hand: Card[];
    legalCards: LegalCardActions[];
    sevenOptions: Array<{ marbleId: string; maxSteps: number }>;
  } | null;
  rules: PublicRules;              // playerCounts, card map labels, safety, etc.
}
```

The server is the only producer of `GameSnapshot`. The raw engine state is never emitted.

## 5. Error codes

```ts
type GameErrorCode =
  | 'AUTH_REQUIRED' | 'SESSION_EXPIRED' | 'FORBIDDEN'
  | 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'ROOM_IN_PROGRESS' | 'ROOM_CLOSED'
  | 'NOT_HOST' | 'NOT_ENOUGH_PLAYERS' | 'PLAYERS_NOT_READY' | 'ALREADY_READY'
  | 'NOT_YOUR_TURN' | 'GAME_NOT_ACTIVE' | 'GAME_FINISHED' | 'WRONG_PHASE'
  | 'CARD_NOT_IN_HAND' | 'INVALID_ACTION' | 'NO_LEGAL_MOVE'
  | 'MARBLE_NOT_ELIGIBLE' | 'DESTINATION_INVALID' | 'HOME_ENTRY_INVALID'
  | 'SWAP_TARGET_INVALID' | 'SPLIT_EXCEEDED' | 'DUPLICATE_ACTION'
  | 'ROOM_LOCK_TIMEOUT' | 'STATE_UNAVAILABLE' | 'RATE_LIMITED'
  | 'VALIDATION_ERROR' | 'INTERNAL_ERROR';
```

Acks use HTTP-like semantics at the socket level: validation/rule failures are normal error acks, not disconnects.

## 6. REST

All REST routes are JSON; auth via cookie. Consistent error shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Display name must be 2–24 characters" } }
```

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/auth/guest` | `{ displayName }` | `{ user }` + Set-Cookie |
| GET | `/auth/me` | — | `{ user }` |
| POST | `/auth/logout` | — | `{ ok: true }` |
| GET | `/rooms/:code` | — | `{ room }` (no hands) |
| GET | `/matches/:id` | — | `{ match, players }` (participants only) |
| GET | `/stats/me` | — | `{ user, stats }` |
| GET | `/health` | — | `{ status, db, redis, uptime }` |

Rate limits: auth 10/min/IP; room create 6/min/user; room join attempts 20/min/user; socket errors are logged with user + room.

## 7. Sequence: start a match

```text
Host                     API                                   Redis/DB
 |  room:start              |                                       |
 |------------------------->| auth/seat/host/full/ready checks      |
 |                          | lock room                             |
 |                          | create deck seed, engine createGame    |
 |                          | DB match ACTIVE, room PLAYING          |
 |                          | save runtime + snapshot                |
 |                          | emit game:started                      |
 |                          | personalized game:state per socket     |
 |<-- ack {matchId} --------|                                       |
```

## 8. Sequence: reconnect

```text
Browser refresh → GET /auth/me → socket connect → room:join {code}
  → server: member? active? update connections map, emit presence, ack room + personalized snapshot
  → UI replaces store with snapshot and clears pending animations
```
