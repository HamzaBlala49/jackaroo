# Jackaroo Online

A production-ready, real-time multiplayer Jackaroo board game for **4, 6 or 8 friends**.
Private rooms, server-authoritative rules, private hands, a hand-drawn SVG table,
and full match persistence.

```text
Create a room → share a 6-character code → ready up → race your marbles home.
```

---

## Highlights

- **Multiplayer only** — no bots, no solo mode, no pass-and-play.
- **4 / 6 / 8 players** — two per team, teammates seated diametrically opposite.
- **Server-authoritative engine** — every shuffle, deal, move, capture and winner is
  validated on the server. Clients only ever submit intent (`marbleId`, `steps`).
- **Private hands** — each socket receives a personalized snapshot. Other players only
  see a card count. The deck and every opponent hand never leave the server.
- **Reconnect anywhere** — refresh, drop Wi-Fi, or swap devices. The seat, hand and
  board are restored from Redis (with a durable Postgres snapshot as fallback).
- **Beautiful board** — one normalized SVG geometry (72-cell ring, private home lanes,
  lacquered base docks) shared by the renderer and the rules engine.
- **Responsive** — desktop command center, tablet board, phone-first bottom hand tray.
- **Durable results** — final scores, per-player statistics and lifetime records are
  stored in PostgreSQL the moment a team wins.
- **Rematch** — the host can reopen the same table with the same seats in one click.

---

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui primitives, Zustand, TanStack Query, Socket.IO, Motion |
| Backend | NestJS 12, Socket.IO gateway, PostgreSQL 18, Prisma 6, Redis 8 (rooms, locks, adapter), JWT httpOnly guest sessions |
| Game | Framework-independent TypeScript engine + shared board geometry + shared rule config |
| Tooling | pnpm workspaces, Turborepo, Vitest, shared ESLint flat config |

---

## Repository layout

```text
apps/
  web/                 Next.js client
  api/                 NestJS REST + Socket.IO server
packages/
  game-types/          Shared types, socket contracts, zod schemas, error codes
  game-config/         Default rulebook, card map, team palettes, room defaults
  game-board/          Board topology + normalized SVG geometry (no React)
  game-engine/         Pure rules engine (no React, no Next, no Nest)
  shared-utils/        Seeded RNG, room codes, formatting helpers
  eslint-config/       Shared flat-ESLint baseline
docs/                  Architecture, rulebook, data model, socket protocol, roadmap
```

Dependency direction is acyclic:

```text
shared-utils ─┐
game-types ───┼──> game-config ──> game-board ──> game-engine ──> apps/api
              │                                          │
              └──────────────────────────────────────────┴──> apps/web
```

---

## Quick start (local)

### 1. Requirements

- Node 22+
- pnpm 10 (`corepack enable`)
- PostgreSQL 18
- Redis 8

### 2. Install

```bash
corepack enable
pnpm install
```

### 3. Configure

Copy the examples and fill in real values:

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
```

`apps/api/.env`

```env
NODE_ENV=development
API_PORT=4000
WEB_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/jackaroo?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=<openssl rand -base64 48>
JWT_EXPIRES_DAYS=30
COOKIE_SECURE=false
```

`apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Database

```bash
pnpm db:generate   # generate the Prisma client
pnpm db:migrate    # create/apply migrations
```

### 5. Run

```bash
pnpm dev           # API on :4000 and Web on :3000 (Turborepo, parallel)
```

Open <http://localhost:3000>, pick a name, create a room, and share the code.

---

## Quick start (Docker)

```bash
JWT_SECRET=$(openssl rand -base64 48) docker compose up --build
```

- Web: <http://localhost:3000>
- API: <http://localhost:4000>
- Health: <http://localhost:4000/health>

`docker compose` starts PostgreSQL, Redis, the API (with `prisma migrate deploy`)
and the web app.

---

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run API + Web in watch mode |
| `pnpm build` | Build every workspace package and app |
| `pnpm test` | Engine unit tests + full multiplayer API integration tests |
| `pnpm typecheck` | Strict TypeScript across the monorepo |
| `pnpm lint` | ESLint across the monorepo |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Create/apply dev migrations |
| `pnpm db:deploy` | Apply migrations in production |
| `pnpm db:studio` | Open Prisma Studio |

---

## How a match works

1. **Create a room** — the host picks 4, 6 or 8 seats. The server mints a
   six-character code and an invitation link.
2. **Fill the table** — friends open the link and are seated automatically. Teams
   alternate by seat, so teammates always sit opposite each other.
3. **Ready + start** — the host can start once every seat is filled, connected and
   ready. The server creates the deck with a fresh random seed and deals four cards
   to each player.
4. **Play** — select a card; the board highlights every marble the server will allow.
   Aces/Kings enter, the court moves, Jacks swap, the 7 opens a split-step panel, the
   4 walks backwards. Illegal moves never reach the board.
5. **Win** — the first team with all eight marbles home wins immediately. Final
   statistics are persisted, the podium screen appears, and the host can rematch.

Full rulebook: [`docs/02-rules.md`](docs/02-rules.md) and `/rules` in the app.

---

## Architecture in one page

- The **engine** (`packages/game-engine`) is pure TypeScript: no React, no Next, no
  Nest. It owns the deck, legal-action generation, captures, safe cells, home entry,
  split 7, swaps, team assistance and win detection.
- The **board package** (`packages/game-board`) produces the same topology and
  normalized 1000×1000 geometry for the renderer and the engine. Board coordinates
  are never duplicated in UI code.
- The **API** is the single source of truth. Every mutating socket event:
  authenticates → validates payload → takes a Redis room lock → checks membership and
  turn → runs the engine → persists the snapshot → broadcasts personalized state.
- The **web client** mirrors server snapshots in Zustand and renders. It never
  computes game outcomes; local previews only ever replay server-provided legal
  actions.

More detail:

- [`docs/01-architecture.md`](docs/01-architecture.md)
- [`docs/02-rules.md`](docs/02-rules.md)
- [`docs/03-data-model.md`](docs/03-data-model.md)
- [`docs/04-socket-protocol.md`](docs/04-socket-protocol.md)
- [`docs/06-board-geometry.md`](docs/06-board-geometry.md)

---

## Testing

- **Engine (`packages/game-engine`)** — 80 tests covering every card, every player
  count, captures, safe cells, home entry, split 7, swaps, assistance, forced
  discards, round rotation and full deterministic 4/6/8-player match simulations.
- **API (`apps/api`)** — 10 integration tests running a real NestJS server with real
  sockets and a real Postgres test database: auth, room lifecycle, privacy redaction,
  out-of-turn/duplicate/unauthorized actions, reconnection, database recovery and a
  complete played match with persisted results and rematch.

```bash
pnpm test
```

---

## Deployment notes

- Set `COOKIE_SECURE=true` when serving over HTTPS.
- Set `WEB_ORIGIN` to the exact public origin of the web app (CORS + Socket.IO).
- Set `NEXT_PUBLIC_API_URL` at web **build time** to the public API origin.
- Run Redis with AOF persistence so room snapshots survive restarts.
- Apply migrations with `pnpm db:deploy` (or the API container entrypoint).
- `GET /health` reports DB and Redis status for load balancers.

---

## Security summary

- httpOnly, SameSite=Lax JWT session cookie; rotating server-side session records.
- Every socket event validates JWT, room membership, seat, turn, phase and payload.
- Zod schemas on every REST body and socket payload.
- Rate limits on guest creation, room creation/joining and gameplay actions.
- Room-level Redis locks prevent concurrent state mutations.
- Helmet, strict CORS, no secrets in client bundles, parameterized Prisma queries.

---

## License

Private project. All rights reserved.
