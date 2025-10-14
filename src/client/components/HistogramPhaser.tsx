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

// This type represents the data packet for the Phaser scene
type HistogramSceneConfig = Omit<Props, 'className'>;

export default function HistogramPhaser({ buckets, target, median, viewerGuess, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const pendingUpdateRef = useRef<HistogramSceneConfig | null>(null);

  // Effect 1: Manages Phaser game instance lifecycle
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

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
      ro.observe(el);
      resizeObserverRef.current = ro;
    } else {
      window.addEventListener('resize', resizeToContainer);
    }

    // Ensure the scene is added and started after boot
    game.events.once(Phaser.Core.Events.READY, () => {
      // Use pending data from the holding area if it exists, otherwise use current props
      const initialData = pendingUpdateRef.current || { buckets, target, median, viewerGuess };

      // We've used the data, so clear the queue. The update effect will handle subsequent changes.
      pendingUpdateRef.current = null;

      if (!game.scene.getScene('HistogramScene')) {
        game.scene.add('HistogramScene', HistogramScene, true, initialData);
      } else {
        game.scene.start('HistogramScene', initialData);
      }
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
    };
  }, []); // Empty dependency array means this runs once on mount

  // Effect 2: Handles passing data updates to the Phaser scene
  useEffect(() => {
    const game = gameRef.current;
    const data: HistogramSceneConfig = { buckets, target, median, viewerGuess };

    // If the game isn't ready yet, place the data in the holding area.
    if (!game) {
      pendingUpdateRef.current = data;
      return;
    }

    const scene = game.scene.getScene('HistogramScene') as HistogramScene | undefined;

    // If the scene is active, send the data. Otherwise, queue it.
    if (scene && scene.scene.isActive()) {
      scene.updateData(data);
      // The update was successful, so clear any stale data from the holding area.
      pendingUpdateRef.current = null;
    } else {
      pendingUpdateRef.current = data;
    }
  }, [buckets, target, median, viewerGuess]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height: 240, overflow: 'hidden' }} />;
}