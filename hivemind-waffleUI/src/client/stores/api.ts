
/**
 * Minimal API helper used by the store to call a backend when VITE_API_BASE_URL is set.
 * In Devvit, leave VITE_API_BASE_URL unset so requests use same-origin paths like /api/daily.
 */
export type ApiError = { ok: false; code: string; message: string; status: number }
export type ApiSuccess<T> = T

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined

function buildUrl(path: string) {
  if (!BASE_URL) return path // same-origin in Devvit
  const trimmed = path.startsWith('/') ? path : `/${path}`
  return `${BASE_URL}${trimmed}`
}

export async function apiRequest<T = any>(
  path: string,
  options: { method?: string; body?: any; headers?: Record<string, string>; userId?: string } = {}
): Promise<ApiSuccess<T>> {
  const { method = 'GET', body, headers = {}, userId } = options
  // lazily read userId from the store to ensure stability across sessions
  let uid = userId
  if (!uid) {
    try {
      const { useGameStore } = await import('../stores/gameStore')
      uid = (useGameStore.getState().userId as string) || undefined
    } catch {
      // ignore if store not available in this context
    }
  }
  const res = await fetch(buildUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(uid ? { 'X-User-Id': uid } : {}),
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    const code = typeof (data as any)?.code === 'string' ? (data as any).code : 'UNKNOWN_ERROR'
    const message = typeof (data as any)?.message === 'string' ? (data as any).message : res.statusText || 'Request failed'
    const err: ApiError = { ok: false, code, message, status: res.status }
    throw err
  }

  return data as T
}

export const useServerApi = Boolean(BASE_URL)
