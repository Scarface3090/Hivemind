import type {
  ActiveGamesResponse,
  DraftRequest,
  DraftResponse,
  PublishGameRequest,
  PublishGameResponse,
  GamePollingResponse,
  GuessRequest,
  GuessResponse,
} from '../../shared/api.js';
import type { GameResults } from '../../shared/types/Game.js';
import { apiClient } from './client.js';

const API_BASE = '/api/games';

export const requestDraft = (payload?: DraftRequest): Promise<DraftResponse> =>
  apiClient.post<DraftResponse, DraftRequest>(`${API_BASE}/draft`, payload ?? ({} as DraftRequest));

export const publishGame = (
  payload: PublishGameRequest
): Promise<PublishGameResponse> => apiClient.post<PublishGameResponse, PublishGameRequest>(API_BASE, payload);

export interface ActiveGamesParams {
  cursor?: string;
  limit?: number;
}

export const getActiveGames = (params?: ActiveGamesParams): Promise<ActiveGamesResponse> =>
  apiClient.get<ActiveGamesResponse>(`${API_BASE}/active`, {
    searchParams: params,
  });

export const getGameById = (gameId: string): Promise<GamePollingResponse> =>
  apiClient.get<GamePollingResponse>(`${API_BASE}/${gameId}`);

export const submitGuess = (
  gameId: string,
  payload: GuessRequest
): Promise<GuessResponse> => {
  console.log(`[DEBUG] API client submitGuess called with gameId=${gameId}, payload=`, JSON.stringify(payload));
  return apiClient.post<GuessResponse, GuessRequest>(`${API_BASE}/${gameId}/guess`, payload);
};

export const getGameResults = (gameId: string): Promise<GameResults> =>
  apiClient.get<GameResults>(`${API_BASE}/${gameId}/results`);


