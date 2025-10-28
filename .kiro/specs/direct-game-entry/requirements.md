# Requirements Document

## Introduction

This feature improves the user experience for joining hosted Hivemind games by eliminating unnecessary navigation steps. When a hosted game appears in the Reddit subreddit feed, users should be able to immediately see and interact with the guessing interface rather than being presented with generic navigation options.

## Glossary

- **Hivemind_App**: The Reddit Devvit application that hosts the Hivemind game
- **Hosted_Game**: A game that has been created by a host user and is actively accepting guesses
- **Subreddit_Feed**: The main Reddit feed where Hivemind game posts appear
- **Guessing_View**: The interactive interface where players can submit their guesses using the spectrum slider
- **Home_Screen**: The generic landing page with "Host Game" and "View Active Games" buttons
- **Game_Post**: A Reddit post created by the Hivemind app representing a specific game instance

## Requirements

### Requirement 1

**User Story:** As a Reddit user browsing the subreddit feed, I want to immediately see the guessing interface when I click on a hosted Hivemind game post, so that I can quickly participate without additional navigation.

#### Acceptance Criteria

1. WHEN a user clicks on a Hosted_Game post in the Subreddit_Feed, THE Hivemind_App SHALL display the Guessing_View directly
2. WHILE a Hosted_Game is in the guessing phase, THE Hivemind_App SHALL show the game clue, spectrum slider, and current median
3. THE Hivemind_App SHALL NOT display the Home_Screen for users accessing a Hosted_Game post
4. WHEN a user accesses a Hosted_Game post, THE Hivemind_App SHALL load the specific game data for that post
5. IF a Hosted_Game has ended, THEN THE Hivemind_App SHALL display the results view instead of the Guessing_View

### Requirement 2

**User Story:** As a host user, I want my hosted game to appear as an interactive game post in the subreddit feed, so that other users can immediately start guessing without confusion.

#### Acceptance Criteria

1. WHEN a host publishes a game, THE Hivemind_App SHALL create a Game_Post that directly opens to the Guessing_View
2. THE Hivemind_App SHALL associate each Game_Post with its specific game instance data
3. WHILE the game is active, THE Hivemind_App SHALL display real-time game state in the Game_Post
4. THE Hivemind_App SHALL maintain the game context when users navigate to the Game_Post from the Subreddit_Feed

### Requirement 3

**User Story:** As a developer, I want the app to intelligently route users based on the context of how they accessed the game, so that the user experience is optimized for each entry point.

#### Acceptance Criteria

1. WHEN a user accesses the Hivemind_App from a specific Game_Post, THE Hivemind_App SHALL detect the game context automatically
2. WHEN a user accesses the Hivemind_App from the general subreddit or app menu, THE Hivemind_App SHALL display the Home_Screen
3. THE Hivemind_App SHALL distinguish between direct game access and general app access
4. IF game context cannot be determined, THEN THE Hivemind_App SHALL fallback to the Home_Screen
5. THE Hivemind_App SHALL handle invalid or expired game contexts gracefully
