# Jackaroo Online — Implementation Roadmap

> Status: **v1 shipped.** Last updated: 2026-11-18.
> Automated coverage: 80 engine tests + 10 multiplayer/API integration tests.
> Browser E2E was validated manually during development; a Playwright suite remains
> an optional future hardening step, not a v1 blocker.

Each phase had a hard verification gate. A phase was not “done” because screens
existed; it was done when its tests passed and its output was wired into the next phase.

## Phase 1 — Research, rules and architecture ✅

- [x] Inspect empty repository and toolchain.
- [x] Define default rules + explicit regional variations + review flags.
- [x] Define normalized board geometry for 4/6/8.
- [x] Define data model, socket contracts, authoritative pipeline, recovery.
- [x] Decide stack, package boundaries, state ownership, security.
- **Gate:** documents reviewed; no UI generated yet.

## Phase 2 — Pure game engine ✅

- [x] Scaffold monorepo + shared packages.
- [x] `game-config`: rules, card map, teams/colors, room defaults.
- [x] `game-board`: topology + normalized geometry + route helpers.
- [x] `game-types`: state, action, view, socket, error contracts.
- [x] `game-engine`: creation/deal, legal actions, all card effects, captures, safe
      cells, home, split, swap, assist, turn/round/win, deterministic RNG, views.
- [x] Unit tests for all rules, player counts and full-match simulations.
- **Gate:** `pnpm --filter @jackaroo/game-engine test` — 80 passing.

## Phase 3 — Board UI ✅

- [x] Next.js shell, theme, fonts, shadcn primitives.
- [x] SVG board + 4/6/8 layouts, marbles, bases, home lanes, safe cells.
- [x] Motion: marble travel, card select/play, capture, turn, victory; reduced motion.
- [x] Hand, legal highlights, seven split UI, player chips/roster, activity rail,
      rules dialog.
- [x] Responsive desktop/tablet/mobile; mobile bottom play panel.
- **Gate:** visual QA at 390/768/1280/1440 px; typecheck green.

## Phase 4 — Backend + realtime ✅

- [x] NestJS app, config, Prisma schema/migrations.
- [x] Guest auth + httpOnly JWT + revocable sessions.
- [x] Redis room store/locks/presence, Socket.IO Redis adapter.
- [x] Room create/join/leave/ready/start/rematch/close.
- [x] Match start + engine integration + personalized snapshots.
- [x] All gameplay events, idempotency, server validation, persistence.
- [x] Reconnect grace, presence, recovery, host migration.
- [x] API integration tests, including a full played match.
- **Gate:** `pnpm --filter @jackaroo/api test` — 10 passing against real Postgres.

## Phase 5 — Complete gameplay ✅

- [x] Auth bootstrap + onboarding.
- [x] Landing → create/join → waiting room → live match.
- [x] Socket provider, action acks, retry/idempotency, reconnect UX.
- [x] Real private hands, real deck, real turn flow.
- [x] Results screen + rematch + history stats.
- **Gate:** 4 real browser sessions played a full match to the podium; 6- and 8-player
  creation/layout verified; engine simulations complete 4/6/8 matches.

## Phase 6 — Polish and production ✅

- [x] Error/loading/empty states, toasts, connection banner.
- [x] Rules page + in-game rules sheet.
- [x] Accessibility pass (keyboard, focus, contrast, aria-live).
- [x] Sound controls, theme toggle, reduced-motion.
- [x] Security/rate-limit/headers review; broadcast redaction audit.
- [x] Performance work (memoized static board, narrow selectors, payload redaction).
- [x] Dockerfiles, docker-compose, CI workflow, README, env docs.
- [ ] *Optional future hardening:* Playwright browser E2E suite, turn timer,
      spectator mode, public matchmaking.
- **Gate:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.

## Cross-cutting quality gates ✅

- Engine has no framework imports (`react`, `next`, `@nestjs/*`).
- No rule constants in React components.
- No board coordinate duplication: always `@jackaroo/game-board`.
- Every mutating event has a validation test for unauthorized/out-of-turn/duplicate.
- No raw engine state (deck/other hands) appears in emitted payloads; tested by
  serializing snapshots.
- Mobile has no horizontal page scroll; primary actions fit the viewport.
