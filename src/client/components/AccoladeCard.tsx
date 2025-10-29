import React from 'react';
import { ArtisticCard } from './ArtisticCard.js';
import { colors, spacing, typography } from '../../shared/design-tokens.js';

interface AccoladeCardProps {
  title: string;
  username: string;
  accoladeType: 'Psychic' | 'Top Comment' | 'Unpopular Opinion';
  className?: string;
}

const getAccoladeIcon = (type: string): string => {
  switch (type) {
    case 'Psychic':
      return '🔮';
    case 'Top Comment':
      return '🏆';
    case 'Unpopular Opinion':
      return '🦄';
    default:
      return '⭐';
  }
};

const getAccoladeBadgeColor = (type: string): string => {
  switch (type) {
    case 'Psychic':
      return colors.brushStrokes.teal;
    case 'Top Comment':
      return colors.brushStrokes.yellow;
    case 'Unpopular Opinion':
      return colors.brushStrokes.red;
    default:
      return colors.brushStrokes.orange;
  }
};

const getRotation = (type: string): number => {
  switch (type) {
    case 'Psychic':
      return 1.5;
    case 'Top Comment':
      return -2;
    case 'Unpopular Opinion':
      return 2.5;
    default:
      return 0;
  }
};

export const AccoladeCard: React.FC<AccoladeCardProps> = ({
  title,
  username,
  accoladeType,
  className = '',
}) => {
  const icon = getAccoladeIcon(accoladeType);
  const badgeColor = getAccoladeBadgeColor(accoladeType);
  const rotation = getRotation(accoladeType);

  return (
    <ArtisticCard
      variant="accolade"
      className={`accolade-card ${className}`}
      rotation={rotation}
      brushStrokeColor={badgeColor}
      showParticles={true}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        gap: spacing.md,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.xs,
          }}>
            <span 
              style={{ 
                fontSize: typography.fontSizes.xl,
                lineHeight: 1,
              }}
              aria-hidden="true"
            >
              {icon}
            </span>
            <div style={{ 
              fontFamily: typography.fontFamilies.display,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.bold,
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.1)',
            }}>
              {title}
            </div>
          </div>
          <div style={{ 
            fontSize: typography.fontSizes.sm,
            opacity: 0.8,
            fontWeight: typography.fontWeights.medium,
            marginLeft: `calc(${typography.fontSizes.xl} + ${spacing.sm})`,
          }}>
            @{username}
          </div>
        </div>
        <div 
          style={{
            background: badgeColor,
            color: colors.text.onDark,
            padding: `${spacing.xs} ${spacing.sm}`,
            borderRadius: '999px',
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.bold,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.5px',
            border: `2px solid ${colors.text.primary}`,
            boxShadow: `2px 2px 0px ${colors.text.primary}`,
            transform: 'rotate(-3deg)',
            whiteSpace: 'nowrap' as const,
          }}
        >
          {accoladeType}
        </div>
      </div>
    </ArtisticCard>
  );
};

export default AccoladeCard;
