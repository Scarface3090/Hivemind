import { useEffect, useState, useRef } from 'react';

interface JudgesScaleProps {
  median: number | null;
  totalParticipants: number;
  leftLabel: string;
  rightLabel: string;
  className?: string;
}

interface AnimatedBucket {
  position: number;
  height: number;
  targetHeight: number;
  animationProgress: number;
  initialHeight?: number;
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
  
  // Histogram animation state
  const [animatedDistribution, setAnimatedDistribution] = useState<AnimatedBucket[]>([]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(Date.now());
  
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

  // Generate target guess distribution for histogram animation
  const generateTargetDistribution = (): AnimatedBucket[] => {
    if (median === null || median === undefined || totalParticipants === 0) {
      return Array.from({ length: 10 }, (_, i) => ({
        position: i * 10,
        height: 0,
        targetHeight: 0,
        animationProgress: 1
      }));
    }
    
    const distribution: AnimatedBucket[] = [];
    const buckets = 10;
    
    for (let i = 0; i < buckets; i++) {
      const bucketCenter = (i + 0.5) * 10;
      const distance = Math.abs(bucketCenter - median);
      
      const baseHeight = Math.exp(-Math.pow(distance / 20, 2)) * totalParticipants * 0.3;
      const jitter = (Math.sin(i * 2.5 + median * 0.1) * 0.5) * 0.15;
      const targetHeight = Math.max(0.1, baseHeight + jitter);
      
      distribution.push({
        position: i * 10,
        height: 0,
        targetHeight: targetHeight,
        animationProgress: 0
      });
    }
    
    return distribution;
  };

  // Histogram animation system
  const animateDistribution = () => {
    const now = Date.now();
    const deltaTime = now - lastUpdateTimeRef.current;
    lastUpdateTimeRef.current = now;
    
    setAnimatedDistribution(prev => {
      let hasActiveAnimations = false;
      const updated = prev.map(bucket => {
        if (bucket.animationProgress >= 1) {
          return bucket;
        }
        
        hasActiveAnimations = true;
        
        const animationSpeed = 0.008 * deltaTime;
        const newProgress = Math.min(1, bucket.animationProgress + animationSpeed);
        const eased = 1 - Math.pow(1 - newProgress, 3);
        
        const initialHeight = bucket.initialHeight || 0;
        const newHeight = initialHeight + (bucket.targetHeight - initialHeight) * eased;
        
        if (newProgress >= 1) {
          return {
            ...bucket,
            height: bucket.targetHeight,
            animationProgress: 1
          };
        }
        
        return {
          ...bucket,
          height: newHeight,
          animationProgress: newProgress
        };
      });
      
      if (hasActiveAnimations) {
        animationFrameRef.current = requestAnimationFrame(animateDistribution);
      } else {
        setIsAnimating(false);
      }
      
      return updated;
    });
  };

  // Update distribution when data changes
  useEffect(() => {
    const newTargetDistribution = generateTargetDistribution();
    
    setAnimatedDistribution(prev => {
      if (prev.length !== newTargetDistribution.length) {
        return newTargetDistribution.map(bucket => ({
          ...bucket,
          height: 0,
          initialHeight: 0,
          animationProgress: 0
        }));
      }
      
      return prev.map((bucket, index) => ({
        ...bucket,
        targetHeight: newTargetDistribution[index]?.targetHeight || 0,
        initialHeight: bucket.height,
        animationProgress: 0
      }));
    });
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (!isAnimating) {
      setIsAnimating(true);
      lastUpdateTimeRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(animateDistribution);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [median, totalParticipants]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
      {/* Header with consensus state only */}
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
        <span style={{ 
          fontSize: '11px',
          color: speedometerColors.textSecondary,
          background: 'rgba(0,0,0,0.3)',
          padding: '4px 8px',
          borderRadius: '12px'
        }}>
          {totalParticipants} minds connected
        </span>
      </div>
      
      {/* Horizontal Arc Speedometer */}
      <div style={{
        position: 'relative',
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
            display: 'block'
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
        
        {/* Spectrum labels positioned at arc boundaries - fixed 5px below SVG */}
        <div style={{
          position: 'relative',
          width: '280px',
          minHeight: '40px',
          marginTop: '5px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '0 20px'
        }}>
          {/* Left label - positioned at left side */}
          <span style={{ 
            textAlign: 'center',
            color: speedometerColors.text,
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 8px',
            borderRadius: '6px',
            border: `1px solid ${speedometerColors.red}60`,
            fontSize: '12px',
            fontWeight: 'bold',
            maxWidth: '45%',
            wordWrap: 'break-word',
            whiteSpace: 'normal',
            lineHeight: '1.3'
          }}>
            {leftLabel}
          </span>
          
          {/* Right label - positioned at right side */}
          <span style={{ 
            textAlign: 'center',
            color: speedometerColors.text,
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 8px',
            borderRadius: '6px',
            border: `1px solid ${speedometerColors.green}60`,
            fontSize: '12px',
            fontWeight: 'bold',
            maxWidth: '45%',
            wordWrap: 'break-word',
            whiteSpace: 'normal',
            lineHeight: '1.3'
          }}>
            {rightLabel}
          </span>
        </div>

        {/* Guess Distribution Histogram - Dedicated space below speedometer */}
        {animatedDistribution.length > 0 && totalParticipants > 0 && (
          <div
            style={{
              position: 'relative',
              width: '280px',
              height: '70px',
              marginTop: '20px',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '3px',
              padding: '0 20px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '10px'
            }}
          >
            {(() => {
              // Normalize heights to fit within container
              const maxHeight = Math.max(...animatedDistribution.map(b => b.height), 0.1);
              const containerHeight = 60; // Leave 10px for padding
              
              return animatedDistribution.map((bucket, index) => {
                // Normalize to 0-1 range, then scale to container height
                const normalizedHeight = bucket.height / maxHeight;
                const heightPx = Math.max(3, normalizedHeight * containerHeight);
                const intensity = normalizedHeight;
                
                const isActive = bucket.animationProgress < 1;
                const baseColor = intensity > 0.7 ? speedometerColors.yellow : 
                                 intensity > 0.4 ? speedometerColors.lightGreen : 
                                 speedometerColors.orange;
                
                return (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      height: `${heightPx}px`,
                      maxHeight: `${containerHeight}px`,
                      background: isActive 
                        ? `linear-gradient(to top, ${baseColor}90, ${baseColor}70)` 
                        : `linear-gradient(to top, ${baseColor}70, ${baseColor}50)`,
                      borderRadius: '3px',
                      transition: 'none',
                      boxShadow: isActive ? `0 0 6px ${baseColor}50` : 'none',
                      transform: isActive ? 'scaleY(1.05)' : 'scaleY(1)',
                      transformOrigin: 'bottom',
                      overflow: 'hidden'
                    }}
                    title={`${bucket.position}-${bucket.position + 10}: ${Math.round(bucket.height)} guesses`}
                  />
                );
              });
            })()}
          </div>
        )}
      </div>
      
      {/* Hivemind Verdict and Direction - Below histogram */}
      {animatedMedian !== null && (
        <div style={{
          textAlign: 'center',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{
            fontSize: '16px',
            color: speedometerColors.text,
            WebkitTextFillColor: speedometerColors.text,
            fontWeight: 'bold',
            marginBottom: '6px',
            colorScheme: 'dark'
          }}>
            Hivemind Verdict: {Math.round(animatedMedian)}
          </div>
          <div style={{
            fontSize: '12px',
            color: speedometerColors.yellow,
            WebkitTextFillColor: speedometerColors.yellow,
            fontWeight: 'bold',
            colorScheme: 'dark'
          }}>
            {animatedMedian < 30 ? `← Leans toward ${leftLabel}` :
             animatedMedian > 70 ? `→ Leans toward ${rightLabel}` :
             '↕ Hivemind is balanced'}
          </div>
        </div>
      )}
    </div>
  );
};

export default JudgesScale;