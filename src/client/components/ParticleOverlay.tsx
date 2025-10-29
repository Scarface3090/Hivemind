import React, { useEffect, useRef, useMemo } from 'react';
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
}

export const ParticleOverlay: React.FC<ParticleOverlayProps> = ({
  particleCount = 8,
  colors: providedColors,
  className = '',
  effectType = 'ambient',
  performance: performanceLevel = 'high',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
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
        vx: (Math.random() - 0.5) * (speedRange.max - speedRange.min) + speedRange.min,
        vy: (Math.random() - 0.5) * (speedRange.max - speedRange.min) + speedRange.min,
        size: Math.random() * (sizeRange.max - sizeRange.min) + sizeRange.min,
        color:
          particleColors[Math.floor(Math.random() * particleColors.length)] ||
          colors.particles.primary,
        opacity: initialOpacity,
        initialOpacity: initialOpacity,
        rotation: Math.random() * Math.PI,
        life: 0,
        maxLife: Math.random() * 300 + 150,
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

        // Fade out over time
        particle.opacity = Math.max(
          0,
          particle.initialOpacity - (particle.life / particle.maxLife) * particle.initialOpacity
        );

        // Reset particle when it dies
        if (particle.life >= particle.maxLife) {
          Object.assign(particle, createParticle());
        }

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.offsetWidth;
        if (particle.x > canvas.offsetWidth) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.offsetHeight;
        if (particle.y > canvas.offsetHeight) particle.y = 0;
      });
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      particlesRef.current.forEach((particle) => {
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = particle.color;

        if (effectType === 'brushStroke') {
          // Draw organic brush stroke shape
          ctx.beginPath();
          ctx.ellipse(
            particle.x,
            particle.y,
            particle.size,
            particle.size * 0.7,
            particle.rotation,
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
      });
    };

    const animate = () => {
      updateParticles();
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
};

export default ParticleOverlay;
