/**
 * Design System Tokens
 *
 * This file imports and exports design-system.json values as TypeScript constants
 * for type-safe access to the artistic design system throughout the application.
 */

import designSystemData from '../../.kiro/specs/hivemind-visual-redesign/design-system.json' with { type: 'json' };

const { designSystem } = designSystemData;

// Color Palette
export const colors = {
  primary: designSystem.colors.primary,
  background: designSystem.colors.background,
  text: designSystem.colors.text,
  interactive: designSystem.colors.interactive,
  brushStrokes: designSystem.colors.brushStrokes,
  decorative: designSystem.colors.decorative,
  particles: designSystem.colors.particles,
} as const;

// Typography System
export const typography = {
  fontFamilies: designSystem.typography.fontFamilies,
  fontSizes: designSystem.typography.fontSizes,
  fontWeights: designSystem.typography.fontWeights,
  lineHeights: designSystem.typography.lineHeights,
} as const;

// Spacing System
export const spacing = designSystem.spacing;

// Border Radius
export const borderRadius = designSystem.borderRadius;

// Shadows
export const shadows = designSystem.shadows;

// Animation System
export const animations = {
  durations: designSystem.animations.durations,
  easings: designSystem.animations.easings,
  particles: designSystem.animations.particles,
} as const;

// Component Specifications
export const components = {
  splash: designSystem.components.splash,
  buttons: designSystem.components.buttons,
  cards: designSystem.components.cards,
  spectrum: designSystem.components.spectrum,
  results: designSystem.components.results,
  navigation: designSystem.components.navigation,
} as const;

// Particle System Configuration
export const particles = {
  systems: designSystem.particles.systems,
  physics: designSystem.particles.physics,
} as const;

// Artistic Effects
export const artistic = {
  brushStrokes: designSystem.artistic.brushStrokes,
  paperTexture: designSystem.artistic.paperTexture,
  handDrawn: designSystem.artistic.handDrawn,
} as const;

// Responsive Breakpoints
export const responsive = designSystem.responsive;

// Performance Configuration
export const performance = designSystem.performance;

// Type definitions for better TypeScript support
export type ColorPalette = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Components = typeof components;
export type ParticleConfig = typeof particles;
export type ArtisticEffects = typeof artistic;

// Utility functions for accessing design tokens

export const getFontFamily = (type: keyof typeof typography.fontFamilies): string => {
  return typography.fontFamilies[type];
};

export const getSpacing = (size: keyof typeof spacing): string => {
  return spacing[size];
};

export const getComponent = (component: keyof typeof components): any => {
  return components[component];
};

// Export the full design system for advanced use cases
export const designSystemTokens = designSystem;
export default designSystemTokens;
