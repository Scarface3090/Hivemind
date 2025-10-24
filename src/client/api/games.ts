import type {
  ActiveGamesResponse,
  DraftRequest,
  DraftResponse,
  PublishGameRequest,
  PublishGameResponse,
  GamePollingResponse,
  GuessRequest,
  GuessResponse,
  ContextsResponse,
  EnhancedDraftRequest,
} from '../../shared/api.js';
import type { GameResults } from '../../shared/types/Game.js';
import { apiClient } from './client.js';

const API_BASE = '/api/games';

export const requestDraft = (payload?: DraftRequest): Promise<DraftResponse> =>
  apiClient.post<DraftResponse, DraftRequest>(`${API_BASE}/draft`, payload ?? ({} as DraftRequest));

export const requestFilteredDraft = (payload: EnhancedDraftRequest): Promise<DraftResponse> =>
  apiClient.post<DraftResponse, EnhancedDraftRequest>(`${API_BASE}/draft`, payload);

export const getContexts = (): Promise<ContextsResponse> =>
  apiClient.get<ContextsResponse>('/api/contexts');

export const publishGame = (
  payload: PublishGameRequest
): Promise<PublishGameResponse> => apiClient.post<PublishGameResponse, PublishGameRequest>(API_BASE, payload);

export interface ActiveGamesParams {
  cursor?: string;
  limit?: number;
}

export const getActiveGames = (params?: ActiveGamesParams): Promise<ActiveGamesResponse> =>
  apiClient.get<ActiveGamesResponse>(`${API_BASE}/active`, {
    searchParams: params as Record<string, string | number | boolean | undefined>,
  });

export const getGameById = (gameId: string): Promise<GamePollingResponse> =>
  apiClient.get<GamePollingResponse>(`${API_BASE}/${gameId}`);

export const submitGuess = (
  gameId: string,
  payload: GuessRequest
): Promise<GuessResponse> => {
  // Development-only logging with structured data (no sensitive fields exposed)
  // Using location.hostname to detect development environment
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    console.log('[DEBUG] submitGuess called', {
      gameId,
      payloadKeys: Object.keys(payload),
      payloadSize: JSON.stringify(payload).length
    });
  }
  return apiClient.post<GuessResponse, GuessRequest>(`${API_BASE}/${gameId}/guess`, payload);
};

export const getGameResults = (gameId: string): Promise<GameResults> =>
  apiClient.get<GameResults>(`${API_BASE}/${gameId}/results`);


