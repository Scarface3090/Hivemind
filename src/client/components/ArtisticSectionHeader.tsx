import React from 'react';
import { colors, spacing, typography } from '../../shared/design-tokens.js';

interface ArtisticSectionHeaderProps {
  children: React.ReactNode;
  icon?: string;
  className?: string;
}

export const ArtisticSectionHeader: React.FC<ArtisticSectionHeaderProps> = ({
  children,
  icon,
  className = '',
}) => {
  return (
    <div className={`artistic-section-header ${className}`} style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginBottom: spacing.lg,
      position: 'relative',
    }}>
      {/* Decorative line before */}
      <div style={{
        flex: 1,
        height: '2px',
        background: `linear-gradient(90deg, transparent 0%, ${colors.decorative.lines} 50%, transparent 100%)`,
        borderRadius: '1px',
      }} />
      
      {/* Header content */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        padding: `${spacing.sm} ${spacing.md}`,
        background: colors.background.paper,
        borderRadius: '999px',
        border: `2px solid ${colors.decorative.lines}`,
        fontFamily: typography.fontFamilies.handwritten,
        fontSize: typography.fontSizes['2xl'],
        fontWeight: typography.fontWeights.bold,
        color: colors.text.primary,
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.1)',
        transform: 'rotate(-1deg)',
      }}>
        {icon && (
          <span style={{ fontSize: typography.fontSizes['3xl'] }} aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
      </div>
      
      {/* Decorative line after */}
      <div style={{
        flex: 1,
        height: '2px',
        background: `linear-gradient(90deg, transparent 0%, ${colors.decorative.lines} 50%, transparent 100%)`,
        borderRadius: '1px',
      }} />
    </div>
  );
};

export default ArtisticSectionHeader;
