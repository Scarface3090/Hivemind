import * as Phaser from 'phaser';
import { MAX_GUESS_VALUE, MIN_GUESS_VALUE } from '../../../shared/constants.js';

type GuessingSceneData = {
  initialValue?: number;
  median?: number | null;
};

export class GuessingScene extends Phaser.Scene {
  private track!: Phaser.GameObjects.Rectangle;
  private handle!: Phaser.GameObjects.Circle;
  private medianLine!: Phaser.GameObjects.Rectangle;
  private valueText!: Phaser.GameObjects.Text;
  private medianText!: Phaser.GameObjects.Text;

  private currentValue: number = 50;
  private currentMedian: number | null = null;

  constructor() {
    super('GuessingScene');
  }

  init(data: GuessingSceneData): void {
    if (typeof data.initialValue === 'number') this.currentValue = data.initialValue;
    if (typeof data.median === 'number') this.currentMedian = data.median;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#111111');

    // Slider track
    this.track = this.add.rectangle(0, 0, 600, 6, 0x888888, 1).setOrigin(0.5, 0.5);

    // Slider handle
    this.handle = this.add.circle(0, 0, 14, 0xffcc00).setInteractive({ useHandCursor: true, draggable: true });

    // Median indicator
    this.medianLine = this.add.rectangle(0, 0, 2, 28, 0x00e5ff, 1).setOrigin(0.5, 0.5);

    // Labels
    this.valueText = this.add.text(0, 0, `${this.currentValue}`, {
      fontFamily: 'Inter, Arial',
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5, 1);

    this.medianText = this.add.text(0, 0, this.currentMedian == null ? '—' : `${this.currentMedian}`, {
      fontFamily: 'Inter, Arial',
      fontSize: '14px',
      color: '#00e5ff',
    }).setOrigin(0.5, 0);

    // Input
    this.input.setDraggable(this.handle, true);
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number) => {
      if (gameObject !== this.handle) return;
      const { left, right } = this.track.getBounds();
      const clampedX = Phaser.Math.Clamp(dragX, left, right);
      this.handle.setX(clampedX);
      this.currentValue = this.positionToValue(clampedX, left, right);
      this.valueText.setText(`${this.currentValue}`);
      this.layout();
      this.emitValueChanged(this.currentValue);
    });

    // Responsive
    this.scale.on('resize', () => this.layout());
    this.layout();
  }

  public setMedian(median: number | null): void {
    this.currentMedian = median;
    this.medianText.setText(median == null ? '—' : `${median}`);
    this.layout();
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
    const maxWidth = Math.max(280, Math.floor(width * 0.9));
    const trackWidth = Math.min(720, maxWidth);
    const verticalPadding = Math.max(24, height * 0.12);
    const sliderY = Phaser.Math.Clamp(height / 2, verticalPadding, height - verticalPadding);

    this.cameras.resize(width, height);

    this.track.setPosition(canvasCenterX, sliderY).setDisplaySize(trackWidth, 6);

    const bounds = this.track.getBounds();
    const left = bounds.left;
    const right = bounds.right;

    const handleX = this.valueToPosition(this.currentValue, left, right);
    this.handle.setPosition(handleX, sliderY);

    const medianX = this.currentMedian == null ? null : this.valueToPosition(this.currentMedian, left, right);
    if (medianX == null) {
      this.medianLine.setVisible(false);
      this.medianText.setVisible(false);
    } else {
      this.medianLine.setVisible(true).setPosition(medianX, sliderY).setDisplaySize(2, 28);
      this.medianText.setVisible(true).setPosition(medianX, sliderY + 20);
    }

    this.valueText.setPosition(handleX, sliderY - 16);

    // Ensure values stay within bounds even if resize shrinks the track dramatically
    this.currentValue = Phaser.Math.Clamp(this.currentValue, MIN_GUESS_VALUE, MAX_GUESS_VALUE);
    this.currentMedian = this.currentMedian == null ? null : Phaser.Math.Clamp(this.currentMedian, MIN_GUESS_VALUE, MAX_GUESS_VALUE);
  }

  private emitValueChanged(value: number): void {
    this.events.emit('slider:valueChanged', value);
  }
}


