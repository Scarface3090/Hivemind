# Implementation Plan

- [x] 1. Set up CSV assets infrastructure and data models

  - Use CSV file in assets folder with initial spectrum data including multiple contexts and difficulty levels (csv file is already added in the folder, use it directly. dont change it)
  - Update shared types to support dynamic context values instead of fixed enums
  - Enhance Spectrum interface to handle new CSV-based data structure
  - _Requirements: 2.1, 2.2, 5.2, 5.3_

- [x] 2. Implement CSV parsing and content loading service

  - [x] 2.1 Create CSV parsing utilities in content service

    - Write functions to read and parse CSV file from assets folder
    - Implement row validation logic for required fields (ID, Context, Left_Label, Right_Label, Difficulty)
    - Add error handling for malformed CSV rows with detailed logging
    - _Requirements: 2.1, 2.3, 4.2, 4.3_

  - [x] 2.2 Enhance content service with context filtering capabilities

    - Implement getAvailableContexts function to return unique context values
    - Create getFilteredSpectrum function to return random spectrum by context and difficulty
    - Add getContextsWithCounts function to provide context statistics for UI
    - _Requirements: 1.1, 1.3, 2.2_

  - [x] 2.3 Implement Redis-based caching with context indexing
    - Create Redis key structure for efficient context and difficulty filtering
    - Implement cache population on server startup with CSV data
    - Add fallback mechanism when CSV loading fails
    - _Requirements: 2.2, 4.1, 4.4, 4.5_

- [x] 3. Create new API endpoints for context selection

  - [x] 3.1 Implement contexts API endpoint

    - Create GET /api/contexts route to return available contexts with counts
    - Add proper error handling and response validation
    - Implement caching headers for optimal performance
    - _Requirements: 1.1, 1.5_

  - [x] 3.2 Enhance draft API with filtering support
    - Modify existing POST /api/draft endpoint to accept optional context and difficulty parameters
    - Implement filtered spectrum selection when parameters provided
    - Maintain backward compatibility for random selection when no filters specified
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 4. Build context selection UI components

  - [x] 4.1 Create ContextSelector component

    - Design and implement context cards with visual appeal and touch-friendly interaction
    - Display context names with spectrum counts for each context
    - Add loading states and error handling for context fetching
    - _Requirements: 1.1_

  - [x] 4.2 Create DifficultySelector component

    - Implement difficulty level selection with available count display
    - Add visual feedback for selected difficulty level
    - Handle cases where no spectra available for selected difficulty
    - _Requirements: 1.2_

  - [x] 4.3 Integrate selection flow into HostView
    - Modify HostView to include context selection step before clue input
    - Add difficulty selection after context choice
    - Update form validation to include context and difficulty selection
    - Maintain existing draft flow with enhanced filtering parameters
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 5. Implement server startup initialization

  - [x] 5.1 Add CSV loading to server startup sequence

    - Integrate CSV loading into server initialization process
    - Implement startup validation to ensure content is loaded successfully
    - Add logging for successful content loading with row counts
    - _Requirements: 2.1, 2.5_

  - [x] 5.2 Create fallback content system
    - Define hardcoded fallback spectra with multiple contexts and difficulties
    - Implement automatic fallback when CSV loading fails
    - Ensure minimum of 3 fallback spectra always available
    - _Requirements: 4.1, 4.4, 4.5_

- [x] 6. Update spectrum validation for dynamic contexts **[Not needed with embedded content]**

  - [x] 6.1 Modify spectrum schema validation **[Not needed with embedded content]**

    - ~~Update Zod schemas to accept dynamic context strings instead of fixed enum values~~ - Already implemented: `context: z.string().min(1)`
    - ~~Enhance difficulty validation to handle string-to-enum conversion~~ - Already implemented in `toEnumValue()` function
    - ~~Add validation for required CSV fields (ID, Context, Left_Label, Right_Label, Difficulty)~~ - Already implemented in `parseCsvRow()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.2 Implement comprehensive error handling **[Not needed with embedded content]**
    - ~~Add detailed error logging for each type of validation failure~~ - Already implemented with specific error messages
    - ~~Implement graceful degradation when content validation fails~~ - Already implemented with multi-tier fallback system
    - ~~Create error recovery mechanisms for partial CSV parsing failures~~ - Already implemented: invalid rows skipped, valid ones kept
    - _Requirements: 4.2, 4.3, 5.5_

- [x] 7. Integration and testing

  - [x] 7.1 Connect frontend components to backend APIs

    - Wire ContextSelector to contexts API endpoint
    - Connect DifficultySelector to filtered content selection
    - Implement optimistic UI updates for smooth user experience
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 7.2 Add comprehensive error handling and loading states

    - Implement error boundaries for context selection components
    - Add loading spinners and skeleton states for async operations
    - Create user-friendly error messages for content loading failures
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]\* 7.3 Write unit tests for core functionality
    - Create tests for CSV parsing and validation logic
    - Test context filtering and spectrum selection functions
    - Add tests for error handling and fallback mechanisms
    - _Requirements: 2.3, 4.2, 5.5_
