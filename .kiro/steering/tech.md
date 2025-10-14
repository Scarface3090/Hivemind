# Technology Stack

## Platform & Framework
- **Devvit**: Reddit's developer platform for building custom Reddit applications
- **Node.js 22**: Required runtime environment
- **TypeScript**: Primary language with strict type checking enabled
- **Vite**: Build tool and development server for both client and server

## Frontend Stack
- **React 18**: UI framework with JSX
- **Phaser 3.88**: 2D game engine for interactive canvas elements (slider, animations)
- **React Router DOM**: Client-side routing
- **Tanstack React Query**: Server state management and caching
- **Tailwind CSS**: Utility-first CSS framework (configured in hivemind-waffleUI)

## Backend Stack
- **Express 5**: Web server framework
- **Redis**: Data persistence and caching layer
- **Zod**: Runtime type validation and schema parsing
- **UUID**: Unique identifier generation

## Development Tools
- **ESLint**: Code linting with TypeScript support
- **Prettier**: Code formatting
- **Vitest**: Testing framework
- **Concurrently**: Run multiple development processes

## Build System
The project uses a monorepo structure with separate build processes:

### Common Commands
```bash
# Development (runs client, server, and devvit in parallel)
npm run dev

# Build everything
npm run build

# Individual builds
npm run build:client  # Builds React/Phaser frontend
npm run build:server  # Builds Express backend

# Quality checks
npm run check         # Type check + lint + format
npm run type-check    # TypeScript compilation check
npm run lint:fix      # Fix linting issues
npm run prettier      # Format code

# Deployment
npm run deploy        # Build and upload to Devvit
npm run launch        # Deploy and publish for review

# Authentication
npm run login         # Login to Reddit/Devvit CLI

# Testing
npm run test          # Run test suite with Vitest
```

## TypeScript Configuration
- Uses project references for monorepo structure
- Strict type checking with additional safety options
- Separate configs for client (DOM), server (Node), and shared code
- Composite builds for incremental compilation

## Architecture Notes
- Client-server communication via Devvit's `postMessage` API
- Hybrid frontend: React for UI shell, Phaser for interactive game canvas
- Redis used for game state, caching, and leaderboards with sorted sets
- Mobile-first responsive design principles
