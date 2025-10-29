# Project Context

## Purpose

**Hivemind** is a social guessing game built on Reddit's Devvit platform where players try to "read the host's mind" by guessing a secret target value on a dynamic spectrum (e.g., "Coffee ↔ Tea"). The game combines community discussion with interactive gameplay, making debate and consensus-building within Reddit comments part of the scoring system.

**Primary Goal**: Prove engagement with the core game loop, measured by the number of completed games (hosted → guessed → revealed).

**Core Gameplay**:
- **Hosts** create games with clues and secret targets on dynamic spectra
- **Players** click game posts and immediately start guessing using an interactive slider
- **Scoring** combines guessing accuracy with social influence (comment upvotes)
- **Results** show detailed analytics, consensus labels, and community accolades

## Tech Stack

**Platform**:
- Reddit Devvit (Node.js 22 serverless runtime)
- Custom Reddit post type with full-screen webview

**Frontend** (`/src/client`):
- React 18.3.1 - UI framework
- TypeScript 5.8.2 - Type safety
- Phaser 3.88.2 - Interactive game elements (sliders, histograms)
- React Router 6.29.0 - Client-side navigation
- TanStack React Query 5.60.5 - Server state management
- Tailwind CSS - Utility-first styling
- Vite 6.2.4 - Build tool

**Backend** (`/src/server`):
- Express 5.1.0 - Serverless API on Devvit runtime
- Redis - Data persistence and caching (via Devvit platform)
- Zod 3.23.8 - Runtime validation and schemas
- Node.js 22 - Runtime environment

**Shared** (`/src/shared`):
- TypeScript types - Game state, scoring, and API contracts
- Zod schemas - Validation for type safety
- Common utilities and constants

**Development Tools**:
- ESLint 9.23.0 + TypeScript ESLint 8.29.0 - Code linting
- Prettier 3.5.3 - Code formatting
- Vitest 3.1.1 - Testing framework
- TypeScript project references - Monorepo structure

## Project Conventions

### Code Style

**Formatting**:
- Prettier for automatic code formatting
- Runs via `npm run prettier` (also formats package.json)
- Integrated into `npm run check` workflow

**Linting**:
- ESLint with TypeScript ESLint recommended configs
- Project-aware TypeScript parser with `projectService: true`
- Key rules:
  - `@typescript-eslint/no-floating-promises: error` (server/client/shared)
  - `@typescript-eslint/no-unused-vars: off` (unused variables allowed)
  - Separate configs per directory (client/server/shared/tools)

**Naming Conventions**:
- **Components**: PascalCase (e.g., `GameFeed.tsx`, `SpectrumSlider.tsx`)
- **Services**: camelCase with `.service.ts` suffix (e.g., `content.service.ts`)
- **Types**: PascalCase matching the main type (e.g., `Game.ts`, `ScoreSummary.ts`)
- **Utilities**: camelCase with descriptive names (e.g., `index.ts`)
- **Tests**: Match source file name with `.test.ts` suffix
- **Routes**: RESTful naming (`/api/games/:gameId`)

**File Organization**:
- Client: React screens in `views/`, components in `components/`, Phaser scenes in `game/scenes/`
- Server: Routes in `core/routes/`, services in `core/services/`, Redis helpers in `core/redis/`
- Shared: Types in `types/`, schemas in `schemas.ts`, utilities in `utils/`

### Architecture Patterns

**Monorepo Structure**:
- Three primary layers: Client, Server, Shared
- TypeScript project references for type checking across boundaries
- Separate Vite configs for client and server builds
- Build output: `/dist/client` (React bundle) and `/dist/server` (Node CJS)

**Client Architecture**:
- React functional components with hooks
- Phaser 3 for interactive canvas elements (sliders, histograms)
- React Router for navigation
- React Query for server state and caching
- Mobile-first, vertical touch-screen optimized

**Server Architecture**:
- Express 5 serverless functions via `createServer(app)` from `@devvit/web/server`
- Service layer pattern: Business logic in `core/services/`
- Route handlers in `core/routes/` for API endpoints
- Redis access via Devvit's Redis helpers
- Background jobs via Devvit scheduler for game lifecycle

**Communication Patterns**:
- Client ↔ Server: HTTP requests via `fetch(/api/endpoint)`
- Data persistence: Redis through server-side services
- Shared logic: Import from `/src/shared` for common functionality

**State Management**:
- Server state: React Query (caching, background refetching)
- Local UI state: React hooks (useState, useContext)
- Game state: Redis-backed with lifecycle management
- Content state: Server startup initialization with Redis caching

### Testing Strategy

**Framework**: Vitest 3.1.1

**Test Structure**:
- Tests colocated with source files or in dedicated `tests/` directories
- Test files use `.test.ts` suffix matching source files
- Separate test suites: `tests/client/`, `tests/server/`, `tests/shared/`

**Testing Approach**:
- Unit tests for services and utilities
- Integration tests for API endpoints
- Component tests for React components
- Test coverage for critical game logic (scoring, lifecycle, validation)

**Run Tests**:
- `npm run test` - Run entire test suite
- Tests should pass before marking tasks complete

### Git Workflow

**Branching Strategy**:
- Current branch: `Visual-Redesign` (active feature branch)
- Feature branches for new capabilities
- Main/master for stable releases

**Commit Conventions**:
- Descriptive commit messages
- Include scope when relevant (client/server/shared)
- Reference related issues or PRs when applicable

**Pre-Commit**:
- Run `npm run check` before committing (type-check + lint + format)
- Ensure tests pass with `npm run test`
- Build succeeds with `npm run build` before deployment

## Domain Context

**Game States**:
- `DRAFT` - Host created but not yet published
- `ACTIVE` - Game is live and accepting guesses
- `REVEAL` - Game ended, results shown

**Content System**:
- 150 curated spectra embedded in application code
- 12 content categories: Movies, Food, Gaming, Technology, Social Media, Life Skills, Relationships, Lifestyle, Entertainment, Internet Culture
- Difficulty levels: Easy (65), Medium (52), Hard (30)
- Multi-tier fallback: Embedded CSV → Google Sheets (optional) → Hardcoded spectra

**Scoring System**:
- **Accuracy Score**: Distance from secret target value
- **Social Score**: Based on comment upvotes (Reddit integration)
- **Consensus Analysis**: Community agreement metrics
- **Accolades**: "Psychic", "Top Comment", "Unpopular Opinion"

**Game Flow**:
1. Host selects context & difficulty → Receives filtered spectrum + secret target → Adds clue → Publishes
2. Player clicks game post → Automatically routed to guessing interface → Sees median → Submits guess + justification → Automatic Reddit comment posting
3. Results: View accuracy scores → Social influence metrics → Community consensus → Accolades

**Direct Game Entry**:
- Context detection API (`/api/context`) identifies game context from Devvit post data
- Automatic routing: Active games → guessing interface, Ended games → results view
- Zero-friction entry: Click game post → immediately see appropriate interface

**Background Jobs**:
- `game-lifecycle-tick`: Cron job (`*/1 * * * *`) for game state transitions
- `game-reveal`: Scheduled task for game completion

## Important Constraints

**Platform Constraints**:
- Serverless environment: No file system dependencies, content must be embedded or fetched
- Redis only persistence: All game data stored in Redis via Devvit platform
- Reddit permissions: `SUBMIT_COMMENT` permission enabled for automatic comment posting
- Build output: Must target `/dist/client` and `/dist/server` as specified in `devvit.json`

**Technical Constraints**:
- Node.js 22+ required
- TypeScript strict mode enforced
- Mobile-first design: Optimized for vertical, touch-screen experience
- Serverless-compatible: No traditional file I/O, all content embedded or fetched from Redis/APIs

**Development Constraints**:
- Must use Devvit patterns: `createServer(app)` from `@devvit/web/server`, never direct Express server creation
- Must follow directory structure: Routes in `core/routes/`, services in `core/services/`
- Build before deploy: Always run `npm run build` before `npm run deploy`

**Content Constraints**:
- Content updates require code deployment (embedded CSV approach)
- Future migration planned to Redis-based dynamic content for hot reload capability

## External Dependencies

**Reddit/Devvit Platform**:
- Devvit runtime: Serverless Node.js environment
- Devvit context API: Access to `postData`, `userId`, `subredditName` for game context detection
- Reddit API: Comment posting for social integration
- Redis: Provided by Devvit platform for data persistence

**Optional External Services**:
- Google Sheets API: Optional content source (fallback tier, requires env vars):
  - `GOOGLE_SHEETS_API_KEY`
  - `GOOGLE_SHEETS_SPREADSHEET_ID`
  - `GOOGLE_SHEETS_RANGE`
  - `GOOGLE_SHEETS_CACHE_TTL_MINUTES`

**Development Services**:
- Reddit OAuth: Required for `devvit login`
- Devvit CLI: For `devvit playtest`, `devvit upload`, `devvit publish`

**No External Runtime Dependencies**:
- All game logic self-contained
- No external databases (Redis via Devvit only)
- No third-party game services
- Content embedded in application bundle
