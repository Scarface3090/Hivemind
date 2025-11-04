import Phaser from 'phaser';
import { performance } from '../../../shared/design-tokens.js';

// Module-scoped counter for unique effect IDs
let effectCounter = 0;

export interface ParticleEffectConfig {
  type: 'trail' | 'burst' | 'ambient' | 'celebration';
  colors: string[];
  count: number;
  size: { min: number; max: number };
  speed: { min: number; max: number };
  opacity: { min: number; max: number };
  duration?: number;
  physics?: {
    gravity?: number;
    friction?: number;
    bounce?: number;
  };
}

export interface PerformanceMetrics {
  fps: number;
  frameDrops: number;
  particleCount: number;
  memoryUsage: number;
}

/**
 * Manages particle effects with performance optimization and device-specific adjustments.
 *
 * Requirements:
 * - The texture 'particle-texture' must be preloaded in the scene's preload method
 *   before using any particle effects from this manager.
 */
export class ParticleSystemManager {
  private scene: Phaser.Scene;
  private particleEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();
  private performanceMonitor: PerformanceMonitor;
  private deviceTier: 'high' | 'medium' | 'low' = 'high';
  private maxParticles: number;
  
  private validateTexture(): boolean {
    const exists = this.scene.textures.exists('particle-texture');
    if (!exists) {
      console.error('ParticleSystemManager: particle-texture not found.');
      return false;
    }
    return true;
  }

  private parseColor(color: string): number {
    const hex = color.startsWith('#') ? color.slice(1) : color;
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      console.warn(`ParticleSystemManager: Invalid color "${color}". Falling back to #FFFFFF.`);
      return 0xFFFFFF;
    }
    return parseInt(hex, 16);
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.performanceMonitor = new PerformanceMonitor();
    this.detectDeviceTier();
    this.maxParticles = this.getMaxParticlesForDevice();

    // Start performance monitoring
    this.performanceMonitor.start();
    this.performanceMonitor.onPerformanceDrop = (metrics) => {
      this.handlePerformanceDrop(metrics);
    };
  }

  private detectDeviceTier(): void {
    // Simple device tier detection based on available metrics
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      this.deviceTier = 'low';
      canvas.remove();
      return;
    }
    canvas.remove();

    // Basic heuristics for device tier using available navigator properties
    const cores = navigator.hardwareConcurrency || 2;
    const memory = (navigator as any).deviceMemory || 2;

    if (cores >= 8 && memory >= 8) {
      this.deviceTier = 'high';
    } else if (cores >= 4 && memory >= 4) {
      this.deviceTier = 'medium';
    } else {
      this.deviceTier = 'low';
    }
  }

  private getMaxParticlesForDevice(): number {
    const maxCounts = performance.particles.maxCount;
    switch (this.deviceTier) {
      case 'high':
        return maxCounts.desktop;
      case 'medium':
        return maxCounts.tablet;
      case 'low':
        return maxCounts.mobile;
      default:
        return maxCounts.mobile;
    }
  }

  private handlePerformanceDrop(metrics: PerformanceMetrics): void {
    if (metrics.fps < 30) {
      // Severe performance drop - reduce to minimal effects
      this.setQualityLevel('low');
    } else if (metrics.fps < 45) {
      // Moderate performance drop - reduce particle count
      this.setQualityLevel('medium');
    }
  }

  private setQualityLevel(level: 'high' | 'medium' | 'low'): void {
    if (this.deviceTier === level) return;
    this.deviceTier = level;
    this.maxParticles = this.getMaxParticlesForDevice();

    // Update existing emitters
    this.particleEmitters.forEach((emitter) => {
      this.adjustEmitterForPerformance(emitter);
    });
  }

  private adjustEmitterForPerformance(emitter: Phaser.GameObjects.Particles.ParticleEmitter): void {
    const reductionFactor = this.deviceTier === 'low' ? 0.3 : this.deviceTier === 'medium' ? 0.6 : 1.0;

    // Cache original baseline values once to avoid compounding adjustments
    const anyEmitter = emitter as unknown as {
      __hvmOriginalMaxParticles?: number;
      __hvmOriginalFrequency?: number;
    };

    if (anyEmitter.__hvmOriginalMaxParticles === undefined && typeof emitter.maxParticles === 'number') {
      anyEmitter.__hvmOriginalMaxParticles = emitter.maxParticles;
    }
    if (anyEmitter.__hvmOriginalFrequency === undefined && typeof emitter.frequency === 'number') {
      anyEmitter.__hvmOriginalFrequency = emitter.frequency;
    }

    // Apply new values derived from baselines
    if (typeof anyEmitter.__hvmOriginalMaxParticles === 'number') {
      const newMax = Math.floor(anyEmitter.__hvmOriginalMaxParticles * reductionFactor);
      if (Number.isFinite(newMax) && newMax > 0) {
        emitter.maxParticles = newMax;
      }
    }

    if (typeof anyEmitter.__hvmOriginalFrequency === 'number' && anyEmitter.__hvmOriginalFrequency > 0) {
      // In Phaser, lower frequency value = more frequent emissions (shorter interval).
      // To reduce emissions on lower tiers, increase the interval by dividing by the reduction factor.
      const newFreq = anyEmitter.__hvmOriginalFrequency / reductionFactor;
      if (Number.isFinite(newFreq) && newFreq >= 0) {
        emitter.frequency = newFreq;
      }
    }
  }



  public createBrushStrokeTrail(
    x: number,
    y: number,
    config?: Partial<ParticleEffectConfig>
  ): string | null {
    const effectId = `brush-trail-${++effectCounter}`;

    const finalConfig: ParticleEffectConfig = {
      type: 'trail',
      colors: config?.colors || ['#FF6B35', '#4CAF50', '#00BCD4'],
      count: Math.min(config?.count || 8, this.maxParticles * 0.1),
      size: config?.size || { min: 4, max: 10 },
      speed: config?.speed || { min: 20, max: 50 },
      opacity: config?.opacity || { min: 0.3, max: 0.9 },
      duration: config?.duration || 800,
      physics: {
        gravity: 0.1,
        friction: 0.95,
        ...config?.physics,
      },
    };

    // Validate that particle texture is loaded before creating particles
    // Note: 'particle-texture' must be preloaded in the scene's preload method
    if (!this.scene.textures.exists('particle-texture')) {
      console.error(
        'ParticleSystemManager: particle-texture not found. Cannot create brush stroke trail.'
      );
      return null;
    }

    const emitter = this.scene.add.particles(x, y, 'particle-texture', {
      speed: { min: finalConfig.speed.min, max: finalConfig.speed.max },
      scale: { start: finalConfig.size.max / 10, end: finalConfig.size.min / 10 },
      alpha: { start: finalConfig.opacity.max, end: finalConfig.opacity.min },
      lifespan: finalConfig.duration || 800,
      tint: finalConfig.colors.map((c) => this.parseColor(c)),
      gravityY: (finalConfig.physics?.gravity || 0) * 100,
      frequency: 50,
      maxParticles: finalConfig.count,
    });

    this.particleEmitters.set(effectId, emitter);

    // Initialize original baselines and apply performance adjustment immediately
    const anyEmitter = emitter as unknown as {
      __hvmOriginalMaxParticles?: number;
      __hvmOriginalFrequency?: number;
    };
    if (anyEmitter.__hvmOriginalMaxParticles === undefined && typeof emitter.maxParticles === 'number') {
      anyEmitter.__hvmOriginalMaxParticles = emitter.maxParticles;
    }
    if (anyEmitter.__hvmOriginalFrequency === undefined && typeof emitter.frequency === 'number') {
      anyEmitter.__hvmOriginalFrequency = emitter.frequency;
    }
    this.adjustEmitterForPerformance(emitter);

    // Auto-cleanup after duration
    this.scene.time.delayedCall((finalConfig.duration || 800) + 1000, () => {
      this.destroyEffect(effectId);
    });

    return effectId;
  }

  public createOrganicBurst(x: number, y: number, config?: Partial<ParticleEffectConfig>): string | null {
    const effectId = `organic-burst-${++effectCounter}`;

    const finalConfig: ParticleEffectConfig = {
      type: 'burst',
      colors: config?.colors || ['#FF6B35', '#F1C40F'],
      count: Math.min(config?.count || 25, this.maxParticles * 0.25),
      size: config?.size || { min: 6, max: 16 },
      speed: config?.speed || { min: 80, max: 150 },
      opacity: config?.opacity || { min: 0.8, max: 1.0 },
      duration: config?.duration || 600,
      physics: {
        gravity: 0.2,
        friction: 0.92,
        ...config?.physics,
      },
    };

    // Validate that particle texture is loaded before creating particles
    if (!this.validateTexture()) return null;

    const emitter = this.scene.add.particles(x, y, 'particle-texture', {
      speed: { min: finalConfig.speed.min, max: finalConfig.speed.max },
      scale: { start: finalConfig.size.max / 10, end: finalConfig.size.min / 10 },
      alpha: { start: finalConfig.opacity.max, end: 0 },
      lifespan: finalConfig.duration || 600,
      tint: finalConfig.colors.map((c) => this.parseColor(c)),
      gravityY: (finalConfig.physics?.gravity || 0) * 100,
      quantity: finalConfig.count,
      maxParticles: finalConfig.count,
    });

    // Trigger burst immediately
    emitter.explode(finalConfig.count, x, y);

    this.particleEmitters.set(effectId, emitter);

    // Initialize original baselines (frequency may be undefined for bursts) and adjust
    const anyEmitter = emitter as unknown as {
      __hvmOriginalMaxParticles?: number;
      __hvmOriginalFrequency?: number;
    };
    if (anyEmitter.__hvmOriginalMaxParticles === undefined && typeof emitter.maxParticles === 'number') {
      anyEmitter.__hvmOriginalMaxParticles = emitter.maxParticles;
    }
    if (anyEmitter.__hvmOriginalFrequency === undefined && typeof emitter.frequency === 'number') {
      anyEmitter.__hvmOriginalFrequency = emitter.frequency;
    }
    this.adjustEmitterForPerformance(emitter);

    // Auto-cleanup after duration
    this.scene.time.delayedCall((finalConfig.duration || 600) + 1000, () => {
      this.destroyEffect(effectId);
    });

    return effectId;
  }

  public createAmbientParticles(
    bounds: Phaser.Geom.Rectangle,
    config?: Partial<ParticleEffectConfig>
  ): string | null {
    const effectId = `ambient-${++effectCounter}`;

    const finalConfig: ParticleEffectConfig = {
      type: 'ambient',
      colors: config?.colors || ['#7986CB', '#9FA8DA', '#C5CAE9'],
      count: Math.min(config?.count || 20, this.maxParticles * 0.2),
      size: config?.size || { min: 4, max: 12 },
      speed: config?.speed || { min: 5, max: 15 },
      opacity: config?.opacity || { min: 0.4, max: 0.8 },
      physics: {
        gravity: 0.01,
        friction: 0.99,
        ...config?.physics,
      },
    };

    // Validate that particle texture is loaded before creating particles
    if (!this.validateTexture()) return null;

    const emitter = this.scene.add.particles(bounds.centerX, bounds.centerY, 'particle-texture', {
      speed: { min: finalConfig.speed.min, max: finalConfig.speed.max },
      scale: { min: finalConfig.size.min / 10, max: finalConfig.size.max / 10 },
      alpha: { min: finalConfig.opacity.min, max: finalConfig.opacity.max },
      lifespan: { min: 3000, max: 6000 },
      tint: finalConfig.colors.map((c) => this.parseColor(c)),
      gravityY: (finalConfig.physics?.gravity || 0) * 100,
      frequency: 200,
      maxParticles: finalConfig.count,
    });

    this.particleEmitters.set(effectId, emitter);
    // Initialize baselines and apply performance adjustment immediately
    const anyEmitter = emitter as unknown as {
      __hvmOriginalMaxParticles?: number;
      __hvmOriginalFrequency?: number;
    };
    if (anyEmitter.__hvmOriginalMaxParticles === undefined && typeof emitter.maxParticles === 'number') {
      anyEmitter.__hvmOriginalMaxParticles = emitter.maxParticles;
    }
    if (anyEmitter.__hvmOriginalFrequency === undefined && typeof emitter.frequency === 'number') {
      anyEmitter.__hvmOriginalFrequency = emitter.frequency;
    }
    this.adjustEmitterForPerformance(emitter);
    return effectId;
  }

  public updateTrailPosition(effectId: string, x: number, y: number): void {
    const emitter = this.particleEmitters.get(effectId);
    if (emitter) {
      emitter.setPosition(x, y);
    }
  }

  public destroyEffect(effectId: string): void {
    const emitter = this.particleEmitters.get(effectId);
    if (emitter) {
      emitter.destroy();
      this.particleEmitters.delete(effectId);
    }
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    const metrics = this.performanceMonitor.getMetrics();
    let totalParticles = 0;
    this.particleEmitters.forEach((emitter) => {
      totalParticles += emitter.getAliveParticleCount?.() || 0;
    });
    return { ...metrics, particleCount: totalParticles };
  }

  public destroy(): void {
    this.performanceMonitor.stop();
    this.particleEmitters.forEach((emitter) => emitter.destroy());
    this.particleEmitters.clear();
  }
}

class PerformanceMonitor {
  private fps: number = 60;
  private frameDrops: number = 0;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private isRunning: boolean = false;
  private animationFrame: number = 0;

  public onPerformanceDrop?: (metrics: PerformanceMetrics) => void;

  start(): void {
    this.isRunning = true;
    this.lastTime = Date.now();
    this.monitor();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  private monitor(): void {
    if (!this.isRunning) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastTime;

    if (deltaTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / deltaTime);

      if (this.fps < 45) {
        this.frameDrops++;
        if (this.frameDrops > 3 && this.onPerformanceDrop) {
          this.onPerformanceDrop(this.getMetrics());
          this.frameDrops = 0; // Reset to avoid constant callbacks
        }
      } else {
        this.frameDrops = Math.max(0, this.frameDrops - 1);
      }

      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    this.frameCount++;
    this.animationFrame = requestAnimationFrame(() => this.monitor());
  }

  getMetrics(): PerformanceMetrics {
    return {
      fps: this.fps,
      frameDrops: this.frameDrops,
      particleCount: 0, // Will be updated by ParticleSystemManager
      memoryUsage: (window.performance as any).memory?.usedJSHeapSize || 0,
    };
  }
}
