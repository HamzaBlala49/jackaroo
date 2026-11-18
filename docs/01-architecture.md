# Jackaroo Online — Architecture (Phase 1)

> Status: approved baseline for implementation. Last updated: 2026-11-18.

## 1. Goals and product shape

Jackaroo Online is a private-room, real-time, server-authoritative board game for exactly 4, 6 or 8 players (two per team). There is no single-player, bot, hot-seat or offline mode.

The product has four surfaces:

1. **Landing / onboarding** — brand, rules, guest identity.
2. **Room lobby** — create/join a private room with a 6-character code, ready up, start.
3. **Live match** — an SVG board, personal hand, legal-move guidance, activity log, presence.
4. **Results** — winning team, full player statistics, rematch / lobby.

## 2. Technology decisions

| Concern | Choice | Notes |
| --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo | Shared packages compiled with `tsc` to CJS + declarations. |
| Frontend | Next.js 16 App Router, React 19, TypeScript strict | Client-heavy game shell; pages are mostly client components because the match is real-time. |
| Styling | Tailwind CSS v4 + shadcn/ui primitives | Custom board-game design tokens, Radix behavior, no dashboard aesthetics. |
| Client state | Zustand (live match snapshot + UI) + TanStack Query (REST/auth/history) | The authoritative snapshot is never derived on the client. Zustand mirrors server snapshots and owns UI-only state. |
| Realtime | Socket.IO 4 | Typed events, acknowledgements, auto-reconnect. |
| Backend | NestJS 12 + Socket.IO gateway | REST for auth/history/health, sockets for room + match. |
| Database | PostgreSQL 18 + Prisma 6 | Users, sessions, rooms, matches, per-player history and lifetime stats. |
| Coordination | Redis 8 | Active room snapshots, presence, distributed room locks, Socket.IO adapter. |
| Game engine | Pure TypeScript package | No React/Next/Nest imports. Deterministic with an injected seed. |
| Board model | Pure TypeScript package | One source of truth for topology **and** SVG coordinates. |
| Tests | Vitest (engine/server), Playwright (UI) | Full-match server integration test drives legal actions only. |
| Animations | Motion for React | SVG marbles, cards, dialogs, victory. Reduced-motion support. |
| Sound | Web Audio synthesis | No binary assets, opt-out by default. |

### Why these versions

- Next.js 16.4 + React 19.
- NestJS 12.5 (current major).
- Prisma 6.19 (stable API; Prisma 7/8 are newer but introduce config/client changes not needed here).
- TypeScript 5.9 (stable tooling support across Next/Nest/Vitest).

## 3. Repository layout

```text
jackaroo/
├── apps/
│   ├── web/                       # Next.js App Router UI
│   └── api/                       # NestJS REST + Socket.IO backend
├── packages/
│   ├── game-types/                # Types, DTO schemas, socket contracts, error codes
│   ├── game-config/               # Default rules, card map, teams/colors, room defaults
│   ├── game-board/                # Board topology + normalized SVG geometry
│   ├── game-engine/               # Deterministic rules engine, views, legal actions
│   ├── shared-utils/              # Seeded RNG, room codes, time/format helpers
│   └── eslint-config/             # Shared lint config
├── docs/
├── e2e/                           # Playwright (or apps/web/e2e)
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

Dependency direction is strictly acyclic:

```text
shared-utils ─┐
game-types ───┼──> game-config ──> game-board ──> game-engine ──> apps/api
              │                                          │
              └──────────────────────────────────────────┴──> apps/web
```

- `game-engine` must never import from `apps/*`.
- `game-board` has no rendering framework dependency; it exports normalized geometry and pure helpers. React SVG components in `apps/web` consume it.
- `game-types` is the single contract shared by frontend and backend.
- The web client imports the engine for local previews and animation path calculation only. The server re-validates every action; a client preview never mutates the authoritative match.

## 4. Runtime topology

```text
Browser (Next.js)
  │  REST  /auth, /rooms, /matches, /health
  │  WS    /game  (Socket.IO)
  ▼
NestJS API ── Prisma ── PostgreSQL
  │      └── Redis adapter / room snapshots / locks / presence
  │
  └── game-engine (pure, in-process)
```

Single API instances are fully supported. Horizontal scaling is supported by:

- `@socket.io/redis-adapter` for cross-instance broadcasts.
- A Redis room lock around every state mutation, so two actions for one room cannot interleave.
- Full room snapshots in Redis (including game state).
- Personalized emission per socket ID.
- A short DB snapshot after each accepted action, enabling recovery even if Redis is lost.

Sticky sessions are recommended for raw WebSocket fallback but not required with the Redis adapter and WebSocket transport.

## 5. Authoritative match pipeline

Every mutation follows the same sequence:

```text
socket event (actionId + payload)
  → JWT/room membership check
  → payload schema check (zod)
  → acquire room lock
  → load room runtime (Redis)
  → idempotency check (actionId)
  → engine validates & applies against full server state
  → persist room snapshot (Redis, TTL) + async DB snapshot
  → release lock
  → emit personalized `game:state` to each seat
  → emit public `game:feed` events for animation/sound
  → send typed ack to actor
```

Rules enforced server-side:

- Correct user, room, seat, team, turn and phase.
- Card belongs to the acting hand.
- Action is in the engine-generated legal action set.
- Deck, shuffle, deal and reshuffle happen only server-side.
- Captures, home entry, finishes and winner are engine results.
- `actionId` (UUID per client intent) is stored with the last N accepted IDs per room for idempotent retries.
- Clients never submit positions or a modified game state; they submit an intent (`marbleId`, optional target, split steps).

### Private information

`GameState` (with all hands and deck) is only held by the server and Persistence. Broadcast payloads are generated per viewer via `toPlayerView(state, playerId)`:

- Own hand is present.
- Other hands are only counts.
- Deck order is never present.
- Legal actions are included only for the current player.
- The activity log only contains public facts (cards played/discarded, moves, captures, finishes).

## 6. Client state ownership

| State | Owner | Storage |
| --- | --- | --- |
| Auth user | TanStack Query (`/auth/me`) | httpOnly JWT cookie |
| Waiting room | Zustand room store (socket-fed) + REST fallback | memory |
| Live match snapshot | Zustand game store | memory, replaced atomically by server snapshots |
| Selected card / hover / preview split | Zustand UI store | memory |
| Sound + theme + reduced motion | small persisted UI store | localStorage |
| Match results | TanStack Query (`/matches/:id`) | memory |
| Last room code (resume) | localStorage | `jackaroo:lastRoom` |

The game store is a **server mirror**, not a source of truth. Socket snapshots always replace it. On reconnect, the client calls `room:join` with the URL code and the server resends the current state. Any optimistic animation is cosmetic and reconciles to the confirmed snapshot.

## 7. Room and match lifecycle

```text
WAITING ──(host start; full + all ready)──> PLAYING ──(team completes 8 marbles)──> FINISHED
   │                                            │
   │ leave / host leaves                        │ Redis TTL / abandoned
   ▼                                            ▼
CLOSED                                        ARCHIVED (DB)
```

- Waiting-room disconnect: 20 s grace, then seat release; host migration to next connected player.
- Active-match disconnect: player remains in the match indefinitely (within room TTL). Presence turns grey; turn does not auto-skip (v1 has no turn timer). Reconnect restores the exact snapshot.
- Server restart: Redis snapshot is the primary recovery source. If absent, the API can rebuild from the latest `GameMatch.state` DB snapshot.
- Room and active match snapshots use a 24 h TTL, refreshed on activity. Finished matches are durable in Postgres.
- Rematch: host can reopen the same room (players/seats retained, ready flags reset) after a finished match.

## 8. Reconnection design

1. Browser refresh → `/game/[code]` → auth via cookie → socket connect.
2. Socket provider emits `room:join { code }` automatically after connect if URL/localStorage has a room code.
3. Server sees the authenticated user already has a seat:
   - waiting: mark connected, resend `room:updated`;
   - playing/finished: update socket ID, resend personalized `game:state` or result;
   - not a member & playing: `ROOM_IN_PROGRESS` error.
4. Socket.IO client uses exponential backoff and jitter. The UI shows "Reconnecting…" and keeps the last confirmed board visible but disabled.
5. Actions are rejected while disconnected. On ack timeout, the client retries once with the **same** `actionId`, so the server can deduplicate.

## 9. Security

- Guest-first auth: a JWT (30 days) in an **httpOnly, SameSite=Lax** cookie; rotating session record (`AuthSession`) allows revocation. Secret exists only in API env. CORS allows only `WEB_ORIGIN` with credentials. Socket origin validation.
- No passwords in v1; the guest identity is deliberate to get friends into a private game quickly. The User/AuthSession model supports adding email/OAuth later without migration pain.
- Every socket event validates JWT, room membership, seating, turn, phase and intent.
- Zod schemas on every REST body and socket payload. Payload size limits; `maxHttpBufferSize`.
- Rate limit room create/join and auth at the HTTP/socket boundary. Unique room codes; codes use an unambiguous alphabet.
- Server never serializes `deck` or other players' hands.
- Prisma parameterized queries; secrets only server-side; Helmet headers; explicit CORS.
- Action IDs + room locks prevent duplicate/concurrent actions.
- Display names are trimmed, length-limited and rendered as text (never HTML).

## 10. Persistence

### Redis keys

| Key | Value | TTL |
| --- | --- | --- |
| `jackaroo:room:{CODE}` | Runtime room + latest `GameState` + connection map + recent action IDs | 24 h refreshed |
| `jackaroo:lock:room:{CODE}` | Random lock token (NX/PX) | 5 s |
| `jackaroo:socket:{socketId}` | `{ roomCode, userId }` lookup | socket lifetime |

### PostgreSQL

Durable entities: `User`, `AuthSession`, `GameRoom`, `GamePlayer`, `GameMatch`, `GameHistory`, `PlayerStatistics`.
Match state snapshots are written to `GameMatch.state` after accepted actions (best-effort, not in the critical path). Final results and lifetime aggregates are written transactionally when a match finishes.

## 11. Board model (summary)

One normalized 1000 × 1000 viewBox for every player count.

- 72-cell ring (divisible by 4, 6 and 8).
- 4-cell private home lane per player.
- 4 base sockets per player outside the ring.
- Starts are evenly distributed; teammates are always diametrically opposite (seat parity teams).
- Route is per owner: `ring[start … start+71]` then `home[0..3]`. Progress `0..75`.
- Start cells + four neutral star cells + all home lanes are protected.
- The board package produces cell centers, lane slots, base sockets, seat anchors and an SVG path for each route. The engine consumes the same `BoardModel` (topology only) for movement, safe checks and captures.

Full rationale and rule decisions: [`02-rules.md`](./02-rules.md).
Geometry details: [`06-board-geometry.md`](./06-board-geometry.md).

## 12. API surface (summary)

REST:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/guest` | Create/resume friendly guest identity; sets cookie |
| GET | `/auth/me` | Current user |
| POST | `/auth/logout` | Revoke session / clear cookie |
| GET | `/rooms/:code` | Public lobby snapshot (fallback / share preview) |
| GET | `/matches/:id` | Result + per-player stats (participants only) |
| GET | `/stats/me` | Lifetime stats |
| GET | `/health` | Liveness + DB/Redis status |

Socket namespace: `/game`. Event contracts: [`04-socket-protocol.md`](./04-socket-protocol.md).

## 13. Performance

- Board is one SVG with static defs; no hundreds of DOM nodes per cell. Marbles and interactive cells are the only animated/updated nodes.
- Zustand selectors per marble/hand card; no context value changes during a move.
- Personalized snapshots only to room sockets; public feed events are small.
- Engine clone is structural (`structuredClone`) and O(players × marbles × cards); negligible.
- Route precomputation in `game-board`; memoized per player count with `WeakMap`/module cache.
- Lazy-load the game route (Next dynamic + route-level code splitting), rules dialog, and results.
- Motion animations use transform/opacity; SVG filters are static (baked once). Reduced motion disables transitions.
- Images: no large raster assets required; only self-hosted variable fonts.

## 14. Testing strategy

1. **Engine unit tests (80)** — every card, counts 4/6/8, deck/deal/reshuffle, safe/capture, home exactness, split, swap, assistance, finish/win, invalid turns/actions, plus deterministic full-match simulations for 4, 6 and 8 players.
2. **API integration tests (10)** — guest auth, create/join/ready/start, private hand redaction, unauthorized/out-of-turn/duplicate actions, disconnect/reconnect, database recovery, a complete played match with persisted results, and rematch.
3. **Browser verification** — the flow (landing → onboarding → room → match → results → rematch, desktop and mobile) was validated manually against the running stack during development. An automated Playwright suite is deliberately deferred; it is an optional hardening step, not a v1 dependency, because the authoritative gameplay and multiplayer flows are already covered end to end by the tests above.
4. **Gate** — `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

## 15. Deployment

- Two containers (`web`, `api`) + PostgreSQL + Redis via `docker-compose.yml` for self-hosting.
- API migrates with `prisma migrate deploy` at release.
- Web uses Next standalone output; API uses Nest build.
- Env in `.env.example`; no secrets in client bundles. `NEXT_PUBLIC_*` contains only the public API origin.
- Healthchecks for DB/Redis; Redis AOF recommended for crash recovery.
- CI workflow: install, generate Prisma client, typecheck, engine/API tests, build. Playwright optional job.

## 16. Architectural decisions log

| # | Decision | Reason |
| --- | --- | --- |
| D1 | Circular 72-cell board for all player counts | Supports 4/6/8 cleanly, no duplicated rule/board code, premium visual identity. |
| D2 | Route is owner-relative (progress index) | Avoids ambiguous cell occupancy and makes home lanes/private safe logic trivial. |
| D3 | Atomic simple moves; incremental 7 | Split needs visual, validated steps; other cards commit atomically. |
| D4 | Personalized snapshots, never room-wide hands | Privacy by construction. |
| D5 | Guest JWT cookie | Frictionless friends-only games while retaining durable identity/stats. |
| D6 | Redis runtime + Postgres durable snapshots | Fast realtime with restart recovery. |
| D7 | Engine consumed by both sides | Instant legal-move previews and animation paths; server remains authoritative. |
| D8 | No turn timer in v1 | Avoids arbitrary autoplay decisions; room option reserved for a later release. |
