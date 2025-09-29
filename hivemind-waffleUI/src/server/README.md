
# Server Build

This server is built using Vite in SSR mode to a CommonJS entry compatible with Devvit.

Build command:
- npm run build:server

Output:
- dist/server/index.cjs

Configure Devvit to use the built entry:
devvit.json:
{
  "server": {
    "entry": "dist/server/index.cjs"
  }
}

Notes:
- The Vite config is at src/server/vite.config.ts.
- Target is node22 per Devvit docs (node18 also works).
- emptyOutDir is false so client builds in dist are preserved.
