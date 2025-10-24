# Requirements Document

## Introduction

The Dynamic Content System ensures a constant stream of fresh, varied content for Hivemind players by using a CSV-based Content Management System stored in the app's assets folder. The system loads spectrum data from a CSV file on server startup and serves filtered content to hosts when they create new games.

## Glossary

- **Content_Management_System**: CSV file stored in app assets containing spectrum definitions with context, labels, and difficulty ratings
- **Spectrum_Cache**: Redis-based storage of loaded content data for fast retrieval
- **Game_Draft**: Initial game configuration provided to hosts before they set their clue for the secret target
- **Content_Row**: Individual entry in the CSV file containing spectrum definition data
- **Hivemind_Backend**: Devvit serverless backend responsible for content loading and game management
- **Assets_Folder**: Devvit's built-in static file storage accessible during server runtime

## Requirements

### Requirement 1

**User Story:** As a Host, I want to select from available contexts and difficulty levels when creating games, so that I can choose content that matches my preferences and engage players with diverse content.

#### Acceptance Criteria

1. WHEN a Host accesses the Host Game View, THE Hivemind_Backend SHALL provide all available Context values from the Spectrum_Cache in a visually appealing card format
2. WHEN a Host selects a Context card, THE Hivemind_Backend SHALL prompt the Host to choose from available Difficulty levels for that Context
3. WHEN a Host selects both Context and Difficulty, THE Hivemind_Backend SHALL randomly select one Content_Row matching the specified Context and Difficulty filters
4. THE Hivemind_Backend SHALL return the selected Content_Row containing Context, Left_Label, and Right_Label fields
5. THE Hivemind_Backend SHALL provide filtered spectrum data within 500 milliseconds of the Host's selection

### Requirement 2

**User Story:** As a System Administrator, I want the backend to automatically load content from the CSV assets file, so that spectrum data is available immediately when the server starts.

#### Acceptance Criteria

1. WHEN the Hivemind_Backend starts up, THE Hivemind_Backend SHALL load the complete contents of the Content_Management_System from the Assets_Folder
2. THE Hivemind_Backend SHALL parse the CSV file and cache all Content_Rows in the Spectrum_Cache for fast retrieval
3. THE Hivemind_Backend SHALL validate that each Content_Row contains required fields: ID, Context, Left_Label, Right_Label, and Difficulty
4. IF the Content_Management_System file is missing or corrupted during startup, THEN THE Hivemind_Backend SHALL use fallback spectrum data and log the error
5. THE Hivemind_Backend SHALL log successful content loading operations with the number of Content_Rows retrieved

### Requirement 3

**User Story:** As a Content Manager, I want to update spectrum content by modifying the CSV file and redeploying the app, so that new content becomes available to players.

#### Acceptance Criteria

1. WHEN the app is redeployed with an updated CSV file, THE Hivemind_Backend SHALL load the new content on server startup
2. THE Hivemind_Backend SHALL replace the existing Spectrum_Cache with newly loaded content only after successful validation
3. THE Hivemind_Backend SHALL maintain backward compatibility with existing game sessions during content updates
4. IF the updated CSV file contains validation errors, THEN THE Hivemind_Backend SHALL log specific error details for each invalid row
5. THE Hivemind_Backend SHALL continue serving valid content rows even when some rows fail validation

### Requirement 4

**User Story:** As a Developer, I want the system to handle CSV file loading errors gracefully, so that the game remains playable even when the content file has issues.

#### Acceptance Criteria

1. IF the Content_Management_System file cannot be read, THEN THE Hivemind_Backend SHALL log the error details and use fallback spectrum data
2. WHEN the CSV file contains malformed rows, THE Hivemind_Backend SHALL skip invalid rows and continue processing valid ones
3. THE Hivemind_Backend SHALL provide detailed error logging for each type of parsing failure encountered
4. THE Hivemind_Backend SHALL ensure at least 3 fallback Content_Rows are always available for game creation
5. WHERE the CSV file is completely empty or missing, THE Hivemind_Backend SHALL use hardcoded fallback spectra and log a warning

### Requirement 5

**User Story:** As a Content Manager, I want to ensure content quality by having the system validate spectrum data, so that only properly formatted content reaches players.

#### Acceptance Criteria

1. THE Hivemind_Backend SHALL validate that each Content_Row contains a unique ID field
2. THE Hivemind_Backend SHALL accept any non-empty string value for the Context field to allow for dynamic expansion of content categories
3. THE Hivemind_Backend SHALL ensure Left_Label and Right_Label fields contain non-empty string values with maximum length of 50 characters
4. THE Hivemind_Backend SHALL validate that Difficulty field matches enum values: Easy, Medium, Hard
5. IF any Content_Row fails validation, THEN THE Hivemind_Backend SHALL exclude it from the Spectrum_Cache and log the validation error
