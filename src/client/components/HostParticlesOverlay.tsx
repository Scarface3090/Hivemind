import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import Phaser from 'phaser';
import { ParticleSystemManager } from '../game/systems/ParticleSystemManager.js';

export interface HostParticlesOverlayHandle {
  emitBurst: (x: number, y: number) => void;
}

const HostParticlesOverlay = forwardRef<HostParticlesOverlayHandle>(function HostParticlesOverlay(_, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const managerRef = useRef<ParticleSystemManager | null>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent || gameRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    class OverlayScene extends Phaser.Scene {
      constructor() {
        super('OverlayScene');
      }

      preload(): void {
        // Generate a simple round particle texture to avoid external assets
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1);
        g.fillCircle(16, 16, 16);
        g.generateTexture('particle-texture', 32, 32);
        g.destroy();
      }

      create(): void {
        managerRef.current = new ParticleSystemManager(this);
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      backgroundColor: 'rgba(0,0,0,0)',
      parent,
      width,
      height,
      transparent: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        width,
        height,
      },
      scene: [OverlayScene],
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    const handleResize = (): void => {
      if (!gameRef.current) return;
      gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      gameRef.current?.destroy(true);
      gameRef.current = null;
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    emitBurst: (x: number, y: number) => {
      const mgr = managerRef.current;
      if (!mgr) return;
      mgr.createOrganicBurst(x, y, {
        colors: ['#FF6B35', '#F1C40F'],
        count: 18,
        duration: 500,
      });
    },
  }));

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 30,
      }}
      aria-hidden
    />
  );
});

export default HostParticlesOverlay;


