
/**
 * Minimal server entry (to be bundled to dist/server/index.cjs by tsup in Step 9).
 * Replace the placeholder handlers with real logic later.
 * This file intentionally avoids external deps for now.
 */

type Handler = (req: Request) => Promise<Response> | Response

// Simple router for same-origin requests (compatible with Devvit fetch handlers)
const routes: Record<string, Record<string, Handler>> = {
  POST: {},
  GET: {},
}

function json(data: unknown, init: ResponseInit = {}): Response {
  const body = JSON.stringify(data)
  return new Response(body, {
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  })
}

function notFound(): Response {
  return json({ ok: false, code: 'GAME_NOT_FOUND', message: 'Not found' }, { status: 404 })
}

function badRequest(message: string, code = 'UNKNOWN_ERROR', status = 400): Response {
  return json({ ok: false, code, message }, { status })
}

// In-memory stubs
const drafts = new Map<
  string,
  { draftId: string; spectrum: { left: string; right: string }; secretTarget: number; hostUserId: string; createdAt: number }
>()
const games = new Map<
  string,
  {
    gameId: string
    hostUserId: string
    phase: 'GUESSING' | 'REVEAL'
    spectrum: { left: string; right: string }
    clue: string
    guesses: { userId: string; guess: number; justification?: string; timestamp: number }[]
    createdAt: number
    endTime: number
    secretTarget: number
  }
>()

function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10)
}

// POST /api/drafts
routes.POST['/api/drafts'] = async (req) => {
  const userId = req.headers.get('x-user-id') || 'anon'
  // Pick a simple spectrum placeholder
  const spectrumList: Array<[string, string]> = [
    ['Comedy', 'Drama'],
    ['Spicy', 'Mild'],
    ['Casual', 'Formal'],
    ['Optimistic', 'Pessimistic'],
  ]
  const [left, right] = spectrumList[Math.floor(Math.random() * spectrumList.length)]
  const draftId = uid('d_')
  const secretTarget = Math.floor(Math.random() * 101)
  const record = {
    draftId,
    spectrum: { left, right },
    secretTarget,
    hostUserId: userId,
    createdAt: Date.now(),
  }
  drafts.set(draftId, record)
  return json({ draftId, spectrum: record.spectrum, secretTarget })
}

// POST /api/games
routes.POST['/api/games'] = async (req) => {
  const userId = req.headers.get('x-user-id') || 'anon'
  let body: any
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }
  const { draftId, clue } = body || {}
  if (!draftId || typeof clue !== 'string' || !clue.trim() || clue.length > 200) {
    return badRequest('Invalid draftId or clue', 'CLUE_INVALID', 400)
  }
  const draft = drafts.get(draftId)
  if (!draft) return badRequest('Draft not found', 'DRAFT_NOT_FOUND', 404)
  if (draft.hostUserId !== userId) return badRequest('Ownership mismatch', 'DRAFT_OWNERSHIP_MISMATCH', 403)

  // Consume draft
  drafts.delete(draftId)

  const gameId = uid('g_')
  const endTime = Date.now() + 24 * 60 * 60 * 1000
  const game = {
    gameId,
    hostUserId: userId,
    phase: 'GUESSING' as const,
    spectrum: draft.spectrum,
    clue: clue.trim(),
    guesses: [],
    createdAt: Date.now(),
    endTime,
    secretTarget: draft.secretTarget,
  }
  games.set(gameId, game)

  const publicGame = {
    gameId: game.gameId,
    hostUserId: game.hostUserId,
    phase: game.phase,
    spectrum: game.spectrum,
    clue: game.clue,
    guesses: game.guesses,
    createdAt: game.createdAt,
    endTime: game.endTime,
  }
  return json(publicGame)
}

// GET /api/daily (stub: return the most recent game if any)
routes.GET['/api/daily'] = async () => {
  const latest = Array.from(games.values()).sort((a, b) => b.createdAt - a.createdAt)[0]
  if (!latest) return badRequest('No daily game', 'GAME_NOT_FOUND', 404)
  const publicGame = {
    gameId: latest.gameId,
    hostUserId: latest.hostUserId,
    phase: latest.phase,
    spectrum: latest.spectrum,
    clue: latest.clue,
    guesses: latest.guesses,
    createdAt: latest.createdAt,
    endTime: latest.endTime,
  }
  return json(publicGame)
}

// GET /api/games/:id
routes.GET['/api/games/:id'] = async (_req) => {
  return badRequest('Direct pattern routes are resolved in fetch handler', 'UNKNOWN_ERROR', 404)
}

// POST /api/games/:id/guesses
routes.POST['/api/games/:id/guesses'] = async (_req) => {
  return badRequest('Direct pattern routes are resolved in fetch handler', 'UNKNOWN_ERROR', 404)
}

/**
 * Devvit expects a fetch handler-like default export in many setups.
 * We export a fetch function that does simple routing and path params.
 */
export default {
  fetch: async (req: Request): Promise<Response> => {
    const url = new URL(req.url)
    const method = req.method.toUpperCase()
    const path = url.pathname

    // Exact match first
    const table = routes[method as keyof typeof routes] || {}
    const direct = (table as any)[path] as Handler | undefined
    if (direct) return direct(req)

    // Pattern: /api/games/:id
    const gameIdMatch = path.match(/^\/api\/games\/([^\/]+)$/)
    const guessMatch = path.match(/^\/api\/games\/([^\/]+)\/guesses$/)

    if (method === 'GET' && gameIdMatch) {
      const id = decodeURIComponent(gameIdMatch[1])
      const game = games.get(id)
      if (!game) return badRequest('Game not found', 'GAME_NOT_FOUND', 404)
      const publicGame = {
        gameId: game.gameId,
        hostUserId: game.hostUserId,
        phase: game.phase,
        spectrum: game.spectrum,
        clue: game.clue,
        guesses: game.guesses,
        createdAt: game.createdAt,
        endTime: game.endTime,
      }
      return json(publicGame)
    }

    if (method === 'POST' && guessMatch) {
      const id = decodeURIComponent(guessMatch[1])
      const userId = req.headers.get('x-user-id') || 'anon'
      const game = games.get(id)
      if (!game) return badRequest('Game not found', 'GAME_NOT_FOUND', 404)
      if (game.phase !== 'GUESSING') return badRequest('Invalid phase', 'PHASE_INVALID', 400)
      if (Date.now() > game.endTime) return badRequest('Game expired', 'GAME_EXPIRED', 400)

      let body: any
      try {
        body = await req.json()
      } catch {
        return badRequest('Invalid JSON body')
      }
      const value = Number(body?.value)
      const justification = typeof body?.justification === 'string' ? String(body.justification) : ''
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return badRequest('Guess must be between 0 and 100', 'GUESS_OUT_OF_RANGE', 400)
      }

      // Upsert by userId
      const existingIdx = game.guesses.findIndex((g) => g.userId === userId)
      const now = Date.now()
      const entry = { userId, guess: value, justification: justification.slice(0, 280), timestamp: now }
      if (existingIdx >= 0) game.guesses[existingIdx] = entry
      else game.guesses.push(entry)

      return json({ ok: true })
    }

    return notFound()
  },
}
