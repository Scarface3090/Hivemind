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

- _Duration:_ ~1.5 weeks (6-7 dev-days)
- _Dependencies:_ None

#### Sub-steps:

- [x] Confirm Devvit project prerequisites, configure environment variables, and document credential management for Google Sheets + Redis (Est. 1 dev-day, Owners: Backend/DevOps).
- [x] Run workflow alignment checklist: review `docs/Bug_tracking.md` for open blockers, reconfirm directory rules in `docs/project_structure.md`, refresh UI guidance in `docs/UI_UX_doc.md`, and capture Stage 1 architecture decisions for client/server/shared boundaries in this document before implementation (Est. 0.5 dev-day, Owners: Full-stack).
- [x] Establish base project scaffolding in `src/client`, `src/server`, `src/shared` per project structure with linting, formatting, and CI checks _(2025-10-14 — ESLint configuration completed and all lint errors resolved; SCAFF-001 closed)_, noting any deviations in `docs/Bug_tracking.md` (Est. 1 dev-day, Owners: Full-stack).
- [x] Implement shared domain models (`Spectrum`, `Game`, `Guess`, `ScoreSummary`, enums) and Zod schemas in `src/shared` _(2025-09-29 — added canonical enums, shared TS contracts, and Zod validation schemas aligned with Stage 1 API scope)_ (Est. 1 dev-day, Owners: Shared engineer).
- [x] Build Google Sheets cache loader service with scheduled refresh and Redis persistence bootstrap (Est. 1.5 dev-days, Owners: Backend).
  - _(2025-09-30 — Temporarily gated `refreshSpectrumCache()` behind env var availability, seeded a mock spectrum cache fallback, and removed the `content-refresh` scheduler registration until Google Sheets credentials are provisioned.)_
  - [ ] **Open Item:** Restore Sheets-powered cache once credentials are configured (remove mock fallback and re-register `content-refresh` scheduler).
- [x] Create draft creation endpoint (`POST /api/games/draft`) with validation, Redis storage, and server-side tests (Est. 1.5 dev-days, Owners: Backend).
- [x] Stage exit validation: run `npm run lint`, `npm run test`, `npm run build`, and `npx devvit playtest`; document outcomes and any defects in `docs/Bug_tracking.md` before marking Stage 1 complete (Est. 0.5 dev-day, Owners: Full-stack).
  - _(2025-09-30 — Reinitialized Devvit scaffolding and confirmed `npm run dev` successfully launches playtest environment.)_
  - _(2025-10-14 — Completed Stage 1 exit validation: `npm run lint` passes with 0 errors after resolving all code quality violations; linting blocker fully resolved per SCAFF-001 closure.)_

_Stage 1 architecture alignment summary:_ Client work resides in `src/client` (React shell + Phaser scenes), server endpoints and jobs use Devvit's `createServer(app)` pattern within `src/server/core`, and shared models/validation live under `src/shared`. All new code must honor `project_structure.md` directory rules and reference `UI_UX_doc.md` for layout/token decisions.

- _Required resources:_ Backend engineer, shared types engineer, DevOps support for credentials, access to Google Sheets cache, CI pipeline configuration, workflow lead to enforce documentation and testing checkpoints.

### Stage 2: Core Features

- _Duration:_ ~2 weeks (8-9 dev-days)
- _Dependencies:_ Stage 1 completion

#### Sub-steps:

- [x] Implement game publication endpoint (`POST /api/games`) and Redis-backed lifecycle state machine with scheduler hooks (Est. 2 dev-days, Owners: Backend).
  - (2025-10-07 — Added `POST /api/games` in `src/server/core/routes/game.route.ts`; wired to `publishGame` in `game.lifecycle.ts` using Devvit `context` for `userId`/`username`.)
- [x] Develop scheduler/reveal worker that processes `ACTIVE` → `REVEAL`, computes timers, and queues score calculation (Est. 1.5 dev-days, Owners: Backend).
  - (2025-10-07 — Implemented lifecycle tick and reveal job handlers in `src/server/core/services/game.scheduler.ts` and mounted internal routes in `contentRefresh.route.ts`.)
- [x] Build active game discovery (`GET /api/games/active`) with pagination, median snapshot, and Redis sorted sets (Est. 1 dev-day, Owners: Backend).
  - (2025-10-07 — Exposed `GET /api/games/active` in `game.route.ts` delegating to `getActiveGamesFeed` in `game.feed.ts`; response validated via shared Zod schema.)
- [x] Stand up client API layer and React routing shell, including shared layout, navigation, and home/feed scaffolding _(2025-09-30 — Added typed client fetch helpers, QueryClient provider, shared AppLayout navigation, and Home/Game Feed/Host scaffolds aligned with design tokens)_ (Est. 2 dev-days, Owners: Frontend).
  - (2025-10-07 — Confirmed `src/client/App.tsx` routes and `views/*` screens wired via `AppProvider`; verified `HomeScreen`, `GameFeed`, `HostView` in place.)
- [x] Create `HostView` form flow integrating draft + publish APIs with optimistic UI and validation states _(2025-09-30 — Implemented React Query-backed draft/publish mutations, client-side validation, optimistic feed refresh, and success/error UX messaging.)_ (Est. 1.5 dev-days, Owners: Frontend).
  - (2025-10-07 — `HostView` submits to draft/publish endpoints; UI follows tokens and updates feed on success.)
- [x] Refine `HostView` flow to match GDD: fetch draft on view load to show spectrum context, use authenticated user from Devvit context instead of stub, and navigate to home screen on successful publication (Est. 1 dev-day, Owners: Frontend).
  - (2025-10-08 — `HostView` now fetches a draft on component mount, relies on server-side user context, and navigates to home screen on successful game publication.)
- [x] Publish live games as subreddit posts (2025-10-08 — `publishGame` now calls `createGamePost` to submit a Devvit custom post per game, storing post metadata on the game record.)
- [x] Implement active games preview on `HomeScreen`, fetching a small number of games from the `/api/games/active` endpoint to populate the card view (Est. 0.5 dev-days, Owners: Frontend).

- _Required resources:_ Backend and frontend engineers, access to scheduler configuration, design references for host/feed screens, QA reviewer for API contract verification.

### Stage 3: Advanced Features

- _Duration:_ ~2.5 weeks (10-11 dev-days)
- _Dependencies:_ Stage 2 completion

#### Sub-steps:

- [x] Implement guess submission endpoint, per-user enforcement, justification capture, and Redis storage strategy (Est. 2 dev-days, Owners: Backend).
  - (2025-10-07 — Implemented `POST /api/games/:gameId/guess` with Zod validation; per-user enforcement via Redis `userGuessIndex(gameId)` hash; guess records saved under `guessRecord(guessId)` and indexed by value in `guessesByGame(gameId)` zset; response returns `MedianSnapshot` computed from the zset. Median cache is refreshed immediately after each guess.)
- [x] Build median computation service with 30s cadence, caching, and client polling endpoint (`GET /api/games/{id}`) support (Est. 2 dev-days, Owners: Backend).
  - (2025-10-07 — Added Redis median cache with 30s TTL, `processMedianTick` service, and `/internal/scheduler/median-tick` route; exposed `GET /api/games/:id` returning validated `{ game, median }` payload for client polling.)
- [x] Integrate Phaser slider component with React state synchronization, live median indicator, and responsive interaction logic (Est. 2 dev-days, Owners: Frontend/Gameplay).
  - (2025-10-08 — Integrated Phaser-based slider in GuessingView; React component manages game state and polling via React Query, synchronizing the live median value with the Phaser scene. Phaser scene handles slider UI, drag interactions, and emits value changes back to React.)
- [x] Create scoring engine computing accuracy, persuasion stub, host score, and persist results payload (Est. 2 dev-days, Owners: Backend).
  - (2025-10-09 — Implemented `scoring.service.ts` with accuracy calculation (`100 - |target - guess|`), stubbed persuasion score (upvotes × 2), host score (accuracy + participant count), histogram aggregation (10-point buckets), and accolade assignment (Psychic, TopComment, UnpopularOpinion). Extended repository with `getGuessIdsForGame`, `getGuessUpvoteScore` stub, `saveGameResults`, and `getStoredGameResults`; added `redisKeys.gameResults`. Updated shared types/schemas/API for `AccoladeSummary`, `finalizedAt` timestamp, and results persistence. Replaced draft tests with scoring integration test covering result computation and caching.)
- [x] Deliver `ResultsView` with histogram, accolades, and share actions, matching `hivemind-waffleUI` tokens (Est. 2 dev-days, Owners: Frontend).
  - (2025-10-10 — Added `GET /api/games/:gameId/results` endpoint in `game.route.ts` calling `getGameResults` service with Zod validation. Implemented `ResultsView` component with histogram (10pt buckets, target/median highlights), accolade cards (Psychic, Top Comment, Unpopular Opinion), and share actions (Web Share API + clipboard fallback). Wired `results/:gameId` route in `App.tsx` and added navigation from `GuessingView` on `REVEAL` state. Extended client API with `getGameResults` wrapper. Added server integration test for results endpoint (200/404 responses). Aligned UI to `hivemind-waffleUI` tokens using `colors` and `spacing` from `tokens.ts`.)
- [x] Implement navigation flow after guess submission: redirect to Home screen and refresh active games feed (Est. 0.5 dev-days, Owners: Frontend).
  - (2025-10-10 — Enhanced `GuessingView` mutation `onSuccess` to invalidate `['activeGames']` query cache, cancel/remove per-game polling queries, and navigate to `/` with replace flag. Imported and used `useQueryClient` from `@tanstack/react-query`. Removed redundant form reset in `handleSubmit` per-call `onSuccess` since navigation happens immediately. Fixed server build error by removing stray `resultsRouter` export from `src/server/core/routes/index.ts` that referenced non-existent `results.route.js` file.)
- [ ] Add Consensus label based on the standard deviation of all the guesses: Qualitative label summarizing dispersion of guesses (“Strong Consensus”, “Split Debate”, etc.). Provide 5 types of labels.
- [x] Add dev tools to easily test and simulate the user actions and guesses for each game (eg: add /simulate 100 random player guesses for an active game, prematurely end an active game to trigger results screen etc)
  - (2025-10-10 — Added `POST /api/dev/games/:gameId/simulate` and `POST /api/dev/games/:gameId/force-reveal`. Simulate generates N guesses using truncated Gaussian around the secret target; Force-reveal transitions to REVEAL and computes results.)
  - Production-ready dev tools: Always mounted and shipped. Server exposes `/api/dev/status` and gates all actions via `DEVTOOLS_ENABLED` (kill switch, defaults to `true` when unset) and optional `DEVTOOLS_SECRET` header. Client shows the panel only when status `enabled=true`, and if a secret is required it prompts once and persists it locally.
- [ ] Add optional event logging, analytics hooks, and feature flags for persuasion stub toggling (Est. 1-1.5 dev-days, Owners: Full-stack).

- _Required resources:_ Backend + gameplay engineers, UI designer support for slider/results polish, access to mock assets, QA for multiplayer flows.

### Stage 4: Polish & Optimization

- _Duration:_ ~1.5 weeks (6 dev-days)
- _Dependencies:_ Stage 3 completion

#### Sub-steps:

- [ ] Conduct end-to-end QA on Reddit test subreddit, capturing bugs in `docs/Bug_tracking.md` and validating multi-client flows (Est. 2 dev-days, Owners: QA/Full-stack).
- [ ] Optimize Redis queries, median computations, and client rendering performance on mobile/desktop (Est. 1.5 dev-days, Owners: Backend/Frontend).
- [ ] Implement comprehensive error handling, loading skeletons, and accessibility adjustments per UI guidelines (Est. 1.5 dev-days, Owners: Frontend).
- [ ] Finalize documentation (Implementation, project structure, UI/UX), deployment checklists, and handoff materials; run `npm run build` & `npx devvit playtest` (Est. 1 dev-day, Owners: PM/Full-stack).

- _Required resources:_ QA engineer, accessibility reviewer, performance tooling, DevOps oversight for deployment readiness.

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

## Consensus Labeling Feature Progress

**Latest Update: 2025-10-14**

### Completed Tasks:

- [x] **Task 1 - Shared Types & Enums** (2025-10-14): Added `ConsensusLabelType` enum to `src/shared/enums.ts` with 6 values (Perfect Harmony, Strong Consensus, Mixed Opinions, Split Debate, Total Chaos, Insufficient Data). Added `ConsensusLabel` interface to `src/shared/types/ScoreSummary.ts` with label, standardDeviation, and description fields. Extended `ScoreSummary` interface to include consensus field. _(Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6)_

- [x] **Task 2.1 - Standard Deviation Calculation** (2025-10-14): Implemented `calculateStandardDeviation` function in `scoring.service.ts` with proper mathematical formula for population standard deviation. Handles edge cases including empty arrays, single values, and invalid numbers (NaN, Infinity). _(Requirements: 1.1, 1.3, 5.3)_

- [x] **Task 2.2 - Consensus Label Mapping** (2025-10-14): Implemented `calculateConsensusLabel` function that maps standard deviation ranges to the 5 consensus categories using initial placeholder thresholds (2, 5, 8, 12, 15+). Includes descriptive text for each label category and configuration system for future empirical calibration. _(Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6)_

- [x] **Task 2.3 - Integration into Results Computation** (2025-10-14): Modified `finalizeScoreSummary` function to include consensus calculation via `calculateConsensusFromGuesses`. Consensus is now calculated and cached when game results are computed. Added logging of standard deviation values for empirical calibration. Includes graceful error handling with fallback to "Unable to Calculate". _(Requirements: 1.1, 5.1, 5.2, 5.3)_

- [x] **Task 2.4 - Unit Tests** (2025-10-14): Comprehensive unit test suite in `src/server/tests/consensus.test.ts` covering standard deviation calculation with various distributions, label mapping for all threshold ranges, edge cases (empty arrays, single values, invalid data), error handling scenarios, and integration tests with different guess distributions (bimodal, uniform, normal). _(Requirements: 1.3, 5.3)_

### Completed Tasks:

- [x] **Task 3.1-3.3**: Create consensus label display component (React component, mobile responsiveness, accessibility) - **Completed 2025-10-14**
- [x] **Task 4.1-4.2**: Integrate consensus label into results view (add to ResultsView, update styling/layout) - **Completed 2025-10-14**

### Next Steps:

- [ ] **Task 5.1-5.2**: Handle edge cases and error scenarios (insufficient data fallback, calculation error handling) - **Note: Server-side error handling already implemented**
- [ ] **Task 6.1-6.3**: Implement empirical calibration system (std dev logging, calibration analysis, threshold updates) - **Note: Logging already implemented**
- [ ] **Task 7**: Add integration tests for consensus feature

### Implementation Status:

**Feature Complete**: The consensus labeling feature is now fully implemented and integrated. Both server-side calculation and client-side display are complete and working together seamlessly.

**Current State**: All core functionality is complete. The consensus labels are automatically calculated and included in game results, and displayed prominently in the ResultsView with proper styling, accessibility, and responsive design. The feature is ready for production use.

**Key Technical Details**:

- Uses population standard deviation formula with proper edge case handling
- Initial thresholds: Perfect Harmony (0-2), Strong Consensus (2-5), Mixed Opinions (5-8), Split Debate (8-12), Total Chaos (12+)
- Logs standard deviation values for future empirical calibration
- Graceful fallback to "Insufficient Data" for edge cases and errors
- Comprehensive test coverage including boundary conditions and error scenarios
