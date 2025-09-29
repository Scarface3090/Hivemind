
Backend Implementation Audit

Summary
- Implemented an Express + Redis backend under src/server/ that provides the endpoints required by the frontend store.
- Added shared type contracts under src/shared/types/ to keep client and server in sync.
- Created core services to manage drafts, games, guesses, feed, and reveal finalization.
- Responses and error codes match the expectations used in src/stores/gameStore.ts.

New files
- src/shared/types/game.ts
  - PublicGameData, GuessPublic, Spectrum, GamePhase.
- src/shared/types/api.ts
  - ErrorCode union; ApiErrorEnvelope; DraftResponse; CreateGameRequest; SubmitGuessRequest.
- src/shared/types/internal.ts
  - DraftRecord, GameRecord, GuessRecord (server storage schema).

- src/server/config.ts
  - Env-based configuration (PORT, REDIS_URL, CORS_ALLOW_ORIGIN, FEED_LIMIT, GAME_DURATION_MS).
- src/server/redis/client.ts
  - Redis client with lazy initialization and health check.
- src/server/errors.ts
  - Typed ApiError and err() mapper to HTTP statuses.
- src/server/utils/median.ts
  - medianInt helper (rounded for even counts).
- src/server/utils/mappers.ts
  - toPublicGame mapper controlling exposure of guesses and secret fields.
- src/server/services/spectrum.ts
  - getRandomPair and getSecretTarget.
- src/server/services/drafts.ts
  - createDraft(userId) -> stores DraftRecord with TTL and returns DraftResponse.
- src/server/services/games.ts
  - createGame(userId, body): consume draft, create GameRecord, add to feed.
  - getGame(gameId): lazy-finalize on expiry, return PublicGameData.
  - submitGuess(userId, gameId, body): validate range, enforce uniqueness, store guess.
  - finalizeGame(gameId): atomic phase flip, compute median.
  - listActiveGames(limit): newest-first feed listing.
- src/server/validation/schemas.ts
  - Zod schemas for request bodies and params.
- src/server/middleware/auth.ts
  - requireUser and attachOptionalUser using X-User-Id.
- src/server/middleware/validate.ts
  - validateBody/validateParams wrappers mapping to error codes.
- src/server/middleware/errors.ts
  - Global error handler that returns { ok:false, code, message }.
- src/server/routes/drafts.ts
  - POST /api/drafts
- src/server/routes/games.ts
  - POST /api/games, GET /api/games/:gameId, POST /api/games/:gameId/guesses
- src/server/routes/feed.ts
  - GET /api/feed
- src/server/index.ts
  - App bootstrap with health check, CORS, routes, error handler.

API behavior aligned with frontend
- POST /api/drafts
  - 200 -> { draftId, spectrum, secretTarget }
  - 401 -> UNAUTHORIZED
- POST /api/games
  - 200 -> PublicGameData (phase=GUESSING, guesses=[])
  - 400 -> CLUE_INVALID
  - 401 -> DRAFT_OWNERSHIP_MISMATCH
  - 404 -> DRAFT_NOT_FOUND
  - 409 -> DRAFT_CONSUMED (if applicable)
- GET /api/feed
  - 200 -> PublicGameData[] (GUESSING items have guesses=[])
- GET /api/games/:id
  - 200 -> PublicGameData; lazy finalizes to REVEAL when expired
  - 404 -> GAME_NOT_FOUND
- POST /api/games/:id/guesses
  - 200 -> { ok:true, guessCount }
  - 400 -> GUESS_OUT_OF_RANGE
  - 401 -> UNAUTHORIZED
  - 404 -> GAME_NOT_FOUND
  - 409 -> PHASE_INVALID or DUPLICATE_GUESS
  - 410 -> GAME_EXPIRED (finalizes and rejects)

How to run
- Set env:
  - REDIS_URL=redis://localhost:6379
  - CORS_ALLOW_ORIGIN=http://localhost:5173
  - PORT=8787
- Start the server process to serve API on http://localhost:8787.
- In the frontend, set VITE_API_BASE_URL=http://localhost:8787 to enable server mode.

Notes
- guesses are omitted during GUESSING for privacy and to match the current UX; included fully on REVEAL with secretTarget and medianGuess.
- Median is rounded to nearest integer for even counts.
- One-guess-per-user enforced with SET NX lock + TTL (2 days).
