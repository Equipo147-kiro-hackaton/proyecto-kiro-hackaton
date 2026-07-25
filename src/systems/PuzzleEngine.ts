import { Puzzle, PuzzleCategory } from '@/types';
import { PUZZLE_POOL } from '@/data/puzzles';

/**
 * PuzzleEngine — Responsible for puzzle selection, answer evaluation,
 * hint management, timer configuration, and damage computation.
 *
 * Pure logic system, independent of Phaser.
 */
export class PuzzleEngine {
  private pool: Map<PuzzleCategory, Puzzle[]>;
  private usedIds: Set<string>;

  constructor() {
    this.pool = new Map();
    this.usedIds = new Set();
    this.initializePool();
  }

  /**
   * Draw one puzzle matching the given category.
   * Returns null if all puzzles in that category have been used.
   */
  draw(category: PuzzleCategory): Puzzle | null {
    const categoryPuzzles = this.pool.get(category);
    if (!categoryPuzzles) {
      return null;
    }

    const available = categoryPuzzles.filter((p) => !this.usedIds.has(p.id));
    if (available.length === 0) {
      return null;
    }

    const index = Math.floor(Math.random() * available.length);
    const selected = available[index];
    this.usedIds.add(selected.id);
    return selected;
  }

  /**
   * Evaluate the player's answer against the puzzle's correct answer.
   * Comparison is case-insensitive and trims whitespace.
   */
  evaluate(puzzle: Puzzle, answer: string): boolean {
    return (
      answer.trim().toLowerCase() === puzzle.correctAnswer.trim().toLowerCase()
    );
  }

  /**
   * Returns the hint at the given index (0-based).
   * Returns undefined if the index is out of range.
   */
  getHint(puzzle: Puzzle, index: number): string | undefined {
    if (index < 0 || index >= puzzle.hints.length) {
      return undefined;
    }
    return puzzle.hints[index];
  }

  /**
   * Timer duration in seconds.
   * Boss bugs get 90 seconds, standard bugs get 60 seconds.
   */
  getTimerDuration(isBoss: boolean): 60 | 90 {
    return isBoss ? 90 : 60;
  }

  /**
   * Compute damage from remaining seconds on the timer.
   * Formula: clamp(remainingSeconds × 2, 10, 120)
   */
  computeDamage(remainingSeconds: number): number {
    return Math.max(10, Math.min(120, remainingSeconds * 2));
  }

  /**
   * Reset used puzzle tracking. Called when starting a new Run.
   */
  reset(): void {
    this.usedIds.clear();
  }

  /**
   * Initialize the internal pool from static puzzle data.
   */
  private initializePool(): void {
    const categories: PuzzleCategory[] = [
      'syntax',
      'logic',
      'devops',
      'memory',
    ];
    for (const category of categories) {
      this.pool.set(category, [...PUZZLE_POOL[category]]);
    }
  }
}
