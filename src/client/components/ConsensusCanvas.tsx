import { useEffect, useRef, useCallback, useState } from 'react';
import Phaser from 'phaser';
import { ConsensusVisualizationScene } from '../game/scenes/ConsensusVisualizationScene.js';
import { PreloaderScene } from '../game/scenes/PreloaderScene.js';
import { MIN_GUESS_VALUE, MAX_GUESS_VALUE } from '../../shared/constants.js';

interface ConsensusData {
  median: number | null;
  guessDistribution: Array<{ value: number; count: number }>;
  totalParticipants: number;
  recentActivity: number;
  consensusStrength: number;
}

interface ConsensusCanvasProps {
  median: number | null;
  totalParticipants: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Real-time consensus visualization canvas that shows the hivemind's collective decision-making
 * Features live heatmap, animated judge's scale, particle streams, and atmospheric effects
 */
export const ConsensusCanvas = ({ 
  median, 
  totalParticipants, 
  className = '',
  style = {}
}: ConsensusCanvasProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<ConsensusVisualizationScene | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState<number>(160);
  
  // Track previous values to detect changes
  const prevDataRef = useRef<{
    median: number | null;
    totalParticipants: number;
    lastUpdateTime: number;
  }>({
    median: null,
    totalParticipants: 0,
    lastUpdateTime: Date.now()
  });

  /**
   * Calculate consensus strength based on participant distribution
   * Higher values indicate more unified agreement
   */
  const calculateConsensusStrength = useCallback((median: number | null, participants: number): number => {
    if (!median || participants < 2) return 0;
    
    // Simple heuristic: assume normal distribution around median
    // In a real implementation, this would use actual guess distribution data
    const participantFactor = Math.min(1, participants / 20); // More participants = potentially stronger consensus
    const center = (MIN_GUESS_VALUE + MAX_GUESS_VALUE) / 2;
    const halfRange = (MAX_GUESS_VALUE - MIN_GUESS_VALUE) / 2;
    const medianCentrality = 1 - Math.abs((median - center) / halfRange); // Closer to center = potentially stronger consensus
    
    return participantFactor * medianCentrality * 0.8; // Max 0.8 to leave room for real distribution analysis
  }, []);

  /**
   * Generate simulated guess distribution based on median and participants
   * In production, this would come from actual server data
   */
  const generateGuessDistribution = useCallback((median: number | null, participants: number): Array<{ value: number; count: number }> => {
    if (!median || participants === 0) return [];
    
    const distribution: Array<{ value: number; count: number }> = [];
    const bucketSize = 5; // Group guesses into buckets of 5
    const numBuckets = Math.ceil((MAX_GUESS_VALUE - MIN_GUESS_VALUE) / bucketSize);
    
    // Create normal distribution around median
    for (let i = 0; i < numBuckets; i++) {
      const bucketStart = MIN_GUESS_VALUE + i * bucketSize;
      const bucketCenter = bucketStart + bucketSize / 2;
      
      // Calculate count using normal distribution
      const distance = Math.abs(bucketCenter - median);
      const maxDistance = (MAX_GUESS_VALUE - MIN_GUESS_VALUE) / 2;
      const normalizedDistance = distance / maxDistance;
      
      // Bell curve with some randomness
      const baseCount = Math.exp(-Math.pow(normalizedDistance * 2, 2));
      const count = Math.floor(baseCount * participants);
      
      if (count > 0) {
        distribution.push({
          value: bucketCenter,
          count: count
        });
      }
    }
    
    return distribution;
  }, []);

  /**
   * Calculate recent activity based on participant changes
   */
  const calculateRecentActivity = useCallback((currentParticipants: number, previousParticipants: number, timeDelta: number): number => {
    const participantIncrease = Math.max(0, currentParticipants - previousParticipants);
    const timeWindow = Math.min(30000, timeDelta); // 30 second window
    const activityRate = (participantIncrease / timeWindow) * 1000; // Per second
    
    return Math.min(10, activityRate * 10); // Scale to 0-10 range
  }, []);

  /**
   * Update the consensus visualization with new data
   */
  const updateConsensusVisualization = useCallback(() => {
    if (!sceneRef.current) return;
    
    const now = Date.now();
    const timeDelta = now - prevDataRef.current.lastUpdateTime;
    
    // Calculate derived metrics
    const consensusStrength = calculateConsensusStrength(median, totalParticipants);
    const guessDistribution = generateGuessDistribution(median, totalParticipants);
    const recentActivity = calculateRecentActivity(
      totalParticipants, 
      prevDataRef.current.totalParticipants, 
      timeDelta
    );
    
    // Prepare consensus data
    const consensusData: Partial<ConsensusData> = {
      median,
      totalParticipants,
      consensusStrength,
      guessDistribution,
      recentActivity
    };
    
    // Update the scene
    sceneRef.current.updateConsensusData(consensusData);
    
    // Update previous values
    prevDataRef.current = {
      median,
      totalParticipants,
      lastUpdateTime: now
    };
  }, [median, totalParticipants, calculateConsensusStrength, generateGuessDistribution, calculateRecentActivity]);

  /**
   * Initialize Phaser game and consensus scene
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || gameRef.current) return;

    const measure = (): { w: number; h: number } => {
      const w = Math.max(1, container.clientWidth || 640);
      const h = Math.max(120, Math.min(200, Math.round(w * 0.25))); // Aspect ratio for consensus overlay
      setHeight(h);
      return { w, h };
    };

    const { w: initialWidth, h: initialHeight } = measure();

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: container,
      backgroundColor: 'transparent',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: initialWidth,
        height: initialHeight,
      },
      scene: [PreloaderScene, ConsensusVisualizationScene],
      render: { 
        antialias: true,
        transparent: true
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 }
        }
      }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Keep Phaser canvas matched to container size
    const resizeToContainer = (): void => {
      const { w, h } = measure();
      if (game.scale.width !== w || game.scale.height !== h) {
        game.scale.resize(w, h);
      }
    };

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(resizeToContainer);
      ro.observe(container);
      resizeObserverRef.current = ro;
    } else {
      window.addEventListener('resize', resizeToContainer);
    }

    // Get scene reference when ready
    game.events.once(Phaser.Core.Events.READY, () => {
      // Start with consensus scene
      if (!game.scene.getScene('ConsensusVisualizationScene')) {
        game.scene.add('ConsensusVisualizationScene', ConsensusVisualizationScene, true);
      } else {
        game.scene.start('ConsensusVisualizationScene');
      }
      
      // Get scene reference
      sceneRef.current = game.scene.getScene('ConsensusVisualizationScene') as ConsensusVisualizationScene;
      
      // Initial update
      updateConsensusVisualization();
    });

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      } else {
        window.removeEventListener('resize', resizeToContainer);
      }
      
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []); // Empty dependency array - only run once on mount

  /**
   * Update visualization when props change
   */
  useEffect(() => {
    updateConsensusVisualization();
  }, [updateConsensusVisualization]);

  return (
    <div 
      ref={containerRef} 
      className={`consensus-canvas ${className}`.trim()}
      style={{ 
        width: '100%', 
        height: `${height}px`,
        overflow: 'hidden',
        borderRadius: '12px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.05))',
        border: '1px solid rgba(255,255,255,0.1)',
        ...style 
      }}
      aria-label={`Consensus visualization: ${totalParticipants} participants, median at ${median ?? 'unknown'}`}
      role="img"
    />
  );
};

export default ConsensusCanvas;