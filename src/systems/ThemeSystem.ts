/**
 * ThemeSystem — Pure system that resolves the visual theme (palette, tile indices,
 * tint parameters) from the difficulty mode and level number.
 *
 * No import of 'phaser'. All colors are 0xRRGGBB integers.
 */

import type { DifficultyMode, PropType } from '@/types';

// ─── Public Types ────────────────────────────────────────────────────────────

export type ThemeId = 'beginner' | 'normal' | 'hard';

export interface ThemePalette {
  floor: number;
  wall: number;
  empty: number;
  accentPrimary: number;
  accentSecondary: number;
  danger: number;
  uiText: number;
  uiBackground: number;
}

export interface ThemeTiles {
  floor: readonly [number, number, number];
  wallTop: number;
  wallMid: number;
  wallBottom: number;
  emptyTile: number;
  props: Readonly<Record<PropType, number>>;
}

export interface ThemeTints {
  /** Multiplicative tint applied to ground layer tiles. */
  floor: number;
  /** Multiplicative tint applied to wall tiles. */
  wall: number;
  /** Fill tint (tintFill = true) applied to void tiles. */
  empty: number;
  props: number;
}

export interface Theme {
  id: ThemeId;
  palette: ThemePalette;
  tiles: ThemeTiles;
  tints: ThemeTints;
  /** Circuit base opacity: 0.75 for beginner/normal, 0.35 for hard. */
  circuitBaseAlpha: number;
  /** true when the default theme was applied due to unrecognized input. */
  isFallback: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_THEME_IDS: readonly ThemeId[] = ['beginner', 'normal', 'hard'];

const SHARED_TILES: Omit<ThemeTiles, 'floor'> = {
  wallTop: 1,
  wallMid: 27,
  wallBottom: 53,
  emptyTile: 27,
  props: {
    'server-rack': 157,
    'crt-monitor': 133,
    'server-tower': 183,
    'power-panel': 184,
    'cable-bundle': 108,
    'energy-container': 132,
    'corrupt-container': 134,
    'padlock': 131,
  },
};

const FLOOR_VARIANTS: readonly [number, number, number] = [79, 80, 81];

const PALETTES: Record<ThemeId, ThemePalette> = {
  beginner: {
    floor: 0x8fa37a,
    wall: 0x3a4433,
    empty: 0x0d110c,
    accentPrimary: 0x7ce04a,
    accentSecondary: 0xf0b429,
    danger: 0xe2443b,
    uiText: 0xd8f5c0,
    uiBackground: 0x10180e,
  },
  normal: {
    floor: 0x8aa9a2,
    wall: 0x2e4744,
    empty: 0x08110f,
    accentPrimary: 0x2fd9c3,
    accentSecondary: 0x6ee36b,
    danger: 0xff4d5a,
    uiText: 0xcff7ef,
    uiBackground: 0x0a1614,
  },
  hard: {
    floor: 0xa18274,
    wall: 0x4a2a22,
    empty: 0x120604,
    accentPrimary: 0xff3b30,
    accentSecondary: 0xff8c1a,
    danger: 0xff1744,
    uiText: 0xffdcc8,
    uiBackground: 0x180806,
  },
};

// ─── Color Utilities ─────────────────────────────────────────────────────────

function srgbChannel(c8: number): number {
  const s = c8 / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG 2.1 relative luminance of a 0xRRGGBB color. */
export function relativeLuminance(color: number): number {
  const r = srgbChannel((color >> 16) & 0xff);
  const g = srgbChannel((color >> 8) & 0xff);
  const b = srgbChannel(color & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio: (L_higher + 0.05) / (L_lower + 0.05). */
export function contrastRatio(a: number, b: number): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lMax = Math.max(la, lb);
  const lMin = Math.min(la, lb);
  return (lMax + 0.05) / (lMin + 0.05);
}

/** Hue (0–360) and saturation (0–1) from a 0xRRGGBB color. */
export function hueSaturation(color: number): { hue: number; saturation: number } {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta > 0) {
    if (max === r) {
      hue = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      hue = 60 * ((b - r) / delta + 2);
    } else {
      hue = 60 * ((r - g) / delta + 4);
    }
  }
  if (hue < 0) hue += 360;

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return { hue, saturation };
}

// ─── Tint Computation ────────────────────────────────────────────────────────

/**
 * Compute a multiplicative tint that, when applied to a tile with average
 * luminance ~128, produces approximately the target color.
 * The normative contract is on the palette colors, not the rendered tint.
 */
function computeMultiplicativeTint(targetColor: number): number {
  // Simplified: use the target color directly as tint since Phaser
  // multiplicative tint on a gray tile approximates the target.
  return targetColor;
}

function buildTints(palette: ThemePalette): ThemeTints {
  return {
    floor: computeMultiplicativeTint(palette.floor),
    wall: computeMultiplicativeTint(palette.wall),
    empty: palette.empty, // Used with tintFill = true, so exact color
    props: computeMultiplicativeTint(palette.wall),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Normalize an arbitrary value to a ThemeId; null if not valid. */
export function toThemeId(value: unknown): ThemeId | null {
  if (typeof value === 'string' && VALID_THEME_IDS.includes(value as ThemeId)) {
    return value as ThemeId;
  }
  return null;
}

/** DifficultyMode → ThemeId. 1:1 relationship in this feature. */
export function themeIdForDifficulty(difficulty: DifficultyMode): ThemeId {
  return difficulty;
}

/** Returns all valid theme IDs. */
export function getThemeIds(): readonly ThemeId[] {
  return VALID_THEME_IDS;
}

/**
 * Resolve the theme. Unrecognized inputs → 'normal' theme with isFallback = true.
 * levelNumber outside [1, 5] is clamped to the nearest limit.
 */
export function resolveTheme(difficulty: unknown, levelNumber: unknown): Theme {
  const themeId = toThemeId(difficulty);
  const isFallback = themeId === null;
  const resolvedId: ThemeId = themeId ?? 'normal';

  // Clamp level to [1, 5]; used for floor tile variant selection
  const rawLevel = typeof levelNumber === 'number' ? levelNumber : 1;
  const clampedLevel = Math.max(1, Math.min(5, Math.round(rawLevel)));

  const palette = PALETTES[resolvedId];
  const tints = buildTints(palette);

  // Floor tile variant selection based on level (deterministic)
  // Level 1-2: variant 0, Level 3-4: variant 1, Level 5: variant 2
  const variantIndex = Math.min(2, Math.floor((clampedLevel - 1) / 2));
  const floorTiles: readonly [number, number, number] = [
    FLOOR_VARIANTS[variantIndex],
    FLOOR_VARIANTS[(variantIndex + 1) % 3],
    FLOOR_VARIANTS[(variantIndex + 2) % 3],
  ];

  const tiles: ThemeTiles = {
    floor: floorTiles,
    ...SHARED_TILES,
  };

  const circuitBaseAlpha = resolvedId === 'hard' ? 0.35 : 0.75;

  return {
    id: resolvedId,
    palette,
    tiles,
    tints,
    circuitBaseAlpha,
    isFallback,
  };
}
