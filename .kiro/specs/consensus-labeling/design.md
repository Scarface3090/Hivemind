# Design Document

## Overview

The consensus labeling feature adds qualitative labels to game results that describe the level of agreement among players based on the standard deviation of their guesses. This enhancement provides immediate visual feedback about community consensus without requiring players to interpret raw statistical data.

The feature integrates into the existing results display system by adding a new consensus label component alongside the current histogram and accolades sections. The labels are calculated server-side during the results computation phase and cached for performance.

## Architecture

### Data Flow
1. **Calculation Phase**: When a game transitions to results, the server calculates standard deviation of all guesses
2. **Labeling Phase**: Standard deviation is mapped to one of 5 predefined consensus categories
3. **Caching Phase**: Consensus label is stored with other game results for fast retrieval
4. **Display Phase**: Client renders the consensus label with appropriate styling and explanatory text

### Integration Points
- **Server**: Extends `scoring.service.ts` to calculate consensus labels during results computation
- **Types**: Adds consensus label fields to `ScoreSummary` interface
- **Client**: Adds consensus display component to `ResultsView.tsx`
- **API**: No new endpoints needed - consensus data flows through existing results API

## Components and Interfaces

### Server-Side Components

#### Consensus Calculation Service
```typescript
// New functions in scoring.service.ts
export const calculateConsensusLabel = (guesses: Guess[]): ConsensusLabel
export const calculateStandardDeviation = (values: number[]): number
```

#### Enhanced ScoreSummary Type
```typescript
// Addition to ScoreSummary interface
export interface ScoreSummary {
  // ... existing fields
  consensus: {
    label: ConsensusLabelType;
    standardDeviation: number;
    description: string;
  };
}

export enum ConsensusLabelType {
  PerfectHarmony = 'PERFECT_HARMONY',
  StrongConsensus = 'STRONG_CONSENSUS', 
  MixedOpinions = 'MIXED_OPINIONS',
  SplitDebate = 'SPLIT_DEBATE',
  TotalChaos = 'TOTAL_CHAOS',
  InsufficientData = 'INSUFFICIENT_DATA'
}
```

### Client-Side Components

#### ConsensusLabel Component
```typescript
interface ConsensusLabelProps {
  consensus: {
    label: ConsensusLabelType;
    standardDeviation: number;
    description: string;
  };
  className?: string;
}
```

#### Integration in ResultsView
The consensus label will be displayed as a new section between the histogram and accolades, featuring:
- Prominent visual styling with category-specific colors
- Icon or emoji to reinforce the meaning
- Tooltip or subtitle with explanatory text
- Responsive design for mobile devices

## Data Models

### Consensus Label Mapping
The standard deviation ranges use empirical calibration based on real game data to ensure balanced distribution across all labels:

| Label | Standard Deviation Range | Color | Icon | Description |
|-------|-------------------------|-------|------|-------------|
| Perfect Harmony | Bottom 20% of games | Green (#4ade80) | 🤝 | "Nearly everyone agreed" |
| Strong Consensus | 20th-40th percentile | Light Green (#84cc16) | ✅ | "Strong agreement with minor differences" |
| Mixed Opinions | 40th-60th percentile | Yellow (#eab308) | 🤔 | "Community was divided" |
| Split Debate | 60th-80th percentile | Orange (#f97316) | ⚖️ | "Sharp disagreement between groups" |
| Total Chaos | Top 20% of games | Red (#ef4444) | 🌪️ | "Complete disagreement across the spectrum" |
| Insufficient Data | <2 guesses | Gray (#6b7280) | ❓ | "Not enough data to determine consensus" |

**Initial Implementation**: Start with placeholder thresholds (2, 5, 8, 12, 15+) based on estimated distributions, then calibrate using real data.

**Calibration Process**: 
1. Log standard deviation values for all completed games
2. After collecting 100+ games, analyze the distribution
3. Set thresholds at 20th, 40th, 60th, and 80th percentiles
4. Update thresholds periodically to maintain balanced label distribution

### Standard Deviation Calculation
```typescript
const calculateStandardDeviation = (values: number[]): number => {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.sqrt(variance);
};
```

## Error Handling

### Server-Side Error Handling
- **Empty guess array**: Return `InsufficientData` label
- **Single guess**: Return `InsufficientData` label  
- **Calculation errors**: Log error and return `InsufficientData` with fallback description
- **Invalid guess values**: Filter out invalid values before calculation

### Client-Side Error Handling
- **Missing consensus data**: Display generic "Unable to calculate" message
- **Rendering errors**: Gracefully degrade to showing just the standard deviation number
- **Mobile layout issues**: Ensure consensus label remains visible with responsive design

### Fallback Behavior
If consensus calculation fails at any point, the system will:
1. Log the error for debugging
2. Display "Unable to Calculate" with gray styling
3. Continue showing all other results normally
4. Not break the overall results page functionality

## Testing Strategy

### Unit Tests
- **Standard deviation calculation**: Test with various guess distributions
- **Label mapping**: Verify correct labels for different standard deviation ranges
- **Edge cases**: Empty arrays, single values, extreme distributions
- **Error handling**: Invalid inputs, calculation failures

### Integration Tests
- **Results computation**: Verify consensus labels are included in computed results
- **Caching**: Ensure consensus labels are properly cached and retrieved
- **API responses**: Confirm consensus data flows through existing endpoints

### Visual Testing
- **Component rendering**: Verify consensus labels display correctly across devices
- **Color accessibility**: Ensure sufficient contrast for all label colors
- **Responsive design**: Test layout on various screen sizes
- **Tooltip functionality**: Verify explanatory text displays properly

### Performance Testing
- **Calculation speed**: Measure consensus calculation time for large guess sets
- **Memory usage**: Monitor memory impact of additional data storage
- **Cache efficiency**: Verify consensus labels don't significantly impact cache size

## Implementation Notes

### Performance Considerations
- Consensus calculation is O(n) complexity, minimal performance impact
- Standard deviation calculation happens once per game during results computation
- Results are cached, so consensus labels don't impact repeated result views
- Additional data storage per game is minimal (~100 bytes)

### Accessibility
- Use semantic HTML with proper ARIA labels
- Ensure color is not the only way to convey information (icons + text)
- Provide descriptive alt text for consensus icons
- Support screen readers with meaningful descriptions

### Mobile Optimization
- Consensus label uses responsive typography (12-14px on mobile)
- Touch-friendly tooltip activation
- Maintains visual hierarchy without overwhelming small screens
- Integrates seamlessly with existing mobile results layout
