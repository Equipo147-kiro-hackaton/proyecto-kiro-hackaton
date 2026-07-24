import { describe, test, expect } from 'vitest';
import { PUZZLE_POOL } from '@/data/puzzles';
import type { PuzzleCategory } from '@/types';

// Feature: cloud-quest-devops-dungeon, Property 9: puzzle pool integrity
describe('Puzzle pool integrity — Property 9', () => {
  /**
   * Validates: Requirements 3.2, 3.8
   * Every puzzle has exactly one correctAnswer (non-empty string),
   * hints.length in [1, 3] with all hints distinct and non-empty.
   */

  const categories: PuzzleCategory[] = ['syntax', 'logic', 'devops', 'memory'];
  const allPuzzles = categories.flatMap((cat) => PUZZLE_POOL[cat]);

  test('every puzzle has a non-empty correctAnswer string', () => {
    for (const puzzle of allPuzzles) {
      expect(typeof puzzle.correctAnswer).toBe('string');
      expect(puzzle.correctAnswer.length).toBeGreaterThan(0);
    }
  });

  test('every puzzle has between 1 and 3 hints', () => {
    for (const puzzle of allPuzzles) {
      expect(puzzle.hints.length).toBeGreaterThanOrEqual(1);
      expect(puzzle.hints.length).toBeLessThanOrEqual(3);
    }
  });

  test('all hints are distinct and non-empty for each puzzle', () => {
    for (const puzzle of allPuzzles) {
      const hintSet = new Set<string>();
      for (const hint of puzzle.hints) {
        expect(typeof hint).toBe('string');
        expect(hint.length).toBeGreaterThan(0);
        expect(hintSet.has(hint)).toBe(false);
        hintSet.add(hint);
      }
    }
  });

  test('there are at least 5 puzzles per category', () => {
    for (const category of categories) {
      expect(PUZZLE_POOL[category].length).toBeGreaterThanOrEqual(5);
    }
  });
});
