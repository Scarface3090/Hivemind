import { useRef, useState, useEffect } from 'react';

// Direct color values for reliable rendering
const consensusColors = {
  primary: '#FFD700',      // Gold for strong consensus
  secondary: '#00BFFF',    // Blue for moderate consensus  
  tertiary: '#FF6B6B',     // Red for divided minds
  background: '#1a1a1a',   // Dark background
  backgroundSecondary: '#2a2a2a', // Lighter dark
  text: '#ffffff',         // White text
  textSecondary: '#aaaaaa', // Gray text
  lines: '#444444',        // Gray lines
  success: '#00ff88',      // Green for alignment
  warning: '#ffaa00'       // Orange for differences
};

interface SimpleConsensusCanvasProps {
  median: number | null;
  totalParticipants: number;
  className?: string;
  style?: React.CSSProperties;
}

interface AnimatedBucket {
  position: number;
  height: number;
  targetHeight: number;
  animationProgress: number;
}

/**
 * Real-time consensus visualization with animated guess distribution
 * Shows hivemind verdict and live participant activity with smooth animations
 */
export const SimpleConsensusCanvas = ({ 
  median, 
  totalParticipants, 
  className = '',
  style = {}
}: SimpleConsensusCanvasProps): JSX.Element => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(Date.now());
  
  // Real-time animated distribution state
  const [animatedDistribution, setAnimatedDistribution] = useState<AnimatedBucket[]>([]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  
  // Calculate meaningful metrics
  const consensusStrength = median !== null && totalParticipants > 0 
    ? Math.min(1, totalParticipants / 20) * 0.8 
    : 0;
  
  // Determine consensus state with clear meaning
  const getConsensusState = () => {
    if (totalParticipants === 0) return { label: 'Waiting for guesses...', icon: '⏳', color: '#888' };
    if (totalParticipants < 3) return { label: 'Need more minds', icon: '🧠', color: '#ff9500' };
    if (consensusStrength > 0.7) return { label: `Strong agreement (${totalParticipants} minds)`, icon: '✅', color: '#00ff88' };
    if (consensusStrength > 0.4) return { label: `Building consensus (${totalParticipants} minds)`, icon: '🤔', color: '#ffaa00' };
    return { label: `Minds divided (${totalParticipants} minds)`, icon: '⚖️', color: '#ff6b6b' };
  };
  
  const consensusState = getConsensusState();
  
  // Generate target guess distribution for animation
  const generateTargetDistribution = (): AnimatedBucket[] => {
    if (!median || totalParticipants === 0) {
      return Array.from({ length: 10 }, (_, i) => ({
        position: i * 10,
        height: 0,
        targetHeight: 0,
        animationProgress: 1
      }));
    }
    
    const distribution: AnimatedBucket[] = [];
    const buckets = 10; // 10 buckets across 0-100 range
    
    for (let i = 0; i < buckets; i++) {
      const bucketCenter = (i + 0.5) * 10; // 5, 15, 25, ..., 95
      const distance = Math.abs(bucketCenter - median);
      
      // Normal distribution around median with some randomness for realism
      const baseHeight = Math.exp(-Math.pow(distance / 20, 2)) * totalParticipants * 0.3;
      const jitter = (Math.random() - 0.5) * 0.15; // Reduced jitter for smoother animation
      const targetHeight = Math.max(0.1, baseHeight + jitter);
      
      distribution.push({
        position: i * 10,
        height: 0, // Will be animated
        targetHeight: targetHeight,
        animationProgress: 0
      });
    }
    
    return distribution;
  };

  // Real-time animation system
  const animateDistribution = () => {
    const now = Date.now();
    const deltaTime = now - lastUpdateTimeRef.current;
    lastUpdateTimeRef.current = now;
    
    setAnimatedDistribution(prev => {
      let hasChanges = false;
      const updated = prev.map(bucket => {
        const diff = bucket.targetHeight - bucket.height;
        
        if (Math.abs(diff) > 0.01) {
          hasChanges = true;
          // Fast animation for real-time feel (200ms total duration)
          const animationSpeed = 0.008 * deltaTime; // Adjust speed based on frame time
          const newProgress = Math.min(1, bucket.animationProgress + animationSpeed);
          
          // Smooth easing function
          const eased = 1 - Math.pow(1 - newProgress, 3);
          const newHeight = bucket.height + diff * eased * 0.1; // Incremental update
          
          return {
            ...bucket,
            height: newHeight,
            animationProgress: newProgress
          };
        }
        
        return bucket;
      });
      
      if (hasChanges) {
        // Continue animation
        animationFrameRef.current = requestAnimationFrame(animateDistribution);
      } else {
        // Animation complete
        setIsAnimating(false);
      }
      
      return updated;
    });
  };

  // Update distribution when data changes (real-time)
  useEffect(() => {
    const newTargetDistribution = generateTargetDistribution();
    
    setAnimatedDistribution(prev => {
      // If this is the first time or structure changed, initialize
      if (prev.length !== newTargetDistribution.length) {
        return newTargetDistribution.map(bucket => ({
          ...bucket,
          height: bucket.targetHeight * 0.1, // Start from small height
          animationProgress: 0
        }));
      }
      
      // Update target heights for existing buckets
      return prev.map((bucket, index) => ({
        ...bucket,
        targetHeight: newTargetDistribution[index]?.targetHeight || 0,
        animationProgress: 0 // Reset animation progress for new target
      }));
    });
    
    // Start animation
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
  }, [median, totalParticipants]); // Update when median or participant count changes

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
      ref={canvasRef}
      className={`simple-consensus-canvas ${className}`.trim()}
      style={{ 
        position: 'relative',
        width: '100%', 
        height: 100,
        overflow: 'hidden',
        borderRadius: '12px',
        background: `linear-gradient(135deg, 
          ${consensusColors.background}f0, 
          ${consensusColors.backgroundSecondary}e0
        )`,
        border: `1px solid ${consensusState.color}40`,
        transition: 'all 0.5s ease',
        ...style 
      }}
      aria-label={`${consensusState.label}, median at ${median ?? 'unknown'}`}
      role="img"
    >
      {/* Clear consensus state indicator */}
      <div
        className="consensus-state-header"
        style={{
          position: 'absolute',
          top: '8px',
          left: '12px',
          right: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
      >
        <span style={{ color: consensusState.color }}>
          {consensusState.icon} {consensusState.label}
        </span>
        {median !== null && (
          <span style={{ color: consensusColors.secondary }}>
            Hivemind Verdict: {median}
          </span>
        )}
      </div>
      
      {/* Hivemind Activity Visualization */}
      <div
        className="hivemind-activity"
        style={{
          position: 'absolute',
          top: '35px',
          left: '12px',
          right: '12px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {median !== null && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            <span style={{ color: consensusColors.textSecondary }}>
              Collective Decision:
            </span>
            <span style={{ 
              color: consensusColors.secondary,
              fontSize: '18px',
              textShadow: `0 0 10px ${consensusColors.secondary}60`
            }}>
              {median}
            </span>
            <span style={{ color: consensusColors.textSecondary }}>
              ({totalParticipants} minds)
            </span>
          </div>
        )}
      </div>
      
      {/* Real-time Animated Guess Distribution Histogram */}
      {animatedDistribution.length > 0 && (
        <div
          className="guess-distribution"
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '12px',
            right: '12px',
            height: '20px',
            display: 'flex',
            alignItems: 'end',
            gap: '2px'
          }}
        >
          {animatedDistribution.map((bucket, index) => {
            const heightPx = Math.max(2, bucket.height * 20);
            const intensity = bucket.height / Math.max(...animatedDistribution.map(b => b.height), 1);
            
            // Dynamic color based on activity and intensity
            const isActive = bucket.animationProgress < 1;
            const baseColor = intensity > 0.7 ? consensusColors.primary : 
                             intensity > 0.4 ? consensusColors.secondary : 
                             consensusColors.tertiary;
            
            return (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: `${heightPx}px`,
                  background: isActive 
                    ? `linear-gradient(to top, ${baseColor}80, ${baseColor}60)` 
                    : `linear-gradient(to top, ${baseColor}60, ${baseColor}40)`,
                  borderRadius: '1px',
                  transition: 'none', // No CSS transition, using JS animation
                  boxShadow: isActive ? `0 0 4px ${baseColor}40` : 'none',
                  transform: isActive ? 'scaleY(1.05)' : 'scaleY(1)',
                  transformOrigin: 'bottom'
                }}
                title={`${bucket.position}-${bucket.position + 10}: ${Math.round(bucket.height)} guesses`}
              />
            );
          })}
        </div>
      )}
      
      {/* Real-time activity indicator */}
      {isAnimating && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: consensusColors.success,
            boxShadow: `0 0 8px ${consensusColors.success}60`,
            animation: 'pulse 1s ease-in-out infinite'
          }}
          title="Live updates in progress"
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .guess-distribution * {
            transition: none !important;
            transform: none !important;
            animation: none !important;
          }
          
          .pulse {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SimpleConsensusCanvas;