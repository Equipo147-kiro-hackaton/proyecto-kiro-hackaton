import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getDifficultyConfig,
  getAllModes,
  shouldShowHint,
  canSaveAtProgress,
  calculateProgress,
} from './DifficultySystem';

// Feature: cloud-quest-devops-dungeon, Property 1: Difficulty configs are consistent
// Feature: cloud-quest-devops-dungeon, Property 2: Hint rules respect mode hierarchy
// Feature: cloud-quest-devops-dungeon, Property 3: Save rules are mode-specific

describe('DifficultySystem', () => {
  describe('getDifficultyConfig', () => {
    it('returns valid config for beginner', () => {
      const config = getDifficultyConfig('beginner');
      expect(config.mode).toBe('beginner');
      expect(config.puzzleTimerSeconds).toBe(90);
      expect(config.hpLossPerWrongAnswer).toBe(5);
      expect(config.autoSave).toBe(true);
      expect(config.hintsEnabled).toBe(true);
    });

    it('returns valid config for normal', () => {
      const config = getDifficultyConfig('normal');
      expect(config.mode).toBe('normal');
      expect(config.puzzleTimerSeconds).toBe(60);
      expect(config.hpLossPerWrongAnswer).toBe(10);
      expect(config.autoSave).toBe(false);
      expect(config.saveCheckpoints).toEqual([30, 60]);
    });

    it('returns valid config for hard', () => {
      const config = getDifficultyConfig('hard');
      expect(config.mode).toBe('hard');
      expect(config.puzzleTimerSeconds).toBe(45);
      expect(config.hpLossPerWrongAnswer).toBe(15);
      expect(config.saveEnabled).toBe(false);
      expect(config.hintsEnabled).toBe(false);
    });

    it('harder modes have less time', () => {
      const b = getDifficultyConfig('beginner').puzzleTimerSeconds;
      const n = getDifficultyConfig('normal').puzzleTimerSeconds;
      const h = getDifficultyConfig('hard').puzzleTimerSeconds;
      expect(b).toBeGreaterThan(n);
      expect(n).toBeGreaterThan(h);
    });

    it('harder modes have more HP loss', () => {
      const b = getDifficultyConfig('beginner').hpLossPerWrongAnswer;
      const n = getDifficultyConfig('normal').hpLossPerWrongAnswer;
      const h = getDifficultyConfig('hard').hpLossPerWrongAnswer;
      expect(b).toBeLessThan(n);
      expect(n).toBeLessThan(h);
    });
  });

  describe('getAllModes', () => {
    it('returns all 3 modes', () => {
      expect(getAllModes()).toEqual(['beginner', 'normal', 'hard']);
    });
  });

  describe('shouldShowHint', () => {
    it('beginner: always shows hints', () => {
      expect(shouldShowHint('beginner', 0)).toBe(true);
      expect(shouldShowHint('beginner', 1)).toBe(true);
      expect(shouldShowHint('beginner', 5)).toBe(true);
    });

    it('normal: shows hints after 2 attempts', () => {
      expect(shouldShowHint('normal', 0)).toBe(false);
      expect(shouldShowHint('normal', 1)).toBe(false);
      expect(shouldShowHint('normal', 2)).toBe(true);
      expect(shouldShowHint('normal', 3)).toBe(true);
    });

    it('hard: never shows hints', () => {
      expect(shouldShowHint('hard', 0)).toBe(false);
      expect(shouldShowHint('hard', 1)).toBe(false);
      expect(shouldShowHint('hard', 10)).toBe(false);
      expect(shouldShowHint('hard', 100)).toBe(false);
    });

    it('property: beginner always shows hints', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (attempts) => {
            expect(shouldShowHint('beginner', attempts)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: hard never shows hints', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (attempts) => {
            expect(shouldShowHint('hard', attempts)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('canSaveAtProgress', () => {
    it('beginner: can always save', () => {
      expect(canSaveAtProgress('beginner', 0)).toBe(true);
      expect(canSaveAtProgress('beginner', 50)).toBe(true);
      expect(canSaveAtProgress('beginner', 100)).toBe(true);
    });

    it('normal: can save at 30% and 60%', () => {
      expect(canSaveAtProgress('normal', 29)).toBe(false);
      expect(canSaveAtProgress('normal', 30)).toBe(true);
      expect(canSaveAtProgress('normal', 35)).toBe(true);
      expect(canSaveAtProgress('normal', 36)).toBe(false);
      expect(canSaveAtProgress('normal', 60)).toBe(true);
      expect(canSaveAtProgress('normal', 65)).toBe(true);
      expect(canSaveAtProgress('normal', 66)).toBe(false);
    });

    it('hard: can never save', () => {
      expect(canSaveAtProgress('hard', 0)).toBe(false);
      expect(canSaveAtProgress('hard', 50)).toBe(false);
      expect(canSaveAtProgress('hard', 100)).toBe(false);
    });

    it('property: beginner always allows save', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (progress) => {
            expect(canSaveAtProgress('beginner', progress)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: hard never allows save', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          (progress) => {
            expect(canSaveAtProgress('hard', progress)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateProgress', () => {
    it('returns 0 for no fragments collected', () => {
      expect(calculateProgress(0, 5)).toBe(0);
    });

    it('returns 100 for all fragments collected', () => {
      expect(calculateProgress(5, 5)).toBe(100);
    });

    it('returns correct percentage for partial progress', () => {
      expect(calculateProgress(2, 5)).toBe(40);
      expect(calculateProgress(3, 5)).toBe(60);
    });

    it('handles 0 total fragments gracefully', () => {
      expect(calculateProgress(0, 0)).toBe(0);
    });

    it('property: progress is bounded [0, 100]', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 1, max: 20 }),
          (collected, total) => {
            const clamped = Math.min(collected, total);
            const progress = calculateProgress(clamped, total);
            expect(progress).toBeGreaterThanOrEqual(0);
            expect(progress).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
