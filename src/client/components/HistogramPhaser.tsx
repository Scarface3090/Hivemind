import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { HistogramScene, HistogramBucket } from '../game/scenes/HistogramScene.js';

type Props = {
  buckets: HistogramBucket[];
  target: number;
  median: number;
  viewerGuess?: number;
  className?: string;
};

export default function HistogramPhaser({ buckets, target, median, viewerGuess, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (gameRef.current) return;

    const el = containerRef.current;

    const measure = (): { w: number; h: number } => {
      const w = Math.max(1, el.clientWidth || 640);
      const h = Math.min(280, Math.round(w * 0.45));
      el.style.height = `${h}px`;
      return { w, h };
    };

    const { w: initialWidth, h: initialHeight } = measure();

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: el,
      backgroundColor: '#0b141c',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: initialWidth,
        height: initialHeight,
      },
      scene: [HistogramScene],
      render: { antialias: true },
    };

    const game = new Phaser.Game(config);

    // Keep Phaser canvas matched to container size
    const resizeToContainer = (): void => {
      const { w, h } = measure();
      if (game.scale.width !== w || game.scale.height !== h) {
        game.scale.resize(w, h);
      }
    };

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => resizeToContainer());
      ro.observe(el);
      resizeObserverRef.current = ro;
    } else {
      window.addEventListener('resize', resizeToContainer);
    }

    // Ensure the scene is added and started after boot
    game.events.once(Phaser.Core.Events.READY, () => {
      // Start with initial data
      if (!game.scene.getScene('HistogramScene')) {
        game.scene.add('HistogramScene', HistogramScene, true, { buckets, target, median, viewerGuess });
      } else {
        game.scene.start('HistogramScene', { buckets, target, median, viewerGuess });
      }
    });

    gameRef.current = game;

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      } else {
        window.removeEventListener('resize', resizeToContainer);
      }
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    const scene = game.scene.getScene('HistogramScene') as HistogramScene | undefined;
    if (scene && scene.scene.isActive()) {
      scene.updateData({ buckets, target, median, viewerGuess });
    }
  }, [buckets, target, median, viewerGuess]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height: 240, overflow: 'hidden' }} />;
}


