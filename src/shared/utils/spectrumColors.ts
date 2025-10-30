// Utilities for deriving colors from spectrum labels with stable fallbacks.
// Returns numeric hex colors suitable for Phaser (e.g., 0xff9933).
// Notes:
// - Label → hue uses simple hints + hash fallback for stability
// - Saturation/lightness tuned for contrast on dark backgrounds
// - Exposes helpers used by painterly gradient and particles

export type RGB = { r: number; g: number; b: number };

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hashStringToInt(input: string): number {
  // Simple FNV-1a like hash for stability across sessions
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360; // normalize
  s = clamp01(s);
  l = clamp01(l);

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToNumber({ r, g, b }: RGB): number {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

export function colorNumberToCssHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// Optional curated mappings for common labels → hues
const labelHueHints: Record<string, number> = {
  // food/drink examples
  coffee: 30, // warm brown/orange
  tea: 100, // green
  spicy: 12,
  sweet: 45,
  // media examples
  horror: 350,
  romance: 340,
  sci: 200,
  science: 200,
  tech: 210,
  technology: 210,
  // general sentiments
  cold: 200,
  warm: 35,
  left: 260,
  right: 20,
};

function labelToHue(label: string): number {
  const key = label.trim().toLowerCase();
  for (const hint in labelHueHints) {
    if (key.includes(hint)) return labelHueHints[hint];
  }
  const h = hashStringToInt(key);
  // Distribute hues but bias away from muddy ranges
  const baseHue = h % 360;
  // Avoid muddy greens (90–150): shift that band upward to clearer hues
  const adjusted = (baseHue >= 90 && baseHue <= 150) ? (baseHue + 60) % 360 : baseHue;
  return adjusted;
}

export function deriveColorFromLabel(label: string): number {
  const hue = labelToHue(label);
  // Medium-high saturation and medium-lightness for contrast on dark bg
  const rgb = hslToRgb(hue, 0.72, 0.56);
  return rgbToNumber(rgb);
}

export function getSpectrumColors(leftLabel: string, rightLabel: string): [number, number] {
  const left = deriveColorFromLabel(leftLabel);
  const right = deriveColorFromLabel(rightLabel);
  return [left, right];
}

export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export function jitter(value: number, amount: number): number {
  return value + (Math.random() * 2 - 1) * amount;
}


