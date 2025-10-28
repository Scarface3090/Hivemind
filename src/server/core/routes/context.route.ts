import express from 'express';
import { context } from '@devvit/web/server';

const router = express.Router();

// GET /api/context - Returns game context information from Devvit post data
router.get('/api/context', async (_req, res) => {
  try {
    console.log('[API] GET /api/context - Checking post context');
    
    // Debug: Log the entire Devvit context to understand what's available
    console.log('[API] GET /api/context - Full context keys:', Object.keys(context));
    console.log('[API] GET /api/context - Context postId:', context.postId);
    console.log('[API] GET /api/context - Context userId:', context.userId);
    console.log('[API] GET /api/context - Context subredditName:', context.subredditName);
    
    // Safely access postData from Devvit server context
    let postData = null;
    let gameId = null;
    let isDirectGameAccess = false;
    let debugInfo = {};
    
    try {
      postData = context.postData || null;
      console.log('[API] GET /api/context - Raw postData:', JSON.stringify(postData, null, 2));
      
      // Try different ways to extract gameId
      gameId = postData?.gameId || postData?.id || null;
      
      // If no gameId in postData, check if postId itself might be the gameId
      if (!gameId && context.postId) {
        console.log('[API] GET /api/context - No gameId in postData, checking if postId is gameId:', context.postId);
        // You might need to query your game database to see if this postId corresponds to a game
      }
      
      isDirectGameAccess = !!gameId;
      
      debugInfo = {
        hasPostData: !!postData,
        postDataKeys: postData ? Object.keys(postData) : [],
        postId: context.postId,
        contextKeys: Object.keys(context),
      };
      
    } catch (contextError) {
      console.log('[API] GET /api/context - Context access error:', contextError);
      debugInfo = { error: contextError instanceof Error ? contextError.message : String(contextError) };
    }
    
    console.log(`[API] GET /api/context - Final result: gameId=${gameId}, isDirectGameAccess=${isDirectGameAccess}`);
    
    // Always return a valid response with debug info
    const response = {
      gameId,
      isDirectGameAccess,
      postData,
      debugInfo
    };
    
    res.json(response);
  } catch (error) {
    console.error('[API] GET /api/context - Unexpected error:', error);
    // Always return a safe fallback response
    res.json({ 
      gameId: null,
      isDirectGameAccess: false,
      postData: null,
      debugInfo: { error: error instanceof Error ? error.message : String(error) }
    });
  }
});

export default router;
