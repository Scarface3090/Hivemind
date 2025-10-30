import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { colors, particles, performance } from '../../shared/design-tokens.js';

interface ParticleSystem {
  count: number;
  size: string;
  colors: string[];
  speed: string;
  opacity: string;
  movement: string;
  style: string;
  texture?: string;
}

interface ParticleSystems {
  ambient: ParticleSystem;
  brushStroke: ParticleSystem;
  interaction: ParticleSystem;
  trail?: ParticleSystem;
  celebration?: ParticleSystem;
}

interface ParticleOverlayProps {
  particleCount?: number;
  colors?: string[];
  className?: string;
  effectType?: 'ambient' | 'brushStroke' | 'interaction';
  performance?: 'high' | 'medium' | 'low';
}

export interface ParticleBurstOptions {
  // Center of burst, default: center of canvas
  x?: number;
  y?: number;
  // Number of burst particles in addition to ambient ones
  count?: number;
  // Lifetime in ms
  durationMs?: number;
  // Velocity scalar in px/s
  velocity?: number;
  // Optional preset name for colors/shape
  preset?: 'submit' | 'streak' | 'splat';
  colors?: string[];
}

export interface ParticleOverlayHandle {
  burst: (opts?: ParticleBurstOptions) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  initialOpacity: number;
  rotation: number;
  life: number;
  maxLife: number;
  // Number of frames to fade in from 0 to initialOpacity after spawn/reset
  fadeIn: number;
  shape?: 'circle' | 'ellipse' | 'streak';
}

export const ParticleOverlay = forwardRef<ParticleOverlayHandle, ParticleOverlayProps>(({ 
  particleCount = 8,
  colors: providedColors,
  className = '',
  effectType = 'ambient',
  performance: performanceLevel = 'high',
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const burstsRef = useRef<Particle[]>([]);
  const burstMetaRef = useRef<{ createdAt: number; durationMs: number } | null>(null);
  const particleColors = useMemo(() => {
    if (providedColors) return providedColors;

    // Runtime validation and safe access to particles.systems
    const systems = particles.systems as ParticleSystems;
    if (!systems || typeof systems !== 'object') {
      return [colors.particles.primary];
    }

    switch (effectType) {
      case 'brushStroke':
        return systems.brushStroke?.colors || [colors.particles.primary];
      case 'interaction':
        return systems.interaction?.colors || [colors.particles.secondary];
      case 'ambient':
      default:
        return systems.ambient?.colors || [colors.particles.tertiary];
    }
  }, [providedColors, effectType]);

  const adjustedParticleCount = useMemo(() => {
    const maxCounts = performance.particles.maxCount;
    const deviceMax =
      performanceLevel === 'high'
        ? maxCounts.desktop
        : performanceLevel === 'medium'
          ? maxCounts.tablet
          : maxCounts.mobile;

    return Math.min(particleCount, Math.floor(deviceMax * 0.2)); // Use 20% of max for overlay
  }, [particleCount, performanceLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Keep fade in short to avoid visible pops while remaining subtle
    const fadeInFrames = 20;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    const createParticle = (): Particle => {
      const systems = particles.systems as ParticleSystems;
      const systemConfig = systems[effectType] || systems.ambient;

      // Parse size range from string format like "4-12px"
      const sizeStr = systemConfig?.size || '4-12px';
      const sizeMatch = sizeStr.toString().match(/(\d+)-(\d+)/);
      const sizeRange =
        sizeMatch && sizeMatch[1] && sizeMatch[2]
          ? { min: parseInt(sizeMatch[1], 10), max: parseInt(sizeMatch[2], 10) }
          : { min: 4, max: 12 };

      // Parse speed range from string format like "0.3-1.0px/s"
      const speedStr = systemConfig?.speed || '0.3-1.0px/s';
      const speedMatch = speedStr.toString().match(/([\d.]+)-([\d.]+)/);
      const speedRange =
        speedMatch && speedMatch[1] && speedMatch[2]
          ? { min: parseFloat(speedMatch[1]), max: parseFloat(speedMatch[2]) }
          : { min: 0.3, max: 1.0 };

      const initialOpacity = effectType === 'ambient' ? 0.6 : 0.8;

      return {
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: (Math.random() - 0.5) * 2 * speedRange.max,
        vy: (Math.random() - 0.5) * 2 * speedRange.max,
        size: Math.random() * (sizeRange.max - sizeRange.min) + sizeRange.min,
        color:
          particleColors[Math.floor(Math.random() * particleColors.length)] ||
          colors.particles.primary,
        // Start invisible and fade in to avoid popping
        opacity: 0,
        initialOpacity: initialOpacity,
        rotation: Math.random() * Math.PI,
        life: 0,
        maxLife: Math.random() * 300 + 150,
        fadeIn: fadeInFrames,
      };
    };

    const initParticles = () => {
      particlesRef.current = Array.from({ length: adjustedParticleCount }, createParticle);
    };

    const updateParticles = () => {
      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life++;

        // Compute base fade-out over life
        const baseOpacity = Math.max(
          0,
          particle.initialOpacity - (particle.life / particle.maxLife) * particle.initialOpacity
        );
        // Apply fade-in on spawn/reset
        if (particle.fadeIn > 0) {
          const progress = 1 - particle.fadeIn / fadeInFrames; // 0 -> 1
          particle.opacity = baseOpacity * Math.max(0, Math.min(1, progress));
          particle.fadeIn -= 1;
        } else {
          particle.opacity = baseOpacity;
        }

        // Reset particle when it dies
        if (particle.life >= particle.maxLife) {
          // Recreate but keep it invisible initially; it will fade in smoothly
          const fresh = createParticle();
          Object.assign(particle, fresh);
        }

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.offsetWidth;
        if (particle.x > canvas.offsetWidth) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.offsetHeight;
        if (particle.y > canvas.offsetHeight) particle.y = 0;
      });
    };

    const updateBurstParticles = () => {
      if (!burstMetaRef.current) return;
      const now = performance.now();
      const elapsed = now - burstMetaRef.current.createdAt;
      const duration = burstMetaRef.current.durationMs;
      const t = Math.min(1, Math.max(0, elapsed / duration));

      // Ease-out fade for burst particles
      burstsRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        const remaining = 1 - t;
        p.opacity = p.initialOpacity * Math.max(0, remaining);
      });

      if (t >= 1) {
        burstsRef.current = [];
        burstMetaRef.current = null;
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      const drawOne = (particle: Particle, isBrush: boolean) => {
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = particle.color;

        const shape = particle.shape ?? (isBrush ? 'ellipse' : 'circle');
        if (shape === 'ellipse' || shape === 'streak') {
          // Draw organic brush stroke shape
          ctx.beginPath();
          ctx.ellipse(
            particle.x,
            particle.y,
            shape === 'streak' ? particle.size * 1.4 : particle.size,
            shape === 'streak' ? particle.size * 0.45 : particle.size * 0.7,
            particle.rotation + (shape === 'streak' ? 0.2 : 0),
            0,
            Math.PI * 2
          );
          ctx.fill();
        } else {
          // Draw circular particle
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      };

      const isBrush = effectType === 'brushStroke';
      particlesRef.current.forEach((particle) => drawOne(particle, isBrush));
      burstsRef.current.forEach((particle) => drawOne(particle, isBrush));
    };

    const animate = () => {
      updateParticles();
      updateBurstParticles();
      drawParticles();
      animationRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    initParticles();
    animate();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [adjustedParticleCount, particleColors, effectType]);

  useImperativeHandle(ref, () => ({
    burst: (opts?: ParticleBurstOptions) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = opts?.x ?? rect.width / 2;
      const cy = opts?.y ?? rect.height / 2;
      const count = Math.max(8, Math.min(64, opts?.count ?? 24));
      const durationMs = Math.max(200, Math.min(1500, opts?.durationMs ?? 650));
      const velocity = Math.max(60, Math.min(600, opts?.velocity ?? 220));

      let burstColors: string[] | undefined = opts?.colors;
      if (!burstColors) {
        switch (opts?.preset) {
          case 'submit':
            burstColors = [colors.particles.primary, colors.particles.accent, colors.particles.secondary];
            break;
          case 'streak':
            burstColors = [colors.particles.secondary, colors.particles.tertiary];
            break;
          case 'splat':
            burstColors = [colors.particles.accent];
            break;
          default:
            burstColors = particleColors;
        }
      }

      const mk = (): Particle => {
        const angle = Math.random() * Math.PI * 2;
        const speedPxPerFrame = (velocity / 1000) * (1 + Math.random() * 0.6); // px/ms scaled per frame time approximation
        const size = 8 + Math.random() * 10;
        let shape: 'circle' | 'ellipse' | 'streak' | undefined;
        switch (opts?.preset) {
          case 'streak':
            shape = 'streak';
            break;
          case 'splat':
            shape = Math.random() < 0.6 ? 'circle' : 'ellipse';
            break;
          case 'submit':
            shape = 'ellipse';
            break;
          default:
            shape = undefined;
        }
        return {
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speedPxPerFrame,
          vy: Math.sin(angle) * speedPxPerFrame,
          size,
          color: burstColors![Math.floor(Math.random() * burstColors!.length)],
          opacity: 1,
          initialOpacity: 1,
          rotation: Math.random() * Math.PI,
          life: 0,
          maxLife: durationMs / 16,
          fadeIn: 0,
          shape,
        };
      };

      burstsRef.current = Array.from({ length: count }, mk);
      burstMetaRef.current = { createdAt: performance.now(), durationMs };
    },
  }), [particleColors]);

  return (
    <canvas
      ref={canvasRef}
      className={`particle-overlay ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
});

export default ParticleOverlay;
