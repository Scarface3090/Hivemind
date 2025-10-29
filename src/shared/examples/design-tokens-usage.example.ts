/**
 * Design Tokens Usage Examples
 * 
 * This file demonstrates how to use the design tokens in components
 */

import { colors, typography, spacing, getColor, getFontFamily, getSpacing } from '../design-tokens';

// Example 1: Using color tokens directly
export const exampleColorUsage = {
  primaryButton: {
    backgroundColor: colors.interactive.join,
    color: colors.text.onDark,
    borderColor: colors.primary.brand,
  },
  
  paperBackground: {
    backgroundColor: colors.background.paper,
    color: colors.text.primary,
  },
  
  brushStrokeAccent: {
    borderColor: colors.brushStrokes.orange,
    boxShadow: `4px 4px 0px ${colors.text.primary}`,
  }
};

// Example 2: Using typography tokens
export const exampleTypographyUsage = {
  handwrittenHeading: {
    fontFamily: typography.fontFamilies.handwritten,
    fontSize: typography.fontSizes['4xl'],
    fontWeight: typography.fontWeights.bold,
    lineHeight: typography.lineHeights.tight,
  },
  
  displayTitle: {
    fontFamily: typography.fontFamilies.display,
    fontSize: typography.fontSizes['5xl'],
    fontWeight: typography.fontWeights.extrabold,
  },
  
  bodyText: {
    fontFamily: typography.fontFamilies.body,
    fontSize: typography.fontSizes.base,
    fontWeight: typography.fontWeights.normal,
    lineHeight: typography.lineHeights.normal,
  }
};

// Example 3: Using spacing tokens
export const exampleSpacingUsage = {
  cardPadding: {
    padding: `${spacing.lg} ${spacing.xl}`,
    margin: spacing.md,
    gap: spacing.sm,
  },
  
  buttonSpacing: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.xl,
    paddingRight: spacing.xl,
    marginBottom: spacing.lg,
  }
};

// Example 4: Using utility functions
export const exampleUtilityUsage = {
  dynamicColor: getColor('primary.brand'), // '#2B4C7E'
  dynamicFont: getFontFamily('handwritten'), // 'Kalam, cursive'
  dynamicSpacing: getSpacing('xl'), // '2rem'
};

// Example 5: CSS-in-JS usage
export const exampleCSSInJS = {
  artisticButton: {
    fontFamily: getFontFamily('display'),
    fontSize: typography.fontSizes.xl,
    color: colors.text.onDark,
    backgroundColor: colors.interactive.join,
    border: `3px solid ${colors.text.primary}`,
    borderRadius: '0.5rem',
    padding: `${spacing.md} ${spacing.xl}`,
    boxShadow: `4px 4px 0px ${colors.text.primary}`,
    transform: 'rotate(-2deg)',
    transition: 'all 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    
    '&:hover': {
      transform: 'rotate(-1deg) translateY(-2px)',
      boxShadow: `6px 6px 0px ${colors.text.primary}`,
    }
  }
};

// Example 6: React component props
export interface ArtisticButtonProps {
  variant?: 'join' | 'host' | 'submit';
  size?: 'sm' | 'md' | 'lg';
  brushStroke?: keyof typeof colors.brushStrokes;
  children: React.ReactNode;
}

export const getArtisticButtonStyles = (props: ArtisticButtonProps) => {
  const baseStyles = {
    fontFamily: getFontFamily('display'),
    color: colors.text.onDark,
    border: `3px solid ${colors.text.primary}`,
    borderRadius: '0.5rem',
    transition: 'all 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  };

  const variantStyles = {
    join: {
      backgroundColor: colors.interactive.join,
      transform: 'rotate(-2deg)',
    },
    host: {
      backgroundColor: colors.interactive.host,
      transform: 'rotate(2deg)',
    },
    submit: {
      backgroundColor: colors.primary.accent,
      transform: 'rotate(0deg)',
    }
  };

  const sizeStyles = {
    sm: {
      fontSize: typography.fontSizes.sm,
      padding: `${spacing.sm} ${spacing.md}`,
    },
    md: {
      fontSize: typography.fontSizes.lg,
      padding: `${spacing.md} ${spacing.lg}`,
    },
    lg: {
      fontSize: typography.fontSizes.xl,
      padding: `${spacing.lg} ${spacing.xl}`,
    }
  };

  return {
    ...baseStyles,
    ...variantStyles[props.variant || 'join'],
    ...sizeStyles[props.size || 'md'],
    boxShadow: `4px 4px 0px ${colors.text.primary}`,
  };
};
