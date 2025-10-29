import React from 'react';
import { ArtisticCard } from './ArtisticCard.js';
import { colors, spacing, typography } from '../../shared/design-tokens.js';
import { ConsensusLabelType } from '../../shared/enums.js';

interface ConsensusCardProps {
  consensus: ConsensusLabelType;
  className?: string;
}

const CONSENSUS_CONFIG = {
  [ConsensusLabelType.BattleRoyale]: {
    icon: '⚔️',
    title: 'Battle Royale',
    description: 'The community is at war',
  },
  [ConsensusLabelType.PerfectHivemind]: {
    icon: '🤝',
    title: 'Perfect Hivemind',
    description: 'The hivemind speaks as one',
  },
  [ConsensusLabelType.EchoChamber]: {
    icon: '🔄',
    title: 'Echo Chamber',
    description: 'Voices echo in harmony',
  },
  [ConsensusLabelType.TotalAnarchy]: {
    icon: '🌪️',
    title: 'Total Anarchy',
    description: 'Chaos reigns supreme',
  },
  [ConsensusLabelType.DumpsterFire]: {
    icon: '🔥',
    title: 'Dumpster Fire',
    description: 'Everything is on fire',
  },
  [ConsensusLabelType.InsufficientData]: {
    icon: '❓',
    title: 'Insufficient Data',
    description: 'Not enough data to decide',
  },
} as const;

const getConsensusConfig = (consensus: ConsensusLabelType) => {
  return CONSENSUS_CONFIG[consensus] || {
    icon: '❓',
    title: 'Unknown',
    description: 'Unable to determine consensus',
  };
};

export const ConsensusCard: React.FC<ConsensusCardProps> = ({
  consensus,
  className = '',
}) => {
  const { icon, title, description } = getConsensusConfig(consensus);

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
