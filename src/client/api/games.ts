import type {
  ActiveGamesResponse,
  DraftRequest,
  DraftResponse,
  PublishGameRequest,
  PublishGameResponse,
} from '../../shared/api.js';
import { apiClient } from './client.js';

const API_BASE = '/api/games';

export const requestDraft = (payload: DraftRequest): Promise<DraftResponse> =>
  apiClient.post<DraftResponse, DraftRequest>(`${API_BASE}/draft`, payload);

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


