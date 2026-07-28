import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { resolveLighting, clampLighting } from '@/systems/LightingSystem';
import type { DifficultyMode } from '@/types';

describe('LightingSystem', () => {
  const arbTheme = fc.constantFrom('beginner', 'normal', 'hard');
  const arbDifficulty = fc.constantFrom<DifficultyMode>('beginner', 'normal', 'hard');

  // Feature: dungeon-visual-overhaul, Property 34: Rangos y determinismo
  it('returns valid ranges and deterministic results for recognized inputs', () => {
    fc.assert(
      fc.property(arbTheme, arbDifficulty, (themeId, difficulty) => {
        const params = resolveLighting(themeId, difficulty);
        expect(params.isFallback).toBe(false);
        expect(params.tintAlpha).toBeGreaterThanOrEqual(0.03);
        expect(params.tintAlpha).toBeLessThanOrEqual(0.12);
        expect(params.haloRadius).toBeGreaterThanOrEqual(12);
        expect(params.haloRadius).toBeLessThanOrEqual(24);
        expect(params.haloMaxAlpha).toBeGreaterThanOrEqual(0.40);
        expect(params.haloMaxAlpha).toBeLessThanOrEqual(0.80);
        expect(params.haloPeriodMs).toBeGreaterThanOrEqual(1000);
        expect(params.haloPeriodMs).toBeLessThanOrEqual(2000);
        if (difficulty === 'hard') {
          expect(params.vignetteIntensity).toBeGreaterThanOrEqual(0.25);
          expect(params.vignetteIntensity).toBeLessThanOrEqual(0.35);
        } else {
          expect(params.vignetteIntensity).toBeGreaterThanOrEqual(0.10);
          expect(params.vignetteIntensity).toBeLessThanOrEqual(0.20);
        }
        expect(resolveLighting(themeId, difficulty)).toEqual(params);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 35: Parámetros por defecto
  it('defaults to normal+normal when either argument is unrecognized', () => {
    const normalResult = resolveLighting('normal', 'normal');
    const invalids: Array<[unknown, unknown]> = [
      [null, 'normal'], ['normal', null], ['HARD', 'normal'],
      ['normal', 'BEGINNER'], [42, 'hard'], ['beginner', undefined],
    ];
    for (const [theme, diff] of invalids) {
      const r = resolveLighting(theme, diff);
      expect(r.isFallback).toBe(true);
      expect(r.tintColor).toBe(normalResult.tintColor);
      expect(r.vignetteIntensity).toBe(normalResult.vignetteIntensity);
    }
  });

  // Feature: dungeon-visual-overhaul, Property 36: Acotamiento
  it('clampLighting constrains out-of-range values', () => {
    fc.assert(
      fc.property(
        arbDifficulty,
        fc.double({ min: -1, max: 2, noNaN: true }),
        fc.double({ min: -1, max: 2, noNaN: true }),
        fc.double({ min: 0, max: 50, noNaN: true }),
        fc.double({ min: -1, max: 2, noNaN: true }),
        fc.double({ min: 0, max: 5000, noNaN: true }),
        (difficulty, tintAlpha, vignetteIntensity, haloRadius, haloMaxAlpha, haloPeriodMs) => {
          const clamped = clampLighting({
            tintColor: 0x2fd9c3, tintAlpha, vignetteIntensity,
            haloRadius, haloMaxAlpha, haloPeriodMs, isFallback: false,
          }, difficulty);
          expect(clamped.tintAlpha).toBeGreaterThanOrEqual(0.03);
          expect(clamped.tintAlpha).toBeLessThanOrEqual(0.12);
          expect(clamped.haloRadius).toBeGreaterThanOrEqual(12);
          expect(clamped.haloRadius).toBeLessThanOrEqual(24);
          expect(clamped.haloMaxAlpha).toBeGreaterThanOrEqual(0.40);
          expect(clamped.haloMaxAlpha).toBeLessThanOrEqual(0.80);
          expect(clamped.haloPeriodMs).toBeGreaterThanOrEqual(1000);
          expect(clamped.haloPeriodMs).toBeLessThanOrEqual(2000);
          const vigMin = difficulty === 'hard' ? 0.25 : 0.10;
          const vigMax = difficulty === 'hard' ? 0.35 : 0.20;
          expect(clamped.vignetteIntensity).toBeGreaterThanOrEqual(vigMin);
          expect(clamped.vignetteIntensity).toBeLessThanOrEqual(vigMax);
        },
      ),
      { numRuns: 100 },
    );
  });
});
