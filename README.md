# Hivemind - Social Guessing Game for Reddit

A social guessing game built on Reddit's Devvit platform where players try to "read the host's mind" by guessing a secret target value on a dynamic spectrum. Combines community discussion with interactive gameplay.

## 🎮 Game Overview

**Hivemind** is an asynchronous social guessing game where:
- **Hosts** create games with clues and secret targets on dynamic spectra (e.g., "Coffee ↔ Tea")
- **Players** submit guesses using an interactive slider while seeing the live community median
- **Scoring** combines guessing accuracy with social influence (comment upvotes)
- **Results** show detailed analytics, consensus labels, and community accolades

## 🏗️ Architecture

Built as a monorepo with three main components:

### Frontend (`/src/client`)
- **React 18** - UI framework with TypeScript
- **Phaser 3.88** - Interactive game elements (sliders, histograms)
- **React Router** - Client-side navigation
- **Tanstack Query** - Server state management
- **Tailwind CSS** - Utility-first styling

### Backend (`/src/server`)
- **Express 5** - Serverless API on Devvit runtime
- **Redis** - Data persistence and caching
- **Zod** - Runtime validation and schemas
- **Background Jobs** - Automated game lifecycle management

### Shared (`/src/shared`)
- **TypeScript Types** - Game state, scoring, and API contracts
- **Validation Schemas** - Zod schemas for type safety
- **Utilities** - Common functions and constants

## 🚀 Key Features Implemented

### Dynamic Content System ✨ NEW
- **Embedded CSV Content Management** - 150 curated spectra embedded directly in the application code
- **Context Selection Interface** - Hosts can choose from 12 categories: Movies, Food, Gaming, Technology, Social Media, Life Skills, Relationships, Lifestyle, Entertainment, Internet Culture
- **Difficulty Filtering** - Easy (65), Medium (52), Hard (30) difficulty levels with live availability counts
- **Smart Caching** - Redis-based content indexing with server startup initialization
- **Multi-Tier Fallbacks** - Embedded CSV → Google Sheets → Hardcoded spectra for maximum reliability
- **Real-time Content Stats** - Live counts of available spectra per context and difficulty
- **Robust Server Initialization** - Content validation and statistics logging on startup
- **Serverless-Optimized** - No file system dependencies, content embedded in application bundle
- **Error Boundary Protection** - ContextSelectionErrorBoundary prevents content loading errors from breaking the host flow
- **Enhanced API Logging** - Comprehensive request/response logging for context API endpoints with detailed error tracking

### Game Lifecycle
- **Draft System** - Hosts receive random spectra with secret targets
- **Timed Rounds** - Configurable durations (1-24 hours)
- **Live Median** - Real-time community consensus updates
- **Automated Transitions** - Background jobs handle phase changes

### Interactive Gameplay
- **Phaser Slider** - Touch-optimized spectrum selection
- **Justification System** - Optional reasoning that affects scoring
- **Median Visualization** - Live community consensus indicator
- **Mobile-First Design** - Optimized for vertical, touch screens

### Advanced Scoring
- **Accuracy Score** - Distance from secret target
- **Social Score** - Based on comment upvotes
- **Consensus Analysis** - Community agreement metrics
- **Accolades System** - "Psychic", "Top Comment", "Unpopular Opinion"

### Results & Analytics
- **Interactive Histograms** - Phaser-powered distribution charts
- **Consensus Labels** - "Perfect Hivemind", "Battle Royale", etc.
- **Player Rankings** - Leaderboards with detailed breakdowns
- **Host Analytics** - Game performance metrics

## 🛠️ Technology Stack

- **Platform**: Reddit Devvit (Node.js 22 serverless runtime)
- **Frontend**: React 18 + Phaser 3.88 + TypeScript
- **Backend**: Express 5 + Redis + Zod validation
- **Build**: Vite + TypeScript project references
- **Quality**: ESLint + Prettier + Vitest testing

## 🔌 New API Endpoints ✨

The Dynamic Content System introduces new API endpoints for enhanced content management:

```bash
# Context Management
GET /api/contexts                    # Get available contexts with counts
POST /api/games/draft               # Enhanced draft with context/difficulty filters

# Enhanced Draft Request (backward compatible)
{
  "context": "Movies",              # Optional: filter by context
  "difficulty": "MEDIUM"            # Optional: filter by difficulty
}

# Context Response
{
  "contexts": [
    {
      "context": "Movies",
      "totalCount": 25,
      "difficultyBreakdown": {
        "EASY": 8,
        "MEDIUM": 12,
        "HARD": 5
      }
    }
  ]
}
```

### API Monitoring & Debugging ✨ NEW
- **Request/Response Logging** - All context API calls are logged with detailed request information
- **Error Tracking** - Comprehensive error logging with stack traces and context information
- **Performance Monitoring** - Response times and success rates tracked for context endpoints
- **Debug Information** - Detailed logging shows context counts, filtering results, and cache performance

## 📋 Development Commands

```bash
# Development (runs client, server, and devvit in parallel)
npm run dev

# Build everything
npm run build

# Individual builds
npm run build:client  # React/Phaser frontend
npm run build:server  # Express backend

# Quality checks
npm run check         # Type check + lint + format
npm run type-check    # TypeScript compilation
npm run lint:fix      # Fix linting issues
npm run prettier      # Format code

# Testing
npm run test          # Run Vitest test suite

# Authentication & Deployment
npm run login         # Login to Reddit/Devvit CLI
npm run deploy        # Build and upload to Devvit
npm run launch        # Deploy and publish for review
```

## 🎯 Getting Started

> Requires Node.js 22+

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd hivemind
   npm install
   ```

2. **Development Setup**
   ```bash
   npm run login    # Authenticate with Reddit
   npm run dev      # Start development servers
   ```

3. **Content Configuration** ✨ ENHANCED
   - Primary: 150 spectra embedded directly in application code for maximum reliability
   - 12 Content Categories: Movies, Food, Gaming, Technology, Social Media, Life Skills, Relationships, Lifestyle, Entertainment, Internet Culture
   - Balanced Difficulty: 65 Easy, 52 Medium, 30 Hard spectra
   - Fallback: Optional Google Sheets integration via environment variables
   - Final fallback: Hardcoded spectra ensure system reliability
   - Content loads automatically during server startup with comprehensive validation

## 📁 Project Structure

```
├── src/
│   ├── client/          # React + Phaser frontend
│   │   ├── views/       # Main screens (✨ ENHANCED: HostView with content selection)
│   │   ├── components/  # Reusable UI components (✨ NEW: ContextSelector, DifficultySelector, ContextSelectionErrorBoundary)
│   │   ├── game/        # Phaser scenes and systems
│   │   └── api/         # HTTP client wrappers (✨ NEW: Context APIs)
│   ├── server/          # Express serverless backend
│   │   ├── core/        # Business logic and services
│   │   │   ├── routes/  # API endpoints (✨ NEW: /api/contexts)
│   │   │   ├── services/# Game logic, scoring, content (✨ ENHANCED: Dynamic content system)
│   │   │   └── redis/   # Data access layer (✨ NEW: Context indexing)
│   │   └── middleware/  # Express middleware
│   └── shared/          # Common types and utilities
│       ├── types/       # TypeScript interfaces
│       ├── schemas.ts   # Zod validation schemas
│       └── constants.ts # Application constants
├── docs/                # Project documentation
├── tests/               # Test files
└── tools/               # Build configuration
```

## 🎮 Game Flow

1. **Host Flow**: Choose context & difficulty → Receive filtered spectrum + secret target → Add clue → Publish
2. **Player Flow**: Browse active games → Join game → See median → Submit guess + justification  
3. **Results**: View accuracy scores → Social influence metrics → Community consensus → Accolades

### Enhanced Host Experience ✨ NEW
- **Step-by-Step Content Selection**: Visual context cards → Difficulty options → Clue creation
- **Content Preview**: See available spectrum counts before selection
- **Smart Filtering**: Get spectra tailored to chosen context and difficulty
- **Breadcrumb Navigation**: Easy back-and-forth between selection steps
- **Graceful Error Handling**: Context selection errors are contained with retry options, preventing host flow interruption

## 🔧 Configuration

- **Devvit Config**: `devvit.json` - Platform settings, scheduler, menu items
- **TypeScript**: Project references for monorepo structure
- **Build**: Vite configs for client/server with different targets
- **Content Management**: Multi-tier content system with flexible configuration

## 🏗️ Content Management Architecture Decision

### Current Implementation: Embedded CSV Data (Prototype)

For the initial prototype launch, we've implemented **embedded CSV content** directly in the server code:

**Why Embedded Data:**
- ✅ **Serverless Compatibility**: No file system dependencies in Devvit's serverless environment
- ✅ **Zero External Dependencies**: Content always available without network calls
- ✅ **Deployment Simplicity**: Content bundled with application code
- ✅ **Guaranteed Availability**: No risk of external service failures
- ✅ **Fast Startup**: Instant content loading without I/O operations

**Current Implementation:**
- 150 curated spectra embedded as string constant in `src/server/core/services/content.service.ts`
- Multi-tier fallback system: Embedded CSV → Google Sheets → Hardcoded spectra
- Server startup validation ensures content integrity
- Content updates require code deployment

### Post-Launch Migration: Redis-Based Dynamic Content

**Planned Enhancement for v2.0:**
```typescript
// Future Redis-based implementation
await redis.set('spectra_csv_data', csvString);
const csvData = await redis.get('spectra_csv_data');
const spectraData = parseCSV(csvData);
```

**Benefits of Redis Approach:**
- 🚀 **Dynamic Updates**: Content updates without redeployment
- 🔧 **Admin Interface**: Moderator tools for content management
- 📊 **Version Control**: Content history and rollback capabilities
- 🔄 **Hot Reload**: Instant content updates across all servers
- 📈 **Scalability**: Centralized content management

**Migration Timeline:**
- **Phase 1** (Current): Embedded CSV for prototype stability
- **Phase 2** (Post-launch): Redis-based dynamic content system
- **Phase 3** (Future): Full content management dashboard

This architectural decision prioritizes **reliability and simplicity** for the initial launch while maintaining a clear path to **dynamic content management** for future iterations.

### Server Startup Process ✨ NEW

The server now includes a comprehensive initialization process that ensures content is loaded and validated before accepting requests:

#### Startup Sequence
1. **CSV Content Loading** - Reads and parses `spectra.csv` from assets folder
2. **Content Validation** - Validates each spectrum entry for required fields and data integrity
3. **Cache Population** - Stores validated content in Redis with context indexing
4. **Statistics Generation** - Logs detailed breakdown of available content
5. **Fallback Handling** - Gracefully handles errors with multi-tier fallback system

#### Startup Logging Example
```
=== Server Startup Initialization ===
Loading content from embedded CSV data...
CSV headers found: ID, Context, Left_Label, Right_Label, Difficulty
Processing 150 data rows...
CSV parsing complete: 150 valid, 0 invalid rows
✓ Successfully loaded 150 spectra from embedded CSV data
Initializing spectrum cache...
✓ Spectrum cache initialized with 150 entries
Content Statistics:
  Total Spectra: 150
  Unique Contexts: 12
    Movies: 15 spectra
    Food: 15 spectra
    Gaming: 15 spectra
    Technology: 15 spectra
    Social Media: 15 spectra
    Life Skills: 15 spectra
    Relationships: 15 spectra
    Lifestyle: 15 spectra
    Entertainment: 15 spectra
    Internet Culture: 15 spectra
  Difficulty Distribution:
    EASY: 65 spectra
    MEDIUM: 52 spectra
    HARD: 30 spectra
✓ Server initialization completed successfully
```

#### API Request Logging Example ✨ NEW
```
[API] GET /api/contexts - Loading contexts with counts
Retrieved context summary from cache for 12 contexts
  Movies: 15 total (Easy: 8, Medium: 5, Hard: 2)
  Food: 15 total (Easy: 9, Medium: 4, Hard: 2)
  Gaming: 15 total (Easy: 7, Medium: 6, Hard: 2)
[API] GET /api/contexts - Found 12 contexts: Movies (15), Food (15), Gaming (15)...
```

#### Error Handling
- **CSV Loading Failures**: Automatically falls back to Google Sheets (if configured) or hardcoded spectra
- **Validation Errors**: Logs detailed error information while continuing with valid content
- **Cache Failures**: Server starts with in-memory fallback content to ensure availability
- **Graceful Degradation**: Server always starts successfully, even with minimal fallback content

### Content System Configuration ✨ NEW
- **Primary Source**: Embedded CSV data directly in `content.service.ts` - 150 curated spectra across 12 contexts
- **Content Categories**: Movies, Food, Gaming, Technology, Social Media, Life Skills, Relationships, Lifestyle, Entertainment, Internet Culture
- **Difficulty Distribution**: 65 Easy, 52 Medium, 30 Hard spectra for balanced gameplay
- **Google Sheets Fallback**: Optional integration via environment variables:
  - `GOOGLE_SHEETS_API_KEY` - API key for Sheets access
  - `GOOGLE_SHEETS_SPREADSHEET_ID` - Spreadsheet identifier
  - `GOOGLE_SHEETS_RANGE` - Data range (e.g., "Sheet1!A:D")
  - `GOOGLE_SHEETS_CACHE_TTL_MINUTES` - Cache refresh interval (default: 15)
- **Hardcoded Fallback**: Built-in spectra ensure system always functions
- **Server Startup Loading**: Content initialized during server startup with comprehensive validation
- **Serverless Compatibility**: No file system dependencies, optimized for Devvit's serverless environment

### Performance Optimizations ✨ NEW
- **Proactive Server Initialization**: Content loading and validation during server startup
- **Smart Caching**: Redis-based content indexing with context and difficulty filters
- **Efficient Filtering**: Pre-computed indexes for instant context/difficulty lookups
- **Graceful Degradation**: Multi-tier fallback system ensures reliability
- **Startup Validation**: Comprehensive content statistics and error reporting

### Monitoring & Debugging ✨ NEW
- **API Request Logging**: All context API requests logged with detailed timing and response information
- **Error Tracking**: Comprehensive error logging with stack traces and contextual information
- **Performance Metrics**: Response times and success rates tracked for all content endpoints
- **Debug Information**: Detailed logging shows context filtering results, cache hits/misses, and content statistics
- **Operational Visibility**: Clear logging for troubleshooting content loading and API performance issues

## 📊 Success Metrics

Primary metric: **Completed Games** (hosted → guessed → revealed)

Secondary metrics:
- Player engagement and retention
- Comment interaction rates
- Game completion rates
- Community consensus quality

## 🆕 Recent Updates

### Dynamic Content System (Latest)
- ✅ **Embedded Content Management**: 150 curated spectra embedded directly in application code
- ✅ **12 Content Categories**: Movies, Food, Gaming, Technology, Social Media, Life Skills, Relationships, Lifestyle, Entertainment, Internet Culture
- ✅ **Context Selection UI**: Visual cards for choosing content categories with live counts
- ✅ **Difficulty Filtering**: Easy (65), Medium (52), Hard (30) options with availability counts
- ✅ **Enhanced Host Flow**: Step-by-step content selection with breadcrumb navigation
- ✅ **Smart Caching**: Redis-based indexing for instant content filtering
- ✅ **Robust Server Initialization**: Proactive content loading with validation and statistics
- ✅ **Multi-Tier Fallbacks**: Embedded CSV → Google Sheets → Hardcoded for maximum reliability
- ✅ **Serverless Optimization**: No file system dependencies, optimized for Devvit runtime
- ✅ **Error Boundary Protection**: ContextSelectionErrorBoundary component prevents content loading failures from breaking the host experience

### Server Infrastructure Enhancements ✨ NEW
- ✅ **Bootstrap Server Process**: Comprehensive server initialization with content validation
- ✅ **Startup Content Loading**: CSV parsing and cache population during server startup
- ✅ **Content Statistics Logging**: Detailed breakdown of contexts and difficulty distribution
- ✅ **Graceful Error Handling**: Server starts with fallback content if initialization fails
- ✅ **Validation Pipeline**: Multi-stage content validation with detailed error reporting

### API Enhancements
- ✅ **New Endpoint**: `GET /api/contexts` - Returns available contexts with counts
- ✅ **Enhanced Draft API**: Accepts optional context and difficulty filters
- ✅ **Backward Compatibility**: Existing random selection still works
- ✅ **Improved Error Handling**: Detailed logging and graceful degradation
- ✅ **Enhanced API Monitoring**: Comprehensive request/response logging with performance tracking
- ✅ **Debug-Friendly Logging**: Detailed context information and error traces for easier troubleshooting
