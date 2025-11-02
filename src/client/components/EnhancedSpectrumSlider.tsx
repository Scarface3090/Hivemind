import { useEffect, useRef, useState } from 'react';
import { createPhaserGame } from '../game/index.js';
import Phaser from 'phaser';
import type { Spectrum } from '../../shared/types/Spectrum.js';
import { colors } from '../../shared/design-tokens.js';

interface EnhancedSpectrumSliderProps {
  spectrum: Spectrum;
  value: number;
  onValueChange: (value: number) => void;
  median?: number | null;
  totalParticipants?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * Enhanced spectrum slider with real-time hivemind visualization effects
 * Includes consensus indicators, participant activity, and atmospheric effects
 */
export const EnhancedSpectrumSlider = ({ 
  spectrum, 
  value, 
  onValueChange, 
  median,
  totalParticipants = 0,
  disabled = false,
  className = ''
}: EnhancedSpectrumSliderProps): JSX.Element => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onChangeRef = useRef(onValueChange);
  const sceneCleanupRef = useRef<(() => void) | null>(null);
  const latestMedianRef = useRef<number | null | undefined>(median);
  const latestParticipantsRef = useRef<number>(totalParticipants);
  
  // Enhanced state tracking
  const [consensusStrength, setConsensusStrength] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const prevParticipantsRef = useRef<number>(0);

  // Keep the latest callback without retriggering game creation
  useEffect(() => {
    onChangeRef.current = onValueChange;
  }, [onValueChange]);

  // Track latest values for late-binding scene
  useEffect(() => {
    latestMedianRef.current = median;
  }, [median]);

  useEffect(() => {
    latestParticipantsRef.current = totalParticipants;
    
    // Calculate consensus strength based on participants and median stability
    if (median !== null && totalParticipants > 0) {
      const participantFactor = Math.min(1, totalParticipants / 20);
      const stabilityFactor = 0.8; // Would be calculated from median history in real implementation
      setConsensusStrength(participantFactor * stabilityFactor);
    } else {
      setConsensusStrength(0);
    }
    
    // Detect new participants for activity effects
    if (totalParticipants > prevParticipantsRef.current) {
      setIsActive(true);
      setTimeout(() => setIsActive(false), 2000); // Activity indicator for 2 seconds
    }
    
    prevParticipantsRef.current = totalParticipants;
  }, [totalParticipants, median]);

  useEffect(() => {
    const mountTarget = canvasRef.current;
    if (!mountTarget) return;

    const game = createPhaserGame({ parent: mountTarget });
    gameRef.current = game;

    const startScene = () => {
      if (!game.scene.isActive('GuessingScene')) {
        game.scene.start('GuessingScene', {
          initialValue: value,
          median: latestMedianRef.current ?? null,
          leftLabel: spectrum.leftLabel,
          rightLabel: spectrum.rightLabel,
          // Enhanced data for consensus effects
          totalParticipants: latestParticipantsRef.current,
          consensusStrength: consensusStrength,
          isActive: isActive
        });
      }
    };

    game.events.once(Phaser.Core.Events.BOOT, startScene);

    const wireSceneEvents = () => {
      if (!gameRef.current) return;
      try {
        const scene = gameRef.current.scene.getScene('GuessingScene') as Phaser.Scene & {
          events?: Phaser.Events.EventEmitter;
          setMedian?: (value: number | null) => void;
          setLabels?: (left: string, right: string) => void;
          setConsensusData?: (data: {
            totalParticipants: number;
            consensusStrength: number;
            isActive: boolean;
          }) => void;
          triggerConsensusEffect?: (type: 'newParticipant' | 'medianShift' | 'strongConsensus') => void;
        };
        
        if (scene?.events) {
          const handler = (newValue: number) => {
            onChangeRef.current(newValue);
          };
          
          scene.events.on('slider:valueChanged', handler);
          scene.setMedian?.(latestMedianRef.current ?? null);
          scene.setLabels?.(spectrum.leftLabel, spectrum.rightLabel);
          
          // Set enhanced consensus data
          scene.setConsensusData?.({
            totalParticipants: latestParticipantsRef.current,
            consensusStrength: consensusStrength,
            isActive: isActive
          });
          
          const off = () => {
            scene.events?.off?.('slider:valueChanged', handler);
          };
          sceneCleanupRef.current = off;

          // Ensure cleanup on scene shutdown
          scene.events?.once?.('shutdown', () => {
            off();
          });
        }
      } catch {
        // Scene may not yet exist; try again after the next frame
        game.events.once(Phaser.Core.Events.POST_STEP, wireSceneEvents);
      }
    };

    game.events.once(Phaser.Core.Events.POST_STEP, wireSceneEvents);

    return () => {
      try {
        sceneCleanupRef.current?.();
        sceneCleanupRef.current = null;
      } finally {
        game.destroy(true);
        if (mountTarget.contains(game.canvas)) {
          mountTarget.removeChild(game.canvas);
        }
        gameRef.current = null;
      }
    };
  }, [spectrum.leftLabel, spectrum.rightLabel]);

  // Update median in scene when it changes
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    const applyMedian = () => {
      try {
        const scene = game.scene.getScene('GuessingScene') as Phaser.Scene & {
          setMedian?: (value: number | null) => void;
          triggerConsensusEffect?: (type: 'medianShift') => void;
        };
        
        const prevMedian = latestMedianRef.current;
        scene?.setMedian?.(median ?? null);
        
        // Trigger median shift effect if significant change
        if (prevMedian !== null && median !== null && typeof prevMedian === 'number' && typeof median === 'number' && Math.abs(prevMedian - median) > 5) {
          scene?.triggerConsensusEffect?.('medianShift');
        }
      } catch {
        game.events.once(Phaser.Core.Events.POST_STEP, applyMedian);
      }
    };

    applyMedian();
  }, [median]);

  // Update consensus data when it changes
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    const applyConsensusData = () => {
      try {
        const scene = game.scene.getScene('GuessingScene') as Phaser.Scene & {
          setConsensusData?: (data: {
            totalParticipants: number;
            consensusStrength: number;
            isActive: boolean;
          }) => void;
          triggerConsensusEffect?: (type: 'newParticipant' | 'strongConsensus') => void;
        };
        
        scene?.setConsensusData?.({
          totalParticipants: totalParticipants,
          consensusStrength: consensusStrength,
          isActive: isActive
        });
        
        // Trigger effects based on consensus state
        if (isActive && totalParticipants > prevParticipantsRef.current) {
          scene?.triggerConsensusEffect?.('newParticipant');
        }
        
        if (consensusStrength > 0.8) {
          scene?.triggerConsensusEffect?.('strongConsensus');
        }
        
      } catch {
        game.events.once(Phaser.Core.Events.POST_STEP, applyConsensusData);
      }
    };

    applyConsensusData();
  }, [totalParticipants, consensusStrength, isActive]);

  // Update labels when spectrum changes
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    const applyLabels = () => {
      try {
        const scene = game.scene.getScene('GuessingScene') as Phaser.Scene & {
          setLabels?: (left: string, right: string) => void;
        };
        scene?.setLabels?.(spectrum.leftLabel, spectrum.rightLabel);
      } catch {
        game.events.once(Phaser.Core.Events.POST_STEP, applyLabels);
      }
    };

    applyLabels();
  }, [spectrum.leftLabel, spectrum.rightLabel]);

  // Update value when changed externally
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    const applyValue = () => {
      try {
        const scene = game.scene.getScene('GuessingScene') as Phaser.Scene & {
          events?: Phaser.Events.EventEmitter;
        };
        scene.events?.emit?.('slider:valueChanged', value);
      } catch {
        game.events.once(Phaser.Core.Events.POST_STEP, applyValue);
      }
    };

    applyValue();
  }, [value]);

  // Calculate dynamic styling based on consensus state
  const getContainerStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: '100%',
      height: '120px', // Increased height for enhanced effects
      background: '#111',
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative',
      transition: 'all 0.3s ease'
    };

    // Add consensus-based styling
    if (consensusStrength > 0.7) {
      // Strong consensus - golden glow
      baseStyle.boxShadow = `0 0 20px ${colors.particles.primary}40, inset 0 0 20px ${colors.particles.primary}20`;
      baseStyle.border = `1px solid ${colors.particles.primary}60`;
    } else if (consensusStrength > 0.4) {
      // Moderate consensus - blue glow
      baseStyle.boxShadow = `0 0 15px ${colors.particles.secondary}30, inset 0 0 15px ${colors.particles.secondary}15`;
      baseStyle.border = `1px solid ${colors.particles.secondary}40`;
    } else if (totalParticipants > 0) {
      // Low consensus - subtle red glow indicating uncertainty
      baseStyle.boxShadow = `0 0 10px ${colors.particles.tertiary}20, inset 0 0 10px ${colors.particles.tertiary}10`;
      baseStyle.border = `1px solid ${colors.particles.tertiary}30`;
    }

    // Activity pulse effect
    if (isActive) {
      baseStyle.animation = 'consensus-pulse 2s ease-out';
    }

    return baseStyle;
  };

  return (
    <div className={`enhanced-spectrum-slider-container ${className}`.trim()}>
      {/* Consensus indicators */}
      <div 
        className="consensus-indicators"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '12px',
          color: '#888'
        }}
      >
        <div className="participants-indicator">
          <span style={{ color: colors.particles.secondary }}>👥</span>
          <span style={{ marginLeft: '4px' }}>{totalParticipants} minds</span>
        </div>
        
        <div className="consensus-strength">
          <span style={{ color: colors.particles.primary }}>🧠</span>
          <span style={{ marginLeft: '4px' }}>
            {consensusStrength > 0.8 ? 'Strong Unity' :
             consensusStrength > 0.5 ? 'Growing Consensus' :
             consensusStrength > 0.2 ? 'Divided Minds' :
             'Exploring...'}
          </span>
        </div>
        
        {isActive && (
          <div 
            className="activity-pulse"
            style={{
              color: colors.particles.burst,
              animation: 'pulse 1s ease-in-out infinite'
            }}
          >
            ⚡ Active
          </div>
        )}
      </div>

      {/* Enhanced slider canvas */}
      <div 
        className="enhanced-spectrum-slider-canvas" 
        ref={canvasRef} 
        style={getContainerStyle()}
      />

      {/* Consensus strength bar */}
      <div 
        className="consensus-bar"
        style={{
          marginTop: '8px',
          height: '4px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${consensusStrength * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${colors.particles.tertiary}, ${colors.particles.secondary}, ${colors.particles.primary})`,
            borderRadius: '2px',
            transition: 'width 0.5s ease'
          }}
        />
      </div>

      <style>{`
        @keyframes consensus-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default EnhancedSpectrumSlider;