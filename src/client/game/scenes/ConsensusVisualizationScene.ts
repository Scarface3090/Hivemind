import * as Phaser from 'phaser';
import { ParticleSystemManager } from '../systems/ParticleSystemManager.js';
import { colors, animations } from '../../../shared/design-tokens.js';
import { MAX_GUESS_VALUE, MIN_GUESS_VALUE } from '../../../shared/constants.js';

interface ConsensusData {
  median: number | null;
  guessDistribution: Array<{ value: number; count: number }>;
  totalParticipants: number;
  recentActivity: number; // guesses in last 30 seconds
  consensusStrength: number; // 0-1, how unified the guesses are
}

interface HeatmapPoint {
  x: number;
  intensity: number;
  age: number; // time since last update
}

/**
 * Real-time consensus visualization scene that shows the hivemind's collective decision-making process
 * Features:
 * - Live heatmap showing guess density
 * - Animated judge's scale that tilts based on consensus
 * - Flowing particle streams representing new guesses
 * - Pulsing heartbeat system showing activity level
 * - Dynamic atmospheric effects based on consensus strength
 */
export class ConsensusVisualizationScene extends Phaser.Scene {
  private particleManager!: ParticleSystemManager;
  private heatmapGraphics!: Phaser.GameObjects.Graphics;
  private scaleGraphics!: Phaser.GameObjects.Graphics;
  private atmosphereContainer!: Phaser.GameObjects.Container;
  
  // Consensus data
  private consensusData: ConsensusData = {
    median: null,
    guessDistribution: [],
    totalParticipants: 0,
    recentActivity: 0,
    consensusStrength: 0
  };
  
  // Heatmap system
  private heatmapPoints: HeatmapPoint[] = [];
  private heatmapHeight: number = 40;
  
  // Judge's scale system
  private scaleBalance: number = 0; // -1 to 1, represents tilt
  private scaleOscillation: number = 0;
  private scaleTween: Phaser.Tweens.Tween | null = null;
  
  // Heartbeat system
  private heartbeatTween: Phaser.Tweens.Tween | null = null;
  
  // Particle streams
  private guessStreamEffects: string[] = [];
  private consensusBeaconEffect: string | null = null;
  
  // Atmosphere effects
  private atmosphereEffects: Map<string, string> = new Map();
  
  constructor() {
    super('ConsensusVisualizationScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('transparent');
    
    // Initialize systems
    this.particleManager = new ParticleSystemManager(this);
    this.heatmapGraphics = this.add.graphics();
    this.scaleGraphics = this.add.graphics();
    this.atmosphereContainer = this.add.container();
    
    // Set up depth layers
    this.atmosphereContainer.setDepth(0);
    this.heatmapGraphics.setDepth(1);
    this.scaleGraphics.setDepth(2);
    
    // Initialize effects
    this.createAtmosphereEffects();
    this.startHeartbeatSystem();
    
    // Layout on resize
    this.scale.on('resize', () => this.layout());
    this.layout();
    
    // Clean up on shutdown
    this.events.once('shutdown', this.destroy, this);
  }

  /**
   * Update consensus data and trigger visual updates
   */
  public updateConsensusData(data: Partial<ConsensusData>): void {
    const previousMedian = this.consensusData.median;
    const previousActivity = this.consensusData.recentActivity;
    
    // Update data
    Object.assign(this.consensusData, data);
    
    // Trigger visual updates based on changes
    if (data.median !== undefined && data.median !== previousMedian) {
      this.updateJudgeScale();
      this.updateConsensusBeacon();
    }
    
    if (data.guessDistribution) {
      this.updateHeatmap();
    }
    
    if (data.recentActivity !== undefined && data.recentActivity > previousActivity) {
      this.triggerActivityPulse();
    }
    
    if (data.consensusStrength !== undefined) {
      this.updateAtmosphere();
    }
  }

  /**
   * Create atmospheric particle effects based on consensus state
   */
  private createAtmosphereEffects(): void {
    const { width, height } = this.scale;
    const bounds = new Phaser.Geom.Rectangle(0, 0, width, height);
    
    // Ambient consensus particles
    const ambientEffect = this.particleManager.createAmbientParticles(bounds, {
      colors: [colors.particles.trail, colors.decorative.dots],
      count: 12,
      size: { min: 2, max: 4 },
      speed: { min: 3, max: 8 },
      opacity: { min: 0.1, max: 0.3 }
    });
    
    this.atmosphereEffects.set('ambient', ambientEffect);
  }

  /**
   * Update the judge's scale visualization based on median position
   */
  private updateJudgeScale(): void {
    if (this.consensusData.median === null) return;
    
    const { width } = this.scale;
    
    // Calculate balance based on median position
    const medianNormalized = (this.consensusData.median - MIN_GUESS_VALUE) / (MAX_GUESS_VALUE - MIN_GUESS_VALUE);
    const targetBalance = (medianNormalized - 0.5) * 2; // -1 to 1
    
    // Add oscillation for uncertainty
    const uncertainty = 1 - this.consensusData.consensusStrength;
    this.scaleOscillation = uncertainty * 0.3;
    
    // Animate scale tilt
    if (this.scaleTween) {
      this.scaleTween.stop();
    }
    
    this.scaleTween = this.tweens.add({
      targets: this,
      scaleBalance: targetBalance,
      duration: 800, // Use direct value
      ease: 'Quad.easeOut', // Use direct easing string
      onUpdate: () => this.drawJudgeScale()
    });
  }

  /**
   * Draw the animated judge's scale
   */
  private drawJudgeScale(): void {
    const { width } = this.scale;
    const centerX = width / 2;
    const scaleY = this.heatmapHeight + 60;
    const scaleWidth = Math.min(200, width * 0.6);
    
    this.scaleGraphics.clear();
    
    // Calculate tilt with oscillation
    const currentTilt = this.scaleBalance + Math.sin(this.time.now * 0.003) * this.scaleOscillation;
    const tiltAngle = currentTilt * 0.2; // Max 0.2 radians tilt
    
    // Scale base (fulcrum)
    this.scaleGraphics.fillStyle(0x4A6FA5, 0.8); // Use hex color directly
    this.scaleGraphics.fillTriangle(
      centerX - 15, scaleY + 20,
      centerX + 15, scaleY + 20,
      centerX, scaleY
    );
    
    // Scale beam
    const beamLength = scaleWidth / 2;
    const leftX = centerX - beamLength * Math.cos(tiltAngle);
    const leftY = scaleY + beamLength * Math.sin(tiltAngle);
    const rightX = centerX + beamLength * Math.cos(tiltAngle);
    const rightY = scaleY - beamLength * Math.sin(tiltAngle);
    
    this.scaleGraphics.lineStyle(4, 0x2B4C7E, 0.9); // Use hex color directly
    this.scaleGraphics.strokeLineShape(new Phaser.Geom.Line(leftX, leftY, rightX, rightY));
    
    // Scale pans
    const panRadius = 25;
    const panDepth = 8;
    
    // Left pan
    this.scaleGraphics.fillStyle(0x4A6FA5, 0.7); // Use hex color directly
    this.scaleGraphics.fillEllipse(leftX, leftY + panDepth, panRadius * 2, panRadius);
    this.scaleGraphics.lineStyle(2, 0x2B4C7E, 0.8); // Use hex color directly
    this.scaleGraphics.strokeEllipse(leftX, leftY + panDepth, panRadius * 2, panRadius);
    
    // Right pan
    this.scaleGraphics.fillEllipse(rightX, rightY + panDepth, panRadius * 2, panRadius);
    this.scaleGraphics.strokeEllipse(rightX, rightY + panDepth, panRadius * 2, panRadius);
    
    // Weight visualization (particle density on pans)
    this.visualizeWeightDistribution(leftX, leftY + panDepth, rightX, rightY + panDepth);
  }

  /**
   * Visualize guess distribution as weights on the scale pans
   */
  private visualizeWeightDistribution(leftX: number, leftY: number, rightX: number, rightY: number): void {
    if (!this.consensusData.guessDistribution.length) return;
    
    const midpoint = (MIN_GUESS_VALUE + MAX_GUESS_VALUE) / 2;
    let leftWeight = 0;
    let rightWeight = 0;
    
    // Calculate weight distribution
    this.consensusData.guessDistribution.forEach(point => {
      if (point.value < midpoint) {
        leftWeight += point.count;
      } else {
        rightWeight += point.count;
      }
    });
    
    const totalWeight = leftWeight + rightWeight;
    if (totalWeight === 0) return;
    
    // Visualize weights as particle clusters
    const leftIntensity = leftWeight / totalWeight;
    const rightIntensity = rightWeight / totalWeight;
    
    // Create weight particles on pans
    if (leftIntensity > 0.1) {
      this.createWeightParticles(leftX, leftY, leftIntensity, 'left');
    }
    
    if (rightIntensity > 0.1) {
      this.createWeightParticles(rightX, rightY, rightIntensity, 'right');
    }
  }

  /**
   * Create particle effects representing weights on scale pans
   */
  private createWeightParticles(x: number, y: number, intensity: number, side: 'left' | 'right'): void {
    const particleCount = Math.floor(intensity * 8) + 2;
    const colors_array = side === 'left' 
      ? [colors.brushStrokes.orange, colors.particles.secondary]
      : [colors.brushStrokes.teal, colors.particles.tertiary];
    
    this.particleManager.createOrganicBurst(x, y, {
      colors: colors_array,
      count: particleCount,
      duration: 400,
      size: { min: 3, max: 6 },
      speed: { min: 10, max: 25 }
    });
  }

  /**
   * Update the live heatmap showing guess density
   */
  private updateHeatmap(): void {
    if (!this.consensusData.guessDistribution.length) return;
    
    const { width } = this.scale;
    
    // Update heatmap points based on guess distribution
    this.heatmapPoints = this.consensusData.guessDistribution.map(point => {
      const normalizedX = (point.value - MIN_GUESS_VALUE) / (MAX_GUESS_VALUE - MIN_GUESS_VALUE);
      return {
        x: normalizedX * width,
        intensity: point.count / Math.max(1, this.consensusData.totalParticipants),
        age: 0
      };
    });
    
    this.drawHeatmap();
  }

  /**
   * Draw the thermal heatmap visualization
   */
  private drawHeatmap(): void {
    const { width } = this.scale;
    const heatmapY = 20;
    
    this.heatmapGraphics.clear();
    
    if (!this.heatmapPoints.length) return;
    
    // Draw heatmap using overlapping circles with thermal colors
    this.heatmapPoints.forEach(point => {
      const intensity = Math.max(0.1, point.intensity);
      const radius = 30 + intensity * 40;
      
      // Thermal color based on intensity
      let color: number;
      let alpha: number;
      
      if (intensity > 0.7) {
        color = 0xff4444; // Hot red
        alpha = 0.8;
      } else if (intensity > 0.4) {
        color = 0xff8844; // Orange
        alpha = 0.6;
      } else if (intensity > 0.2) {
        color = 0xffaa44; // Yellow
        alpha = 0.4;
      } else {
        color = 0x44aaff; // Cool blue
        alpha = 0.3;
      }
      
      this.heatmapGraphics.fillStyle(color, alpha);
      this.heatmapGraphics.fillCircle(point.x, heatmapY, radius);
    });
    
    // Add pulsing effect for recent activity
    if (this.consensusData.recentActivity > 0) {
      const pulseAlpha = 0.3 + 0.2 * Math.sin(this.time.now * 0.008);
      this.heatmapGraphics.fillStyle(0xF1C40F, pulseAlpha); // Use hex color directly
      this.heatmapGraphics.fillRect(0, heatmapY - this.heatmapHeight/2, width, this.heatmapHeight);
    }
  }

  /**
   * Update consensus beacon effect at median position
   */
  private updateConsensusBeacon(): void {
    if (this.consensusData.median === null) return;
    
    const { width } = this.scale;
    const medianNormalized = (this.consensusData.median - MIN_GUESS_VALUE) / (MAX_GUESS_VALUE - MIN_GUESS_VALUE);
    const beaconX = medianNormalized * width;
    const beaconY = 20;
    
    // Destroy existing beacon
    if (this.consensusBeaconEffect) {
      this.particleManager.destroyEffect(this.consensusBeaconEffect);
    }
    
    // Create new beacon with intensity based on consensus strength
    const beaconIntensity = this.consensusData.consensusStrength;
    const beaconColors = beaconIntensity > 0.7 
      ? [colors.particles.primary, colors.particles.burst]
      : [colors.particles.secondary, colors.particles.tertiary];
    
    this.consensusBeaconEffect = this.particleManager.createAmbientParticles(
      new Phaser.Geom.Rectangle(beaconX - 20, beaconY - 20, 40, 40),
      {
        colors: beaconColors,
        count: Math.floor(8 + beaconIntensity * 12),
        size: { min: 4, max: 8 },
        speed: { min: 15, max: 30 },
        opacity: { min: 0.4, max: 0.8 }
      }
    );
  }

  /**
   * Start the heartbeat system that pulses with activity
   */
  private startHeartbeatSystem(): void {
    // Create continuous heartbeat based on activity
    this.time.addEvent({
      delay: 1000,
      callback: this.updateHeartbeat,
      callbackScope: this,
      loop: true
    });
  }

  /**
   * Update heartbeat intensity based on recent activity
   */
  private updateHeartbeat(): void {
    const activityLevel = Math.min(1, this.consensusData.recentActivity / 10);
    
    // Pulse all visual elements
    this.cameras.main.flash(50, 255, 255, 255, false);
  }

  /**
   * Trigger activity pulse when new guesses arrive
   */
  private triggerActivityPulse(): void {
    const { width } = this.scale;
    
    // Create flowing particles from edges toward median
    if (this.consensusData.median !== null) {
      const medianNormalized = (this.consensusData.median - MIN_GUESS_VALUE) / (MAX_GUESS_VALUE - MIN_GUESS_VALUE);
      const targetX = medianNormalized * width;
      
      // Left stream
      this.createGuessStream(0, targetX, 'left');
      
      // Right stream  
      this.createGuessStream(width, targetX, 'right');
    }
    
    // Trigger heartbeat pulse
    if (this.heartbeatTween) {
      this.heartbeatTween.stop();
    }
    
    this.heartbeatTween = this.tweens.add({
      targets: this.atmosphereContainer,
      scaleX: { from: 1, to: 1.02 },
      scaleY: { from: 1, to: 1.02 },
      duration: 200,
      yoyo: true,
      ease: animations.easings.bounce
    });
  }

  /**
   * Create flowing particle stream representing new guesses
   */
  private createGuessStream(startX: number, targetX: number, direction: 'left' | 'right'): void {
    const streamY = 40;
    const streamColors = direction === 'left'
      ? [colors.brushStrokes.orange, colors.particles.secondary]
      : [colors.brushStrokes.teal, colors.particles.tertiary];
    
    const streamEffect = this.particleManager.createBrushStrokeTrail(startX, streamY, {
      colors: streamColors,
      count: 6,
      duration: 1200,
      size: { min: 3, max: 7 },
      speed: { min: 40, max: 80 }
    });
    
    // Animate stream toward target
    this.tweens.add({
      targets: { x: startX },
      x: targetX,
      duration: 1200,
      ease: 'Quad.easeOut', // Use direct easing string
      onUpdate: (tween) => {
        const currentX = tween.getValue();
        this.particleManager.updateTrailPosition(streamEffect, currentX, streamY);
      },
      onComplete: () => {
        this.particleManager.destroyEffect(streamEffect);
      }
    });
  }

  /**
   * Update atmospheric effects based on consensus strength
   */
  private updateAtmosphere(): void {
    const strength = this.consensusData.consensusStrength;
    
    // Clear existing atmosphere effects
    this.atmosphereEffects.forEach((effectId, key) => {
      if (key !== 'ambient') {
        this.particleManager.destroyEffect(effectId);
        this.atmosphereEffects.delete(key);
      }
    });
    
    const { width, height } = this.scale;
    
    if (strength > 0.8) {
      // Strong consensus - crystalline effects
      const crystalEffect = this.particleManager.createAmbientParticles(
        new Phaser.Geom.Rectangle(0, 0, width, height),
        {
          colors: [colors.particles.primary, colors.particles.burst],
          count: 20,
          size: { min: 6, max: 12 },
          speed: { min: 2, max: 5 },
          opacity: { min: 0.6, max: 0.9 }
        }
      );
      this.atmosphereEffects.set('crystal', crystalEffect);
      
    } else if (strength < 0.3) {
      // Low consensus - chaotic fog effects
      const fogEffect = this.particleManager.createAmbientParticles(
        new Phaser.Geom.Rectangle(0, 0, width, height),
        {
          colors: [colors.decorative.dots, colors.particles.trail],
          count: 30,
          size: { min: 8, max: 16 },
          speed: { min: 8, max: 20 },
          opacity: { min: 0.1, max: 0.4 }
        }
      );
      this.atmosphereEffects.set('fog', fogEffect);
    }
  }

  /**
   * Layout all visual elements
   */
  private layout(): void {
    const { width, height } = this.scale;
    
    // Update camera
    this.cameras.resize(width, height);
    
    // Redraw all elements
    this.drawHeatmap();
    this.drawJudgeScale();
    
    // Update atmosphere bounds - placeholder for future enhancement
  }

  override update(time: number, delta: number): void {
    // Age heatmap points for fade effect
    this.heatmapPoints.forEach(point => {
      point.age += delta;
      if (point.age > 5000) { // Fade after 5 seconds
        point.intensity *= 0.98;
      }
    });
    
    // Update oscillation effects
    if (this.scaleOscillation > 0) {
      this.drawJudgeScale();
    }
  }

  destroy(): void {
    // Clean up all effects
    this.guessStreamEffects.forEach(effectId => {
      this.particleManager.destroyEffect(effectId);
    });
    
    this.atmosphereEffects.forEach(effectId => {
      this.particleManager.destroyEffect(effectId);
    });
    
    if (this.consensusBeaconEffect) {
      this.particleManager.destroyEffect(this.consensusBeaconEffect);
    }
    
    // Clean up tweens
    if (this.scaleTween) {
      this.scaleTween.stop();
    }
    
    if (this.heartbeatTween) {
      this.heartbeatTween.stop();
    }
    
    // Clean up particle system
    if (this.particleManager) {
      this.particleManager.destroy();
    }
  }
}