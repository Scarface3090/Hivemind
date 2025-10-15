import React from 'react';
import { ConsensusLabelType } from '../../shared/enums.js';
import type { ConsensusLabel as ConsensusLabelData } from '../../shared/types/ScoreSummary.js';

interface ConsensusLabelProps {
  consensus: ConsensusLabelData;
  className?: string;
  variant?: 'default' | 'compact' | 'mobile-full';
  showDescription?: boolean;
  onClick?: () => void;
  tabIndex?: number;
}

interface LabelConfig {
  color: string;
  bgColor: string;
  icon: string;
  ariaLabel: string;
}

const LABEL_CONFIGS: Record<ConsensusLabelType, LabelConfig> = {
  [ConsensusLabelType.PerfectHivemind]: {
    color: 'text-green-800',
    bgColor: 'bg-green-100 border-green-400',
    icon: '🧠',
    ariaLabel: 'Perfect consensus achieved - the collective mind speaks as one with very high agreement'
  },
  [ConsensusLabelType.EchoChamber]: {
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-300',
    icon: '🤝',
    ariaLabel: 'Strong consensus reached - most minds think alike with minor differences'
  },
  [ConsensusLabelType.BattleRoyale]: {
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100 border-yellow-400',
    icon: '⚔️',
    ariaLabel: 'Mixed opinions observed - the community is divided with moderate disagreement'
  },
  [ConsensusLabelType.TotalAnarchy]: {
    color: 'text-orange-800',
    bgColor: 'bg-orange-100 border-orange-400',
    icon: '🌪️',
    ariaLabel: 'High disagreement detected - chaos reigns with significant opinion spread'
  },
  [ConsensusLabelType.DumpsterFire]: {
    color: 'text-red-800',
    bgColor: 'bg-red-100 border-red-400',
    icon: '🔥',
    ariaLabel: 'Complete disagreement found - total pandemonium with extreme opinion variance'
  },
  [ConsensusLabelType.InsufficientData]: {
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 border-gray-400',
    icon: '❓',
    ariaLabel: 'Insufficient data available - not enough responses to determine consensus level'
  }
};

const DISPLAY_NAMES: Record<ConsensusLabelType, string> = {
  [ConsensusLabelType.PerfectHivemind]: 'Perfect Hivemind',
  [ConsensusLabelType.EchoChamber]: 'Echo Chamber',
  [ConsensusLabelType.BattleRoyale]: 'Battle Royale',
  [ConsensusLabelType.TotalAnarchy]: 'Total Anarchy',
  [ConsensusLabelType.DumpsterFire]: 'Dumpster Fire',
  [ConsensusLabelType.InsufficientData]: 'Insufficient Data'
};

export const ConsensusLabel: React.FC<ConsensusLabelProps> = ({ 
  consensus, 
  className = '',
  variant = 'default',
  showDescription = true,
  onClick,
  tabIndex
}) => {
  // Helper function to map consensus label to dot count
  const getDotCount = (label: ConsensusLabelType): number => {
    switch (label) {
      case ConsensusLabelType.PerfectHivemind:
        return 5;
      case ConsensusLabelType.EchoChamber:
        return 4;
      case ConsensusLabelType.BattleRoyale:
        return 3;
      case ConsensusLabelType.TotalAnarchy:
        return 2;
      case ConsensusLabelType.DumpsterFire:
        return 1;
      default:
        return 0;
    }
  };

  // Generate unique ID for accessibility
  const uniqueId = React.useId();
  
  // Error handling for malformed consensus data
  if (!consensus || typeof consensus !== 'object') {
    console.warn('[ConsensusLabel] Invalid consensus data provided:', consensus);
    return (
      <div 
        className={`
          consensus-label
          flex items-center px-3 py-2 rounded-lg border-2
          bg-gray-100 border-gray-400 text-gray-700
          ${className}
        `}
        role="status"
        aria-label="Unable to display consensus information"
      >
        <span className="text-lg mr-2" aria-hidden="true">❓</span>
        <span className="text-sm">Unable to display consensus</span>
      </div>
    );
  }

  // Handle unknown consensus label types gracefully
  const config = LABEL_CONFIGS[consensus.label] || LABEL_CONFIGS[ConsensusLabelType.InsufficientData];
  const displayName = DISPLAY_NAMES[consensus.label] || 'Unknown';
  const isInteractive = Boolean(onClick);

  // Validate standard deviation is a valid number
  const standardDeviation = typeof consensus.standardDeviation === 'number' && 
    Number.isFinite(consensus.standardDeviation) ? 
    consensus.standardDeviation : 0;

  // Variant-specific styling
  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'inline-flex px-2 py-1 text-xs gap-1.5 min-h-[32px]';
      case 'mobile-full':
        return 'flex w-full px-4 py-3 text-base gap-3 min-h-[56px]';
      default:
        return 'flex px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base gap-2 w-full sm:w-auto min-h-[44px] sm:min-h-[48px]';
    }
  };

  const getIconSize = () => {
    switch (variant) {
      case 'compact':
        return 'text-sm';
      case 'mobile-full':
        return 'text-2xl';
      default:
        return 'text-xl sm:text-lg';
    }
  };

  const getTextSize = () => {
    switch (variant) {
      case 'compact':
        return 'text-xs';
      case 'mobile-full':
        return 'text-base';
      default:
        return 'text-sm sm:text-base';
    }
  };

  const getDescriptionSize = () => {
    switch (variant) {
      case 'compact':
        return 'text-xs hidden'; // Hide description in compact mode
      case 'mobile-full':
        return 'text-sm';
      default:
        return 'text-xs sm:text-sm';
    }
  };

  // Handle keyboard interactions for accessibility
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isInteractive && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.();
    }
  };

  // Generate comprehensive aria-describedby content
  const getAriaDescription = () => {
    const description = consensus.description || 'No description available';
    let fullDescription = `Community consensus level: ${displayName}. ${description}`;
    if (process.env.NODE_ENV === 'development') {
      fullDescription += ` Standard deviation: ${standardDeviation.toFixed(1)}`;
    }
    return fullDescription;
  };

  const ElementTag = isInteractive ? 'button' : 'div';

  return (
    <ElementTag
      className={`
        consensus-label
        items-center
        rounded-lg border-2 
        ${config.bgColor} ${config.color}
        font-medium
        transition-all duration-200
        hover:shadow-sm active:scale-95
        ${isInteractive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' : ''}
        ${getVariantClasses()}
        ${className}
      `}
      role={isInteractive ? 'button' : 'status'}
      aria-label={config.ariaLabel}
      aria-describedby={uniqueId}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      tabIndex={isInteractive ? (tabIndex ?? 0) : undefined}
    >
      {/* Hidden description for screen readers */}
      <span 
        id={uniqueId}
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0'
        }}
      >
        {getAriaDescription()}
      </span>

      {/* Icon with semantic meaning and pattern for colorblind users */}
      <span 
        className={`${getIconSize()} leading-none select-none flex-shrink-0`}
        aria-hidden="true"
        role="img"
        title={displayName} // Tooltip for icon meaning
      >
        {config.icon}
      </span>
      
      {/* Visual indicator pattern for accessibility (not relying only on color) */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Dot pattern to supplement color coding */}
        <div className="flex gap-0.5" aria-hidden="true">
          {Array.from({ length: getDotCount(consensus.label) }, (_, index) => (
            <div key={index} className="w-1 h-1 rounded-full bg-current opacity-60"></div>
          ))}
        </div>
      </div>
      
      {/* Label text */}
      <div className="flex flex-col gap-0.5 flex-grow min-w-0">
        <span className={`font-semibold leading-tight ${getTextSize()}`}>
          {displayName}
        </span>
        
        {/* Description text - conditionally shown */}
        {showDescription && variant !== 'compact' && (
          <span className={`opacity-80 leading-tight ${getDescriptionSize()}`}>
            {consensus.description}
          </span>
        )}
      </div>
      
      {/* Standard deviation for debugging/calibration - only show in dev and not in compact mode */}
      {process.env.NODE_ENV === 'development' && variant !== 'compact' && (
        <span className="text-xs opacity-60 flex-shrink-0 hidden sm:block">
          σ={standardDeviation.toFixed(1)}
        </span>
      )}
    </ElementTag>
  );
};

export default ConsensusLabel;
