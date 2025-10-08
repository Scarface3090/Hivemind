import Phaser from 'phaser';
import { GuessingScene } from './scenes/GuessingScene.js';

export interface SliderBridge {
  onValueChanged?: (value: number) => void;
  getInitialValue?: () => number;
  getMedian?: () => number | null;
}

export interface CreateGameOptions {
  parent: string | HTMLElement;
  width?: number;
  height?: number;
  bridge?: SliderBridge;
}

export const createPhaserGame = ({ parent, width = 1024, height = 768 }: CreateGameOptions): Phaser.Game => {
  const parentElement =
    typeof parent === 'string' ? document.querySelector<HTMLElement>(parent) : parent ?? undefined;

  if (!parentElement) {
    throw new Error('Unable to mount Phaser game: parent element not found');
  }

  if (!parentElement.style.position) {
    parentElement.style.position = 'relative';
  }
  parentElement.style.overflow = parentElement.style.overflow || 'hidden';

  const initialWidth = Math.max(1, parentElement.clientWidth || width);
  const initialHeight = Math.max(1, parentElement.clientHeight || height);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    backgroundColor: '#111111',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: initialWidth,
      height: initialHeight,
    },
    parent: parentElement,
    scene: [GuessingScene],
    physics: { default: 'arcade' },
    render: { pixelArt: false, antialias: true },
  };

  const game = new Phaser.Game(config);

  const resizeToContainer = (): void => {
    const targetWidth = Math.max(1, parentElement.clientWidth || initialWidth);
    const targetHeight = Math.max(1, parentElement.clientHeight || initialHeight);

    if (game.scale.width !== targetWidth || game.scale.height !== targetHeight) {
      game.scale.resize(targetWidth, targetHeight);
    }
  };

  // Ensure the canvas matches the container as soon as it mounts
  resizeToContainer();

  let resizeObserver: ResizeObserver | null = null;

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => resizeToContainer());
    resizeObserver.observe(parentElement);
  } else {
    window.addEventListener('resize', resizeToContainer);
  }

  game.events.once('destroy', () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    } else {
      window.removeEventListener('resize', resizeToContainer);
    }
  });

  return game;
};


