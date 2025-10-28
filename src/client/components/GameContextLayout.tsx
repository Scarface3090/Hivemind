import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useGameContext } from '../hooks/useGameContext.js';
import { getGameById } from '../api/games.js';
import { GamePhase } from '../../shared/enums.js';
import type { GamePollingResponse } from '../../shared/api.js';

export const GameContextLayout = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasCheckedContext, setHasCheckedContext] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  
  // Only check context on initial app load (when on home page)
  const shouldCheckContext = !hasCheckedContext && (location.pathname === '/' || location.pathname === '');
  
  console.log('[GameContextLayout] shouldCheckContext:', shouldCheckContext, 'path:', location.pathname);
  
  const { gameId, isDirectGameAccess, isLoading: contextLoading, error: contextError } = useGameContext(shouldCheckContext);

  // Only fetch game data if we have a gameId from direct access
  const { 
    data: gameData, 
    isLoading: gameLoading, 
    error: gameError 
  } = useQuery<GamePollingResponse>({
    queryKey: ['game', gameId],
    queryFn: async () => {
      try {
        console.log('[GameContextLayout] Fetching game data for:', gameId);
        const result = await getGameById(gameId!);
        console.log('[GameContextLayout] Game data received:', result?.game?.state);
        return result;
      } catch (err) {
        console.error('[GameContextLayout] Failed to fetch game data:', err);
        throw err;
      }
    },
    enabled: !!gameId && isDirectGameAccess && !hasNavigated && shouldCheckContext,
    retry: (failureCount, error) => {
      // Don't retry on 404 (game not found) or other 4xx errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = error.status as number;
        if (status === 404) {
          console.warn('[GameContextLayout] Game not found (404), not retrying');
          return false;
        }
        if (status >= 400 && status < 500) {
          console.warn('[GameContextLayout] Client error, not retrying:', status);
          return false;
        }
      }
      return failureCount < 1; // Only retry once for context routing
    },
  });

  useEffect(() => {
    // Mark that we've checked context (even if we're not checking it this time)
    if (!hasCheckedContext) {
      setHasCheckedContext(true);
    }

    // Don't do anything while still loading context
    if (shouldCheckContext && contextLoading && !hasNavigated) return;

    // If context detection failed, fall back to normal app behavior
    if (contextError) {
      console.warn('[GameContextLayout] Context detection failed, continuing with normal app flow:', contextError);
      return;
    }

    // If we're not checking context or no direct game access, render normally
    if (!shouldCheckContext || !isDirectGameAccess || !gameId) {
      return;
    }

    // Validate gameId format (should be a valid UUID or similar)
    if (typeof gameId !== 'string' || gameId.length < 10) {
      console.warn('[GameContextLayout] Invalid gameId format, falling back to home:', gameId);
      navigate('/', { replace: true });
      setHasNavigated(true);
      return;
    }

    // Don't navigate while still loading game data
    if (gameLoading) return;

    // If there was an error loading the game, fall back to home
    if (gameError) {
      console.warn('[GameContextLayout] Failed to load game for direct access, falling back to home:', gameError);
      navigate('/', { replace: true });
      setHasNavigated(true);
      return;
    }

    // If we have game data, route based on game state
    if (gameData?.game) {
      const { state, gameId: fetchedGameId } = gameData.game;
      
      // Double-check that the fetched game matches the requested game
      if (fetchedGameId !== gameId) {
        console.warn('[GameContextLayout] Game ID mismatch, falling back to home. Expected:', gameId, 'Got:', fetchedGameId);
        navigate('/', { replace: true });
        setHasNavigated(true);
        return;
      }
      
      if (state === GamePhase.Active) {
        console.log('[GameContextLayout] Routing to active game:', gameId);
        navigate(`/game/${gameId}`, { replace: true });
        setHasNavigated(true);
      } else if (state === GamePhase.Reveal || state === GamePhase.Archived) {
        console.log('[GameContextLayout] Routing to game results:', gameId);
        navigate(`/results/${gameId}`, { replace: true });
        setHasNavigated(true);
      } else {
        // Draft games or other states should fall back to home
        console.log('[GameContextLayout] Game in unsupported state for direct access, falling back to home. State:', state);
        navigate('/', { replace: true });
        setHasNavigated(true);
      }
    }
  }, [shouldCheckContext, hasCheckedContext, contextLoading, contextError, isDirectGameAccess, gameId, gameLoading, gameError, gameData, navigate, hasNavigated]);

  // Show loading spinner while determining context and game state (only on initial load)
  if (shouldCheckContext && (contextLoading || (isDirectGameAccess && gameId && gameLoading && !hasNavigated))) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        gap: '10px'
      }}>
        <div>Loading game...</div>
        {contextLoading && <div style={{ fontSize: '14px', color: '#666' }}>Detecting context...</div>}
        {gameLoading && <div style={{ fontSize: '14px', color: '#666' }}>Loading game data...</div>}
      </div>
    );
  }

  // Render the matched route component
  return <Outlet />;
};
