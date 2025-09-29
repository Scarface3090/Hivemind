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
- [ ] Establish base project scaffolding in `src/client`, `src/server`, `src/shared` per project structure with linting, formatting, and CI checks (Est. 1 dev-day, Owners: Full-stack).
- [ ] Implement shared domain models (`Spectrum`, `Game`, `Guess`, `ScoreSummary`, enums) and Zod schemas in `src/shared` (Est. 1 dev-day, Owners: Shared engineer).
- [ ] Build Google Sheets cache loader service with scheduled refresh and Redis persistence bootstrap (Est. 1.5 dev-days, Owners: Backend).
- [ ] Create draft creation endpoint (`POST /api/games/draft`) with validation, Redis storage, and server-side tests (Est. 1.5 dev-days, Owners: Backend).

- *Required resources:* Backend engineer, shared types engineer, DevOps support for credentials, access to Google Sheets cache, CI pipeline configuration.

### Stage 2: Core Features

- *Duration:* ~2 weeks (8-9 dev-days)
- *Dependencies:* Stage 1 completion

#### Sub-steps:

- [ ] Implement game publication endpoint (`POST /api/games`) and Redis-backed lifecycle state machine with scheduler hooks (Est. 2 dev-days, Owners: Backend).
- [ ] Develop scheduler/reveal worker that processes `ACTIVE` → `REVEAL`, computes timers, and queues score calculation (Est. 1.5 dev-days, Owners: Backend).
- [ ] Build active game discovery (`GET /api/games/active`) with pagination, median snapshot, and Redis sorted sets (Est. 1 dev-day, Owners: Backend).
- [ ] Stand up client API layer and React routing shell, including shared layout, navigation, and home/feed scaffolding (Est. 2 dev-days, Owners: Frontend).
- [ ] Create `HostView` form flow integrating draft + publish APIs with optimistic UI and validation states (Est. 1.5 dev-days, Owners: Frontend).

- *Required resources:* Backend and frontend engineers, access to scheduler configuration, design references for host/feed screens, QA reviewer for API contract verification.

### Stage 3: Advanced Features

- *Duration:* ~2.5 weeks (10-11 dev-days)
- *Dependencies:* Stage 2 completion

#### Sub-steps:

- [ ] Implement guess submission endpoint, per-user enforcement, justification capture, and Redis storage strategy (Est. 2 dev-days, Owners: Backend).
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

