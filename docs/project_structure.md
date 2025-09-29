# Project Structure

## 1. High-Level Architecture

The Hivemind Vertical Slice follows the Devvit full-stack pattern with three primary layers deployed to Reddit:

- **Client (`/src/client`)** – React TypeScript shell hosting a Phaser canvas for gameplay surfaces (`GuessingView` slider, animations) alongside UI built from design system components.
- **Server (`/src/server`)** – Serverless backend built atop `@devvit/web/server`, exposing REST endpoints, orchestrating Redis-backed game lifecycle, and running scheduled jobs.
- **Shared (`/src/shared`)** – Common TypeScript models, enums, validation schemas, and utility helpers synced across client and server to guarantee contract alignment.

Build artifacts target `/dist/client` (Vite bundle) and `/dist/server` (Node CJS) as specified in `devvit.json` and Devvit deployment tooling.

## 2. File System Breakdown

### Root (`/`)

- `devvit.json` – Declares client/server entrypoints for Devvit runtime.
- `package.json` – Scripts for build (`npm run build`), linting, playtest, testing.
- `tsconfig.json` – Shared TypeScript configuration with path aliases for client/server/shared.
- `vite.config.ts` – Vite setup for React + Phaser bundling, output to `dist/client`.
- `vitest.config.ts` (add) – Test configuration referencing shared tsconfig.
- `.eslintrc.cjs`, `.prettierrc` – Code quality tooling.

### `/docs`

- `Implementation.md` – Live implementation plan (current document).
- `project_structure.md` – Current file.
- `UI_UX_doc.md` – Design standards, component guidelines.
- `Bug_tracking.md` – Log of defects and solutions.
- Supporting references (PRDs, GDD) remain read-only.

### `/src`

#### `/src/client`

- `main.tsx` – Client entry bootstrapping React app and Phaser game config.
- `App.tsx` – Top-level router and layout container.
- `index.css` – Tailwind base imports and global tokens.
- `views/`
  - `HomeScreen/HomeScreen.tsx`
  - `HostView/HostView.tsx`
  - `GameFeed/GameFeed.tsx`
  - `GuessingView/GuessingView.tsx`
  - `ResultsView/ResultsView.tsx`
- `components/` – Reusable UI elements (buttons, cards, timers, badges) implementing `hivemind-waffleUI` tokens.
- `hooks/` – Custom hooks for API polling, median subscription, game state handling.
- `api/` – Fetch wrappers mapping to server endpoints with shared types.
- `providers/` – Context providers (theme, game session, animation).
- `game/`
  - `index.ts` – Phaser game setup, scene registration.
  - `scenes/`
    - `BootScene.ts`
    - `PreloaderScene.ts`
    - `GuessingScene.ts`
  - `systems/` – Phaser utilities (slider control, median indicator).
- `styles/` – Tailwind config extensions, component-level styles if needed.
- `assets/` – Client-only static assets (icons, UI sprites) referencing `/public/assets` for runtime fetch.

#### `/public`

- `index.html` – Vite client shell.
- `assets/` – Images, spritesheets, audio used by Phaser scenes.
- `fonts/` – Custom font files aligned with visual system.

#### `/src/server`

- `main.ts` – Server entry using `createServer(app)` with route mounting and scheduled job registration.
- `core/`
  - `routes/`
    - `games.draft.route.ts`
    - `games.publish.route.ts`
    - `games.active.route.ts`
    - `games.guess.route.ts`
    - `games.byId.route.ts`
    - `games.results.route.ts`
  - `services/`
    - `content.service.ts`
    - `gameLifecycle.service.ts`
    - `guessing.service.ts`
    - `scoring.service.ts`
    - `results.service.ts`
  - `jobs/`
    - `contentRefresh.job.ts`
    - `revealScheduler.job.ts`
  - `redis/`
    - `client.ts` – Redis helper wrappers.
    - `keys.ts` – Centralized key factory.
  - `validation/`
    - Zod schemas for each endpoint.
- `middleware/` – Auth/context enforcement, error handler, logging.
- `utils/` – Common helpers (time, id generation, median calculation).
- `tests/` – Server integration tests mock Redis.

#### `/src/shared`

- `types/`
  - `Spectrum.ts`
  - `Game.ts`
  - `Guess.ts`
  - `ScoreSummary.ts`
- `enums.ts`
- `schemas.ts` – Zod definitions.
- `constants.ts` – Shared tokens, durations, poll intervals.
- `api.ts` – Typed endpoint definitions.

### `/tests`

- `client/` – Vitest + React Testing Library suites for views/components.
- `server/` – Unit/integration tests using supertest/mocks.
- `shared/` – Schema/type regression tests.

## 3. Configuration & Build

- **Environment Variables:**
  - `.env` / `.env.local` (excluded from repo) – Google Sheets credentials, Redis URL, feature flags.
  - Document variable usage in `/docs/Implementation.md` Stage 1.
- **Build Outputs:**
  - Client: `npm run build:client` emits to `dist/client`.
  - Server: `npm run build:server` emits to `dist/server`.
  - Combined `npm run build` ensures both.
- **Playtest:** `npx devvit playtest` consumes `/dist` artifacts.
- **Testing:** `npm run test`, `npm run test:watch` (Vitest), `npm run lint`.

## 4. Module & Component Hierarchy

- Client views import components and hooks; Phaser scenes communicate via shared context/events.
- Server routes delegate to services; services coordinate Redis helpers and shared validation.
- Shared types enforce request/response structure; clients import them for API wrappers and state typing.

## 5. Asset Organization

- UI tokens, colors, typography defined in `src/client/styles/tokens.ts` (or `tailwind.config.cjs`).
- Sprite assets stored in `public/assets/sprites/` with JSON atlases.
- Audio cues in `public/assets/audio/` with licensing notes.
- Icons exported from `hivemind-waffleUI` stored under `public/assets/icons/`.

## 6. Documentation Placement

- Implementation plan, structure, and UI/UX docs reside in `/docs`.
- Bug tracking and test plans appended as work progresses.
- README update references docs for onboarding.

## 7. Build & Deployment Flow

1. Develop features respecting `Implementation.md` checklists.
2. Run `npm run lint`, `npm run test`, `npm run build` locally.
3. Update `docs/Bug_tracking.md` with defects found.
4. Package via Devvit CLI (`npx devvit playtest`) using `dist` outputs.
5. Deploy to test subreddit, validate multi-client flows.

## 8. Environment-specific Configurations

- **Local Development:**
  - Use `.env.local` with mock Reddit API tokens, stubbed persuasion scoring toggle.
  - Start client via `npm run dev` (Vite) and server via `npm run dev:server` (if separate worker process). Devvit CLI proxies endpoints.
- **Staging/Test:**
  - Store secrets via Devvit Secrets manager.
  - Enable real median scheduler intervals, increase logging.
- **Production:**
  - Harden Redis TTL policies, enable analytics/telemetry hooks, and configure fallback content refresh frequency.


