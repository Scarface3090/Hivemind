import * as Phaser from 'phaser';
import { MAX_GUESS_VALUE, MIN_GUESS_VALUE } from '../../../shared/constants.js';
import { ParticleSystemManager } from '../systems/ParticleSystemManager.js';
import { colors } from '../../../shared/design-tokens.js';

type GuessingSceneData = {
  initialValue?: number;
  median?: number | null;
  leftLabel?: string;
  rightLabel?: string;
};

export class GuessingScene extends Phaser.Scene {
  private track!: Phaser.GameObjects.Rectangle;
  private handle!: Phaser.GameObjects.Arc;
  private medianLine!: Phaser.GameObjects.Rectangle;
  private valueText!: Phaser.GameObjects.Text;
  private medianText!: Phaser.GameObjects.Text;
  private leftLabelText!: Phaser.GameObjects.Text;
  private rightLabelText!: Phaser.GameObjects.Text;
  private spectrumBar!: Phaser.GameObjects.Graphics;

  private currentValue: number = 50;
  private currentMedian: number | null = null;
  private leftLabel: string = '';
  private rightLabel: string = '';

  // Particle system
  private particleManager!: ParticleSystemManager;
  private trailEffectId: string | null = null;
  private ambientEffectId: string | null = null;
  private isDragging: boolean = false;

  constructor() {
    super('GuessingScene');
  }

  init(data: GuessingSceneData): void {
    if (typeof data.initialValue === 'number') this.currentValue = data.initialValue;
    if (typeof data.median === 'number') this.currentMedian = data.median;
    if (typeof data.leftLabel === 'string') this.leftLabel = data.leftLabel;
    if (typeof data.rightLabel === 'string') this.rightLabel = data.rightLabel;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#111111');

    // Initialize particle system
    this.particleManager = new ParticleSystemManager(this);

    // Spectrum gradient bar
    this.spectrumBar = this.add.graphics();

    // Slider track (invisible, just for hit detection)
    this.track = this.add.rectangle(0, 0, 600, 6, 0x888888, 0).setOrigin(0.5, 0.5);

    // Slider handle
    this.handle = this.add
      .arc(0, 0, 14, 0, 360, false, 0xffcc00)
      .setInteractive({ useHandCursor: true, draggable: true });

    // Median indicator
    this.medianLine = this.add.rectangle(0, 0, 2, 28, 0x00e5ff, 1).setOrigin(0.5, 0.5);

    // Value and median labels
    this.valueText = this.add
      .text(0, 0, `${this.currentValue}`, {
        fontFamily: 'Inter, Arial',
        fontSize: '20px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 1);

    this.medianText = this.add
      .text(0, 0, this.currentMedian == null ? '—' : `${this.currentMedian}`, {
        fontFamily: 'Inter, Arial',
        fontSize: '14px',
        color: '#00e5ff',
      })
      .setOrigin(0.5, 0);

    // Spectrum labels
    this.leftLabelText = this.add
      .text(0, 0, this.leftLabel, {
        fontFamily: 'Inter, Arial',
        fontSize: '12px',
        color: '#cccccc',
      })
      .setOrigin(0, 0.5);

    this.rightLabelText = this.add
      .text(0, 0, this.rightLabel, {
        fontFamily: 'Inter, Arial',
        fontSize: '12px',
        color: '#cccccc',
      })
      .setOrigin(1, 0.5);

    // Depth ordering to ensure interactivity and visibility
    this.spectrumBar.setDepth(0);
    this.track.setDepth(1);
    this.leftLabelText.setDepth(1);
    this.rightLabelText.setDepth(1);
    this.medianLine.setDepth(2);
    this.medianText.setDepth(2);
    this.handle.setDepth(3);
    this.valueText.setDepth(3);

    // Input
    this.input.setDraggable(this.handle, true);

    // Handle drag start
    this.input.on(
      'dragstart',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (gameObject !== this.handle) return;
        this.isDragging = true;

        // Create brush stroke trail effect
        this.trailEffectId = this.particleManager.createBrushStrokeTrail(
          this.handle.x,
          this.handle.y,
          {
            colors: [colors.particles.primary, colors.particles.secondary],
            count: 8,
            duration: 800,
          }
        );
      }
    );

    this.input.on(
      'drag',
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number
      ) => {
        if (gameObject !== this.handle) return;
        const { left, right } = this.track.getBounds();
        const clampedX = Phaser.Math.Clamp(dragX, left, right);
        this.handle.setX(clampedX);
        this.currentValue = this.positionToValue(clampedX, left, right);
        this.valueText.setText(`${this.currentValue}`);

        // Update particle trail position
        if (this.trailEffectId && this.isDragging) {
          this.particleManager.updateTrailPosition(this.trailEffectId, clampedX, this.handle.y);
        }

        this.layout();
        this.emitValueChanged(this.currentValue);
      }
    );

    // Handle drag end
    this.input.on(
      'dragend',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (gameObject !== this.handle) return;
        this.isDragging = false;

        // Create organic burst effect on release
        this.particleManager.createOrganicBurst(this.handle.x, this.handle.y, {
          colors: [colors.particles.primary, colors.particles.tertiary],
          count: 15,
          duration: 600,
        });
      }
    );

    // Make track clickable and draggable for quick jumps
    this.track.setInteractive({ useHandCursor: true });
    this.track.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const { left, right } = this.track.getBounds();
      const clampedX = Phaser.Math.Clamp(pointer.x, left, right);
      this.handle.setX(clampedX);
      this.currentValue = this.positionToValue(clampedX, left, right);
      this.valueText.setText(`${this.currentValue}`);

      // Create burst effect on click
      this.particleManager.createOrganicBurst(clampedX, this.handle.y, {
        colors: [colors.particles.secondary, colors.particles.tertiary],
        count: 12,
        duration: 500,
      });

      this.layout();
      this.emitValueChanged(this.currentValue);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      const { left, right } = this.track.getBounds();
      const clampedX = Phaser.Math.Clamp(pointer.x, left, right);
      this.handle.setX(clampedX);
      this.currentValue = this.positionToValue(clampedX, left, right);
      this.valueText.setText(`${this.currentValue}`);

      // Update particle trail position during drag
      if (this.trailEffectId && this.isDragging) {
        this.particleManager.updateTrailPosition(this.trailEffectId, clampedX, this.handle.y);
      }

      this.layout();
      this.emitValueChanged(this.currentValue);
    });

    // Responsive
    this.scale.on('resize', () => this.layout());
    this.layout();

    // Create ambient particles after layout
    this.createAmbientParticles();

    // Set up cleanup when scene shuts down
    this.events.once('shutdown', this.destroy, this);
  }

  public setMedian(median: number | null): void {
    const previousMedian = this.currentMedian;
    this.currentMedian = median;
    this.medianText.setText(median == null ? '—' : `${median}`);

    // Create particle effect when median changes
    if (previousMedian !== null && median !== null && previousMedian !== median) {
      const { left, right } = this.track.getBounds();
      const medianX = this.valueToPosition(median, left, right);

      this.particleManager.createOrganicBurst(medianX, this.track.y, {
        colors: [colors.particles.tertiary, colors.particles.trail],
        count: 10,
        duration: 400,
        size: { min: 4, max: 8 },
      });
    }

    this.layout();
  }

  public setLabels(left: string, right: string): void {
    this.leftLabel = left ?? '';
    this.rightLabel = right ?? '';
    if (this.leftLabelText) this.leftLabelText.setText(this.leftLabel);
    if (this.rightLabelText) this.rightLabelText.setText(this.rightLabel);
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
    const canvasCenterY = height / 2;

    // Use full width minus padding for spectrum
    const horizontalPadding = Math.max(16, width * 0.05);
    const trackWidth = width - horizontalPadding * 2;
    const trackHeight = 6;

    // Center everything vertically
    const sliderY = canvasCenterY;
    const labelY = sliderY + 18;

    this.cameras.resize(width, height);

    // Render spectrum gradient bar
    this.spectrumBar.clear();
    const left = canvasCenterX - trackWidth / 2;

    // Create gradient effect using multiple rectangles
    const gradientSteps = 50;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / (gradientSteps - 1);
      const x = left + trackWidth * t;
      const stepWidth = trackWidth / gradientSteps;

      // Interpolate from orange (#FFBF00) to blue (#0079D3)
      const r = Math.floor(255 * (1 - t) + 0 * t);
      const g = Math.floor(191 * (1 - t) + 121 * t);
      const b = Math.floor(0 * (1 - t) + 211 * t);
      const color = (r << 16) | (g << 8) | b;

      this.spectrumBar.fillStyle(color, 0.6);
      this.spectrumBar.fillRect(x, sliderY - trackHeight / 2, stepWidth, trackHeight);
    }

    // Set track for hit detection
    this.track.setPosition(canvasCenterX, sliderY).setDisplaySize(trackWidth, trackHeight);

    const bounds = this.track.getBounds();
    const trackLeft = bounds.left;
    const trackRight = bounds.right;

    const handleX = this.valueToPosition(this.currentValue, trackLeft, trackRight);
    this.handle.setPosition(handleX, sliderY);

    const medianX =
      this.currentMedian == null
        ? null
        : this.valueToPosition(this.currentMedian, trackLeft, trackRight);
    if (medianX == null) {
      this.medianLine.setVisible(false);
      this.medianText.setVisible(false);
    } else {
      this.medianLine.setVisible(true).setPosition(medianX, sliderY).setDisplaySize(2, 28);
      this.medianText.setVisible(true).setPosition(medianX, sliderY + 20);
    }

    this.valueText.setPosition(handleX, sliderY - 16);

    // Position spectrum labels at track edges with a small inset to prevent clipping
    const labelInset = 6;
    this.leftLabelText
      .setText(this.leftLabel || '')
      .setPosition(trackLeft + labelInset, labelY)
      .setVisible(true);
    this.rightLabelText
      .setText(this.rightLabel || '')
      .setPosition(trackRight - labelInset, labelY)
      .setVisible(true);

    // Ensure values stay within bounds even if resize shrinks the track dramatically
    this.currentValue = Phaser.Math.Clamp(this.currentValue, MIN_GUESS_VALUE, MAX_GUESS_VALUE);
    this.currentMedian =
      this.currentMedian == null
        ? null
        : Phaser.Math.Clamp(this.currentMedian, MIN_GUESS_VALUE, MAX_GUESS_VALUE);
  }

  private emitValueChanged(value: number): void {
    this.events.emit('slider:valueChanged', value);
  }

  private createAmbientParticles(): void {
    const { width, height } = this.scale;
    const bounds = new Phaser.Geom.Rectangle(0, 0, width, height);

    this.ambientEffectId = this.particleManager.createAmbientParticles(bounds, {
      colors: [colors.particles.trail, colors.decorative.dots],
      count: 15,
      size: { min: 2, max: 6 },
      speed: { min: 5, max: 15 },
      opacity: { min: 0.2, max: 0.5 },
    });
  }

  destroy(): void {
    // Clean up specific effects
    if (this.trailEffectId) {
      this.particleManager.destroyEffect(this.trailEffectId);
      this.trailEffectId = null;
    }
    if (this.ambientEffectId) {
      this.particleManager.destroyEffect(this.ambientEffectId);
      this.ambientEffectId = null;
    }

    // Clean up particle system
    if (this.particleManager) {
      this.particleManager.destroy();
    }
  }
}
