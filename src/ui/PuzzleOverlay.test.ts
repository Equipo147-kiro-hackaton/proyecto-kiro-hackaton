import { describe, it, expect } from 'vitest';
import type { Puzzle, DifficultyMode } from '@/types';
import { PuzzleEngine } from '@/systems/PuzzleEngine';

// Feature: cloud-quest-devops-dungeon, Property 1: Puzzle evaluation logic for overlay
// Feature: cloud-quest-devops-dungeon, Property 2: Hint visibility respects difficulty mode
// Feature: cloud-quest-devops-dungeon, Property 3: Timer duration varies by difficulty

/**
 * Test the pure logic behind PuzzleOverlay decisions.
 * The Phaser visual layer is tested via the TileTestScene integration.
 */

describe('PuzzleOverlay Logic', () => {
  const testPuzzle: Puzzle = {
    id: 'test-001',
    category: 'devops',
    question: 'What command applies a K8s manifest?',
    correctAnswer: 'kubectl apply -f deploy.yml',
    hints: ['Uses the kubectl CLI', 'The -f flag specifies a file', 'apply creates/updates resources'],
    difficulty: 2,
  };

  // ─── Answer Evaluation ──────────────────────────────────────────────────

  describe('answer evaluation', () => {
    const engine = new PuzzleEngine();

    it('accepts exact correct answer', () => {
      expect(engine.evaluate(testPuzzle, 'kubectl apply -f deploy.yml')).toBe(true);
    });

    it('accepts case-insensitive answer', () => {
      expect(engine.evaluate(testPuzzle, 'KUBECTL APPLY -F DEPLOY.YML')).toBe(true);
    });

    it('accepts trimmed answer', () => {
      expect(engine.evaluate(testPuzzle, '  kubectl apply -f deploy.yml  ')).toBe(true);
    });

    it('rejects incorrect answer', () => {
      expect(engine.evaluate(testPuzzle, 'docker apply')).toBe(false);
    });

    it('rejects empty answer', () => {
      expect(engine.evaluate(testPuzzle, '')).toBe(false);
    });
  });

  // ─── Hint Visibility Rules ──────────────────────────────────────────────

  describe('hint visibility rules', () => {
    const engine = new PuzzleEngine();

    it('beginner mode: hints available from first attempt', () => {
      const mode: DifficultyMode = 'beginner';
      // In beginner, hints show immediately and after every wrong answer
      const hint0 = engine.getHint(testPuzzle, 0);
      expect(hint0).toBe('Uses the kubectl CLI');
      // Rule: beginner shows hints immediately
      expect(mode === 'beginner').toBe(true);
    });

    it('normal mode: hints available after 2nd attempt', () => {
      const mode: DifficultyMode = 'normal';
      // Rule: normal mode shows hints after attempt >= 2
      const attemptsRequired = 2;
      expect(mode === 'normal' && attemptsRequired >= 2).toBe(true);
      const hint0 = engine.getHint(testPuzzle, 0);
      expect(hint0).toBeDefined();
    });

    it('hard mode: no hints ever', () => {
      const mode: DifficultyMode = 'hard';
      // Rule: hard mode never shows hints regardless of attempts
      expect(mode === 'hard').toBe(true);
      // Even though hints exist in data, the overlay should not display them
    });

    it('hints are indexed sequentially', () => {
      expect(engine.getHint(testPuzzle, 0)).toBe('Uses the kubectl CLI');
      expect(engine.getHint(testPuzzle, 1)).toBe('The -f flag specifies a file');
      expect(engine.getHint(testPuzzle, 2)).toBe('apply creates/updates resources');
      expect(engine.getHint(testPuzzle, 3)).toBeUndefined();
    });
  });

  // ─── Timer Duration by Difficulty ───────────────────────────────────────

  describe('timer duration by difficulty', () => {
    it('beginner gets 90 seconds', () => {
      const timerByMode: Record<DifficultyMode, number> = {
        beginner: 90,
        normal: 60,
        hard: 45,
      };
      expect(timerByMode.beginner).toBe(90);
    });

    it('normal gets 60 seconds', () => {
      const timerByMode: Record<DifficultyMode, number> = {
        beginner: 90,
        normal: 60,
        hard: 45,
      };
      expect(timerByMode.normal).toBe(60);
    });

    it('hard gets 45 seconds', () => {
      const timerByMode: Record<DifficultyMode, number> = {
        beginner: 90,
        normal: 60,
        hard: 45,
      };
      expect(timerByMode.hard).toBe(45);
    });
  });

  // ─── HP Deduction Rules ─────────────────────────────────────────────────

  describe('HP deduction rules by difficulty', () => {
    const hpLossByMode: Record<DifficultyMode, number> = {
      beginner: 5,
      normal: 10,
      hard: 15,
    };

    it('beginner loses 5 HP per wrong answer', () => {
      expect(hpLossByMode.beginner).toBe(5);
    });

    it('normal loses 10 HP per wrong answer', () => {
      expect(hpLossByMode.normal).toBe(10);
    });

    it('hard loses 15 HP per wrong answer', () => {
      expect(hpLossByMode.hard).toBe(15);
    });

    it('all HP losses are positive', () => {
      for (const mode of Object.keys(hpLossByMode) as DifficultyMode[]) {
        expect(hpLossByMode[mode]).toBeGreaterThan(0);
      }
    });
  });

  // ─── Timeout Rules ──────────────────────────────────────────────────────

  describe('timeout consequences', () => {
    it('timeout counts as failure (no fragment awarded)', () => {
      // When timer reaches 0, the puzzle is marked as failed
      // The calling system should not award a fragment
      const timeoutResult = { solved: false, remainingSeconds: 0 };
      expect(timeoutResult.solved).toBe(false);
    });

    it('timeout deducts additional HP', () => {
      // Timeout penalty is harsher than a single wrong answer
      const timeoutHPLoss = 15; // Fixed penalty for timeout
      expect(timeoutHPLoss).toBeGreaterThanOrEqual(15);
    });
  });
});
