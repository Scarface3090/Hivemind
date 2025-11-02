import { useEffect, useState } from 'react';

interface JudgesScaleProps {
  median: number | null;
  totalParticipants: number;
  className?: string;
}

// Direct color values for reliable rendering
const scaleColors = {
  primary: '#FFD700',      // Gold for consensus side
  secondary: '#00BFFF',    // Blue for verdict
  lines: '#444444',        // Gray lines
  background: '#1a1a1a',   // Dark background
  text: '#ffffff',         // White text
  textSecondary: '#aaaaaa' // Gray text
};

/**
 * Prominent Judge's Scale component that shows real-time hivemind consensus direction
 * Updates immediately when median changes to show which way the collective is leaning
 */
export const JudgesScale = ({ 
  median, 
  totalParticipants, 
  className = '' 
}: JudgesScaleProps): JSX.Element => {
  const [animatedTilt, setAnimatedTilt] = useState<number>(0);
  const [animatedMedian, setAnimatedMedian] = useState<number | null>(null);
  
  // Calculate scale tilt based on median position (-20 to +20 degrees for dramatic effect)
  const targetTilt = median !== null ? ((median - 50) / 50) * 20 : 0;
  
  // Real-time animation of scale tilt
  useEffect(() => {
    if (median === null) {
      setAnimatedTilt(0);
      setAnimatedMedian(null);
      return;
    }
    
    // Immediate update for real-time feel
    const animationDuration = 300; // Fast 300ms animation
    const startTilt = animatedTilt;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Smooth easing
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentTilt = startTilt + (targetTilt - startTilt) * eased;
      
      setAnimatedTilt(currentTilt);
      setAnimatedMedian(median);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [median, targetTilt]);
  
  // Determine consensus state
  const getConsensusState = () => {
    if (totalParticipants === 0) return { label: 'Waiting for the hivemind...', icon: '⏳', color: '#888' };
    if (totalParticipants < 5) return { label: 'Gathering minds', icon: '🧠', color: '#ff9500' };
    if (totalParticipants >= 15) return { label: 'Strong hivemind consensus', icon: '⚡', color: '#00ff88' };
    if (totalParticipants >= 8) return { label: 'Hivemind forming consensus', icon: '🤔', color: '#ffaa00' };
    return { label: 'Hivemind exploring options', icon: '💭', color: '#ff6b6b' };
  };
  
  const consensusState = getConsensusState();
  
  return (
    <div 
      className={`judges-scale-container ${className}`.trim()}
      style={{
        width: '100%',
        padding: '16px',
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${scaleColors.background}f0, #2a2a2ae0)`,
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
          <span style={{ color: scaleColors.secondary }}>
            Hivemind Verdict: {Math.round(animatedMedian)}
          </span>
        )}
      </div>
      
      {/* Large, prominent judge's scale */}
      <div style={{
        position: 'relative',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Scale base (fulcrum) */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '0',
          height: '0',
          borderLeft: '16px solid transparent',
          borderRight: '16px solid transparent',
          borderBottom: `24px solid ${scaleColors.lines}`,
          zIndex: 1
        }} />
        
        {/* Scale beam (tilts based on median) */}
        <div style={{
          position: 'absolute',
          bottom: '34px',
          left: '50%',
          width: '240px',
          height: '6px',
          background: scaleColors.lines,
          transformOrigin: 'center',
          transform: `translateX(-50%) rotate(${animatedTilt}deg)`,
          transition: 'none', // No CSS transition, using JS animation
          borderRadius: '3px',
          zIndex: 2
        }} />
        
        {/* Left pan */}
        <div style={{
          position: 'absolute',
          bottom: `${34 + Math.sin((animatedTilt * Math.PI) / 180) * 120}px`,
          left: `${50 - 25 + (animatedTilt * 0.8)}%`,
          transform: 'translateX(-50%)',
          width: '50px',
          height: '12px',
          background: animatedMedian !== null && animatedMedian < 50 ? scaleColors.primary : scaleColors.lines,
          borderRadius: '25px',
          border: `3px solid ${scaleColors.lines}`,
          transition: 'background 0.3s ease',
          boxShadow: animatedMedian !== null && animatedMedian < 50 ? `0 0 15px ${scaleColors.primary}60` : 'none',
          zIndex: 3
        }} />
        
        {/* Right pan */}
        <div style={{
          position: 'absolute',
          bottom: `${34 - Math.sin((animatedTilt * Math.PI) / 180) * 120}px`,
          left: `${50 + 25 + (animatedTilt * 0.8)}%`,
          transform: 'translateX(-50%)',
          width: '50px',
          height: '12px',
          background: animatedMedian !== null && animatedMedian > 50 ? scaleColors.primary : scaleColors.lines,
          borderRadius: '25px',
          border: `3px solid ${scaleColors.lines}`,
          transition: 'background 0.3s ease',
          boxShadow: animatedMedian !== null && animatedMedian > 50 ? `0 0 15px ${scaleColors.primary}60` : 'none',
          zIndex: 3
        }} />
        
        {/* Scale labels */}
        <div style={{
          position: 'absolute',
          bottom: '-5px',
          left: '15%',
          fontSize: '12px',
          color: scaleColors.textSecondary,
          fontWeight: 'bold'
        }}>
          Lower Values
        </div>
        <div style={{
          position: 'absolute',
          bottom: '-5px',
          right: '15%',
          fontSize: '12px',
          color: scaleColors.textSecondary,
          fontWeight: 'bold'
        }}>
          Higher Values
        </div>
      </div>
      
      {/* Tilt indicator */}
      {animatedMedian !== null && Math.abs(animatedTilt) > 2 && (
        <div style={{
          textAlign: 'center',
          marginTop: '8px',
          fontSize: '12px',
          color: scaleColors.primary,
          fontWeight: 'bold'
        }}>
          {animatedTilt > 0 ? '→ Hivemind leans HIGHER' : '← Hivemind leans LOWER'}
        </div>
      )}
      
      {/* Participant count */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '12px',
        fontSize: '11px',
        color: scaleColors.textSecondary,
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