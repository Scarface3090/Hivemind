# Implementation Plan

- [x] 1. Add consensus types and enums to shared code _(Completed 2025-10-14)_

  - [x] Create ConsensusLabelType enum with 6 values (Perfect Harmony, Strong Consensus, Mixed Opinions, Split Debate, Total Chaos, Insufficient Data)
  - [x] Add consensus interface with label, standardDeviation, and description fields
  - [x] Extend ScoreSummary interface to include consensus field
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - **Implementation Notes**: Added `ConsensusLabelType` enum to `src/shared/enums.ts`, created `ConsensusLabel` interface in `src/shared/types/ScoreSummary.ts`, and extended `ScoreSummary` interface to include consensus field. All shared type definitions are now in place for the consensus labeling feature.

- [x] 2. Implement consensus calculation logic in scoring service _(Completed 2025-10-14)_

  - [x] 2.1 Create standard deviation calculation function _(Completed 2025-10-14)_

    - Write calculateStandardDeviation function that handles edge cases (empty arrays, single values)
    - Implement proper mathematical formula for population standard deviation
    - _Requirements: 1.1, 1.3, 5.3_
    - **Implementation Notes**: Implemented `calculateStandardDeviation` in `scoring.service.ts` with proper population standard deviation formula. Handles edge cases including empty arrays, single values, and invalid numbers (NaN, Infinity). Filters out invalid values and returns 0 for insufficient data scenarios.

  - [x] 2.2 Create consensus label mapping function _(Completed 2025-10-14)_

    - Write calculateConsensusLabel function that maps standard deviation ranges to labels
    - Implement the 5 category system with initial placeholder thresholds (2, 5, 8, 12, 15+)
    - Include descriptive text for each label category
    - Add configuration system for updating thresholds based on empirical data
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
    - **Implementation Notes**: Implemented `calculateConsensusLabel` with configurable `CONSENSUS_THRESHOLDS` object. Maps standard deviation to 5 categories with descriptive text: Perfect Harmony ("Nearly everyone agreed"), Strong Consensus ("Strong agreement with minor differences"), Mixed Opinions ("Community was divided"), Split Debate ("Sharp disagreement between groups"), Total Chaos ("Complete disagreement across the spectrum").

  - [x] 2.3 Integrate consensus calculation into results computation _(Completed 2025-10-14)_

    - Modify finalizeScoreSummary function to include consensus calculation
    - Ensure consensus is calculated and cached when game results are computed
    - Add logging of standard deviation values for empirical calibration
    - Handle error cases gracefully with fallback to "Unable to Calculate"
    - _Requirements: 1.1, 5.1, 5.2, 5.3_
    - **Implementation Notes**: Added `calculateConsensusFromGuesses` function that integrates with existing results computation. Modified `finalizeScoreSummary` to include consensus field. Includes comprehensive error handling with try-catch blocks, graceful fallback to "Insufficient Data" label, and console logging of standard deviation values for empirical calibration.

  - [x] 2.4 Write unit tests for consensus calculation functions _(Completed 2025-10-14)_
    - Test standard deviation calculation with various distributions
    - Test label mapping for all threshold ranges
    - Test edge cases and error handling
    - _Requirements: 1.3, 5.3_
    - **Implementation Notes**: Comprehensive test suite in `src/server/tests/consensus.test.ts` with 20+ test cases covering: standard deviation calculation accuracy, label mapping boundary conditions, edge cases (empty arrays, single values, invalid data), error handling scenarios, and integration tests with different guess distributions (bimodal, uniform, normal). Includes mocking for error scenarios and console output verification.

- [x] 3. Create consensus label display component _(Completed 2025-10-14)_

  - [x] 3.1 Build ConsensusLabel React component _(Completed 2025-10-14)_

    - Create component that displays consensus label with appropriate styling
    - Implement category-specific colors and icons (green, light green, yellow, orange, red, gray)
    - Add tooltip or subtitle with explanatory description text
    - _Requirements: 4.1, 4.2_
    - **Implementation Notes**: Created comprehensive `ConsensusLabel` component in `src/client/components/ConsensusLabel.tsx` with game-themed labels (Perfect Hivemind, Echo Chamber, Battle Royale, Total Anarchy, Dumpster Fire, Insufficient Data). Includes category-specific colors, emoji icons, dot patterns for accessibility, and three variants (default, compact, mobile-full). Supports interactive mode with click handlers and keyboard navigation.

  - [x] 3.2 Ensure mobile responsiveness _(Completed 2025-10-14)_

    - Implement responsive design that works on mobile devices
    - Use appropriate font sizes and touch-friendly interactions
    - Maintain visual hierarchy without overwhelming small screens
    - _Requirements: 4.3_
    - **Implementation Notes**: Implemented responsive design with three variants: default (responsive), compact (minimal space), and mobile-full (optimized for mobile). Uses responsive typography (12-14px on mobile, 16px+ on desktop), touch-friendly minimum heights (32px compact, 56px mobile-full), and maintains visual hierarchy across screen sizes.

  - [x] 3.3 Add accessibility features _(Completed 2025-10-14)_
    - Include proper ARIA labels and semantic HTML
    - Ensure color is not the only way to convey information
    - Support screen readers with meaningful descriptions
    - _Requirements: 4.1, 4.2_
    - **Implementation Notes**: Comprehensive accessibility implementation with proper ARIA labels, semantic HTML (role="status" or "button"), screen reader descriptions, keyboard navigation support, and visual patterns (dot indicators) that supplement color coding. Includes focus management and descriptive tooltips.

- [x] 4. Integrate consensus label into results view _(Completed 2025-10-14)_

  - [x] 4.1 Add consensus section to ResultsView component _(Completed 2025-10-14)_

    - Insert consensus label section between histogram and accolades sections
    - Import and use ConsensusLabel component with proper data flow
    - Handle cases where consensus data might be missing
    - _Requirements: 1.2, 2.1, 4.1_
    - **Implementation Notes**: Successfully integrated ConsensusLabel into `ResultsView.tsx` with proper section placement between histogram and accolades. Added "Community Consensus" section header, proper data flow from `data.scoreSummary.consensus`, and graceful fallback UI for missing consensus data. Fixed TypeScript compilation errors related to strict type checking.

  - [x] 4.2 Update results view styling and layout _(Completed 2025-10-14)_
    - Ensure consensus section fits well with existing results layout
    - Maintain consistent spacing and visual hierarchy
    - Test layout on various screen sizes
    - _Requirements: 4.3_
    - **Implementation Notes**: Integrated consensus section with consistent spacing using design tokens (`spacing.lg`, `spacing.sm`), maintained visual hierarchy with proper section headers, and ensured responsive layout with max-width constraints. Removed unused legacy code and resolved all TypeScript compilation issues for clean integration.

- [x] 5. Handle edge cases and error scenarios

  - [x] 5.1 Implement fallback behavior for insufficient data

    - Display "Insufficient Data" label when fewer than 2 guesses exist
    - Show appropriate messaging for edge cases
    - _Requirements: 1.3, 5.3_

  - [x] 5.2 Add error handling for calculation failures
    - Gracefully handle calculation errors without breaking results display
    - Log errors for debugging while showing fallback UI
    - Ensure results page continues to function normally if consensus fails
    - _Requirements: 5.3_

- [x] 6. Implement empirical calibration system

  - [x] 6.1 Add standard deviation logging

    - Log all calculated standard deviation values to Redis for analysis
    - Create data structure to store historical std dev values
    - Implement efficient storage that doesn't impact performance
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 6.2 Create calibration analysis function

    - Write function to analyze collected std dev data and calculate percentile thresholds
    - Implement logic to determine 20th, 40th, 60th, and 80th percentiles
    - Add validation to ensure sufficient data before recalibration
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 6.3 Add threshold update mechanism
    - Create system to update consensus label thresholds based on empirical data
    - Implement configuration storage for current threshold values
    - Add safeguards to prevent extreme threshold changes
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7. Add integration tests for consensus feature
  - Test consensus calculation in full results computation flow
  - Verify consensus data is properly cached and retrieved
  - Test API responses include consensus data
  - Test empirical calibration system with sample data
  - _Requirements: 5.1, 5.2_
