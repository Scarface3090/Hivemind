import { useQuery } from '@tanstack/react-query';
import { getGameContext } from '../api/games.js';
import type { GameContextResponse } from '../../shared/api.js';

export interface GameContextDebug {
  gameId: string | null;
  isDirectGameAccess: boolean;
  isLoading: boolean;
  error: Error | null;
  debugInfo: {
    queryEnabled: boolean;
    queryKey: string[];
    timestamp: number;
  };
}

export const useGameContextDebug = (enabled: boolean = true): GameContextDebug => {
  console.log('[useGameContextDebug] Hook called with enabled:', enabled);
  
  const queryKey = ['gameContext', 'debug', Date.now().toString()];
  
  const { data, isLoading, error } = useQuery<GameContextResponse>({
    queryKey,
    queryFn: async () => {
      console.log('[useGameContextDebug] Query function executing...');
      try {
        const result = await getGameContext();
        console.log('[useGameContextDebug] API response:', result);
        return result;
      } catch (err) {
        console.error('[useGameContextDebug] API error:', err);
        // Return safe fallback instead of throwing
        return {
          gameId: null,
          isDirectGameAccess: false,
          postData: null,
        };
      }
    },
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity, // Never consider stale for debugging
    initialData: {
      gameId: null,
      isDirectGameAccess: false,
      postData: null,
    },
  });

  const result = {
    gameId: data?.gameId ?? null,
    isDirectGameAccess: data?.isDirectGameAccess ?? false,
    isLoading,
    error: error as Error | null,
    debugInfo: {
      queryEnabled: enabled,
      queryKey,
      timestamp: Date.now(),
    },
  };

  console.log('[useGameContextDebug] Returning result:', result);
  return result;
};
