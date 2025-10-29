import React from 'react';
import { colors, spacing, borderRadius, shadows, typography } from '../../shared/design-tokens.js';
import { ParticleOverlay } from './ParticleOverlay.js';

interface ArtisticCardProps {
  children: React.ReactNode;
  variant?: 'consensus' | 'accolade' | 'default';
  className?: string;
  style?: React.CSSProperties;
  brushStrokeColor?: string;
  rotation?: number;
  showParticles?: boolean;
}

export const ArtisticCard: React.FC<ArtisticCardProps> = ({
  children,
  variant = 'default',
  className = '',
  style = {},
  brushStrokeColor,
  rotation = 0,
  showParticles = false,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'consensus':
        return {
          background: `linear-gradient(135deg, ${colors.interactive.host} 0%, ${colors.interactive.hostHover} 100%)`,
          border: `3px solid ${colors.text.primary}`,
          color: colors.text.onDark,
          transform: `rotate(${rotation || -1}deg)`,
          boxShadow: `4px 4px 0px ${colors.text.primary}, ${shadows.lg}`,
        };
      case 'accolade':
        return {
          background: `linear-gradient(135deg, ${colors.brushStrokes.yellow} 0%, ${colors.brushStrokes.orange} 100%)`,
          border: `3px solid ${colors.text.primary}`,
          color: colors.text.primary,
          transform: `rotate(${rotation || 2}deg)`,
          boxShadow: `4px 4px 0px ${colors.text.primary}, ${shadows.lg}`,
        };
      default:
        return {
          background: colors.background.card,
          border: `2px solid ${colors.decorative.lines}`,
          color: colors.text.primary,
          boxShadow: shadows.md,
        };
    }
  };

  const baseStyles: React.CSSProperties = {
    position: 'relative',
    padding: spacing.lg,
    borderRadius: borderRadius['2xl'],
    fontFamily: typography.fontFamilies.handwritten,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.medium,
    lineHeight: typography.lineHeights.relaxed,
    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    ...getVariantStyles(),
    ...style,
  };

  const brushStrokeStyles: React.CSSProperties = {
    position: 'absolute',
    top: '-4px',
    left: '-4px',
    right: '-4px',
    bottom: '-4px',
    background: brushStrokeColor || 'transparent',
    borderRadius: borderRadius['3xl'],
    opacity: 0.2,
    transform: 'rotate(-2deg)',
    zIndex: -1,
  };

  const getParticleColors = () => {
    switch (variant) {
      case 'consensus':
        return [colors.brushStrokes.teal, colors.brushStrokes.green];
      case 'accolade':
        return [colors.brushStrokes.yellow, colors.brushStrokes.orange];
      default:
        return [colors.particles.primary, colors.particles.secondary];
    }
  };

  return (
    <div
      className={`artistic-card ${className}`}
      style={baseStyles}
    >
      {brushStrokeColor && <div style={brushStrokeStyles} />}
      {showParticles && (
        <ParticleOverlay
          particleCount={6}
          colors={getParticleColors()}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default ArtisticCard;
