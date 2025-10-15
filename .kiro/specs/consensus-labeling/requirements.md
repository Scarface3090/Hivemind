# Requirements Document

## Introduction

This feature adds consensus labels to game results that provide qualitative descriptions of how much players agreed or disagreed with each other. The labels are calculated based on the standard deviation of all guesses submitted for a game, giving players and hosts immediate insight into whether the community reached strong consensus, had mixed opinions, or was completely split on the answer.

## Requirements

### Requirement 1

**User Story:** As a player viewing game results, I want to see a consensus label that tells me how much the community agreed on the answer, so that I can quickly understand if there was strong agreement or debate.

#### Acceptance Criteria

1. WHEN a game reaches the results phase THEN the system SHALL calculate a consensus label based on the standard deviation of all submitted guesses
2. WHEN displaying game results THEN the system SHALL show the consensus label prominently alongside other result statistics
3. WHEN there are fewer than 2 guesses THEN the system SHALL display "Insufficient Data" as the consensus label

### Requirement 2

**User Story:** As a host reviewing my game results, I want to understand the level of debate my question generated, so that I can see how thought-provoking or clear-cut my clue was.

#### Acceptance Criteria

1. WHEN viewing results as a host THEN the system SHALL display the consensus label with the same prominence as accuracy metrics
2. WHEN the consensus label indicates high disagreement THEN the system SHALL highlight this as a sign of an engaging, debate-worthy question
3. WHEN the consensus label indicates strong consensus THEN the system SHALL present this as evidence of a clear, well-crafted clue

### Requirement 3

**User Story:** As a developer, I want the consensus labeling system to use 5 distinct categories based on standard deviation ranges, so that players get meaningful and consistent feedback about community agreement levels.

#### Acceptance Criteria

1. WHEN calculating consensus labels THEN the system SHALL use exactly 5 predefined categories: "Perfect Harmony", "Strong Consensus", "Mixed Opinions", "Split Debate", and "Total Chaos"
2. WHEN standard deviation is in the lowest 20% range THEN the system SHALL assign "Perfect Harmony"
3. WHEN standard deviation is in the 20-40% range THEN the system SHALL assign "Strong Consensus"
4. WHEN standard deviation is in the 40-60% range THEN the system SHALL assign "Mixed Opinions"
5. WHEN standard deviation is in the 60-80% range THEN the system SHALL assign "Split Debate"
6. WHEN standard deviation is in the highest 20% range THEN the system SHALL assign "Total Chaos"

### Requirement 4

**User Story:** As a player, I want the consensus label to be visually distinctive and easy to understand, so that I can quickly grasp the community's level of agreement without needing to interpret raw statistics.

#### Acceptance Criteria

1. WHEN displaying consensus labels THEN the system SHALL use distinct visual styling (colors, icons, or badges) for each of the 5 categories
2. WHEN a consensus label is displayed THEN the system SHALL include a brief explanatory tooltip or subtitle describing what the label means
3. WHEN on mobile devices THEN the consensus label SHALL remain clearly visible and readable without compromising the results layout

### Requirement 5

**User Story:** As a system administrator, I want the consensus calculation to be performant and cached appropriately, so that results load quickly even for games with many participants.

#### Acceptance Criteria

1. WHEN calculating consensus labels THEN the system SHALL compute and cache the result when the game transitions to results phase
2. WHEN a game's results are viewed multiple times THEN the system SHALL serve the cached consensus label without recalculation
3. WHEN the consensus calculation fails THEN the system SHALL gracefully fallback to showing "Unable to Calculate" without breaking the results display
