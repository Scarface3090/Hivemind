import React, { useEffect, useRef } from 'react';
import { colors } from '../../shared/design-tokens.js';

interface ParticleOverlayProps {
  particleCount?: number;
  colors?: string[];
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
}

export const ParticleOverlay: React.FC<ParticleOverlayProps> = ({
  particleCount = 8,
  colors: particleColors = [colors.particles.primary, colors.particles.secondary, colors.particles.tertiary],
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);

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

    const createParticle = (): Particle => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      color: particleColors[Math.floor(Math.random() * particleColors.length)] || colors.particles.primary,
      opacity: Math.random() * 0.6 + 0.2,
      life: 0,
      maxLife: Math.random() * 200 + 100,
    });

    const initParticles = () => {
      particlesRef.current = Array.from({ length: particleCount }, createParticle);
    };

    const updateParticles = () => {
      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life++;

        // Fade out over time
        particle.opacity = Math.max(0, 0.8 - (particle.life / particle.maxLife) * 0.8);

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
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
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
  }, [particleCount, particleColors]);

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
