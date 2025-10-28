# Implementation Plan

- [x] 1. Create server-side context API endpoint

  - Create new route file `/src/server/core/routes/context.route.ts`
  - Implement `/api/context` endpoint that accesses `context.postData` from Devvit server context
  - Return game context information including `gameId`, `isDirectGameAccess`, and full `postData`
  - Handle cases where `postData` is null or missing `gameId`
  - _Requirements: 1.4, 3.1, 3.3_

- [x] 1.1 Integrate context route into server

  - Import and mount the new context router in `/src/server/index.ts`
  - Add proper error handling and logging for context endpoint
  - _Requirements: 1.4, 3.1_

- [x] 2. Create client-side context detection hook

  - Create `/src/client/hooks/useGameContext.ts` hook
  - Implement API call to `/api/context` endpoint using existing API client pattern
  - Handle loading states, error states, and successful context detection
  - Return `GameContext` interface with `gameId`, `isDirectGameAccess`, and `isLoading`
  - Use React Query for caching and error handling consistency
  - _Requirements: 1.1, 3.1, 3.3_

- [x] 3. Implement automatic game routing in App component

  - Modify `/src/client/App.tsx` to use `useGameContext` hook on app initialization
  - Add conditional routing logic that redirects to appropriate game view when direct game access is detected
  - Handle different game states: active games redirect to `/game/:gameId`, ended games redirect to `/results/:gameId`
  - Show loading spinner during context detection
  - Maintain existing routing behavior when no game context is detected
  - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2_

- [x] 4. Add error handling and fallback behavior

  - Implement graceful fallback to HomeScreen when game context is invalid or API fails
  - Add error boundaries for context detection failures
  - Handle edge cases: invalid `gameId`, non-existent games, network failures
  - Log context detection errors for debugging
  - _Requirements: 1.5, 3.4, 3.5_

- [x] 5. Implement client-side context detection and routing

  - Create `useGameContext` hook with React Query integration for efficient API calls and caching
  - Implement `GameContextRouter` component for automatic routing based on game context and state
  - Add `GameContextErrorBoundary` to prevent context detection failures from breaking the app
  - Integrate context detection into main App component with proper error handling
  - Handle different game states: route active games to guessing view, ended games to results view
  - Implement loading states and graceful fallbacks for all error scenarios
  - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 3.1, 3.3, 3.4, 3.5_

- [x] 5.1 Add developer debug tools for context detection

  - Create `useGameContextDebug` hook with enhanced logging and error tracking
  - Implement `GameContextDebugger` component with visual debugging overlay
  - Add debug mode activation via URL parameter and localStorage
  - Integrate real-time debug panel showing context state and API results
  - Implement debug log history with timestamps for troubleshooting
  - Add interactive debug controls for enabling/disabling context queries
  - Remove React Router dependencies for improved compatibility and reduced coupling
  - _Requirements: Developer tooling for debugging context detection issues_

- [ ]\* 6. Add unit tests for context detection

  - Write tests for `useGameContext` hook with various API response scenarios
  - Test `GameContextRouter` component routing logic with different context states
  - Test context API endpoint with various `postData` scenarios
  - Test error handling and fallback behaviors
  - _Requirements: All requirements_

- [ ]\* 7. Add integration tests for direct game entry flow
  - Test end-to-end flow from game post access to guessing interface
  - Test fallback behavior with invalid game contexts
  - Test navigation between direct game access and general app usage
  - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2_
