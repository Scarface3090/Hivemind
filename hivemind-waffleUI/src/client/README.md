
# Hivemind Client

This is the client UI built with React + Vite. The Vite root points to this folder.

Development
- Install dependencies at repo root: npm install
- Start the client dev server: npm run dev
  - Serves from src/client (port 5173)
  - Entry HTML: src/client/index.html
  - Entry script: src/client/main.tsx

Build
- Build the client: npm run build
  - Output goes to dist/client

API Endpoints
- The client calls same-origin REST endpoints by default:
  - POST /api/drafts — generate a spectrum draft
  - POST /api/games — publish a game from a draft and clue
  - GET /api/daily — fetch the daily game
  - GET /api/games/:id — fetch a specific game
  - POST /api/games/:id/guesses — submit a guess
- To point to a remote API, set VITE_API_BASE_URL in .env, e.g.:
  VITE_API_BASE_URL=https://your-server.example.com

Notes
- Shared types live under src/shared/types/*
- UI state lives in src/client/stores/*
- Screens live in src/client/screens/*
- Vite config
  - vite.config.ts at repo root sets root to src/client and build.outDir to dist/client
  - If you move this folder, update vite.config.ts accordingly
