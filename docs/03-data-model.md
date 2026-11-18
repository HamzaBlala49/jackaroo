# Jackaroo Online — Data Model (Phase 1)

## 1. Entity relationship overview

```text
User 1 ── * AuthSession
User 1 ── * GamePlayer * ── 1 GameRoom
User 1 ── * GameHistory * ── 1 GameMatch * ── 1 GameRoom
User 1 ── 0..1 PlayerStatistics
```

- A **GameRoom** is the durable lobby record. Its live state is in Redis.
- A **GameMatch** is one played game inside a room. A rematch creates a new match in the same room.
- A **GamePlayer** is a seat inside a room for the current lobby incarnation.
- A **GameHistory** is a durable per-player row for one finished match.
- **PlayerStatistics** is a lifetime aggregate row.

## 2. Prisma schema (source of truth: `apps/api/prisma/schema.prisma`)

```prisma
enum RoomStatus {
  WAITING
  PLAYING
  FINISHED
  CLOSED
}

enum MatchStatus {
  ACTIVE
  FINISHED
  ABANDONED
}

model User {
  id           String   @id @default(uuid())
  displayName  String   @db.VarChar(24)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  sessions     AuthSession[]
  hostedRooms  GameRoom[]       @relation("HostedRooms")
  roomPlayers  GamePlayer[]
  histories    GameHistory[]
  statistics   PlayerStatistics?
}

model AuthSession {
  id         String   @id @default(uuid())
  userId     String
  jti        String   @unique
  userAgent  String?  @db.VarChar(512)
  createdAt  DateTime @default(now())
  lastSeenAt DateTime @default(now())
  expiresAt  DateTime
  revokedAt  DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model GameRoom {
  id           String     @id @default(uuid())
  code         String     @unique @db.VarChar(8)
  hostId       String
  status       RoomStatus @default(WAITING)
  playerCount  Int
  rulesVersion String     @db.VarChar(32)
  settings     Json       @default("{}")
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  startedAt    DateTime?
  closedAt     DateTime?

  host    User         @relation("HostedRooms", fields: [hostId], references: [id])
  players GamePlayer[]
  matches GameMatch[]

  @@index([status, updatedAt])
}

model GamePlayer {
  id       String   @id @default(uuid())
  roomId   String
  userId   String
  seat     Int
  teamId   Int
  ready    Boolean  @default(false)
  joinedAt DateTime @default(now())
  leftAt   DateTime?

  room GameRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([roomId, userId])
  @@index([roomId, seat])
}

model GameMatch {
  id              String      @id @default(uuid())
  roomId          String
  status          MatchStatus @default(ACTIVE)
  playerCount     Int
  rulesVersion    String      @db.VarChar(32)
  seed            String?     // never sent to clients while active
  state           Json?       // recovery snapshot (server-only)
  winnerTeamId    Int?
  startingSeat    Int         @default(0)
  moveCount       Int         @default(0)
  turnCount       Int         @default(0)
  createdAt       DateTime    @default(now())
  startedAt       DateTime    @default(now())
  endedAt         DateTime?

  room      GameRoom      @relation(fields: [roomId], references: [id], onDelete: Cascade)
  histories GameHistory[]

  @@index([roomId, status])
  @@index([status, startedAt])
}

model GameHistory {
  id          String   @id @default(uuid())
  matchId     String
  userId      String
  seat        Int
  teamId      Int
  won         Boolean
  marblesHome Int      @default(0)
  captures    Int      @default(0)
  moves       Int      @default(0)
  cardsPlayed Int      @default(0)
  createdAt   DateTime @default(now())

  match GameMatch @relation(fields: [matchId], references: [id], onDelete: Cascade)
  user  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([matchId, userId])
  @@index([userId, createdAt])
}

model PlayerStatistics {
  userId           String   @id
  gamesPlayed      Int      @default(0)
  gamesWon         Int      @default(0)
  marblesHome      Int      @default(0)
  captures         Int      @default(0)
  moves            Int      @default(0)
  cardsPlayed      Int      @default(0)
  totalPlaySeconds Int      @default(0)
  updatedAt        DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## 3. Redis runtime model

```ts
interface RoomRuntime {
  code: string;
  hostId: string;
  playerCount: 4 | 6 | 8;
  status: 'waiting' | 'playing' | 'finished';
  rulesVersion: string;
  settings: RoomSettings;
  players: RoomPlayerRuntime[];   // seat, team, ready, connected
  game: GameState | null;         // full engine state incl. hands/deck — never broadcast raw
  currentMatchId: string | null;
  result: StoredMatchResult | null;
  recentActionIds: string[];      // last 200 for idempotency
  connections: Record<string, string>; // userId -> socketId
  createdAt: string;
  updatedAt: string;
}
```

`RoomRuntime` is stored as JSON at `jackaroo:room:{CODE}` with a 24 h sliding TTL. A compare-and-set Redis lock serializes mutations across API instances. DB snapshots at every accepted action are asynchronous and lossy-by-design; Redis is the realtime source of truth.

## 4. Indexing rationale

- `GameRoom.code` unique for join lookups.
- `GameRoom(status, updatedAt)` for janitor/cleanup and lobby admin.
- `GamePlayer(roomId, userId)` unique prevents double-seating.
- `GameMatch(roomId, status)` for reconnect lookup of the active match.
- `GameHistory(userId, createdAt)` for profile/history pages.
- `AuthSession(jti)` unique for JWT revocation; `expiresAt` for cleanup.

## 5. Retention

- Waiting rooms: Redis TTL 24 h; DB CLOSED via janitor after 24 h.
- Active match: Redis TTL refreshed on every action; no hard timeout while at least one participant reconnects within TTL.
- Finished match: durable forever (history); summaries exposed only to participants.
- Expired auth sessions: cleaned daily.
- No animation/UI state is persisted.
