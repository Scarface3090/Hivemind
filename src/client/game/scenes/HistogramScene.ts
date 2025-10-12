import Phaser from 'phaser';

export type HistogramBucket = { rangeStart: number; rangeEnd: number; count: number };

export type HistogramSceneConfig = {
  buckets: HistogramBucket[];
  target: number;
  median: number;
  viewerGuess?: number;
};

/**
 * Renders a responsive histogram with vertical markers for target, median, and viewer guess.
 */
export class HistogramScene extends Phaser.Scene {
  private buckets: HistogramBucket[] = [];
  private target = 0;
  private median = 0;
  private viewerGuess: number | undefined;

  private gfx!: Phaser.GameObjects.Graphics;
  private labelLayer!: Phaser.GameObjects.Layer;

  constructor() {
    super('HistogramScene');
  }

  init(config: HistogramSceneConfig): void {
    this.buckets = config.buckets ?? [];
    this.target = config.target ?? 0;
    this.median = config.median ?? 0;
    this.viewerGuess = config.viewerGuess;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b141c');
    this.gfx = this.add.graphics();
    this.labelLayer = this.add.layer();

    this.scale.on('resize', () => this.draw());
    this.draw();
  }

  public updateData(config: Partial<HistogramSceneConfig>): void {
    if (config.buckets) this.buckets = config.buckets;
    if (typeof config.target === 'number') this.target = config.target;
    if (typeof config.median === 'number') this.median = config.median;
    if (typeof config.viewerGuess === 'number' || config.viewerGuess === undefined) this.viewerGuess = config.viewerGuess;
    this.draw();
  }

  private domain(): { start: number; end: number } {
    if (this.buckets.length === 0) return { start: 0, end: 100 };
    const start = this.buckets[0].rangeStart;
    const end = this.buckets[this.buckets.length - 1].rangeEnd;
    return { start, end };
  }

  private draw(): void {
    const { width, height } = this.scale;
    const padding = Math.max(12, Math.floor(width * 0.04));
    const chartTop = padding + 8;
    const chartBottom = height - padding - 28; // leave room for x-axis labels
    const chartHeight = Math.max(32, chartBottom - chartTop);
    const chartLeft = padding;
    const chartRight = width - padding;
    const chartWidth = Math.max(32, chartRight - chartLeft);

    const maxCount = Math.max(1, ...this.buckets.map((b) => b.count));
    const toX = (value: number): number => {
      const { start, end } = this.domain();
      const t = Phaser.Math.Clamp((value - start) / (end - start || 1), 0, 1);
      return chartLeft + t * chartWidth;
    };

    // Clear
    this.gfx.clear();
    this.labelLayer.removeAll(true);

    // Background grid (slightly stronger for mobile visibility)
    this.gfx.lineStyle(1.5, 0xffffff, 0.12);
    const horizontalLines = 4;
    for (let i = 0; i <= horizontalLines; i++) {
      const y = chartTop + (i / horizontalLines) * chartHeight;
      this.gfx.strokeLineShape(new Phaser.Geom.Line(chartLeft, y, chartRight, y));
    }

    // Bars
    if (this.buckets.length > 0) {
      const barGap = Math.max(2, Math.floor(chartWidth * 0.012));
      const barWidth = (chartWidth - barGap * (this.buckets.length - 1)) / this.buckets.length;

      this.buckets.forEach((b, idx) => {
        const h = Math.max(6, Math.round((b.count / maxCount) * chartHeight));
        const x = chartLeft + idx * (barWidth + barGap);
        const y = chartBottom - h;

        const isTarget = this.target >= b.rangeStart && this.target <= b.rangeEnd;
        const isMedian = this.median >= b.rangeStart && this.median <= b.rangeEnd;
        const isViewer = this.viewerGuess != null && this.viewerGuess >= b.rangeStart && this.viewerGuess <= b.rangeEnd;

        const color = isViewer ? 0x62f29e : isTarget ? 0xff4500 : isMedian ? 0x00a3ff : 0xffffff;
        const alpha = isViewer || isTarget || isMedian ? 0.95 : 0.28;

        this.roundedRect(x, y, barWidth, h, 4, color, alpha);

        // Count label above bar
        const countText = this.add.text(x + barWidth / 2, y - 4, String(b.count), {
          fontFamily: 'Inter, Arial',
          fontSize: '10px',
          color: '#c9d1d9',
        }).setOrigin(0.5, 1);
        this.labelLayer.add(countText);

        // Bucket start label under bar (sparse)
        if (idx % 2 === 0 || idx === this.buckets.length - 1) {
          const label = this.add.text(x + barWidth / 2, chartBottom + 4, String(b.rangeStart), {
            fontFamily: 'Inter, Arial',
            fontSize: '10px',
            color: '#9aa4b2',
          }).setOrigin(0.5, 0);
          this.labelLayer.add(label);
        }
      });
    }

    // Markers
    this.drawMarker(toX(this.target), chartTop, chartBottom, 0xff4500);
    this.drawMarker(toX(this.median), chartTop, chartBottom, 0x00a3ff);
    if (this.viewerGuess != null) this.drawMarker(toX(this.viewerGuess), chartTop, chartBottom, 0x62f29e);
  }

  private roundedRect(x: number, y: number, w: number, h: number, r: number, color: number, alpha: number): void {
    this.gfx.fillStyle(color, alpha);
    this.gfx.beginPath();
    this.gfx.moveTo(x + r, y);
    this.gfx.lineTo(x + w - r, y);
    this.gfx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.gfx.lineTo(x + w, y + h - r);
    this.gfx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.gfx.lineTo(x + r, y + h);
    this.gfx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.gfx.lineTo(x, y + r);
    this.gfx.quadraticCurveTo(x, y, x + r, y);
    this.gfx.closePath();
    this.gfx.fillPath();
  }

  private drawMarker(x: number, top: number, bottom: number, color: number): void {
    this.gfx.fillStyle(color, 1);
    this.gfx.fillCircle(x, top - 5, 5);
    this.gfx.fillRect(x - 1.5, top, 3, bottom - top);
  }
}


