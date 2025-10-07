# Implementation Plan for Hivemind Vertical Slice

## Feature Analysis

### Identified Features:

- Content drafting service that loads spectrum prompts from Google Sheets cache and issues drafts with hidden targets for hosts.
- Game lifecycle management covering draft publication, timed progression through `ACTIVE` and `REVEAL`, and scheduler-driven transitions.
- Active game discovery endpoint and client feed that surfaces live games with remaining time and median snapshot.
- Guess submission flow with Phaser slider UI, justification capture, median recalculation cadence, and client polling.
- Scoring engine combining accuracy and persuasion components, plus host score computation and results persistence.
- Results reveal experience exposing final target, median, accolades, histogram, and share actions.
- Client experiences for `HomeScreen`, `HostView`, `GameFeed`, `GuessingView`, and `ResultsView` aligned with `hivemind-waffleUI` visual system.
- Shared TypeScript contracts and validation utilities to keep client/server payloads consistent and safe.
- Observability and restart-safe Redis persistence with optional event logging for debugging.

### Feature Categorization:

- **Must-Have Features:** Content drafting API, game publication & timed lifecycle, active game discovery, guess submission with live median updates, scoring engine and results reveal, client views (Home, Host, Feed, Guessing, Results), shared types & validation, Redis-backed persistence and scheduler.
- **Should-Have Features:** Google Sheets refresh worker, optional event log stream, median calculation optimization, loading/error states in client, analytics hooks, admin utilities for debugging.
- **Nice-to-Have Features:** Reddit upvote integration for persuasion scoring beyond stubs, advanced moderation controls, adjustable difficulty/category filters, shareable permalink enhancements, optional histogram animations.

## Recommended Tech Stack

### Frontend:

- **Framework:** React 18 with Phaser 3 canvas integration – Rich UI shell plus high-performance game interactions, proven Devvit pattern.
- **Documentation:** https://react.dev & https://newdocs.phaser.io

### Backend:

- **Framework:** `@devvit/web/server` Express-compatible serverless runtime – Matches Devvit deployment, provides Redis/context bindings natively.
- **Documentation:** https://developers.reddit.com/docs/devvit/runtime/web

### Database:

- **Database:** Redis (Devvit managed) – Supports low-latency state transitions, sorted sets for scheduling, and persistence across restarts.
- **Documentation:** https://redis.io/docs

### Additional Tools:

- **Build Tool:** Vite – Fast TypeScript bundling for React/Phaser client; https://vitejs.dev/guide/
- **Validation:** Zod – Runtime schema validation shared across client/server; https://zod.dev
- **Testing:** Vitest + Testing Library – Lightweight unit/integration tests for TS + React; https://vitest.dev/docs/guide
- **Styling:** Tailwind CSS with design tokens – Rapid UI iteration aligned with mock tokens; https://tailwindcss.com/docs

## Implementation Stages

### Stage 1: Foundation & Setup

- *Duration:* ~1.5 weeks (6-7 dev-days)
- *Dependencies:* None

#### Sub-steps:

- [x] Confirm Devvit project prerequisites, configure environment variables, and document credential management for Google Sheets + Redis (Est. 1 dev-day, Owners: Backend/DevOps).
- [x] Run workflow alignment checklist: review `docs/Bug_tracking.md` for open blockers, reconfirm directory rules in `docs/project_structure.md`, refresh UI guidance in `docs/UI_UX_doc.md`, and capture Stage 1 architecture decisions for client/server/shared boundaries in this document before implementation (Est. 0.5 dev-day, Owners: Full-stack).
- [x] Establish base project scaffolding in `src/client`, `src/server`, `src/shared` per project structure with linting, formatting, and CI checks *(lint step pending due to ESLint configuration work; scaffolding decisions logged under Bug ID SCAFF-001)*, noting any deviations in `docs/Bug_tracking.md` (Est. 1 dev-day, Owners: Full-stack).
- [x] Implement shared domain models (`Spectrum`, `Game`, `Guess`, `ScoreSummary`, enums) and Zod schemas in `src/shared` *(2025-09-29 — added canonical enums, shared TS contracts, and Zod validation schemas aligned with Stage 1 API scope)* (Est. 1 dev-day, Owners: Shared engineer).
- [x] Build Google Sheets cache loader service with scheduled refresh and Redis persistence bootstrap (Est. 1.5 dev-days, Owners: Backend).
  - *(2025-09-30 — Temporarily gated `refreshSpectrumCache()` behind env var availability, seeded a mock spectrum cache fallback, and removed the `content-refresh` scheduler registration until Google Sheets credentials are provisioned.)*
  - [ ] **Open Item:** Restore Sheets-powered cache once credentials are configured (remove mock fallback and re-register `content-refresh` scheduler).
- [x] Create draft creation endpoint (`POST /api/games/draft`) with validation, Redis storage, and server-side tests (Est. 1.5 dev-days, Owners: Backend).
- [ ] Stage exit validation: run `npm run lint`, `npm run test`, `npm run build`, and `npx devvit playtest`; document outcomes and any defects in `docs/Bug_tracking.md` before marking Stage 1 complete (Est. 0.5 dev-day, Owners: Full-stack).
  - *(2025-09-30 — Reinitialized Devvit scaffolding and confirmed `npm run dev` successfully launches playtest environment.)*

*Stage 1 architecture alignment summary:* Client work resides in `src/client` (React shell + Phaser scenes), server endpoints and jobs use Devvit's `createServer(app)` pattern within `src/server/core`, and shared models/validation live under `src/shared`. All new code must honor `project_structure.md` directory rules and reference `UI_UX_doc.md` for layout/token decisions.

- *Required resources:* Backend engineer, shared types engineer, DevOps support for credentials, access to Google Sheets cache, CI pipeline configuration, workflow lead to enforce documentation and testing checkpoints.

### Stage 2: Core Features

- *Duration:* ~2 weeks (8-9 dev-days)
- *Dependencies:* Stage 1 completion

#### Sub-steps:

- [x] Implement game publication endpoint (`POST /api/games`) and Redis-backed lifecycle state machine with scheduler hooks (Est. 2 dev-days, Owners: Backend).
  - (2025-10-07 — Added `POST /api/games` in `src/server/core/routes/game.route.ts`; wired to `publishGame` in `game.lifecycle.ts` using Devvit `context` for `userId`/`username`.)
- [x] Develop scheduler/reveal worker that processes `ACTIVE` → `REVEAL`, computes timers, and queues score calculation (Est. 1.5 dev-days, Owners: Backend).
  - (2025-10-07 — Implemented lifecycle tick and reveal job handlers in `src/server/core/services/game.scheduler.ts` and mounted internal routes in `contentRefresh.route.ts`.)
- [x] Build active game discovery (`GET /api/games/active`) with pagination, median snapshot, and Redis sorted sets (Est. 1 dev-day, Owners: Backend).
  - (2025-10-07 — Exposed `GET /api/games/active` in `game.route.ts` delegating to `getActiveGamesFeed` in `game.feed.ts`; response validated via shared Zod schema.)
- [x] Stand up client API layer and React routing shell, including shared layout, navigation, and home/feed scaffolding *(2025-09-30 — Added typed client fetch helpers, QueryClient provider, shared AppLayout navigation, and Home/Game Feed/Host scaffolds aligned with design tokens)* (Est. 2 dev-days, Owners: Frontend).
  - (2025-10-07 — Confirmed `src/client/App.tsx` routes and `views/*` screens wired via `AppProvider`; verified `HomeScreen`, `GameFeed`, `HostView` in place.)
- [x] Create `HostView` form flow integrating draft + publish APIs with optimistic UI and validation states *(2025-09-30 — Implemented React Query-backed draft/publish mutations, client-side validation, optimistic feed refresh, and success/error UX messaging.)* (Est. 1.5 dev-days, Owners: Frontend).
  - (2025-10-07 — `HostView` submits to draft/publish endpoints; UI follows tokens and updates feed on success.)

- *Required resources:* Backend and frontend engineers, access to scheduler configuration, design references for host/feed screens, QA reviewer for API contract verification.

### Stage 3: Advanced Features

- *Duration:* ~2.5 weeks (10-11 dev-days)
- *Dependencies:* Stage 2 completion

#### Sub-steps:

- [ ] Implement guess submission endpoint, per-user enforcement, justification capture, and Redis storage strategy (Est. 2 dev-days, Owners: Backend).
  - (Not started as of 2025-10-07 — Stage 3 work is pending; no guess submission or results endpoints live yet.)
- [ ] Build median computation service with 30s cadence, caching, and client polling endpoint (`GET /api/games/{id}`) support (Est. 2 dev-days, Owners: Backend).
- [ ] Integrate Phaser slider component with React state synchronization, live median indicator, and responsive interaction logic (Est. 2 dev-days, Owners: Frontend/Gameplay).
- [ ] Create scoring engine computing accuracy, persuasion stub, host score, and persist results payload (Est. 2 dev-days, Owners: Backend).
- [ ] Deliver `ResultsView` with histogram, accolades, and share actions, matching `hivemind-waffleUI` tokens (Est. 2 dev-days, Owners: Frontend).
- [ ] Add optional event logging, analytics hooks, and feature flags for persuasion stub toggling (Est. 1-1.5 dev-days, Owners: Full-stack).

- *Required resources:* Backend + gameplay engineers, UI designer support for slider/results polish, access to mock assets, QA for multiplayer flows.

### Stage 4: Polish & Optimization

- *Duration:* ~1.5 weeks (6 dev-days)
- *Dependencies:* Stage 3 completion

#### Sub-steps:

- [ ] Conduct end-to-end QA on Reddit test subreddit, capturing bugs in `docs/Bug_tracking.md` and validating multi-client flows (Est. 2 dev-days, Owners: QA/Full-stack).
- [ ] Optimize Redis queries, median computations, and client rendering performance on mobile/desktop (Est. 1.5 dev-days, Owners: Backend/Frontend).
- [ ] Implement comprehensive error handling, loading skeletons, and accessibility adjustments per UI guidelines (Est. 1.5 dev-days, Owners: Frontend).
- [ ] Finalize documentation (Implementation, project structure, UI/UX), deployment checklists, and handoff materials; run `npm run build` & `npx devvit playtest` (Est. 1 dev-day, Owners: PM/Full-stack).

- *Required resources:* QA engineer, accessibility reviewer, performance tooling, DevOps oversight for deployment readiness.

## Resource Links

- Devvit Runtime: https://developers.reddit.com/docs/devvit/runtime/web
- Devvit Phaser Template: https://github.com/reddit/devvit-template-phaser
- Redis Official Docs: https://redis.io/docs
- Phaser 3 Docs: https://newdocs.phaser.io
- React Docs: https://react.dev
- Vite Guide: https://vitejs.dev/guide/
- Tailwind CSS Docs: https://tailwindcss.com/docs
- Zod Docs: https://zod.dev
- Vitest Docs: https://vitest.dev/docs/guide

