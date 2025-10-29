import { useEffect, useRef } from 'react';
import { createPhaserGame } from '../game/index.js';
import Phaser from 'phaser';
import type { Spectrum } from '../../shared/types/Spectrum.js';

interface SpectrumSliderProps {
  spectrum: Spectrum;
  value: number;
  onValueChange: (value: number) => void;
  median?: number | null;
  disabled?: boolean;
  className?: string;
}

export const SpectrumSlider = ({ 
  spectrum, 
  value, 
  onValueChange, 
  median, 
  disabled = false,
  className = ''
}: SpectrumSliderProps): JSX.Element => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onChangeRef = useRef(onValueChange);

  // Keep the latest callback without retriggering game creation
  useEffect(() => {
    onChangeRef.current = onValueChange;
  }, [onValueChange]);

  useEffect(() => {
    const mountTarget = canvasRef.current;
    if (!mountTarget) return;

    const game = createPhaserGame({ parent: mountTarget });
    gameRef.current = game;

    const startScene = () => {
      if (!game.scene.isActive('GuessingScene')) {
        game.scene.start('GuessingScene', {
          initialValue: value,
          median: median,
          leftLabel: spectrum.leftLabel,
          rightLabel: spectrum.rightLabel,
        });
      }
    };

    game.events.once(Phaser.Core.Events.BOOT, startScene);

    let cleanup: (() => void) | null = null;

    const wireSceneEvents = () => {
      if (!gameRef.current) return;
      try {
        const scene = gameRef.current.scene.getScene('GuessingScene') as Phaser.Scene & {
          events?: Phaser.Events.EventEmitter;
          setMedian?: (value: number | null) => void;
          setLabels?: (left: string, right: string) => void;
        };
        if (scene?.events) {
          const handler = (newValue: number) => {
            onChangeRef.current(newValue);
          };
          scene.events.on('slider:valueChanged', handler);
          scene.setMedian?.(median ?? null);
          scene.setLabels?.(spectrum.leftLabel, spectrum.rightLabel);
          cleanup = () => {
            scene.events?.off?.('slider:valueChanged', handler);
          };
        }
      } catch {
        // Scene may not yet exist; try again after the next frame
        game.events.once(Phaser.Core.Events.POST_STEP, wireSceneEvents);
      }
    };

    game.events.once(Phaser.Core.Events.POST_STEP, wireSceneEvents);
    game.events.once(Phaser.Core.Events.STEP, wireSceneEvents);

    return () => {
      try {
        cleanup?.();
      } finally {
        // Destroy the Phaser game and remove the canvas element entirely
        game.destroy(true);

        if (mountTarget.contains(game.canvas)) {
          mountTarget.removeChild(game.canvas);
        }

        gameRef.current = null;
      }
    };
  }, [spectrum.leftLabel, spectrum.rightLabel]);

  // Update median in scene when it changes
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    const applyMedian = () => {
      try {
        const scene = game.scene.getScene('GuessingScene') as Phaser.Scene & {
          setMedian?: (value: number | null) => void;
        };
        scene?.setMedian?.(median ?? null);
      } catch {
        game.events.once(Phaser.Core.Events.POST_STEP, applyMedian);
      }
    };

    applyMedian();
  }, [median]);

  // Update labels when spectrum changes without recreating the game
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    const applyLabels = () => {
      try {
        const scene = game.scene.getScene('GuessingScene') as Phaser.Scene & {
          setLabels?: (left: string, right: string) => void;
        };
        scene?.setLabels?.(spectrum.leftLabel, spectrum.rightLabel);
      } catch {
        game.events.once(Phaser.Core.Events.POST_STEP, applyLabels);
      }
    };

    applyLabels();
  }, [spectrum.leftLabel, spectrum.rightLabel]);

  // Update initial value only once after scene is ready (when prop changes externally)
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;

    const applyValue = () => {
      try {
        const scene = game.scene.getScene('GuessingScene') as Phaser.Scene & {
          events?: Phaser.Events.EventEmitter;
        };
        // simulate external value change by emitting event the scene already handles via layout
        scene.events?.emit?.('slider:valueChanged', value);
      } catch {
        game.events.once(Phaser.Core.Events.POST_STEP, applyValue);
      }
    };

    applyValue();
  }, [value]);

  return (
    <div className={`spectrum-slider-container ${className}`.trim()}>
      <div 
        className="spectrum-slider-canvas" 
        ref={canvasRef} 
        style={{ 
          width: '100%', 
          height: '96px', 
          background: '#111',
          borderRadius: '12px',
          overflow: 'hidden'
        }} 
      />
    </div>
  );
};

export default SpectrumSlider;
