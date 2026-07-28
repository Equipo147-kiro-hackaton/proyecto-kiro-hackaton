import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  hpSegments,
  hpText,
  objectiveCounterText,
  intersects,
  hudBlocksFor,
  HUD_BLOCKS,
  HUD_FORBIDDEN_REGION,
  createInitialHudState,
  applyHudUpdate,
} from '@/systems/HudLayout';
import { contrastRatio, resolveTheme } from '@/systems/ThemeSystem';
import type { DifficultyMode } from '@/types';

describe('HudLayout', () => {
  const arbDifficulty = fc.constantFrom<DifficultyMode>('beginner', 'normal', 'hard');

  // Feature: dungeon-visual-overhaul, Property 44: Segmentos de la barra de HP
  it('hpSegments returns clamp(ceil(hp/25), 0, 4) and hpText formats correctly', () => {
    fc.assert(
      fc.property(fc.integer({ min: -50, max: 150 }), (hp) => {
        const segments = hpSegments(hp);
        expect(segments).toBeGreaterThanOrEqual(0);
        expect(segments).toBeLessThanOrEqual(4);
        expect(segments).toBe(Math.max(0, Math.min(4, Math.ceil(hp / 25))));

        const text = hpText(hp);
        const clampedHp = Math.max(0, Math.min(hp, 100));
        expect(text).toBe(`${clampedHp}/100`);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 45: Formato del contador de objetivos
  it('objectiveCounterText formats X/N correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (activated, total) => {
          const text = objectiveCounterText(activated, total);
          const clampedTotal = Math.max(1, Math.min(5, total));
          const clampedActivated = Math.max(0, Math.min(clampedTotal, activated));
          expect(text).toBe(`${clampedActivated}/${clampedTotal}`);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 46: Geometría del HUD
  it('hudBlocksFor respects margins, forbidden region, and difficulty rules', () => {
    fc.assert(
      fc.property(arbDifficulty, (difficulty) => {
        const blocks = hudBlocksFor(difficulty);

        for (const block of blocks) {
          expect(block.x).toBeGreaterThanOrEqual(0);
          expect(block.y).toBeGreaterThanOrEqual(0);
          expect(block.x + block.width).toBeLessThanOrEqual(960);
          expect(block.y + block.height).toBeLessThanOrEqual(540);
          expect(intersects(block, HUD_FORBIDDEN_REGION)).toBe(false);
        }

        expect(blocks).toContainEqual(HUD_BLOCKS.status);
        expect(blocks).toContainEqual(HUD_BLOCKS.score);

        const hasControls = blocks.some(
          (b) => b.x === HUD_BLOCKS.controls.x && b.y === HUD_BLOCKS.controls.y,
        );
        expect(hasControls).toBe(difficulty !== 'hard');

        const hasTopBand = blocks.some(
          (b) => b.x === HUD_BLOCKS.topBand.x && b.y === HUD_BLOCKS.topBand.y,
        );
        expect(hasTopBand).toBe(difficulty === 'normal' || difficulty === 'hard');
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 47: Contraste de los bloques del HUD
  it('uiText/composited background contrast >= 4.5 for all themes and opacities', () => {
    fc.assert(
      fc.property(
        arbDifficulty,
        fc.double({ min: 0.45, max: 0.75, noNaN: true }),
        (difficulty, alpha) => {
          const theme = resolveTheme(difficulty, 1);
          const { palette } = theme;

          const bgR = ((palette.uiBackground >> 16) & 0xff) / 255;
          const bgG = ((palette.uiBackground >> 8) & 0xff) / 255;
          const bgB = (palette.uiBackground & 0xff) / 255;
          const floorR = ((palette.floor >> 16) & 0xff) / 255;
          const floorG = ((palette.floor >> 8) & 0xff) / 255;
          const floorB = (palette.floor & 0xff) / 255;

          const compR = Math.round((alpha * bgR + (1 - alpha) * floorR) * 255);
          const compG = Math.round((alpha * bgG + (1 - alpha) * floorG) * 255);
          const compB = Math.round((alpha * bgB + (1 - alpha) * floorB) * 255);
          const composited = (compR << 16) | (compG << 8) | compB;

          const ratio = contrastRatio(palette.uiText, composited);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 48: Estado del HUD ante secuencias de eventos
  it('shows defaults before first event, then last received values', () => {
    fc.assert(
      fc.property(
        arbDifficulty,
        fc.integer({ min: 1, max: 5 }),
        fc.array(
          fc.oneof(
            fc.record({ type: fc.constant('hp' as const), hp: fc.integer({ min: 0, max: 100 }) }),
            fc.record({ type: fc.constant('objectives' as const), objectivesActivated: fc.integer({ min: 0, max: 5 }) }),
            fc.record({ type: fc.constant('score' as const), score: fc.integer({ min: 0, max: 10000 }) }),
          ),
          { minLength: 0, maxLength: 10 },
        ),
        (difficulty, total, updates) => {
          let state = createInitialHudState(difficulty, total);

          if (updates.length === 0) {
            expect(state.hasReceivedData).toBe(false);
            expect(state.hp).toBe(100);
            expect(state.objectivesActivated).toBe(0);
            expect(state.score).toBe(0);
            return;
          }

          for (const update of updates) {
            state = applyHudUpdate(state, update);
          }

          expect(state.hasReceivedData).toBe(true);

          const lastHp = [...updates].reverse().find((u) => u.type === 'hp');
          const lastObj = [...updates].reverse().find((u) => u.type === 'objectives');
          const lastScore = [...updates].reverse().find((u) => u.type === 'score');

          if (lastHp && 'hp' in lastHp && typeof lastHp.hp === 'number') {
            expect(state.hp).toBe(lastHp.hp);
          }
          if (lastScore && 'score' in lastScore && typeof lastScore.score === 'number') {
            expect(state.score).toBe(lastScore.score);
          }
          if (lastObj && 'objectivesActivated' in lastObj && typeof lastObj.objectivesActivated === 'number') {
            expect(state.objectivesActivated).toBe(lastObj.objectivesActivated);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  describe('hpSegments edge cases', () => {
    it('returns 0 for hp <= 0', () => {
      expect(hpSegments(0)).toBe(0);
      expect(hpSegments(-10)).toBe(0);
    });
    it('returns 4 for hp >= 76', () => {
      expect(hpSegments(76)).toBe(4);
      expect(hpSegments(100)).toBe(4);
    });
    it('returns 1 for hp = 1', () => {
      expect(hpSegments(1)).toBe(1);
    });
  });

  describe('intersects', () => {
    it('detects overlap', () => {
      expect(intersects({ x: 0, y: 0, width: 100, height: 100 }, { x: 50, y: 50, width: 100, height: 100 })).toBe(true);
    });
    it('detects non-overlap', () => {
      expect(intersects({ x: 0, y: 0, width: 50, height: 50 }, { x: 100, y: 100, width: 50, height: 50 })).toBe(false);
    });
  });
});
