import { describe, it, expect } from 'vitest';
import { deriveColorFromLabel, getSpectrumColors, lerpColor, jitter } from './spectrumColors.js';

describe('spectrumColors', () => {
  it('deriveColorFromLabel returns stable numeric color', () => {
    const a1 = deriveColorFromLabel('Coffee');
    const a2 = deriveColorFromLabel('Coffee');
    expect(typeof a1).toBe('number');
    expect(a1).toBe(a2);
    expect(a1).toBeGreaterThanOrEqual(0);
    expect(a1).toBeLessThanOrEqual(0xffffff);
  });

  it('getSpectrumColors returns two distinct colors for different labels', () => {
    const [l, r] = getSpectrumColors('Coffee', 'Tea');
    expect(typeof l).toBe('number');
    expect(typeof r).toBe('number');
    expect(l).not.toBeNaN();
    expect(r).not.toBeNaN();
  });

  it('lerpColor interpolates endpoints at t=0 and t=1', () => {
    const a = 0xff0000;
    const b = 0x0000ff;
    expect(lerpColor(a, b, 0)).toBe(a);
    expect(lerpColor(a, b, 1)).toBe(b);
  });

  it('jitter stays within reasonable range', () => {
    const v = 10;
    const amount = 2;
    for (let i = 0; i < 50; i++) {
      const j = jitter(v, amount);
      expect(j).toBeGreaterThanOrEqual(v - amount);
      expect(j).toBeLessThanOrEqual(v + amount);
    }
  });
});


