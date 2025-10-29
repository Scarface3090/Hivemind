import React from 'react';
import { ArtisticCard } from './ArtisticCard.js';
import { colors, spacing, typography } from '../../shared/design-tokens.js';
import { ConsensusLabelType } from '../../shared/enums.js';

interface ConsensusCardProps {
  consensus: ConsensusLabelType;
  className?: string;
}

const getConsensusIcon = (consensus: ConsensusLabelType): string => {
  switch (consensus) {
    case ConsensusLabelType.BattleRoyale:
      return '⚔️';
    case ConsensusLabelType.PerfectHivemind:
      return '🤝';
    case ConsensusLabelType.EchoChamber:
      return '🔄';
    case ConsensusLabelType.TotalAnarchy:
      return '🌪️';
    case ConsensusLabelType.DumpsterFire:
      return '🔥';
    case ConsensusLabelType.InsufficientData:
      return '❓';
    default:
      return '❓';
  }
};

const getConsensusTitle = (consensus: ConsensusLabelType): string => {
  switch (consensus) {
    case ConsensusLabelType.BattleRoyale:
      return 'Battle Royale';
    case ConsensusLabelType.PerfectHivemind:
      return 'Perfect Hivemind';
    case ConsensusLabelType.EchoChamber:
      return 'Echo Chamber';
    case ConsensusLabelType.TotalAnarchy:
      return 'Total Anarchy';
    case ConsensusLabelType.DumpsterFire:
      return 'Dumpster Fire';
    case ConsensusLabelType.InsufficientData:
      return 'Insufficient Data';
    default:
      return 'Unknown';
  }
};

const getConsensusDescription = (consensus: ConsensusLabelType): string => {
  switch (consensus) {
    case ConsensusLabelType.BattleRoyale:
      return 'The community is at war';
    case ConsensusLabelType.PerfectHivemind:
      return 'The hivemind speaks as one';
    case ConsensusLabelType.EchoChamber:
      return 'Voices echo in harmony';
    case ConsensusLabelType.TotalAnarchy:
      return 'Chaos reigns supreme';
    case ConsensusLabelType.DumpsterFire:
      return 'Everything is on fire';
    case ConsensusLabelType.InsufficientData:
      return 'Not enough data to decide';
    default:
      return 'Unable to determine consensus';
  }
};

export const ConsensusCard: React.FC<ConsensusCardProps> = ({
  consensus,
  className = '',
}) => {
  const icon = getConsensusIcon(consensus);
  const title = getConsensusTitle(consensus);
  const description = getConsensusDescription(consensus);

  return (
    <ArtisticCard
      variant="consensus"
      className={`consensus-card ${className}`}
      rotation={-1.5}
      brushStrokeColor={colors.brushStrokes.teal}
      showParticles={true}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: spacing.md,
        textAlign: 'center' as const,
        justifyContent: 'center'
      }}>
        <span 
          style={{ 
            fontSize: typography.fontSizes['3xl'],
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div>
          <div style={{ 
            fontFamily: typography.fontFamilies.display,
            fontSize: typography.fontSizes.xl,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.xs,
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.2)',
          }}>
            {title}
          </div>
          <div style={{ 
            fontSize: typography.fontSizes.base,
            opacity: 0.9,
            fontStyle: 'italic',
          }}>
            {description}
          </div>
        </div>
      </div>
    </ArtisticCard>
  );
};

export default ConsensusCard;
