# Project Structure

## Root Level Organization
```
├── src/                    # Main source code (monorepo structure)
├── hivemind-waffleUI/      # Alternative UI implementation (legacy/experimental)
├── docs/                   # Project documentation
├── tests/                  # Test files
├── tools/                  # Build configuration and tooling
├── dist/                   # Build output directory
└── node_modules/           # Dependencies
```

## Source Code Structure (`src/`)

### Client (`src/client/`)
Frontend React + Phaser application:
```
├── api/                    # API client and HTTP requests
├── components/             # Reusable React components
│   └── AppLayout/          # Layout components
├── game/                   # Phaser game engine code
│   ├── scenes/             # Phaser scenes (Boot, Game, Menu, etc.)
│   └── systems/            # Game systems and logic
├── hooks/                  # Custom React hooks
├── providers/              # React context providers
├── public/assets/          # Static assets (images, etc.)
├── styles/                 # CSS and styling
├── views/                  # Main screen components
│   ├── GameFeed/           # Game discovery and listing
│   ├── GuessingView/       # Active gameplay interface
│   ├── HomeScreen/         # Main entry point
│   ├── HostView/           # Game creation interface
│   └── ResultsView/        # Game results display
├── main.tsx               # React app entry point
└── vite.config.ts         # Client build configuration
```

### Server (`src/server/`)
Express backend with Redis:
```
├── core/                   # Core business logic
│   ├── jobs/               # Background jobs and scheduling
│   ├── redis/              # Redis key management
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   │   ├── content.service.ts      # Content management
│   │   ├── game.*.ts              # Game-related services
│   │   ├── median.service.ts      # Live median calculation
│   │   └── scoring.service.ts     # Score calculation
│   └── validation/         # Input validation schemas
├── middleware/             # Express middleware
├── tests/                  # Server-side tests
├── utils/                  # Utility functions
├── main.ts                # Server entry point
└── vite.config.ts         # Server build configuration
```

### Shared (`src/shared/`)
Common code used by both client and server:
```
├── types/                  # TypeScript type definitions
│   ├── Game.ts            # Game state and data structures
│   ├── Guess.ts           # Player guess types
│   ├── ScoreSummary.ts    # Scoring system types
│   └── Spectrum.ts        # Game spectrum types
├── utils/                 # Shared utility functions
├── api.ts                 # API contract definitions
├── constants.ts           # Application constants
├── enums.ts              # Shared enumerations
└── schemas.ts            # Zod validation schemas
```

## Configuration Files

### TypeScript Configuration
- `tsconfig.json` - Root project references
- `tools/tsconfig-base.json` - Shared TypeScript settings
- Individual `tsconfig.json` in each src subdirectory

### Build & Development
- `vite.config.ts` - Root Vite configuration
- `vitest.config.ts` - Test configuration
- `eslint.config.js` - Linting rules
- `.prettierrc` - Code formatting rules

### Platform Configuration
- `devvit.json` - Devvit platform configuration (entry points, scheduler, menu items)
- `package.json` - Dependencies and npm scripts

## Naming Conventions

### Files & Directories
- **Components**: PascalCase (e.g., `GameFeed.tsx`, `SpectrumSlider.tsx`)
- **Services**: camelCase with `.service.ts` suffix
- **Types**: PascalCase matching the main type they define
- **Utilities**: camelCase with descriptive names
- **Tests**: Match source file name with `.test.ts` suffix

### Code Structure
- **React Components**: Use functional components with hooks
- **Services**: Export functions or classes with clear, single responsibilities
- **Types**: Define interfaces for data structures, use type unions for state
- **API Routes**: RESTful naming (`/api/games/:gameId`)

## Import Patterns
- Relative imports within the same module
- Absolute imports from shared code
- Group imports: external libraries, internal modules, relative imports
- Use TypeScript path mapping for cleaner imports across the monorepo

## Development Workflow
1. Make changes in appropriate `src/` subdirectory
2. Run `npm run dev` for live development with hot reload
3. Use `npm run check` before committing to ensure code quality
4. Build with `npm run build` before deployment
5. Deploy with `npm run deploy` to Devvit platform (not to be used for now, unless explicitly asked by the user)
