# Hivemind Visual Redesign - Design Document

## Overview

This design document outlines the technical approach for recreating Hivemind with an artistic, hand-drawn visual style while preserving all existing functionality. The redesign transforms the current digital interface into a creative workshop aesthetic featuring paper textures, brush stroke animations, and organic particle effects.

## Architecture

### High-Level Architecture

The redesigned Hivemind maintains the existing monorepo structure while enhancing the visual layer:

```
├── src/client/              # Enhanced React + Phaser frontend
│   ├── components/          # Artistic UI components
│   ├── game/               # Enhanced Phaser scenes with particle systems
│   ├── styles/             # Artistic design system implementation
│   └── animations/         # Brush stroke and particle animation utilities
├── src/server/             # Preserved Express backend
└── src/shared/             # Enhanced types for visual effects
```

### Visual Enhancement Layer

The design introduces a new visual enhancement layer that wraps existing functionality:

- **Artistic Theme Provider**: Manages design system tokens and artistic styling
- **Particle System Manager**: Coordinates organic animations and effects
- **Brush Stroke Engine**: Handles hand-drawn visual elements
- **Performance Monitor**: Ensures 60fps with enhanced visuals

## Components and Interfaces

### Enhanced Design System

#### Color Palette (Based on Reference Assets)
```typescript
interface ArtisticColorPalette {
  background: {
    paper: '#F5F1E8';           // Warm beige paper texture
    card: '#FFFFFF';            // Clean white cards
    accent: '#2B4C7E';          // Deep blue accents
  };
  interactive: {
    orange: '#FF6B35';          // Vibrant orange brush strokes
    green: '#4CAF50';           // Fresh green elements
    teal: '#26A69A';            // Calming teal accents
    blue: '#2B4C7E';            // Primary blue elements
  };
  text: {
    primary: '#2C3E50';         // Dark charcoal for readability
    handwritten: '#1A1A1A';     // Hand-lettered text
  };
}
```

#### Typography System
```typescript
interface ArtisticTypography {
  fonts: {
    handwritten: 'Kalam, cursive';        // Hand-drawn style
    display: 'Fredoka One, cursive';      // Bold display text
    body: 'Open Sans, sans-serif';        // Clean body text
  };
  effects: {
    roughPaper: 'filter: contrast(1.1) brightness(0.98)';
    handDrawn: 'text-shadow: 1px 1px 2px rgba(0,0,0,0.1)';
  };
}
```

### Component Architecture

#### 1. Artistic Main Screen
```typescript
interface MainScreenProps {
  backgroundTexture: PaperTexture;
  gamePrompt: HandLettering;
  actionButtons: BrushStrokeButton[];
  decorativeElements: OrganicShape[];
}

// Implementation preserves existing functionality while adding artistic styling
const ArtisticMainScreen: React.FC = () => {
  return (
    <PaperBackground texture="notebook">
      <HandLettering text="ARE YOU GAME?" style="bold-sketch" />
      <BrushStrokeButton 
        color="green" 
        text="JOIN" 
        onClick={handleJoinGame}
        particles={{ trail: true, burst: false }}
      />
      <BrushStrokeButton 
        color="teal" 
        text="HOST" 
        onClick={handleHostGame}
        particles={{ trail: true, burst: false }}
      />
      <OrganicDecorations elements={["circles", "brushStrokes"]} />
    </PaperBackground>
  );
};
```

#### 2. Enhanced Host Flow Components
```typescript
interface HostFlowStep {
  step: 'context' | 'difficulty' | 'spectrum' | 'clue' | 'prediction' | 'duration';
  component: React.ComponentType;
  transition: BrushStrokeTransition;
}

// Context Selection with Artistic Cards
const ContextSelector: React.FC = () => {
  const contexts = [
    'Movies', 'Food', 'Gaming', 'Technology', 'Social Media',
    'Life Skills', 'Relationships', 'Lifestyle', 'Entertainment', 'Internet Culture'
  ];
  
  return (
    <ArtisticGrid>
      {contexts.map(context => (
        <ContextCard
          key={context}
          title={context}
          style="hand-drawn"
          hoverEffect="brush-stroke-glow"
          particles={{ ambient: true }}
        />
      ))}
    </ArtisticGrid>
  );
};

// Duration Selector with Artistic Buttons
const DurationSelector: React.FC = () => {
  const durations = ['1hr', '3hr', '6hr', '24hr'];
  
  return (
    <ButtonGroup orientation="artistic-scattered">
      {durations.map(duration => (
        <ArtisticButton
          key={duration}
          variant="duration"
          brushStroke="orange"
          text={duration}
          particles={{ onSelect: true }}
        />
      ))}
    </ButtonGroup>
  );
};
```

#### 3. Enhanced Spectrum Slider
```typescript
interface ArtisticSpectrumSlider {
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (value: number) => void;
  showMedian?: boolean;
  particles: ParticleConfig;
}

const ArtisticSpectrumSlider: React.FC<ArtisticSpectrumSlider> = ({
  leftLabel,
  rightLabel,
  value,
  onChange,
  showMedian,
  particles
}) => {
  return (
    <SliderContainer style="hand-drawn-frame">
      <HandLettering text={leftLabel} position="left" />
      <HandLettering text={rightLabel} position="right" />
      
      <PhaserSlider
        value={value}
        onChange={onChange}
        visualEffects={{
          track: 'brush-stroke-gradient',
          thumb: 'artistic-circle',
          trail: particles.trail,
          median: showMedian ? 'pulsing-indicator' : null
        }}
        particles={{
          onMove: particles.onMove,
          colors: ['#FF6B35', '#4CAF50', '#26A69A']
        }}
      />
      
      {showMedian && (
        <MedianIndicator 
          position={medianValue}
          style="organic-pulse"
          particles={{ ambient: true }}
        />
      )}
    </SliderContainer>
  );
};
```

### Particle System Architecture

#### Particle Engine Design
```typescript
interface ParticleSystem {
  engine: 'phaser' | 'canvas';
  maxParticles: number;
  performance: 'high' | 'medium' | 'low';
  effects: ParticleEffect[];
}

interface ParticleEffect {
  type: 'trail' | 'burst' | 'ambient' | 'celebration';
  colors: string[];
  physics: ParticlePhysics;
  lifecycle: ParticleLifecycle;
}

// Brush Stroke Trail Effect
const BrushStrokeTrail: ParticleEffect = {
  type: 'trail',
  colors: ['#FF6B35', '#4CAF50', '#26A69A'],
  physics: {
    gravity: 0.1,
    friction: 0.95,
    initialVelocity: { min: 2, max: 5 }
  },
  lifecycle: {
    spawn: 'continuous',
    duration: 800,
    fadeOut: 'exponential'
  }
};

// Organic Burst Effect
const OrganicBurst: ParticleEffect = {
  type: 'burst',
  colors: ['#FF6B35', '#FFA726', '#FFD54F'],
  physics: {
    gravity: 0.2,
    friction: 0.92,
    initialVelocity: { min: 8, max: 15 },
    spread: 360
  },
  lifecycle: {
    spawn: 'instant',
    count: 25,
    duration: 1200,
    fadeOut: 'linear'
  }
};
```

## Data Models

### Enhanced Visual State Management

#### Artistic Theme State
```typescript
interface ArtisticThemeState {
  currentTheme: 'notebook' | 'sketchpad' | 'canvas';
  paperTexture: PaperTexture;
  brushSettings: BrushSettings;
  particleQuality: 'high' | 'medium' | 'low';
  animationSpeed: number;
}

interface BrushSettings {
  primaryColor: string;
  secondaryColor: string;
  strokeWidth: number;
  opacity: number;
  texture: 'rough' | 'smooth' | 'textured';
}
```

#### Enhanced Game State
```typescript
// Extends existing GameState with visual enhancements
interface EnhancedGameState extends GameState {
  visualEffects: {
    currentAnimation?: AnimationState;
    particleEffects: ActiveParticleEffect[];
    transitionState: TransitionState;
  };
  hostFlow: {
    currentStep: HostFlowStep;
    completedSteps: HostFlowStep[];
    selectedContext?: string;
    selectedDifficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    selectedDuration?: '1hr' | '3hr' | '6hr' | '24hr';
    hostPrediction?: number;
  };
}
```

### Performance Optimization Models

#### Particle Performance Manager
```typescript
interface ParticlePerformanceConfig {
  deviceTier: 'high' | 'medium' | 'low';
  maxParticles: number;
  qualitySettings: {
    enableTrails: boolean;
    enableBursts: boolean;
    enableAmbient: boolean;
    particleSize: number;
    updateFrequency: number;
  };
}

// Adaptive performance based on device capabilities
const getPerformanceConfig = (deviceInfo: DeviceInfo): ParticlePerformanceConfig => {
  if (deviceInfo.gpu === 'high' && deviceInfo.memory > 4000) {
    return {
      deviceTier: 'high',
      maxParticles: 100,
      qualitySettings: {
        enableTrails: true,
        enableBursts: true,
        enableAmbient: true,
        particleSize: 1.0,
        updateFrequency: 60
      }
    };
  }
  // ... medium and low configurations
};
```

## Error Handling

### Visual Effect Error Boundaries

#### Particle System Fallbacks
```typescript
class ParticleSystemErrorBoundary extends React.Component {
  state = { hasError: false, fallbackMode: false };

  static getDerivedStateFromError(error: Error) {
    // Fallback to CSS animations if particle system fails
    return { hasError: true, fallbackMode: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('Particle system error, falling back to CSS animations:', error);
    // Report to monitoring service
  }

  render() {
    if (this.state.fallbackMode) {
      return (
        <CSSAnimationProvider>
          {this.props.children}
        </CSSAnimationProvider>
      );
    }

    return this.props.children;
  }
}
```

#### Performance Degradation Handling
```typescript
interface PerformanceMonitor {
  fps: number;
  frameDrops: number;
  memoryUsage: number;
}

const usePerformanceOptimization = () => {
  const [performanceLevel, setPerformanceLevel] = useState<'high' | 'medium' | 'low'>('high');
  
  useEffect(() => {
    const monitor = new PerformanceMonitor();
    
    monitor.onPerformanceDrop((metrics) => {
      if (metrics.fps < 30) {
        setPerformanceLevel('low');
        // Disable complex particle effects
      } else if (metrics.fps < 45) {
        setPerformanceLevel('medium');
        // Reduce particle count
      }
    });
    
    return () => monitor.cleanup();
  }, []);
  
  return performanceLevel;
};
```

## Testing Strategy

### Visual Regression Testing

#### Component Visual Testing
```typescript
// Visual testing for artistic components
describe('Artistic Components', () => {
  test('MainScreen renders with correct artistic styling', async () => {
    const { container } = render(<ArtisticMainScreen />);
    
    // Test paper texture background
    expect(container.querySelector('.paper-background')).toBeInTheDocument();
    
    // Test hand-lettered text
    expect(container.querySelector('.hand-lettering')).toHaveStyle({
      fontFamily: 'Kalam, cursive'
    });
    
    // Test brush stroke buttons
    const buttons = container.querySelectorAll('.brush-stroke-button');
    expect(buttons).toHaveLength(2);
  });

  test('SpectrumSlider shows particle effects on interaction', async () => {
    const mockOnChange = jest.fn();
    render(
      <ArtisticSpectrumSlider
        leftLabel="Coffee"
        rightLabel="Tea"
        value={50}
        onChange={mockOnChange}
        particles={{ trail: true, onMove: true }}
      />
    );
    
    // Test particle system initialization
    expect(ParticleSystem.getInstance()).toBeDefined();
  });
});
```

#### Performance Testing
```typescript
describe('Performance Optimization', () => {
  test('particle system maintains 60fps on high-end devices', async () => {
    const performanceMonitor = new PerformanceMonitor();
    
    render(<ParticleSystemProvider quality="high">
      <ArtisticGameInterface />
    </ParticleSystemProvider>);
    
    // Simulate heavy interaction
    await simulateSliderMovement(100);
    
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.averageFPS).toBeGreaterThan(55);
  });

  test('gracefully degrades on low-end devices', async () => {
    // Mock low-end device
    mockDeviceCapabilities({ gpu: 'low', memory: 2000 });
    
    render(<ArtisticGameInterface />);
    
    // Verify reduced particle count
    const particleSystem = ParticleSystem.getInstance();
    expect(particleSystem.maxParticles).toBeLessThan(50);
  });
});
```

### Integration Testing

#### Host Flow Integration
```typescript
describe('Enhanced Host Flow', () => {
  test('complete host flow with visual feedback', async () => {
    const { user } = renderWithProviders(<HostFlow />);
    
    // Step 1: Context Selection
    await user.click(screen.getByText('Movies'));
    expect(screen.getByTestId('context-selected')).toHaveClass('brush-stroke-selected');
    
    // Step 2: Difficulty Selection
    await user.click(screen.getByText('Medium'));
    expect(screen.getByTestId('difficulty-selected')).toBeInTheDocument();
    
    // Step 3: Spectrum Assignment
    expect(screen.getByTestId('spectrum-display')).toBeInTheDocument();
    
    // Step 4: Clue Input
    await user.type(screen.getByPlaceholderText('Enter your clue'), 'Test clue');
    
    // Step 5: Host Prediction
    const slider = screen.getByTestId('prediction-slider');
    await user.drag(slider, { delta: { x: 100, y: 0 } });
    
    // Step 6: Duration Selection
    await user.click(screen.getByText('3hr'));
    
    // Step 7: Submit
    await user.click(screen.getByText('Create Game'));
    
    // Verify game creation
    expect(mockCreateGame).toHaveBeenCalledWith({
      context: 'Movies',
      difficulty: 'MEDIUM',
      clue: 'Test clue',
      hostPrediction: expect.any(Number),
      duration: '3hr'
    });
  });
});
```

## Implementation Phases

### Phase 1: Core Visual System (Week 1-2)
- Implement artistic design system and theme provider
- Create paper texture backgrounds and hand-lettered typography
- Build basic brush stroke button components
- Set up particle system foundation

### Phase 2: Enhanced Components (Week 3-4)
- Implement artistic main screen with organic animations
- Create enhanced spectrum slider with particle trails
- Build context and difficulty selection interfaces
- Add duration selector with artistic styling

### Phase 3: Host Flow Enhancement (Week 5-6)
- Implement complete step-by-step host flow
- Add visual progress indicators and breadcrumb navigation
- Create host prediction interface with median visualization
- Integrate all host flow components with smooth transitions

### Phase 4: Game Interface Enhancement (Week 7-8)
- Enhance guessing interface with live median updates
- Implement competitive scoring visualization
- Create dramatic results revelation with particle celebrations
- Add achievement badges and accolades display

### Phase 5: Performance & Polish (Week 9-10)
- Optimize particle systems for mobile performance
- Implement adaptive quality settings
- Add comprehensive error handling and fallbacks
- Conduct thorough testing and bug fixes

## Technical Considerations

### Devvit Platform Integration
- Maintain compatibility with Devvit's serverless environment
- Ensure proper webview loading and initialization
- Preserve existing API endpoints and data structures
- Optimize bundle size for platform constraints

### Mobile Performance
- Implement touch-optimized interactions with haptic-like feedback
- Use CSS transforms for smooth animations
- Optimize particle count based on device capabilities
- Provide fallback animations for unsupported features

### Accessibility
- Maintain keyboard navigation for all interactive elements
- Provide alternative text for decorative visual elements
- Ensure sufficient color contrast for hand-lettered text
- Support reduced motion preferences

This design document provides a comprehensive technical foundation for implementing the artistic Hivemind redesign while preserving all existing functionality and ensuring optimal performance across all devices.
