import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  resolveTheme,
  contrastRatio,
  hueSaturation,
  toThemeId,
  getThemeIds,
  type ThemeId,
} from '@/systems/ThemeSystem';

describe('ThemeSystem', () => {
  const arbDifficulty = fc.constantFrom<ThemeId>('beginner', 'normal', 'hard');
  const arbLevel = fc.integer({ min: 1, max: 5 });

  // Feature: dungeon-visual-overhaul, Property 27: Contraste de todos los temas
  it('all themes satisfy WCAG contrast ratios: floor/wall >= 3.0, floor/empty >= 4.5, uiText/uiBackground >= 4.5', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, (difficulty, level) => {
        const theme = resolveTheme(difficulty, level);
        const { palette } = theme;

        const floorWall = contrastRatio(palette.floor, palette.wall);
        const floorEmpty = contrastRatio(palette.floor, palette.empty);
        const textBg = contrastRatio(palette.uiText, palette.uiBackground);

        expect(floorWall).toBeGreaterThanOrEqual(3.0);
        expect(floorEmpty).toBeGreaterThanOrEqual(4.5);
        expect(textBg).toBeGreaterThanOrEqual(4.5);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 28: Integridad y determinismo del tema
  it('theme contains 8 defined non-null colors and two calls with same args return identical themes', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, (difficulty, level) => {
        const theme1 = resolveTheme(difficulty, level);
        const theme2 = resolveTheme(difficulty, level);

        // 8 colors are defined integers in valid range
        const { palette } = theme1;
        const colors = [
          palette.floor, palette.wall, palette.empty,
          palette.accentPrimary, palette.accentSecondary, palette.danger,
          palette.uiText, palette.uiBackground,
        ];
        for (const c of colors) {
          expect(typeof c).toBe('number');
          expect(c).toBeGreaterThanOrEqual(0x000000);
          expect(c).toBeLessThanOrEqual(0xffffff);
        }

        // Determinism: identical field by field
        expect(theme1).toEqual(theme2);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 29: Tema por defecto ante identificador no reconocido
  it('unrecognized difficulty returns normal theme with isFallback=true', () => {
    const invalidInputs: unknown[] = ['', null, undefined, 'NORMAL', 'Normal', 'HARD', 42, {}, []];
    for (const input of invalidInputs) {
      const theme = resolveTheme(input, 1);
      expect(theme.id).toBe('normal');
      expect(theme.isFallback).toBe(true);
    }
  });

  // Feature: dungeon-visual-overhaul, Property 30: Acotamiento del número de nivel
  it('level < 1 resolves same as level 1, level > 5 same as level 5', () => {
    fc.assert(
      fc.property(arbDifficulty, (difficulty) => {
        const atMin = resolveTheme(difficulty, 1);
        const belowMin = resolveTheme(difficulty, -10);
        const atMax = resolveTheme(difficulty, 5);
        const aboveMax = resolveTheme(difficulty, 100);

        expect(belowMin).toEqual(atMin);
        expect(aboveMax).toEqual(atMax);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 31: Matiz y saturación de los acentos
  it('accent colors have saturation >= 0.40 and hue within declared ranges per theme', () => {
    const hueRanges: Record<ThemeId, { primary: [number, number][]; secondary: [number, number][] }> = {
      beginner: { primary: [[90, 150]], secondary: [[35, 55]] },
      normal: { primary: [[160, 200]], secondary: [[90, 150]] },
      hard: { primary: [[345, 360], [0, 15]], secondary: [[16, 40]] },
    };

    fc.assert(
      fc.property(arbDifficulty, arbLevel, (difficulty, level) => {
        const theme = resolveTheme(difficulty, level);
        const { palette } = theme;
        const ranges = hueRanges[theme.id];

        const primary = hueSaturation(palette.accentPrimary);
        const secondary = hueSaturation(palette.accentSecondary);

        expect(primary.saturation).toBeGreaterThanOrEqual(0.40);
        expect(secondary.saturation).toBeGreaterThanOrEqual(0.40);

        const primaryInRange = ranges.primary.some(
          ([lo, hi]) => primary.hue >= lo && primary.hue <= hi,
        );
        expect(primaryInRange).toBe(true);

        const secondaryInRange = ranges.secondary.some(
          ([lo, hi]) => secondary.hue >= lo && secondary.hue <= hi,
        );
        expect(secondaryInRange).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 32: Opacidad base de los circuitos por tema
  it('circuitBaseAlpha is 0.35 for hard and 0.75 for beginner/normal', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, (difficulty, level) => {
        const theme = resolveTheme(difficulty, level);
        if (theme.id === 'hard') {
          expect(theme.circuitBaseAlpha).toBe(0.35);
        } else {
          expect(theme.circuitBaseAlpha).toBe(0.75);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 33: Índices de tile compartidos y tintes diferenciados
  it('all themes share same tile indices but have different tints, floor colors, and accents', () => {
    const themes = getThemeIds().map((id) => resolveTheme(id, 1));

    // Shared tile indices
    for (let i = 0; i < themes.length; i++) {
      for (let j = i + 1; j < themes.length; j++) {
        // Same prop indices
        expect(themes[i].tiles.props).toEqual(themes[j].tiles.props);
        // Same wall indices
        expect(themes[i].tiles.wallTop).toBe(themes[j].tiles.wallTop);
        expect(themes[i].tiles.wallMid).toBe(themes[j].tiles.wallMid);
        expect(themes[i].tiles.wallBottom).toBe(themes[j].tiles.wallBottom);
        expect(themes[i].tiles.emptyTile).toBe(themes[j].tiles.emptyTile);
      }
    }

    // Different floor colors, accent primary, and accent secondary between distinct themes
    for (let i = 0; i < themes.length; i++) {
      for (let j = i + 1; j < themes.length; j++) {
        expect(themes[i].palette.floor).not.toBe(themes[j].palette.floor);
        expect(themes[i].palette.accentPrimary).not.toBe(themes[j].palette.accentPrimary);
        expect(themes[i].palette.accentSecondary).not.toBe(themes[j].palette.accentSecondary);
      }
    }

    // Different tints between distinct themes
    for (let i = 0; i < themes.length; i++) {
      for (let j = i + 1; j < themes.length; j++) {
        const ti = themes[i].tints;
        const tj = themes[j].tints;
        const allSame =
          ti.floor === tj.floor &&
          ti.wall === tj.wall &&
          ti.empty === tj.empty &&
          ti.props === tj.props;
        expect(allSame).toBe(false);
      }
    }
  });

  // ─── Unit tests: catalog and edge cases ────────────────────────────────────

  describe('toThemeId', () => {
    it('returns ThemeId for valid exact-match strings', () => {
      expect(toThemeId('beginner')).toBe('beginner');
      expect(toThemeId('normal')).toBe('normal');
      expect(toThemeId('hard')).toBe('hard');
    });

    it('returns null for invalid inputs', () => {
      expect(toThemeId('')).toBeNull();
      expect(toThemeId(null)).toBeNull();
      expect(toThemeId(undefined)).toBeNull();
      expect(toThemeId('NORMAL')).toBeNull();
      expect(toThemeId('Normal')).toBeNull();
      expect(toThemeId('Hard')).toBeNull();
      expect(toThemeId(42)).toBeNull();
    });
  });

  describe('tile index snapshot', () => {
    it('prop tile indices match the expected values from the tileset', () => {
      const theme = resolveTheme('normal', 1);
      expect(theme.tiles.props).toEqual({
        'server-rack': 157,
        'crt-monitor': 133,
        'server-tower': 183,
        'power-panel': 184,
        'cable-bundle': 108,
        'energy-container': 132,
        'corrupt-container': 134,
        'padlock': 131,
      });
    });
  });
});
