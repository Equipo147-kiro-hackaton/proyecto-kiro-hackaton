/**
 * FragmentSystem — Manages fragment collection, validation, and boss weight calculations.
 * Independent of Phaser (pure logic, testable without DOM/canvas).
 *
 * Responsibilities:
 * - Track which fragments have been collected per level
 * - Determine if a level's fragments are complete
 * - Calculate boss damage weights for the boss fight
 * - Validate fragment ordering for boss resolution
 */

import type { Fragment, FragmentState, FragmentProgress } from '@/types';
import { FRAGMENT_POOL } from '@/data/fragments';

export class FragmentSystem {
  /** Map of levelId → collected fragment states */
  private collectedFragments: Map<string, FragmentState[]> = new Map();

  /**
   * Get all fragments defined for a specific level.
   */
  getFragmentsForLevel(levelId: string): Fragment[] {
    return FRAGMENT_POOL[levelId] ?? [];
  }

  /**
   * Initialize tracking for a level (call when entering a new level).
   */
  initLevel(levelId: string): void {
    const fragments = this.getFragmentsForLevel(levelId);
    const states: FragmentState[] = fragments.map((f) => ({
      fragmentId: f.id,
      collected: false,
      solvedCorrectly: false,
    }));
    this.collectedFragments.set(levelId, states);
  }

  /**
   * Mark a fragment as collected. Returns true if the fragment exists and was collected.
   * @param fragmentId - The ID of the fragment to collect
   * @param solvedCorrectly - Whether the associated puzzle was solved correctly
   */
  collectFragment(fragmentId: string, solvedCorrectly = true): boolean {
    for (const [, states] of this.collectedFragments) {
      const state = states.find((s) => s.fragmentId === fragmentId);
      if (state) {
        state.collected = true;
        state.solvedCorrectly = solvedCorrectly;
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a specific fragment has been collected.
   */
  isFragmentCollected(fragmentId: string): boolean {
    for (const [, states] of this.collectedFragments) {
      const state = states.find((s) => s.fragmentId === fragmentId);
      if (state) return state.collected;
    }
    return false;
  }

  /**
   * Check if all fragments for a level have been collected.
   */
  isLevelComplete(levelId: string): boolean {
    const states = this.collectedFragments.get(levelId);
    if (!states || states.length === 0) return false;
    return states.every((s) => s.collected);
  }

  /**
   * Get the progress for a specific level.
   */
  getLevelProgress(levelId: string): FragmentProgress {
    const states = this.collectedFragments.get(levelId) ?? [];
    const totalRequired = this.getFragmentsForLevel(levelId).length;
    return {
      levelId,
      collected: states,
      totalRequired,
      isComplete: states.length > 0 && states.every((s) => s.collected),
    };
  }

  /**
   * Get all collected fragments for a level (only those marked collected).
   */
  getCollectedFragments(levelId: string): Fragment[] {
    const states = this.collectedFragments.get(levelId);
    if (!states) return [];

    const fragments = this.getFragmentsForLevel(levelId);
    return fragments.filter((f) =>
      states.some((s) => s.fragmentId === f.id && s.collected)
    );
  }

  /**
   * Calculate the boss damage weights for collected fragments.
   * Returns an array of {fragment, effectiveWeight} where effectiveWeight
   * includes the critical multiplier (×1.5 for critical fragments).
   */
  calculateBossWeights(levelId: string): Array<{ fragment: Fragment; effectiveWeight: number }> {
    const collected = this.getCollectedFragments(levelId);
    return collected.map((fragment) => ({
      fragment,
      effectiveWeight: fragment.isCritical
        ? Math.round(fragment.weight * 1.5)
        : fragment.weight,
    }));
  }

  /**
   * Validate a sequence of fragment IDs against the correct order.
   * Returns which positions are correct/incorrect.
   * Used during the boss fight when the player places fragments.
   */
  validateOrder(levelId: string, orderedFragmentIds: string[]): Array<{
    fragmentId: string;
    position: number;
    isCorrect: boolean;
  }> {
    const fragments = this.getFragmentsForLevel(levelId);
    const correctOrder = fragments
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((f) => f.id);

    return orderedFragmentIds.map((id, index) => ({
      fragmentId: id,
      position: index,
      isCorrect: index < correctOrder.length && correctOrder[index] === id,
    }));
  }

  /**
   * Check if a specific fragment placement at a position is correct.
   * Used for incremental boss fight validation.
   */
  isPlacementCorrect(levelId: string, fragmentId: string, position: number): boolean {
    const fragments = this.getFragmentsForLevel(levelId);
    const correctOrder = fragments
      .slice()
      .sort((a, b) => a.order - b.order);

    if (position < 0 || position >= correctOrder.length) return false;
    return correctOrder[position].id === fragmentId;
  }

  /**
   * Get the total weight sum for a level (should be 100).
   * Useful for validation.
   */
  getTotalWeight(levelId: string): number {
    const fragments = this.getFragmentsForLevel(levelId);
    return fragments.reduce((sum, f) => sum + f.weight, 0);
  }

  /**
   * Reset all fragment states (for starting a new run).
   */
  reset(): void {
    this.collectedFragments.clear();
  }

  /**
   * Reset only a specific level's fragment states.
   */
  resetLevel(levelId: string): void {
    this.collectedFragments.delete(levelId);
  }
}
