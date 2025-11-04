import { useEffect, useRef, useState, useCallback } from 'react';
import { colors, animations } from '../../shared/design-tokens.js';

interface AtmosphericEffectsProps {
  consensusStrength: number; // 0-1
  totalParticipants: number;
  isActive: boolean;
  className?: string;
}

type MoodState = 'exploring' | 'converging' | 'unified' | 'chaotic';

/**
 * Atmospheric effects component that creates mood-based visual atmosphere
 * Changes background effects, lighting, and ambient animations based on hivemind state
 */
export const AtmosphericEffects = ({
  consensusStrength,
  totalParticipants,
  isActive,
  className = ''
}: AtmosphericEffectsProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentMood, setCurrentMood] = useState<MoodState>('exploring');
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    color: string;
    life: number;
    initialLife: number;
  }>>([]);
  
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const particleIdRef = useRef<number>(0);
  
  // Refs to hold latest values for the animation loop
  const latestValuesRef = useRef({
    currentMood,
    isActive,
    containerRef
  });

  // Update latest values ref on every render
  latestValuesRef.current = {
    currentMood,
    isActive,
    containerRef
  };

  /**
   * Determine mood state based on consensus metrics
   */
  useEffect(() => {
    let newMood: MoodState;
    
    if (consensusStrength > 0.8) {
      newMood = 'unified';
    } else if (consensusStrength > 0.5) {
      newMood = 'converging';
    } else if (consensusStrength < 0.2 && totalParticipants > 5) {
      newMood = 'chaotic';
    } else {
      newMood = 'exploring';
    }
    
    setCurrentMood(newMood);
  }, [consensusStrength, totalParticipants]);

  /**
   * Get mood-specific styling
   */
  const getMoodStyling = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      transition: 'all 1s ease-in-out',
      overflow: 'hidden'
    };

    switch (currentMood) {
      case 'unified':
        return {
          ...baseStyle,
          background: `
            radial-gradient(circle at 30% 20%, ${colors.particles.primary}15 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, ${colors.particles.burst}10 0%, transparent 50%),
            linear-gradient(45deg, ${colors.background.main}95, ${colors.background.secondary}90)
          `,
          boxShadow: `inset 0 0 100px ${colors.particles.primary}20`
        };
        
      case 'converging':
        return {
          ...baseStyle,
          background: `
            radial-gradient(circle at 50% 50%, ${colors.particles.secondary}12 0%, transparent 60%),
            linear-gradient(135deg, ${colors.background.main}98, ${colors.background.secondary}95)
          `,
          boxShadow: `inset 0 0 80px ${colors.particles.secondary}15`
        };
        
      case 'chaotic':
        return {
          ...baseStyle,
          background: `
            radial-gradient(circle at 20% 30%, ${colors.particles.tertiary}08 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, ${colors.decorative.shadows}06 0%, transparent 40%),
            linear-gradient(90deg, ${colors.background.main}99, ${colors.background.secondary}97)
          `,
          boxShadow: `inset 0 0 60px ${colors.particles.tertiary}10`
        };
        
      default: // exploring
        return {
          ...baseStyle,
          background: `
            radial-gradient(circle at 40% 60%, ${colors.decorative.dots}05 0%, transparent 50%),
            ${colors.background.main}
          `
        };
    }
  };

  /**
   * Get particle configuration for current mood
   */
  const getMoodParticleConfig = useCallback((mood: MoodState) => {
    switch (mood) {
      case 'unified':
        return {
          colors: [colors.particles.primary, colors.particles.burst],
          speed: 0.5,
          minSize: 3,
          maxSize: 8,
          minOpacity: 0.6,
          maxOpacity: 0.9,
          life: 8000,
          maxCount: 15
        };
        
      case 'converging':
        return {
          colors: [colors.particles.secondary, colors.particles.tertiary],
          speed: 1.0,
          minSize: 2,
          maxSize: 6,
          minOpacity: 0.4,
          maxOpacity: 0.7,
          life: 6000,
          maxCount: 12
        };
        
      case 'chaotic':
        return {
          colors: [colors.particles.tertiary, colors.decorative.dots, colors.particles.trail],
          speed: 2.5,
          minSize: 1,
          maxSize: 4,
          minOpacity: 0.2,
          maxOpacity: 0.5,
          life: 3000,
          maxCount: 20
        };
        
      default: // exploring
        return {
          colors: [colors.decorative.dots, colors.particles.trail],
          speed: 0.8,
          minSize: 2,
          maxSize: 5,
          minOpacity: 0.3,
          maxOpacity: 0.6,
          life: 5000,
          maxCount: 8
        };
    }
  }, []);

  /**
   * Create mood-appropriate particles
   */
  const createParticle = useCallback((container: DOMRect, mood: MoodState): void => {
    const particleConfig = getMoodParticleConfig(mood);
    
    const particle = {
      id: ++particleIdRef.current,
      x: Math.random() * container.width,
      y: Math.random() * container.height,
      vx: (Math.random() - 0.5) * particleConfig.speed,
      vy: (Math.random() - 0.5) * particleConfig.speed,
      size: particleConfig.minSize + Math.random() * (particleConfig.maxSize - particleConfig.minSize),
      opacity: particleConfig.minOpacity + Math.random() * (particleConfig.maxOpacity - particleConfig.minOpacity),
      color: particleConfig.colors[Math.floor(Math.random() * particleConfig.colors.length)] || '#ffffff',
      life: particleConfig.life,
      initialLife: particleConfig.life
    };
    
    setParticles(prev => [...prev.slice(-particleConfig.maxCount), particle]);
  }, [getMoodParticleConfig]);

  /**
   * Animation loop for particles
   */
  const animateParticles = useCallback((currentTime: number): void => {
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;
    
    if (deltaTime > 16) { // ~60fps cap
      const { currentMood: latestMood, isActive: latestIsActive, containerRef: latestContainerRef } = latestValuesRef.current;
      const particleConfig = getMoodParticleConfig(latestMood);
      
      setParticles(prev => 
        prev
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            life: particle.life - deltaTime,
            opacity: particle.opacity * (particle.life / particle.initialLife)
          }))
          .filter(particle => particle.life > 0 && particle.opacity > 0.01)
      );
      
      // Create new particles based on activity
      const container = latestContainerRef.current?.getBoundingClientRect();
      if (container && Math.random() < (latestIsActive ? 0.3 : 0.1)) {
        createParticle(container, latestMood);
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(animateParticles);
  }, [getMoodParticleConfig, createParticle]);

  /**
   * Start/stop animation loop
   */
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animateParticles);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animateParticles]);

  /**
   * Activity pulse effect
   */
  const getActivityPulse = (): React.CSSProperties => {
    if (!isActive) return {};
    
    return {
      animation: `atmospheric-pulse ${animations.durations.fast}ms ease-in-out infinite`,
      animationDelay: '0ms'
    };
  };

  return (
    <div 
      ref={containerRef}
      className={`atmospheric-effects ${className}`.trim()}
      style={{
        ...getMoodStyling(),
        ...getActivityPulse()
      }}
      aria-hidden="true"
    >
      {/* Floating particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="atmospheric-particle"
          style={{
            position: 'absolute',
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            borderRadius: '50%',
            opacity: particle.opacity,
            pointerEvents: 'none',
            filter: 'blur(0.5px)',
            transition: 'opacity 0.1s ease'
          }}
        />
      ))}
      
      {/* Mood-specific overlay effects */}
      {currentMood === 'unified' && (
        <div
          className="unity-rays"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '200%',
            height: '200%',
            transform: 'translate(-50%, -50%)',
            background: `conic-gradient(from 0deg, transparent, ${colors.particles.primary}05, transparent, ${colors.particles.burst}03, transparent)`,
            animation: 'rotate 20s linear infinite',
            opacity: 0.6
          }}
        />
      )}
      
      {currentMood === 'chaotic' && (
        <div
          className="chaos-static"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 2px,
                ${colors.particles.tertiary}02 2px,
                ${colors.particles.tertiary}02 4px
              )
            `,
            animation: 'static-flicker 0.1s infinite',
            opacity: 0.3
          }}
        />
      )}

      <style>{`
        @keyframes atmospheric-pulse {
          0%, 100% { 
            filter: brightness(1) saturate(1);
            transform: scale(1);
          }
          50% { 
            filter: brightness(1.1) saturate(1.2);
            transform: scale(1.005);
          }
        }
        
        @keyframes rotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        @keyframes static-flicker {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.1; }
        }
      `}</style>
    </div>
  );
};

export default AtmosphericEffects;