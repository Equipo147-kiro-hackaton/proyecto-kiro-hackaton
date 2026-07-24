import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { PuzzleEngine } from '@/systems/PuzzleEngine';

// Feature: cloud-quest-devops-dungeon, Property 7: damage formula clamp
describe('PuzzleEngine — Property Tests', () => {
  test('Property 7: damage formula clamp', () => {
    const engine = new PuzzleEngine();
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 90 }), (t) => {
        return engine.computeDamage(t) === Math.max(10, Math.min(120, t * 2));
      }),
      { numRuns: 100 }
    );
  });
});

// **Validates: Requirements 3.4**

describe('PuzzleEngine — Unit Tests', () => {
  test('draw() returns a puzzle with the correct category', () => {
    const engine = new PuzzleEngine();
    const puzzle = engine.draw('syntax');
    expect(puzzle).not.toBeNull();
    expect(puzzle!.category).toBe('syntax');
  });

  test('draw() marks puzzle as used (no duplicates)', () => {
    const engine = new PuzzleEngine();
    const drawn = new Set<string>();
    let puzzle = engine.draw('syntax');
    while (puzzle !== null) {
      expect(drawn.has(puzzle.id)).toBe(false);
      drawn.add(puzzle.id);
      puzzle = engine.draw('syntax');
    }
    // After exhaustion, all syntax puzzles should be in the set
    expect(drawn.size).toBeGreaterThanOrEqual(5);
  });

  test('draw() returns null when all puzzles in a category are exhausted', () => {
    const engine = new PuzzleEngine();
    // Exhaust the syntax category
    while (engine.draw('syntax') !== null) {
      // keep drawing
    }
    const result = engine.draw('syntax');
    expect(result).toBeNull();
  });

  test('evaluate() is case-insensitive', () => {
    const engine = new PuzzleEngine();
    const puzzle = engine.draw('logic')!;
    const answer = puzzle.correctAnswer;
    expect(engine.evaluate(puzzle, answer.toUpperCase())).toBe(true);
    expect(engine.evaluate(puzzle, answer.toLowerCase())).toBe(true);
  });

  test('evaluate() trims whitespace', () => {
    const engine = new PuzzleEngine();
    const puzzle = engine.draw('devops')!;
    const answer = puzzle.correctAnswer;
    expect(engine.evaluate(puzzle, `  ${answer}  `)).toBe(true);
    expect(engine.evaluate(puzzle, `\t${answer}\n`)).toBe(true);
  });

  test('getHint() returns undefined for out-of-range index', () => {
    const engine = new PuzzleEngine();
    const puzzle = engine.draw('memory')!;
    expect(engine.getHint(puzzle, -1)).toBeUndefined();
    expect(engine.getHint(puzzle, 99)).toBeUndefined();
  });

  test('getHint() returns valid hint for in-range index', () => {
    const engine = new PuzzleEngine();
    const puzzle = engine.draw('syntax')!;
    const hint = engine.getHint(puzzle, 0);
    expect(hint).toBeDefined();
    expect(typeof hint).toBe('string');
  });

  test('reset() clears usedIds — can draw again after reset', () => {
    const engine = new PuzzleEngine();
    // Draw one puzzle
    const firstPuzzle = engine.draw('logic');
    expect(firstPuzzle).not.toBeNull();

    // Exhaust all logic puzzles
    while (engine.draw('logic') !== null) {
      // keep drawing
    }
    expect(engine.draw('logic')).toBeNull();

    // Reset and try again
    engine.reset();
    const afterReset = engine.draw('logic');
    expect(afterReset).not.toBeNull();
  });
});
