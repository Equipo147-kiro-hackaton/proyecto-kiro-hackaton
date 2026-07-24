import type { Puzzle, PuzzleCategory } from '@/types';
import { PUZZLE_POOL } from '@/data/puzzles';

/**
 * PuzzleEngine — manages puzzle selection, answer evaluation, hint retrieval,
 * timer configuration, and damage computation.
 *
 * Independent of Phaser (pure logic, testable without DOM/canvas).
 */
export class PuzzleEngine {
  private pool: Map<PuzzleCategory, Puzzle[]>;
  private usedIds: Set<string>;

  constructor() {
    this.pool = new Map<PuzzleCategory, Puzzle[]>();
    this.usedIds = new Set<string>();

    // Load PUZZLE_POOL into the pool map
    for (const category of Object.keys(PUZZLE_POOL) as PuzzleCategory[]) {
      this.pool.set(category, [...PUZZLE_POOL[category]]);
    }
  }

  /**
   * Draw one puzzle matching the given category that hasn't been used yet.
   * Returns null if all puzzles in that category have been used.
   */
  draw(category: PuzzleCategory): Puzzle | null {
    const puzzles = this.pool.get(category);
    if (!puzzles) {
      return null;
    }

    const available = puzzles.filter((p) => !this.usedIds.has(p.id));
    if (available.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    const selected = available[randomIndex];
    this.usedIds.add(selected.id);

    return selected;
  }

  /**
   * Evaluate answer; returns true if correct.
   * Uses case-insensitive, trimmed comparison for better UX.
   */
  evaluate(puzzle: Puzzle, answer: string): boolean {
    return (
      puzzle.correctAnswer.trim().toLowerCase() ===
      answer.trim().toLowerCase()
    );
  }

  /**
   * Returns the hint at index (0-based); undefined if out of range.
   */
  getHint(puzzle: Puzzle, index: number): string | undefined {
    if (index < 0 || index >= puzzle.hints.length) {
      return undefined;
    }
    return puzzle.hints[index];
  }

  /**
   * Timer duration in seconds depending on boss flag.
   * 90 seconds for boss bugs, 60 seconds for standard bugs.
   */
  getTimerDuration(isBoss: boolean): 60 | 90 {
    return isBoss ? 90 : 60;
  }

  /**
   * Compute damage from remaining seconds.
   * Formula: clamp(remainingSeconds * 2, 10, 120)
   */
  computeDamage(remainingSeconds: number): number {
    return Math.max(10, Math.min(120, remainingSeconds * 2));
  }

  /**
   * Reset used puzzle tracking (called on new Run).
   */
  reset(): void {
    this.usedIds.clear();
  }
}
