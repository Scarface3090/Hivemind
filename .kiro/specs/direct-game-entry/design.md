# Design Document

## Overview

The direct game entry feature eliminates the friction of joining hosted Hivemind games by automatically detecting when a user accesses a specific game post and routing them directly to the appropriate game interface. This design leverages Devvit's post context and post data capabilities to provide seamless game entry.

## Architecture

### Current Flow (Problem)
1. Host creates and publishes a game → Reddit post created with `createGamePost()`
2. User clicks on game post in subreddit feed → Opens Hivemind app
3. App shows generic HomeScreen with "Host Game" and "View Active Games" buttons
4. User must click "View Active Games" → Navigate to GameFeed
5. User must find and click on the specific game → Finally reach GuessingView

### New Flow (Solution)
1. Host creates and publishes a game → Reddit post created with `createGamePost()` (unchanged)
2. User clicks on game post in subreddit feed → Opens Hivemind app
3. App detects game context from Devvit's `context.postData` → Automatically route to GuessingView
4. User immediately sees the guessing interface for that specific game

## Components and Interfaces

### 1. Server Context API Endpoint

**Location:** `src/server/core/routes/context.route.ts` (new)

```typescript
router.get('/api/context', async (req, res) => {
  const { postData } = context;
  res.json({
    gameId: postData?.gameId || null,
    isDirectGameAccess: !!postData?.gameId,
    postData: postData || null
  });
});
```

This endpoint will:
- Access `context.postData` from Devvit's server context
- Extract game information from post data
- Return context information to the client

### 2. Client Context Detection Hook

**Location:** `src/client/hooks/useGameContext.ts` (new)

```typescript
interface GameContext {
  gameId: string | null;
  isDirectGameAccess: boolean;
  isLoading: boolean;
}

export const useGameContext = (): GameContext
```

This hook will:
- Fetch context data from `/api/context` endpoint
- Handle loading states during context detection
- Return context information for routing decisions

### 2. Enhanced App Router

**Location:** `src/client/App.tsx` (modified)

The router will be enhanced to:
- Use the `useGameContext` hook on app initialization
- Automatically redirect to `/game/:gameId` when direct game access is detected
- Maintain existing routing for general app access (when no game context)

### 3. Post Data Structure (Existing)

**Location:** `src/server/core/post.ts` (no changes needed)

The `createGamePost` function already includes `gameId` in `postData`:

```typescript
postData: {
  gameId: metadata.gameId,
  host: metadata.hostUsername,
  startTime: metadata.timing.startTime,
  endTime: metadata.timing.endTime,
  spectrum: {
    leftLabel: metadata.spectrum.leftLabel,
    rightLabel: metadata.spectrum.rightLabel,
  },
}
```

This existing structure provides all necessary context for direct game access via the server's `context.postData`.

### 4. Enhanced App Router Logic

**Location:** `src/client/App.tsx` (modified)

The App component will:
- Use `useGameContext` hook on initialization
- Show loading state while context detection occurs
- Automatically redirect to appropriate game view when direct game access is detected
- Render normal routing when no game context is detected

### 5. Context Route Integration

**Location:** `src/server/index.ts` (modified)

Add the new context router to the existing server routes:

```typescript
import { contextRouter } from './core/routes/context.route.js';
// ... existing imports

app.use(contextRouter);
```

## Data Models

### GameContext Interface
```typescript
interface GameContext {
  gameId: string | null;
  isDirectGameAccess: boolean;
  isLoading: boolean;
}
```

### Context API Response
```typescript
interface ContextResponse {
  gameId: string | null;
  isDirectGameAccess: boolean;
  postData: GamePostData | null;
}
```

### Post Data Structure (Existing)
```typescript
interface GamePostData {
  gameId: string;
  host: string;
  startTime: string;
  endTime: string;
  spectrum: {
    leftLabel: string;
    rightLabel: string;
  };
}
```

## Error Handling

### Invalid Game Context
- If `gameId` is present but game doesn't exist → Show error message and fallback to HomeScreen
- If `gameId` format is invalid → Log warning and fallback to HomeScreen
- If game has ended → Automatically redirect to `/results/:gameId`

### Network Failures
- If game data fetch fails → Show retry mechanism with fallback to HomeScreen
- If context detection fails → Gracefully fallback to normal HomeScreen behavior

### Graceful Degradation
- All error scenarios should fallback to the existing HomeScreen behavior
- Users should never be stuck in a broken state
- Clear error messages should guide users to alternative actions

## Testing Strategy

### Unit Tests
- `useGameContext` hook behavior with various post data scenarios
- Router logic for context-based routing decisions
- Error handling for invalid game contexts

### Integration Tests
- End-to-end flow from game post click to guessing interface
- Fallback behavior when game context is invalid
- Navigation between direct game access and general app usage

### Manual Testing Scenarios
1. **Direct Game Access:** Click on active game post → Should open directly to guessing view
2. **Ended Game Access:** Click on ended game post → Should open directly to results view
3. **Invalid Game Access:** Click on post with invalid game data → Should show error and fallback to home
4. **General App Access:** Access app from subreddit menu → Should show normal home screen
5. **Navigation Persistence:** Navigate away from direct game and back → Should maintain context appropriately

## Implementation Notes

### Devvit Context Integration
- Leverage `context.postData` available on server-side via `@devvit/web/server`
- Create `/api/context` endpoint to expose post data to client
- Use existing post data structure from `createGamePost` function
- No changes needed to server-side post creation logic

### React Router Integration
- Implement context detection at the App component level via API call
- Use programmatic navigation to redirect based on context
- Handle loading states during context detection
- Maintain existing route structure for backward compatibility

### Performance Considerations
- Context detection requires one API call on app initialization
- Cache context information to avoid repeated API calls
- Use React Query for efficient caching and error handling
- Minimize loading time with optimistic routing

### Backward Compatibility
- Existing URLs and navigation patterns remain functional
- General app access (non-game posts) behavior unchanged
- All existing features continue to work as before
