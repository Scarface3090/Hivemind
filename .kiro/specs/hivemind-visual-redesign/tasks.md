# Implementation Plan

## Design System Usage

**📋 How to Use design-system.json:**
1. **Import as Reference** - All color values, typography, spacing, and component specs are defined in design-system.json
2. **Create Type-Safe Tokens** - Convert JSON values to TypeScript constants in src/shared/design-tokens.ts
3. **Tailwind Integration** - Import design tokens into tailwind.config.js for consistent styling
4. **Component Implementation** - Reference design-system.json specifications for all component styling
5. **Particle Configuration** - Use design-system.json particles.systems for all particle effect parameters

**Example Usage:**
```typescript
// src/shared/design-tokens.ts
import designSystem from '../../.kiro/specs/hivemind-visual-redesign/design-system.json';

export const colors = designSystem.designSystem.colors;
export const typography = designSystem.designSystem.typography;
export const particles = designSystem.designSystem.particles;
```

## Important Implementation Guidelines

**🚫 CRITICAL CONSTRAINTS:**
1. **DO NOT change the app's name** - Keep all existing app naming and branding as "Hivemind"
2. **DO NOT run build commands or npm scripts** - All building, deployment, and testing will be handled manually by the user
3. **Code-only implementation** - Focus solely on writing/modifying code files, never execute build processes

**📋 Task Execution Rules:**
- Write and modify code files only
- Never run `npm run build`, `npm run dev`, `npm run deploy`, or any npm scripts
- Never execute bash commands for building or deployment
- At checkpoints, prompt user to manually build, deploy, test, and commit
- Focus on file creation and code implementation only

**🚀 Checkpoint Process:**
Each checkpoint will prompt: "Please manually run: `npm run build && npm run deploy` to test this checkpoint, then commit your changes before proceeding to the next task."

- [ ] 1. Project Foundation and Core Setup
  - Create project structure following Devvit monorepo pattern with src/client, src/server, src/shared directories
  - Set up TypeScript configuration with project references for client, server, and shared code
  - Configure Vite build system for both client (React/Phaser) and server (Express) targets
  - Initialize package.json with all required dependencies (React 18, Phaser 3.88, Express 5, Redis, Zod, Tailwind CSS) - KEEP existing app name "Hivemind"
  - Create devvit.json configuration file with proper webview and server entry points - PRESERVE existing app naming
  - Set up ESLint and Prettier configuration for code quality
  - **Create src/shared/design-tokens.ts that imports and exports design-system.json values as TypeScript constants**
  - **Configure Tailwind CSS to use design-system.json color palette, typography, and spacing values**
  - **CRITICAL: Do not change app name, branding, or package.json name field - keep as "Hivemind"**
  - _Requirements: All requirements - foundational setup_

- [ ] 2. Artistic Design System Implementation
  - **Reference design-system.json for all color values, typography, spacing, and component specifications**
  - Create src/shared/design-tokens.ts file importing values from design-system.json for type-safe access
  - Implement PaperBackground component using design-system.json background.paper (#F5F1E8) and texture specifications
  - Create HandLettering component using design-system.json typography.fonts.handwritten (Kalam) specifications
  - Build BrushStrokeButton component using design-system.json interactive colors (orange #FF6B35, green #4CAF50, teal #26A69A)
  - Implement OrganicShape decorative elements following design-system.json components.decorative specifications
  - Create ArtisticCard component using design-system.json components.cards styling and hover effects
  - Set up Tailwind CSS configuration importing design tokens from design-system.json color palette and spacing
  - Create design system utility functions that reference design-system.json for consistent styling across components
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

**🚀 CHECKPOINT 1: Manual Build, Deploy & Test Basic UI Components**
*Code implementation complete. Please manually run: `npm run build && npm run deploy` to test the artistic main screen with paper background, hand-lettered text, and brush stroke buttons. Commit changes before proceeding.*

- [ ] 3. Phaser Particle System Foundation
  - Initialize Phaser 3.88 game engine with proper canvas setup and responsive configuration
  - Create ParticleSystemManager class for coordinating all particle effects across the application
  - **Implement particle effects using design-system.json particles.systems specifications and color palettes**
  - Implement BrushStrokeTrail particle effect using design-system.json particles.systems.trail configuration
  - Create OrganicBurst particle effect using design-system.json particles.systems.interaction settings
  - Build AmbientParticles system using design-system.json particles.systems.ambient specifications
  - Implement PerformanceMonitor using design-system.json performance.particles.maxCount device-based limits
  - Create particle effect presets referencing design-system.json particles.physics and lifecycle settings
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 4. Enhanced Main Screen with Interactions
  - Implement ArtisticMainScreen component with "ARE YOU GAME?" hand-lettered heading
  - Create animated JOIN and HOST buttons with brush stroke styling and particle effects
  - Add organic decorative elements (blue circles, colorful abstract shapes) positioned around the interface
  - Implement button hover effects with particle trails and visual feedback
  - Create smooth page transitions with brush stroke animations between screens
  - Add responsive design optimizations for mobile devices with proper touch targets
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 8.1, 8.2, 8.3, 8.4, 8.5_

**🚀 CHECKPOINT 2: Manual Build, Deploy & Test Interactive Main Screen**
*Code implementation complete. Please manually run: `npm run build && npm run deploy` to test the fully interactive main screen with particle effects and smooth animations. Commit changes before proceeding.*

- [ ] 5. Server Infrastructure and API Foundation
  - Set up Express 5 server with Devvit createServer pattern for serverless compatibility
  - Configure Redis connection and data access layer for game state management
  - Implement core API routes: /api/contexts, /api/games/draft, /api/games, /api/context, /api/guesses
  - Create Reddit comment integration API for posting player justifications under game posts
  - Create Zod validation schemas for all API requests and responses including guess submissions with justifications
  - Set up content management system with embedded CSV data for 150 curated spectra
  - Implement context and difficulty filtering with 12 categories and 3 difficulty levels
  - Create background job system for automated game lifecycle management
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 6. Host Flow - Context and Difficulty Selection
  - Create ContextSelector component with artistic cards for all 12 categories
  - Implement DifficultySelector with Easy/Medium/Hard options and availability counts
  - Build step-by-step navigation with visual progress indicators and breadcrumb system
  - Add smooth transitions between selection steps with brush stroke animations
  - Create ContextSelectionErrorBoundary for graceful error handling
  - Implement API integration for fetching available contexts and counts
  - Add visual feedback for selected options with brush stroke highlighting
  - _Requirements: 7.1, 7.2, 7.7, 7.8_

**🚀 CHECKPOINT 3: Manual Build, Deploy & Test Host Flow Foundation**
*Code implementation complete. Please manually run: `npm run build && npm run deploy` to test navigation through context and difficulty selection with full visual feedback. Commit changes before proceeding.*

- [ ] 7. Enhanced Spectrum Slider with Particle Effects
  - Create ArtisticSpectrumSlider component using Phaser for interactive canvas element
  - Implement brush stroke gradient track with artistic styling and organic curves
  - Build interactive thumb with particle trail effects that follow mouse/touch movement
  - Add live median indicator with pulsing animation and organic visual effects
  - Create smooth value change animations with brush stroke particle feedback
  - Implement touch-optimized interactions for mobile devices with haptic-like visual feedback
  - Add accessibility features including keyboard navigation and screen reader support
  - _Requirements: 3.1, 3.2, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 8. Host Flow - Clue Input and Prediction Interface
  - Create enhanced clue input interface with character limits and visual validation
  - Implement host median prediction using the artistic spectrum slider component
  - Build spectrum display showing the randomly assigned left and right labels
  - Add visual feedback for clue validation with brush stroke success/error indicators
  - Create prediction visualization showing host's guess on the spectrum
  - Implement smooth transitions between clue input and prediction steps
  - _Requirements: 7.3, 7.4, 7.5_

**🚀 CHECKPOINT 4: Manual Build, Deploy & Test Complete Spectrum Interaction**
*Code implementation complete. Please manually run: `npm run build && npm run deploy` to test fully functional spectrum sliders with particle effects and host prediction capability. Commit changes before proceeding.*

- [ ] 9. Host Flow - Duration Selection and Game Creation
  - Create DurationSelector component with artistic buttons for 1hr, 3hr, 6hr, 24hr options
  - Implement scattered button layout with organic positioning and brush stroke styling
  - Add particle effects for duration selection with burst animations on click
  - Create game creation summary screen showing all selected options before submission
  - Implement final game submission with API integration and error handling
  - Add loading states with artistic animations during game creation process
  - Create success confirmation with celebration particle effects
  - _Requirements: 7.6, 7.7, 7.8_

- [ ] 10. Game State Management and Live Updates
  - Implement real-time median calculation system with Redis-based data persistence
  - Create live median update API endpoints with WebSocket-like polling mechanism
  - Build MedianVisualization component with smooth animation transitions
  - Implement participant count tracking and display with organic number animations
  - Create game phase management (draft, active, ended) with proper state transitions
  - Add automatic game lifecycle management with background job scheduling
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

**🚀 CHECKPOINT 5: Manual Build, Deploy & Test Complete Host Flow**
*Code implementation complete. Please manually run: `npm run build && npm run deploy` to test complete game creation from start to finish with all visual enhancements. Commit changes before proceeding.*

- [ ] 11. Player Guessing Interface with Social Integration
  - Create enhanced guessing screen with artistic spectrum slider and live median display
  - Implement "Influence Hivemind" toggle switch with artistic styling (ON by default)
  - Add conditional justification textbox that appears when toggle is enabled with placeholder text encouraging intelligent reasoning
  - Create guess submission system that posts user's guess and justification as Reddit comment when toggle is ON
  - Add live median updates with smooth animations when new guesses are submitted
  - Create participant counter with organic number transitions and visual feedback
  - Implement guess confirmation with particle burst effects and visual success indicators
  - Add mobile-optimized touch interactions with enhanced visual feedback for both slider and toggle
  - Integrate with Reddit's comment API for posting justifications under the hosted game post
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 12. Competitive Scoring and Ranking System
  - Implement accuracy scoring based on distance from final median using exponential decay
  - Create ranking system that includes both host and all guessers in final results
  - Build ScoreCalculation service with bonus points for early participation
  - Implement social scoring based on comment upvotes and community engagement
  - Create achievement system with badges for accuracy, participation, and social influence
  - Add real-time score updates during active game phases
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

**🚀 CHECKPOINT 6: Manual Build, Deploy & Test Complete Gameplay Loop**
*Code implementation complete. Please manually run: `npm run build && npm run deploy` to test fully functional games with scoring, ranking, and live updates. Commit changes before proceeding.*

- [ ] 13. Results Screen with Dramatic Visualization
  - Create animated results revelation with dramatic median unveiling and particle celebrations
  - Implement interactive histogram using Phaser with animated bars and hover effects
  - Build player ranking display with smooth transitions from closest to furthest accuracy
  - Add achievement badges and accolades with sparkle particle effects and celebration animations
  - Create visual distance indicators showing each player's accuracy relative to the median
  - Implement results sharing functionality with artistic summary cards
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 14. Direct Game Entry System Integration
  - Implement context detection API endpoint for seamless Reddit post integration
  - Create GameContextLayout component for intelligent routing based on game state
  - Build useGameContext hook with React Query caching and error handling
  - Add automatic game routing (active games → guessing, ended games → results)
  - Implement graceful fallback to home screen for invalid or expired game contexts
  - Create debug tools for context detection monitoring and troubleshooting
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

**🚀 CHECKPOINT 7: Manual Build, Deploy & Test Complete Game Experience**
*Code implementation complete. Please manually run: `npm run build && npm run deploy` to test the complete game working end-to-end with all visual enhancements and platform integration. Commit changes before proceeding.*

- [ ] 15. Performance Optimization and Mobile Enhancement
  - Implement adaptive particle quality system based on device capabilities and performance metrics
  - Create performance monitoring with automatic quality degradation for maintaining 60fps
  - Optimize mobile touch interactions with proper touch target sizing and visual feedback
  - Add reduced motion support for accessibility compliance and user preferences
  - Implement efficient memory management for particle systems and animations
  - Create fallback CSS animations for devices that don't support advanced particle effects
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 16. Error Handling and Robustness
  - Implement comprehensive error boundaries for all major component sections
  - Create graceful degradation for particle system failures with CSS animation fallbacks
  - Add network error handling with retry mechanisms and user-friendly error messages
  - Implement loading states with artistic animations for all async operations
  - Create comprehensive logging system for debugging and monitoring in production
  - Add input validation and sanitization for all user-generated content
  - _Requirements: All requirements - error handling and robustness_

**🚀 CHECKPOINT 8: Manual Build, Deploy & Test Production-Ready Application**
*Code implementation complete. Please manually run: `npm run build && npm run deploy` to test the fully polished, production-ready game with comprehensive error handling and performance optimization. Commit changes before proceeding.*

- [ ] 17. Asset Management System and Documentation
  - Create comprehensive asset index documenting all visual assets, their locations, and usage
  - Implement asset loading system with proper error handling and fallback mechanisms
  - Create detailed README documentation with asset update procedures and file structure
  - Add asset optimization guidelines for maintaining performance with visual enhancements
  - Document particle effect configurations and customization options
  - Create troubleshooting guide for common visual and performance issues
  - _Requirements: All requirements - documentation and maintainability_

- [ ]* 18. Testing and Quality Assurance
  - Write comprehensive unit tests for all core game logic and API endpoints
  - Create integration tests for complete user flows (host creation, guessing, results)
  - Implement visual regression tests for artistic components and animations
  - Add performance tests to ensure 60fps targets are maintained across devices
  - Create accessibility tests for keyboard navigation and screen reader compatibility
  - Write end-to-end tests covering the complete game lifecycle from creation to results
  - _Requirements: All requirements - testing and quality assurance_

**🚀 FINAL CHECKPOINT: Manual Testing & Production Deployment**
*Code implementation complete. Please manually run: `npm run build && npm run deploy` for final testing of the production-ready Hivemind game with enhanced artistic visuals and all original functionality preserved. Final commit and deployment ready.*
