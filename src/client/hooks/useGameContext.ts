import { useQuery } from '@tanstack/react-query';
import { getGameContext } from '../api/games.js';
import type { GameContextResponse } from '../../shared/api.js';

export interface GameContext {
  gameId: string | null;
  isDirectGameAccess: boolean;
  isLoading: boolean;
  error: Error | null;
}

export const useGameContext = (enabled: boolean = true): GameContext => {
  const { data, isLoading, error } = useQuery<GameContextResponse>({
    queryKey: ['gameContext'],
    queryFn: async () => {
      try {
        const result = await getGameContext();
        console.log('[useGameContext] Context API response:', result);
        return result;
      } catch (err) {
        console.error('[useGameContext] Failed to fetch game context:', err);
        // Return safe fallback instead of throwing
        return {
          gameId: null,
          isDirectGameAccess: false,
          postData: null,
        };
      }
    },
    enabled, // Allow disabling the query
    staleTime: 5 * 60 * 1000, // 5 minutes - context shouldn't change during session
    retry: false, // Don't retry context detection to avoid repeated errors
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component remount
    refetchOnReconnect: false, // Don't refetch on network reconnect
    // Provide initial data to prevent loading states on normal browsing
    initialData: {
      gameId: null,
      isDirectGameAccess: false,
      postData: null,
    },
  });

  return {
    gameId: data?.gameId ?? null,
    isDirectGameAccess: data?.isDirectGameAccess ?? false,
    isLoading: enabled ? isLoading : false,
    error: enabled ? (error as Error | null) : null,
  };
};
