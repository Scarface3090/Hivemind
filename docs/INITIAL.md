# Hivemind Vertical Slice PRD

## Purpose

Establish a shared plan to build the vertical slice described in `Hivemind_GDD.md` §6. The slice should deliver a single playable end-to-end round that validates the game loop, live median dynamics, and results reveal in both the Devvit app and companion web client.

## Scope

- **Included**
  - Core API surface (draft creation, game publication, active game retrieval, guess submission, results fetch).
  - Content ingestion from the Google Sheet CMS cache.
  - Redis-backed game lifecycle with `DRAFT`, `ACTIVE`, `REVEAL` states and timers.
  - Scoring engine (guessing + persuasion, host scoring) with Reddit upvote propagation stubbed or simulated if Reddit API access is unavailable locally.
  - Live median calculation on a cadence (< 30s) and push/pull to clients.
  - Client-facing UI flows: `HomeScreen`, `HostView`, `GameFeed`, `GuessingView`, `ResultsView` integrating Phaser slider.
  - Visual system parity with `hivemind-waffleUI` mock (colors, typography, icons, layout structure).
- **Out of Scope (Phase 2+)**
  - User profiles, achievements, persistent leaderboards.
  - Advanced content metadata (difficulty/category usage).
  - Reddit feed integration beyond mocked publishing.
  - Team play, alternate modes, social features.

## Success Criteria

- A host can create and publish a game, and the game transitions automatically from `DRAFT` → `ACTIVE` → `REVEAL` based on duration.
- At least two clients can submit guesses, see the live median update, and receive the reveal with scores.
- Results screen surfaces final target, median, host score, top guess stats, and awards.
- No manual data seeding required beyond the Google Sheet cache; restart-safe with Redis persistence.
- Client views match the `hivemind-waffleUI` reference implementation within acceptable pixel variance (fonts, color tokens, component hierarchy).

## Assumptions

- Users authenticate via Reddit accounts supplied by Devvit environment; user IDs + usernames available in request context.
- Redis is reachable via existing Devvit runtime bindings.
- Phaser/React integration pattern from prior Devvit apps applies.
- Background jobs can be implemented with serverless scheduled triggers or pollers.

## Dependencies

- Google Sheet credentials and URL for spectrum content.
- Reddit API token scope for reading comment upvotes (or mock until granted).
- Devvit runtime, Node environment, ESLint/Prettier configuration already in repo.

## Product Requirements

### 1. Content Drafting

- **User Story**: As a host, I need to receive a random spectrum with left/right labels when I start hosting.
- **Functional**
  - Endpoint `POST /api/games/draft` returns `draftId`, `spectrumId`, `leftLabel`, `rightLabel`, `secretTarget`.
  - Cache Google Sheet rows on server startup; refresh every 15 minutes.
  - Secret target randomly assigned (0–100) server-side.
- **Data**
  - Redis key `content:spectrums` for cached rows.
  - `draft:{draftId}` hash storing spectrum + secret target + host user.
- **Open Questions**
  - Do we accept difficulty/category filters in v1?

### 2. Game Publication & Lifecycle

- **User Story**: As a host, I publish a draft with a clue and duration so the community can play.
- **Functional**
  - Endpoint `POST /api/games` accepts `draftId`, `clue`, `durationMinutes` and transitions to `ACTIVE`.
  - Store metadata: `hostUserId`, `clue`, `startTime`, `endTime`, `state`, `spectrum`, `secretTarget`.
  - Scheduler transitions game to `REVEAL` at `endTime`; compute final scores.
- **Data**
  - Redis `game:{gameId}` hash for state; sorted sets for `games:active` ordered by `endTime`.
  - Event log list `game:{gameId}:events` for debugging (optional).
- **Open Questions**
  - Retry / idempotency strategy if publish request retries.

### 3. Game Discovery

- **User Story**: As a participant, I need to find active games.
- **Functional**
  - Endpoint `GET /api/games/active` returns paginated games with clue, host username, remaining time, median snapshot.
  - For Reddit feed path, ensure permalink includes `gameId` for direct load.
- **Data**
  - Use `games:active` sorted set; fall back to scanning if < 20 entries.

### 4. Guess Submission & Live Median

- **User Story**: As a guesser, I submit a slider position and justification, then see updated median.
- **Functional**
  - Endpoint `POST /api/games/{gameId}/guess` validates state `ACTIVE`, enforces one guess per user.
  - Store guess value, justification, timestamp.
  - Median service recalculates every 30s; push to clients via polling `GET /api/games/{gameId}`.
- **Data**
  - Redis `game:{gameId}:guesses` list or sorted set; per-user hash `guess:{gameId}:{userId}`.
- **Open Questions**
  - Should we support guess edits before reveal?

### 5. Scoring Engine

- **User Story**: As a player, I want scores that reflect accuracy and persuasion.
- **Functional**
  - On reveal, compute `guessingScore = 100 - abs(secretTarget - guess)`.
  - Fetch `persuasionScore` via Reddit comment upvotes (or stub value locally).
  - Host score uses final median and participant count.
- **Data**
  - Persist final scores in `game:{gameId}:results`.
- **Open Questions**
  - How to obtain comment IDs for guesses (integration with Reddit comment posting)?

### 6. Results Reveal

- **User Story**: As any viewer, I can load finished games and see outcomes and accolades.
- **Functional**
  - Endpoint `GET /api/games/{gameId}/results` returns target, median, guesses ordered by score, histogram data, accolades.
  - Results view highlights `The Psychic`, `Top Comment`, `Unpopular Opinion`, clue clarity rating.
- **Data**
  - Pre-compute histogram buckets (e.g., 10 increments).
- **Open Questions**
  - Minimum participant count to award certain accolades?

### 7. Client Experiences

- **HomeScreen**
  - Shows `Host Game`, `Join Game`. Use `GET /api/games/active` preview (top 3).
  - Mirror layout, typography, and styling from `hivemind-waffleUI/src/ui/MainMenuUI.tsx`.
- **HostView**
  - Form for clue + duration; on submit call draft then publish.
  - Reuse the mock's components and tokens to maintain consistent visual language.
- **GameFeed**
  - Card list with clue, host, timer, CTA to join.
  - Preserve card spacing, badge styling, and touch targets from the mock repository.
- **GuessingView**
  - Phaser slider synced with React state; show live median indicator.
  - Adopt slider skin, labels, and median indicator styling from the mock.
- **ResultsView**
  - Display reveal stats; allow share/replay link.
  - Match results panels, accolades icons, and consensus badges defined in the mock UI.

### 8. Shared Types & Validation

- Define TypeScript interfaces in `src/shared` (e.g., `Spectrum`, `Game`, `Guess`, `ScoreSummary`).
- Use Zod/Yup for request validation on server inputs.
- Centralize enums (`GameState`, `AccoladeType`).

## Implementation Plan

1. **Infrastructure & Content**
   - Set up shared types, Redis helpers, Google Sheet cache loader.
   - Implement draft creation endpoint + server tests.
2. **Game Lifecycle & Scheduler**
   - Publish endpoint, state machine, duration timers, reveal job.
3. **Guessing & Live Median**
   - Guess submission, median workers, API for polling.
4. **Scoring & Results**
   - Score calculation, accolades, results endpoint.
5. **Client UI Integration**
   - React + Phaser views, API hooks, optimistic states.
6. **Polish & QA**
   - Error handling, loading states, analytics/logging, smoke tests.

## Acceptance Tests (Happy Path)

1. Host starts draft → receives spectrum.
2. Host publishes with clue/duration → game appears in feed.
3. Two players join → submit guesses + justifications.
4. Median updates at least once while active.
5. After timer, results endpoint returns scores and accolades; Results UI renders same.

## Risks & Mitigations

- **Upvote dependency**: If Reddit API unavailable, use mock stub and flag to replace later.
- **Median accuracy**: Verify data structure (sorted vs list) supports fast median; consider maintaining two heaps.
- **Timer drift**: Use Redis TTLs or serverless scheduler to avoid relying on in-memory timers only.
- **Phaser integration**: Allocate time for React ↔ Phaser comms; reuse proven patterns.

## Open Questions

- How will guesses map to Reddit comments for persuasion scoring in MVP?
- What moderation controls are required before wider release?
- Are there accessibility requirements for the slider and color use?


