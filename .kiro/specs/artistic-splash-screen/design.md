# Design Document

## Overview

This design enhances the existing Hivemind splash screen by replacing the current static background with an animated, artistic notebook-style composition created using Phaser 3. The design maintains all existing dynamic content functionality (buildSplashScreen function, contextual descriptions, adaptive headings) while adding a vibrant, hand-drawn aesthetic that brings the "HIVEMIND" brand to life through colorful letter blocks and scattered art supplies.

The implementation leverages the existing Phaser 3 infrastructure already present in the project, creating a new SplashScene that renders the artistic background as an animated canvas, which then gets exported as a static image asset for use in the Devvit splash screen configuration.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Devvit Splash Screen                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Dynamic Content Layer                      │ │
│  │  • buildSplashScreen() function                        │ │
│  │  • Contextual descriptions                             │ │
│  │  • Adaptive headings & buttons                         │ │
│  │  • Game clue & spectrum preview                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Artistic Background Layer                  │ │
│  │  • Phaser-generated artistic background                │ │
│  │  • Colorful "HIVEMIND" letter blocks                   │ │
│  │  • Scattered art supplies with animations              │ │
│  │  • Notebook paper aesthetic with spiral binding        │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Component Integration

The design integrates with existing systems:

1. **Existing Splash System**: Maintains current `buildSplashScreen()` function and dynamic content
2. **Phaser Infrastructure**: Utilizes existing Phaser 3 setup and scene management
3. **Asset Pipeline**: Leverages current Vite build system and media directory configuration
4. **Devvit Integration**: Works within existing Devvit Web architecture

## Components and Interfaces

### 1. SplashScene (New Phaser Scene)

**Purpose**: Creates the animated artistic background composition

**Key Responsibilities**:
- Render notebook paper background with spiral binding
- Create and animate colorful "HIVEMIND" letter blocks
- Add scattered art supplies with subtle animations
- Export final composition as static image asset

**Interface**:
```typescript
class SplashScene extends Phaser.Scene {
  constructor();
  preload(): void;           // Load art assets and fonts
  create(): void;            // Build artistic composition
  animateLetters(): void;    // Staggered letter block animations
  animateArtSupplies(): void; // Floating/rotation animations
  exportBackground(): void;   // Generate static background image
}
```

### 2. Artistic Asset System

**Purpose**: Manages individual visual elements and their animations

**Components**:
- **LetterBlock**: Individual animated letter tiles
- **ArtSupply**: Pencils, erasers, paint blobs, sticky notes
- **NotebookBackground**: Paper texture with spiral binding
- **LightbulbIcon**: Animated idea representation

**Interface**:
```typescript
interface ArtisticElement {
  sprite: Phaser.GameObjects.Sprite;
  animation: Phaser.Tweens.Tween;
  position: { x: number; y: number };
  rotation?: number;
  scale?: number;
}

interface LetterBlock extends ArtisticElement {
  letter: string;
  color: string;
  entranceDelay: number;
}

interface ArtSupply extends ArtisticElement {
  type: 'pencil' | 'eraser' | 'paint' | 'sticky-note' | 'lightbulb';
  animationType: 'float' | 'rotate' | 'pulse' | 'morph';
}
```

### 3. Asset Generation System

**Purpose**: Converts Phaser scene to both background and logo assets

**Process**:
1. Render complete artistic composition in Phaser for background (1024x768)
2. Render focused "HIVEMIND" lettering composition for logo (500x108)
3. Capture both scenes as high-resolution images
4. Export as optimized PNG assets matching existing dimensions
5. Replace both existing bg.png and logo.png in media directory

**Interface**:
```typescript
interface AssetGenerator {
  scene: SplashScene;
  captureBackground(): Promise<Blob>;
  captureLogo(): Promise<Blob>;
  optimizeImage(blob: Blob): Promise<Blob>;
  saveAsAsset(blob: Blob, filename: string): Promise<void>;
  generateBothAssets(): Promise<void>;
}
```

## Data Models

### Artistic Composition Configuration

```typescript
interface SplashComposition {
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
  };
  
  notebook: {
    paperColor: string;
    lineColor: string;
    spiralBinding: {
      visible: boolean;
      position: 'left' | 'right';
      color: string;
    };
  };
  
  hivemindLetters: LetterConfig[];
  artSupplies: ArtSupplyConfig[];
  animations: AnimationConfig;
}

interface LetterConfig {
  letter: string;
  position: { x: number; y: number };
  color: string;
  size: number;
  rotation: number;
  entranceAnimation: {
    type: 'drop' | 'fade' | 'scale' | 'rotate';
    delay: number;
    duration: number;
  };
}

interface ArtSupplyConfig {
  type: 'pencil' | 'eraser' | 'paint' | 'sticky-note' | 'lightbulb';
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  animation: {
    type: 'float' | 'rotate' | 'pulse' | 'morph';
    amplitude: number;
    frequency: number;
    offset: number;
  };
}

interface AnimationConfig {
  letterEntranceDuration: number;
  letterEntranceStagger: number;
  artSupplyAnimationSpeed: number;
  transitionDuration: number;
}
```

## Error Handling

### Phaser Scene Errors
- **Asset Loading Failures**: Fallback to solid color backgrounds if textures fail to load
- **Animation Errors**: Graceful degradation to static elements if tweens fail
- **Rendering Issues**: Error logging with fallback to existing bg.png

### Background Generation Errors
- **Export Failures**: Retry mechanism with quality reduction
- **File System Errors**: Fallback to existing background asset
- **Memory Issues**: Automatic cleanup of Phaser resources

### Integration Errors
- **Devvit Compatibility**: Ensure generated assets meet size/format requirements
- **Build System Issues**: Proper error handling in Vite asset pipeline
- **Runtime Errors**: Non-blocking failures that don't break existing splash functionality

## Testing Strategy

### Visual Testing
1. **Composition Verification**: Automated screenshots comparing generated backgrounds
2. **Animation Testing**: Frame-by-frame validation of tween sequences
3. **Responsive Testing**: Background generation at multiple resolutions
4. **Cross-browser Testing**: Phaser rendering consistency across browsers

### Integration Testing
1. **Asset Pipeline Testing**: Verify generated backgrounds integrate with build system
2. **Devvit Compatibility Testing**: Ensure splash screen works in Reddit environment
3. **Performance Testing**: Monitor Phaser scene creation and export times
4. **Fallback Testing**: Verify graceful degradation when Phaser fails

### Unit Testing
1. **Scene Creation**: Test SplashScene initialization and setup
2. **Animation Logic**: Test tween creation and timing calculations
3. **Asset Management**: Test loading and cleanup of Phaser resources
4. **Export Functionality**: Test background generation and optimization

## Implementation Phases

### Phase 1: Phaser Scene Setup
- Create SplashScene class extending existing scene architecture
- Implement basic notebook background rendering
- Set up asset loading for artistic elements
- Integrate with existing Phaser game configuration

### Phase 2: Artistic Element Creation
- Implement colorful "HIVEMIND" letter blocks
- Create art supply sprites (pencils, erasers, paint, sticky notes)
- Add lightbulb icon with pulsing animation
- Position elements according to reference design

### Phase 3: Animation System
- Implement staggered letter entrance animations
- Add floating/rotation animations for art supplies
- Create smooth transitions and easing functions
- Optimize animation performance for mobile devices

### Phase 4: Asset Generation
- Implement scene capture functionality for both background and logo
- Add image optimization and compression for multiple asset types
- Create automated asset replacement system for bg.png and logo.png
- Integrate with existing build pipeline

### Phase 5: Integration & Polish
- Ensure compatibility with existing buildSplashScreen function
- Test with various game contexts and dynamic content
- Optimize for different screen sizes and orientations
- Add error handling and fallback mechanisms

## Technical Considerations

### Performance Optimization
- **Texture Atlasing**: Combine art supply sprites into single atlas
- **Animation Pooling**: Reuse tween objects to reduce garbage collection
- **Scene Cleanup**: Proper disposal of Phaser resources after background generation
- **Mobile Optimization**: Reduced animation complexity on lower-end devices

### Asset Management
- **File Size Limits**: Keep generated assets under 2MB for Devvit compatibility (bg.png: 1024x768, logo.png: 500x108)
- **Format Optimization**: Use PNG with appropriate compression for artistic elements
- **Dual Asset Generation**: Create both background and logo assets from same artistic composition
- **Caching Strategy**: Generate assets once and cache for reuse
- **Fallback Assets**: Maintain backup versions of both bg.png and logo.png

### Accessibility Considerations
- **High Contrast Mode**: Ensure letter blocks remain readable
- **Reduced Motion**: Respect user preferences for reduced animations
- **Screen Reader Compatibility**: Maintain existing text-based splash content
- **Color Blindness**: Use sufficient contrast and varied visual patterns
