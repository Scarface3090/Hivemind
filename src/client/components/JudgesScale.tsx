import { useEffect, useState } from 'react';

interface JudgesScaleProps {
  median: number | null;
  totalParticipants: number;
  leftLabel: string;
  rightLabel: string;
  className?: string;
}

// Speedometer color scheme
const speedometerColors = {
  red: '#FF4444',          // Low values (0-20)
  orange: '#FF8844',       // Low-medium values (20-40)
  yellow: '#FFD700',       // Medium values (40-60)
  lightGreen: '#88DD44',   // Medium-high values (60-80)
  green: '#44DD44',        // High values (80-100)
  needle: '#2C3E50',       // Dark needle
  center: '#FFFFFF',       // White center dot
  background: '#1a1a1a',   // Dark background
  text: '#ffffff',         // White text
  textSecondary: '#aaaaaa' // Gray text
};

/**
 * Speedometer-style visualization showing real-time hivemind consensus direction
 * Updates immediately when median changes with a rotating needle indicator
 */
export const JudgesScale = ({ 
  median, 
  totalParticipants,
  leftLabel,
  rightLabel,
  className = '' 
}: JudgesScaleProps): JSX.Element => {
  const [animatedNeedlePosition, setAnimatedNeedlePosition] = useState<number>(0); // Start at left (0%)
  const [animatedMedian, setAnimatedMedian] = useState<number | null>(null);
  
  // Calculate needle position based on median (0-100 percentage for horizontal bar)
  const targetPosition = median !== null ? median : 0;
  
  // Real-time animation of speedometer needle position
  useEffect(() => {
    if (median === null) {
      setAnimatedNeedlePosition(0);
      setAnimatedMedian(null);
      return;
    }
    
    // Immediate update for real-time feel
    const animationDuration = 400; // Smooth 400ms animation for needle
    const startPosition = animatedNeedlePosition;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Smooth cubic ease-in-out for needle movement
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      const currentPosition = startPosition + (targetPosition - startPosition) * eased;
      
      setAnimatedNeedlePosition(currentPosition);
      setAnimatedMedian(median);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [median, targetPosition]);
  
  // Determine consensus state
  const getConsensusState = () => {
    if (totalParticipants === 0) return { label: 'Waiting for the hivemind...', icon: '⏳', color: '#888' };
    if (totalParticipants < 5) return { label: 'Gathering minds', icon: '🧠', color: '#ff9500' };
    if (totalParticipants >= 15) return { label: 'Strong hivemind consensus', icon: '⚡', color: '#00ff88' };
    if (totalParticipants >= 8) return { label: 'Hivemind forming consensus', icon: '🤔', color: '#ffaa00' };
    return { label: 'Hivemind exploring options', icon: '💭', color: '#ff6b6b' };
  };
  
  const consensusState = getConsensusState();
  
  // Create SVG path for horizontal arc segments
  const createArcPath = (startAngle: number, endAngle: number, radius: number, centerX: number, centerY: number): string => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    // For horizontal arc: 0° = left, 180° = right, with arc curving upward
    const angleInRadians = (angleInDegrees + 180) * Math.PI / 180.0; // Offset by 180° to make it horizontal
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  // Calculate needle angle for horizontal arc (0° = left, 180° = right)
  const needleAngle = animatedNeedlePosition !== null ? (animatedNeedlePosition / 100) * 180 : 0;

  return (
    <div 
      className={`speedometer-container ${className}`.trim()}
      style={{
        width: '100%',
        padding: '16px',
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${speedometerColors.background}f0, #2a2a2ae0)`,
        border: `2px solid ${consensusState.color}60`,
        marginBottom: '16px',
        position: 'relative'
      }}
    >
      {/* Header with consensus state */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        <span style={{ color: consensusState.color }}>
          {consensusState.icon} {consensusState.label}
        </span>
        {animatedMedian !== null && (
          <span style={{ color: speedometerColors.text }}>
            Hivemind Verdict: {Math.round(animatedMedian)}
          </span>
        )}
      </div>
      
      {/* Horizontal Arc Speedometer */}
      <div style={{
        position: 'relative',
        height: '100px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 20px'
      }}>
        {/* SVG Arc Speedometer */}
        <svg 
          width="280" 
          height="80" 
          viewBox="0 0 280 80"
          style={{ 
            overflow: 'visible',
            marginBottom: '10px'
          }}
        >
          {/* Horizontal arc segments (0° = left, 180° = right) */}
          {/* Red segment (0-36 degrees) */}
          <path
            d={createArcPath(0, 36, 60, 140, 60)}
            fill="none"
            stroke={speedometerColors.red}
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Orange segment (36-72 degrees) */}
          <path
            d={createArcPath(36, 72, 60, 140, 60)}
            fill="none"
            stroke={speedometerColors.orange}
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Yellow segment (72-108 degrees) */}
          <path
            d={createArcPath(72, 108, 60, 140, 60)}
            fill="none"
            stroke={speedometerColors.yellow}
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Light Green segment (108-144 degrees) */}
          <path
            d={createArcPath(108, 144, 60, 140, 60)}
            fill="none"
            stroke={speedometerColors.lightGreen}
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Green segment (144-180 degrees) */}
          <path
            d={createArcPath(144, 180, 60, 140, 60)}
            fill="none"
            stroke={speedometerColors.green}
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Needle */}
          {animatedMedian !== null && (
            <line
              x1="140"
              y1="60"
              x2="140"
              y2="10"
              stroke={speedometerColors.needle}
              strokeWidth="3"
              strokeLinecap="round"
              transform={`rotate(${needleAngle - 90} 140 60)`}
              style={{ transition: 'none' }}
            />
          )}
          
          {/* Center dot */}
          <circle
            cx="140"
            cy="60"
            r="5"
            fill={speedometerColors.center}
            stroke={speedometerColors.needle}
            strokeWidth="2"
          />
        </svg>
        
        {/* Spectrum labels positioned at arc boundaries */}
        <div style={{
          position: 'relative',
          width: '280px',
          height: '30px',
          marginTop: '-45px'
        }}>
          {/* Left label - positioned at left arc boundary (x=80 in SVG = 80/280 = 28.57%) */}
          <span style={{ 
            position: 'absolute',
            left: 'calc(28.57% - 0px)', // Arc starts at x=80, centered on boundary
            transform: 'translateX(-50%)',
            textAlign: 'center',
            color: speedometerColors.text,
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 8px',
            borderRadius: '6px',
            border: `1px solid ${speedometerColors.red}60`,
            fontSize: '13px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}>
            {leftLabel}
          </span>
          
          {/* Right label - positioned at right arc boundary (x=200 in SVG = 200/280 = 71.43%) */}
          <span style={{ 
            position: 'absolute',
            left: 'calc(71.43% - 0px)', // Arc ends at x=200, centered on boundary
            transform: 'translateX(-50%)',
            textAlign: 'center',
            color: speedometerColors.text,
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 8px',
            borderRadius: '6px',
            border: `1px solid ${speedometerColors.green}60`,
            fontSize: '13px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}>
            {rightLabel}
          </span>
        </div>
      </div>
      
      {/* Direction indicator */}
      {animatedMedian !== null && (
        <div style={{
          textAlign: 'center',
          marginTop: '8px',
          fontSize: '12px',
          color: speedometerColors.yellow,
          fontWeight: 'bold'
        }}>
          {animatedMedian < 30 ? `← Hivemind leans toward ${leftLabel}` :
           animatedMedian > 70 ? `→ Hivemind leans toward ${rightLabel}` :
           '↕ Hivemind is balanced'}
        </div>
      )}
      
      {/* Participant count */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '12px',
        fontSize: '11px',
        color: speedometerColors.textSecondary,
        background: 'rgba(0,0,0,0.3)',
        padding: '4px 8px',
        borderRadius: '12px'
      }}>
        {totalParticipants} minds connected
      </div>
    </div>
  );
};

export default JudgesScale;