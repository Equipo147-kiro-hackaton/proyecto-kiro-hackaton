/**
 * LightingSystem — Pure system that computes lighting parameters
 * (vignette, ambient tint, halos) based on theme and difficulty.
 *
 * No import of 'phaser'.
 */

import type { DifficultyMode } from '@/types';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface LightingParams {
  tintColor: number;
  /** 0.03 – 0.12 */
  tintAlpha: number;
  /** 0.10 – 0.20 for beginner/normal; 0.25 – 0.35 for hard. */
  vignetteIntensity: number;
  /** Halo radius per objective, 12 – 24 px. */
  haloRadius: number;
  /** Maximum halo opacity, 0.40 – 0.80. */
  haloMaxAlpha: number;
  /** Halo pulse period, 1000 – 2000 ms. */
  haloPeriodMs: number;
  isFallback: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_IDS: readonly string[] = ['beginner', 'normal', 'hard'];

const TINT_COLORS: Record<string, number> = {
  beginner: 0x7ce04a,
  normal: 0x2fd9c3,
  hard: 0xff3b30,
};

// ─── Main Functions ──────────────────────────────────────────────────────────

export function resolveLighting(themeId: unknown, difficulty: unknown): LightingParams {
  const isThemeValid = typeof themeId === 'string' && VALID_IDS.includes(themeId);
  const isDiffValid = typeof difficulty === 'string' && VALID_IDS.includes(difficulty);

  if (!isThemeValid || !isDiffValid) {
    return {
      tintColor: TINT_COLORS['normal'],
      tintAlpha: 0.06,
      vignetteIntensity: 0.15,
      haloRadius: 18,
      haloMaxAlpha: 0.60,
      haloPeriodMs: 1500,
      isFallback: true,
    };
  }

  const tintColor = TINT_COLORS[themeId as string] ?? TINT_COLORS['normal'];

  const isHard = difficulty === 'hard';
  return {
    tintColor,
    tintAlpha: isHard ? 0.10 : 0.06,
    vignetteIntensity: isHard ? 0.30 : 0.15,
    haloRadius: 18,
    haloMaxAlpha: 0.60,
    haloPeriodMs: 1500,
    isFallback: false,
  };
}

export function clampLighting(params: LightingParams, difficulty: DifficultyMode): LightingParams {
  const c = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const vigMin = difficulty === 'hard' ? 0.25 : 0.10;
  const vigMax = difficulty === 'hard' ? 0.35 : 0.20;

  return {
    ...params,
    tintAlpha: c(params.tintAlpha, 0.03, 0.12),
    vignetteIntensity: c(params.vignetteIntensity, vigMin, vigMax),
    haloRadius: c(params.haloRadius, 12, 24),
    haloMaxAlpha: c(params.haloMaxAlpha, 0.40, 0.80),
    haloPeriodMs: c(params.haloPeriodMs, 1000, 2000),
  };
}
