import * as Phaser from 'phaser';
import { MAX_GUESS_VALUE, MIN_GUESS_VALUE } from '../../../shared/constants.js';
import { ParticleSystemManager } from '../systems/ParticleSystemManager.js';
import { colors } from '../../../shared/design-tokens.js';
import { getSpectrumColors, lerpColor, jitter } from '../../../shared/utils/spectrumColors.js';
/**
 * Artistic Enhancements:
 * - Painterly gradient track using spectrum-derived colors (multi-pass jittered strokes)
 * - Medium-density particle trail + contextual bursts with spectrum palette
 * - Organic median visuals: subtle shimmer and near-value pulse tween
 * - Touch UX: larger hit area and short momentum easing glide on release
 *
 * Performance:
 * - Adaptive draw density based on track width and devicePixelRatio
 * - Effects are lightweight; counts tuned for mid-range mobile targets
 */

type GuessingSceneData = {
  initialValue?: number;
  median?: number | null;
  leftLabel?: string;
  rightLabel?: string;
  // Enhanced consensus data
  totalParticipants?: number;
  consensusStrength?: number;
  isActive?: boolean;
};

export class GuessingScene extends Phaser.Scene {
  private track!: Phaser.GameObjects.Rectangle;
  private handle!: Phaser.GameObjects.Arc;
  private medianLine!: Phaser.GameObjects.Rectangle;
  private valueText!: Phaser.GameObjects.Text;
  private medianText!: Phaser.GameObjects.Text;
  private leftLabelText!: Phaser.GameObjects.Text;
  private rightLabelText!: Phaser.GameObjects.Text;
  private spectrumBar!: Phaser.GameObjects.Graphics;
  private spectrumColorLeft: number | null = null;
  private spectrumColorRight: number | null = null;
  private spectrumCacheWidth: number | null = null;
  private spectrumCacheHeight: number | null = null;
  private spectrumCacheLeft: number | null = null;
  private spectrumCacheRight: number | null = null;

  private currentValue: number = 50;
  private currentMedian: number | null = null;
  private leftLabel: string = '';
  private rightLabel: string = '';
  
  // Enhanced consensus state
  private totalParticipants: number = 0;
  private consensusStrength: number = 0;
  private isActive: boolean = false;
  private consensusEffects: Map<string, string> = new Map();

  // Particle system
  private particleManager!: ParticleSystemManager;
  private trailEffectId: string | null = null;
  private ambientEffectId: string | null = null;
  private isDragging: boolean = false;
  private medianPulseTween: Phaser.Tweens.Tween | null = null;
  private medianTimeline: Phaser.Tweens.Timeline | null = null;
  private medianAnimatedX: number | null = null;
  private jitterAmp: number = 0;
  private isEmittingInternal: boolean = false;
  private lastDragVX: number = 0;
  private prevDragX: number | null = null;

  constructor() {
    super('GuessingScene');
  }

  init(data: GuessingSceneData): void {
    if (typeof data.initialValue === 'number') this.currentValue = data.initialValue;
    if (typeof data.median === 'number') this.currentMedian = data.median;
    if (typeof data.leftLabel === 'string') this.leftLabel = data.leftLabel;
    if (typeof data.rightLabel === 'string') this.rightLabel = data.rightLabel;
    if (typeof data.totalParticipants === 'number') this.totalParticipants = data.totalParticipants;
    if (typeof data.consensusStrength === 'number') this.consensusStrength = data.consensusStrength;
    if (typeof data.isActive === 'boolean') this.isActive = data.isActive;
    
    if (this.leftLabel && this.rightLabel) {
      const [l, r] = getSpectrumColors(this.leftLabel, this.rightLabel);
      this.spectrumColorLeft = l;
      this.spectrumColorRight = r;
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#111111');

    // Initialize particle system
    this.particleManager = new ParticleSystemManager(this);

    // Spectrum gradient bar
    this.spectrumBar = this.add.graphics();

    // Slider track (invisible, just for hit detection)
    this.track = this.add.rectangle(0, 0, 600, 6, 0x888888, 0).setOrigin(0.5, 0.5);

    // Slider handle
    this.handle = this.add
      .arc(0, 0, 14, 0, 360, false, 0xffcc00)
      .setInteractive({
        useHandCursor: true,
        draggable: true,
        hitArea: new Phaser.Geom.Circle(0, 0, 24),
        hitAreaCallback: Phaser.Geom.Circle.Contains,
      });

    // Median indicator
    this.medianLine = this.add.rectangle(0, 0, 2, 28, 0x00e5ff, 1).setOrigin(0.5, 0.5);

    // Value and median labels
    this.valueText = this.add
      .text(0, 0, `${this.currentValue}`, {
        fontFamily: 'Inter, Arial',
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 1);

    this.medianText = this.add
      .text(0, 0, this.currentMedian == null ? '—' : `${this.currentMedian}`, {
        fontFamily: 'Inter, Arial',
        fontSize: '14px',
        color: '#00e5ff',
      })
      .setOrigin(0.5, 0);

    // Spectrum labels
    this.leftLabelText = this.add
      .text(0, 0, this.leftLabel, {
        fontFamily: 'Inter, Arial',
        fontSize: '12px',
        color: '#cccccc',
      })
      .setOrigin(0, 0.5);

    this.rightLabelText = this.add
      .text(0, 0, this.rightLabel, {
        fontFamily: 'Inter, Arial',
        fontSize: '12px',
        color: '#cccccc',
      })
      .setOrigin(1, 0.5);

    // Depth ordering to ensure interactivity and visibility
    this.spectrumBar.setDepth(0);
    this.track.setDepth(1);
    this.leftLabelText.setDepth(1);
    this.rightLabelText.setDepth(1);
    this.medianLine.setDepth(2);
    this.medianText.setDepth(2);
    this.handle.setDepth(3);
    this.valueText.setDepth(3);

    // Input
    this.input.setDraggable(this.handle, true);

    // Handle drag start
    this.input.on(
      'dragstart',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (gameObject !== this.handle) return;
        this.isDragging = true;

        // If a previous trail exists, destroy it before creating a new one
        if (this.trailEffectId) {
          this.particleManager.destroyEffect(this.trailEffectId);
          this.trailEffectId = null;
        }

        // Create brush stroke trail effect (medium density) using spectrum colors
        const trailLeft = this.spectrumColorLeft ?? colors.particles.primary;
        const trailRight = this.spectrumColorRight ?? colors.particles.secondary;
        this.trailEffectId = this.particleManager.createBrushStrokeTrail(
          this.handle.x,
          this.handle.y,
          {
            colors: [trailLeft, trailRight],
            count: 16,
            duration: 900,
          }
        );
      }
    );

    this.input.on(
      'drag',
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number
      ) => {
        if (gameObject !== this.handle) return;
        const { left, right } = this.track.getBounds();
        const clampedX = Phaser.Math.Clamp(dragX, left, right);
        this.handle.setX(clampedX);
        this.currentValue = this.positionToValue(clampedX, left, right);
        this.valueText.setText(`${this.currentValue}`);

        // simple velocity estimation for momentum easing
        if (this.prevDragX == null) {
          this.prevDragX = clampedX;
        } else {
          this.lastDragVX = clampedX - this.prevDragX;
          this.prevDragX = clampedX;
        }

        // Update particle trail position
        if (this.trailEffectId && this.isDragging) {
          this.particleManager.updateTrailPosition(this.trailEffectId, clampedX, this.handle.y);
        }

        this.layout();
        this.emitValueChanged(this.currentValue);
      }
    );

    // Handle drag end
    this.input.on(
      'dragend',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (gameObject !== this.handle) return;
        this.isDragging = false;
        this.prevDragX = null;

        // Destroy and clear trail effect on release to avoid leaks
        if (this.trailEffectId) {
          this.particleManager.destroyEffect(this.trailEffectId);
          this.trailEffectId = null;
        }

        // Create organic burst effect on release
        const burstLeft = this.spectrumColorLeft ?? colors.particles.primary;
        const burstRight = this.spectrumColorRight ?? colors.particles.tertiary;
        this.particleManager.createOrganicBurst(this.handle.x, this.handle.y, {
          colors: [burstLeft, burstRight],
          count: 18,
          duration: 600,
        });

        // Momentum easing: glide a bit based on last velocity
        const { left, right } = this.track.getBounds();
        const targetX = Phaser.Math.Clamp(this.handle.x + this.lastDragVX * 6, left, right);
        if (Math.abs(targetX - this.handle.x) > 1) {
          const startX = this.handle.x;
          this.tweens.add({
            targets: this.handle,
            x: targetX,
            duration: 180,
            ease: 'Quad.easeOut',
            onUpdate: () => {
              const v = this.positionToValue(this.handle.x, left, right);
              this.currentValue = v;
              this.valueText.setText(`${v}`);
              this.layout();
            },
            onComplete: () => {
              this.emitValueChanged(this.currentValue);
            },
          });
        }
      }
    );

    // Make track clickable and draggable for quick jumps
    this.track.setInteractive({ useHandCursor: true });
    this.track.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const { left, right } = this.track.getBounds();
      const clampedX = Phaser.Math.Clamp(pointer.x, left, right);
      this.handle.setX(clampedX);
      this.currentValue = this.positionToValue(clampedX, left, right);
      this.valueText.setText(`${this.currentValue}`);

      // Create burst effect on click
      const clickLeft = this.spectrumColorLeft ?? colors.particles.secondary;
      const clickRight = this.spectrumColorRight ?? colors.particles.tertiary;
      this.particleManager.createOrganicBurst(clampedX, this.handle.y, {
        colors: [clickLeft, clickRight],
        count: 14,
        duration: 520,
      });

      this.layout();
      this.emitValueChanged(this.currentValue);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      // Skip pointermove logic if handle is being dragged - handle drag events will handle it
      if (this.isDragging) return;
      const { left, right } = this.track.getBounds();
      const clampedX = Phaser.Math.Clamp(pointer.x, left, right);
      this.handle.setX(clampedX);
      this.currentValue = this.positionToValue(clampedX, left, right);
      this.valueText.setText(`${this.currentValue}`);

      // Update particle trail position during drag
      if (this.trailEffectId && this.isDragging) {
        this.particleManager.updateTrailPosition(this.trailEffectId, clampedX, this.handle.y);
      }

      this.layout();
      this.emitValueChanged(this.currentValue);
    });

    // Responsive
    this.scale.on('resize', () => this.layout());
    this.layout();

    // Create ambient particles after layout
    this.createAmbientParticles();

    // Set up cleanup when scene shuts down
    this.events.once('shutdown', this.destroy, this);

    // Listen for external value changes (from React wrapper) to provide visual feedback
    this.events.on('slider:valueChanged', (newValue: number) => {
      if (this.isEmittingInternal) return; // ignore self-emitted events
      if (typeof newValue !== 'number') return;
      if (this.isDragging) return; // don't disturb active drag

      const { left, right } = this.track.getBounds();
      const x = this.valueToPosition(newValue, left, right);
      this.currentValue = Phaser.Math.Clamp(newValue, MIN_GUESS_VALUE, MAX_GUESS_VALUE);
      this.handle.setX(x);
      this.valueText.setText(`${this.currentValue}`);
      this.layout();

      const burstLeft = this.spectrumColorLeft ?? colors.particles.secondary;
      const burstRight = this.spectrumColorRight ?? colors.particles.trail;
      this.particleManager.createOrganicBurst(x, this.handle.y, {
        colors: [burstLeft, burstRight],
        count: 10,
        duration: 420,
      });
    });
  }

  public setMedian(median: number | null): void {
    const previousMedian = this.currentMedian;
    this.currentMedian = median;
    this.medianText.setText(median == null ? '—' : `${median}`);

    // Create particle effect when median changes
    const { left, right } = this.track.getBounds();
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (previousMedian !== null && median !== null && previousMedian !== median) {
      const prevX = this.medianAnimatedX ?? this.valueToPosition(previousMedian, left, right);
      const targetX = this.valueToPosition(median, left, right);
      const delta = targetX - prevX;
      const absDelta = Math.abs(delta);
      const sign = delta === 0 ? 1 : delta / absDelta;

      // celebratory micro burst at target
      this.particleManager.createOrganicBurst(targetX, this.track.y, {
        colors: [colors.particles.tertiary, colors.particles.trail],
        count: 10,
        duration: 400,
        size: { min: 4, max: 8 },
      });

      // Cancel existing animation
      if (this.medianTimeline) {
        this.medianTimeline.stop();
        this.medianTimeline = null;
      }

      const overshoot = reducedMotion ? 0 : Math.min(12, Math.max(4, absDelta * 0.08));
      const o1 = targetX + sign * overshoot;
      const o2 = targetX - sign * overshoot * 0.4;
      const durationTotal = reducedMotion ? 240 : Phaser.Math.Clamp(600 + Math.min(300, absDelta * 4), 600, 900);
      const d1 = reducedMotion ? durationTotal : Math.round(durationTotal * 0.45);
      const d2 = reducedMotion ? 0 : Math.round(durationTotal * 0.28);
      const d3 = reducedMotion ? 0 : Math.max(150, durationTotal - d1 - d2);

      const driver = { x: prevX } as { x: number };
      const apply = () => {
        this.medianAnimatedX = driver.x;
        // Position immediately based on animated X
        const sliderY = this.track.y;
        this.medianLine.setVisible(true).setPosition(this.medianAnimatedX, sliderY).setDisplaySize(2, 28);
        this.medianText.setVisible(true).setPosition(this.medianAnimatedX, sliderY + 20);
      };

      // enable subtle jitter implying flowing guesses
      this.jitterAmp = reducedMotion ? 0 : 0.5;

      if (reducedMotion) {
        this.tweens.add({
          targets: driver,
          x: targetX,
          duration: d1,
          ease: 'Quad.easeOut',
          onUpdate: apply,
          onComplete: () => {
            this.medianAnimatedX = targetX;
            this.jitterAmp = 0;
          },
        });
      } else {
        const tl = this.tweens.createTimeline();
        tl.add({ targets: driver, x: o1, duration: d1, ease: 'Cubic.easeOut', onUpdate: apply });
        if (d2 > 0) tl.add({ targets: driver, x: o2, duration: d2, ease: 'Sine.easeInOut', onUpdate: apply });
        if (d3 > 0) tl.add({ targets: driver, x: targetX, duration: d3, ease: 'Sine.easeOut', onUpdate: apply });
        tl.setCallback('onComplete', () => {
          this.medianAnimatedX = targetX;
          this.jitterAmp = 0;
        });
        this.medianTimeline = tl;
        tl.play();
      }
    } else {
      // No previous or same value: just lay out normally
      this.medianAnimatedX = null;
      this.layout();
    }

    this.updateMedianVisuals();
  }

  public setLabels(left: string, right: string): void {
    this.leftLabel = left ?? '';
    this.rightLabel = right ?? '';
    if (this.leftLabelText) this.leftLabelText.setText(this.leftLabel);
    if (this.rightLabelText) this.rightLabelText.setText(this.rightLabel);
    if (this.leftLabel && this.rightLabel) {
      const [l, r] = getSpectrumColors(this.leftLabel, this.rightLabel);
      this.spectrumColorLeft = l;
      this.spectrumColorRight = r;
    }
    this.layout();
    this.updateMedianVisuals();
  }

  /**
   * Update consensus data for enhanced visual effects
   */
  public setConsensusData(data: {
    totalParticipants: number;
    consensusStrength: number;
    isActive: boolean;
  }): void {
    this.totalParticipants = data.totalParticipants;
    this.consensusStrength = data.consensusStrength;
    this.isActive = data.isActive;
    
    this.updateConsensusEffects();
  }

  /**
   * Trigger specific consensus effects
   */
  public triggerConsensusEffect(type: 'newParticipant' | 'medianShift' | 'strongConsensus'): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    
    switch (type) {
      case 'newParticipant':
        // Ripple effect from edges
        this.createRippleEffect(0, centerY, centerX);
        this.createRippleEffect(width, centerY, centerX);
        break;
        
      case 'medianShift':
        // Dramatic shift effect at median position
        if (this.currentMedian !== null) {
          const { left, right } = this.track.getBounds();
          const medianX = this.valueToPosition(this.currentMedian, left, right);
          this.createShiftEffect(medianX, this.track.y);
        }
        break;
        
      case 'strongConsensus':
        // Crystallization effect across entire spectrum
        this.createCrystallizationEffect();
        break;
    }
  }

  /**
   * Update ambient consensus effects based on current state
   */
  private updateConsensusEffects(): void {
    // Clear existing consensus effects
    this.consensusEffects.forEach((effectId) => {
      this.particleManager.destroyEffect(effectId);
    });
    this.consensusEffects.clear();
    
    const { width, height } = this.scale;
    
    // Add effects based on consensus strength
    if (this.consensusStrength > 0.7) {
      // Strong consensus - golden harmony particles
      const harmonyEffect = this.particleManager.createAmbientParticles(
        new Phaser.Geom.Rectangle(0, 0, width, height),
        {
          colors: [colors.particles.primary, colors.particles.burst],
          count: Math.floor(8 + this.totalParticipants * 0.2),
          size: { min: 4, max: 8 },
          speed: { min: 5, max: 15 },
          opacity: { min: 0.4, max: 0.7 }
        }
      );
      this.consensusEffects.set('harmony', harmonyEffect);
      
    } else if (this.consensusStrength > 0.4) {
      // Moderate consensus - flowing convergence
      const convergenceEffect = this.particleManager.createAmbientParticles(
        new Phaser.Geom.Rectangle(0, 0, width, height),
        {
          colors: [colors.particles.secondary, colors.particles.tertiary],
          count: Math.floor(6 + this.totalParticipants * 0.15),
          size: { min: 3, max: 6 },
          speed: { min: 8, max: 20 },
          opacity: { min: 0.3, max: 0.6 }
        }
      );
      this.consensusEffects.set('convergence', convergenceEffect);
      
    } else if (this.totalParticipants > 0) {
      // Low consensus - chaotic exploration
      const chaosEffect = this.particleManager.createAmbientParticles(
        new Phaser.Geom.Rectangle(0, 0, width, height),
        {
          colors: [colors.particles.trail, colors.decorative.mist],
          count: Math.floor(4 + this.totalParticipants * 0.1),
          size: { min: 2, max: 5 },
          speed: { min: 15, max: 35 },
          opacity: { min: 0.2, max: 0.4 }
        }
      );
      this.consensusEffects.set('chaos', chaosEffect);
    }
  }

  /**
   * Create ripple effect for new participant
   */
  private createRippleEffect(startX: number, startY: number, targetX: number): void {
    const rippleColors = [colors.particles.secondary, colors.particles.tertiary];
    
    // Create expanding ring effect
    const ringEffect = this.particleManager.createOrganicBurst(startX, startY, {
      colors: rippleColors,
      count: 12,
      duration: 800,
      size: { min: 4, max: 10 },
      speed: { min: 30, max: 60 }
    });
    
    // Animate toward center
    this.tweens.add({
      targets: { x: startX },
      x: targetX,
      duration: 600,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const currentX = tween.getValue();
        this.particleManager.updateTrailPosition(ringEffect, currentX, startY);
      }
    });
  }

  /**
   * Create dramatic shift effect at median
   */
  private createShiftEffect(x: number, y: number): void {
    // Explosive burst at median position
    this.particleManager.createOrganicBurst(x, y, {
      colors: [colors.particles.primary, colors.particles.burst, colors.particles.secondary],
      count: 25,
      duration: 1000,
      size: { min: 6, max: 14 },
      speed: { min: 50, max: 100 }
    });
    
    // Screen flash effect
    this.cameras.main.flash(200, 255, 215, 0, false);
  }

  /**
   * Create crystallization effect for strong consensus
   */
  private createCrystallizationEffect(): void {
    const { width, height } = this.scale;
    
    // Multiple synchronized bursts across the spectrum
    const positions = [
      { x: width * 0.2, y: height * 0.5 },
      { x: width * 0.4, y: height * 0.3 },
      { x: width * 0.6, y: height * 0.7 },
      { x: width * 0.8, y: height * 0.4 }
    ];
    
    positions.forEach((pos, index) => {
      this.time.delayedCall(index * 150, () => {
        this.particleManager.createOrganicBurst(pos.x, pos.y, {
          colors: [colors.particles.primary, colors.particles.burst],
          count: 20,
          duration: 1200,
          size: { min: 8, max: 16 },
          speed: { min: 40, max: 80 }
        });
      });
    });
    
    // Golden screen tint
    this.cameras.main.setTint(0xffd700);
    this.tweens.add({
      targets: this.cameras.main,
      alpha: { from: 0.9, to: 1 },
      duration: 1000,
      onComplete: () => {
        this.cameras.main.clearTint();
      }
    });
  }

  private valueToPosition(value: number, left: number, right: number): number {
    const t = (value - MIN_GUESS_VALUE) / (MAX_GUESS_VALUE - MIN_GUESS_VALUE);
    return Phaser.Math.Linear(left, right, t);
  }

  private positionToValue(x: number, left: number, right: number): number {
    const t = Phaser.Math.Clamp((x - left) / (right - left), 0, 1);
    const v = MIN_GUESS_VALUE + Math.round(t * (MAX_GUESS_VALUE - MIN_GUESS_VALUE));
    return Phaser.Math.Clamp(v, MIN_GUESS_VALUE, MAX_GUESS_VALUE);
  }

  private layout(): void {
    const { width, height } = this.scale;
    const canvasCenterX = width / 2;
    const canvasCenterY = height / 2;

    // Use full width minus padding for spectrum
    const horizontalPadding = Math.max(16, width * 0.05);
    const trackWidth = width - horizontalPadding * 2;
    const trackHeight = 6;

    // Center everything vertically
    const sliderY = canvasCenterY;
    const labelY = sliderY + 18;

    this.cameras.resize(width, height);

    // Render spectrum gradient bar with painterly brush strokes (cached to avoid flicker)
    const left = canvasCenterX - trackWidth / 2;
    const top = sliderY - trackHeight / 2;

    const baseLeft = this.spectrumColorLeft ?? 0xff7a1a; // fallback warm
    const baseRight = this.spectrumColorRight ?? 0x2aa6ff; // fallback cool

    const needsRedraw =
      this.spectrumCacheWidth !== trackWidth ||
      this.spectrumCacheHeight !== trackHeight ||
      this.spectrumCacheLeft !== baseLeft ||
      this.spectrumCacheRight !== baseRight;

    if (needsRedraw) {
      this.spectrumBar.clear();

      // Adaptive density based on track width and device pixel ratio
      const dpr = Math.max(1, Math.min(2, (window.devicePixelRatio || 1)));
      const density = Phaser.Math.Clamp(Math.round((trackWidth / 600) * dpr), 1, 2);
      const passes = 4 + density * 1; // 5–6 passes
      const stepsPerPass = 36 + density * 12; // 48–60 steps

      // Deterministic jitter so redraws look stable
      const seedBase =
        (trackWidth | 0) ^ ((trackHeight | 0) << 7) ^ ((baseLeft | 0) << 13) ^ ((baseRight | 0) << 19);
      let seed = seedBase >>> 0;
      const rand = () => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return ((seed >>> 0) % 10000) / 10000; // [0,1)
      };
      const dj = (amount: number) => (rand() * 2 - 1) * amount;

      for (let p = 0; p < passes; p++) {
        const opacity = 0.18 + (p / passes) * 0.12; // subtle layering
        const yOffset = dj(trackHeight * 0.25);
        const thickness = Math.max(1, Math.round(trackHeight / 2.5 + dj(1.2)));

        for (let i = 0; i < stepsPerPass; i++) {
          const t = i / (stepsPerPass - 1);
          const x = left + trackWidth * t + dj(1.1);
          const stepWidth = trackWidth / stepsPerPass + dj(0.6);
          const color = lerpColor(baseLeft, baseRight, t);

          this.spectrumBar.fillStyle(color, opacity);
          this.spectrumBar.fillRect(x, top + dj(0.4) + yOffset, stepWidth, thickness);
        }
      }

      this.spectrumCacheWidth = trackWidth;
      this.spectrumCacheHeight = trackHeight;
      this.spectrumCacheLeft = baseLeft;
      this.spectrumCacheRight = baseRight;
    }

    // Set track for hit detection
    this.track.setPosition(canvasCenterX, sliderY).setDisplaySize(trackWidth, trackHeight);

    const bounds = this.track.getBounds();
    const trackLeft = bounds.left;
    const trackRight = bounds.right;

    const handleX = this.valueToPosition(this.currentValue, trackLeft, trackRight);
    this.handle.setPosition(handleX, sliderY);

    const medianX =
      this.currentMedian == null
        ? null
        : (this.medianAnimatedX ?? this.valueToPosition(this.currentMedian, trackLeft, trackRight));
    if (medianX == null) {
      this.medianLine.setVisible(false);
      this.medianText.setVisible(false);
    } else {
      this.medianLine.setVisible(true).setPosition(medianX, sliderY).setDisplaySize(2, 28);
      this.medianText.setVisible(true).setPosition(medianX, sliderY + 20);
    }

    this.valueText.setPosition(handleX, sliderY - 16);

    // Position spectrum labels at track edges with a small inset to prevent clipping
    const labelInset = 6;
    this.leftLabelText
      .setText(this.leftLabel || '')
      .setPosition(trackLeft + labelInset, labelY)
      .setVisible(true);
    this.rightLabelText
      .setText(this.rightLabel || '')
      .setPosition(trackRight - labelInset, labelY)
      .setVisible(true);

    // Ensure values stay within bounds even if resize shrinks the track dramatically
    this.currentValue = Phaser.Math.Clamp(this.currentValue, MIN_GUESS_VALUE, MAX_GUESS_VALUE);
    this.currentMedian =
      this.currentMedian == null
        ? null
        : Phaser.Math.Clamp(this.currentMedian, MIN_GUESS_VALUE, MAX_GUESS_VALUE);
  }

  private updateMedianVisuals(): void {
    if (this.currentMedian == null) {
      if (this.medianPulseTween) {
        this.medianPulseTween.stop();
        this.medianPulseTween = null;
      }
      return;
    }
    const nearThreshold = 3; // epsilon for near-value pulse
    const isNear = Math.abs((this.currentMedian ?? 0) - this.currentValue) <= nearThreshold;

    if (isNear && !this.medianPulseTween) {
      this.medianPulseTween = this.tweens.add({
        targets: this.medianLine,
        scaleY: { from: 1, to: 1.2 },
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (!isNear && this.medianPulseTween) {
      this.medianPulseTween.stop();
      this.medianPulseTween = null;
      this.medianLine.setScale(1, 1);
    }
  }

  update(time: number): void {
    // Organic shimmer for median line/text
    if (this.currentMedian != null) {
      const shimmer = 0.85 + 0.15 * Math.sin(time * 0.003);
      this.medianLine.setAlpha(shimmer);
      this.medianText.setAlpha(0.8 + 0.2 * Math.sin(time * 0.0028 + 0.6));

      // Apply subtle, decaying jitter while animating
      if (this.jitterAmp > 0 && this.medianAnimatedX != null) {
        const jitter = Math.sin(time * 0.06) * this.jitterAmp;
        const y = this.track.y;
        this.medianLine.setPosition(this.medianAnimatedX + jitter, y);
        this.medianText.setPosition(this.medianAnimatedX + jitter, y + 20);
        // decay amplitude
        this.jitterAmp = Math.max(0, this.jitterAmp - 0.005);
      }
    }
  }

  private emitValueChanged(value: number): void {
    this.isEmittingInternal = true;
    this.events.emit('slider:valueChanged', value);
    // Reset flag next tick
    this.time.delayedCall(0, () => {
      this.isEmittingInternal = false;
    });
  }

  private createAmbientParticles(): void {
    const { width, height } = this.scale;
    const bounds = new Phaser.Geom.Rectangle(0, 0, width, height);

    this.ambientEffectId = this.particleManager.createAmbientParticles(bounds, {
      colors: [colors.particles.trail, colors.decorative.dots],
      count: 15,
      size: { min: 2, max: 6 },
      speed: { min: 5, max: 15 },
      opacity: { min: 0.2, max: 0.5 },
    });
  }

  destroy(): void {
    // Clean up specific effects
    if (this.trailEffectId) {
      this.particleManager.destroyEffect(this.trailEffectId);
      this.trailEffectId = null;
    }
    if (this.ambientEffectId) {
      this.particleManager.destroyEffect(this.ambientEffectId);
      this.ambientEffectId = null;
    }

    // Clean up consensus effects
    this.consensusEffects.forEach((effectId) => {
      this.particleManager.destroyEffect(effectId);
    });
    this.consensusEffects.clear();

    // Clean up particle system
    if (this.particleManager) {
      this.particleManager.destroy();
    }
  }
}
