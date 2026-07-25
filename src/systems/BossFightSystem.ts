/**
 * BossFightSystem — Pure logic for the CI/CD Chaos Assembly boss fight.
 * Independent of Phaser (testable without DOM/canvas).
 *
 * Mechanics:
 * - Player has 4 hearts (each = 25% HP)
 * - Player places collected fragments in order to build a CI/CD pipeline
 * - Correct placement: reduces boss HP by fragment weight (critical = ×1.5)
 * - Incorrect placement: boss attacks hero (loses 1 heart)
 * - Boss auto-attacks every N seconds if player hasn't acted
 * - Victory: boss HP reaches 0
 * - Defeat: hero loses all 4 hearts
 */

import type { Fragment } from '@/types';

export interface BossFightState {
  bossHP: number;
  bossMaxHP: number;
  heroHearts: number;
  maxHearts: number;
  placedFragments: string[];
  nextSlotIndex: number;
  isComplete: boolean;
  victory: boolean;
  lastActionTime: number;
}

export interface PlacementResult {
  correct: boolean;
  damageDealt: number;
  isCritical: boolean;
  bossHPAfter: number;
  heroHeartsAfter: number;
  victory: boolean;
  defeat: boolean;
}

/**
 * Create initial boss fight state.
 */
export function createBossFightState(): BossFightState {
  return {
    bossHP: 100,
    bossMaxHP: 100,
    heroHearts: 4,
    maxHearts: 4,
    placedFragments: [],
    nextSlotIndex: 0,
    isComplete: false,
    victory: false,
    lastActionTime: Date.now(),
  };
}

/**
 * Attempt to place a fragment at the next slot.
 */
export function placeFragment(
  state: BossFightState,
  fragmentId: string,
  correctOrder: string[],
  fragments: Fragment[]
): PlacementResult {
  if (state.isComplete) {
    return {
      correct: false, damageDealt: 0, isCritical: false,
      bossHPAfter: state.bossHP, heroHeartsAfter: state.heroHearts,
      victory: false, defeat: false,
    };
  }

  const expectedId = correctOrder[state.nextSlotIndex];
  const isCorrect = fragmentId === expectedId;
  state.lastActionTime = Date.now();

  if (isCorrect) {
    const fragment = fragments.find((f) => f.id === fragmentId);
    const baseWeight = fragment?.weight ?? 10;
    const isCritical = fragment?.isCritical ?? false;
    const effectiveWeight = isCritical ? Math.round(baseWeight * 1.5) : baseWeight;

    state.bossHP = Math.max(0, state.bossHP - effectiveWeight);
    state.placedFragments.push(fragmentId);
    state.nextSlotIndex++;

    const victory = state.bossHP <= 0;
    if (victory) {
      state.isComplete = true;
      state.victory = true;
    }

    return {
      correct: true, damageDealt: effectiveWeight, isCritical,
      bossHPAfter: state.bossHP, heroHeartsAfter: state.heroHearts,
      victory, defeat: false,
    };
  } else {
    state.heroHearts = Math.max(0, state.heroHearts - 1);
    const defeat = state.heroHearts <= 0;
    if (defeat) {
      state.isComplete = true;
      state.victory = false;
    }

    return {
      correct: false, damageDealt: 0, isCritical: false,
      bossHPAfter: state.bossHP, heroHeartsAfter: state.heroHearts,
      victory: false, defeat,
    };
  }
}

/**
 * Boss auto-attack: reduces hero hearts by 1.
 */
export function bossAutoAttack(state: BossFightState): {
  heroHeartsAfter: number;
  defeat: boolean;
} {
  if (state.isComplete) {
    return { heroHeartsAfter: state.heroHearts, defeat: false };
  }

  state.heroHearts = Math.max(0, state.heroHearts - 1);
  state.lastActionTime = Date.now();

  const defeat = state.heroHearts <= 0;
  if (defeat) {
    state.isComplete = true;
    state.victory = false;
  }

  return { heroHeartsAfter: state.heroHearts, defeat };
}

/**
 * Check if the boss auto-attack should trigger.
 */
export function shouldBossAttack(
  state: BossFightState,
  intervalMs: number,
  currentTime: number
): boolean {
  if (state.isComplete) return false;
  return (currentTime - state.lastActionTime) >= intervalMs;
}

/**
 * Get remaining slots to fill.
 */
export function getRemainingSlots(state: BossFightState, totalSlots: number): number {
  return totalSlots - state.nextSlotIndex;
}

/**
 * Boss HP as percentage.
 */
export function getBossHPPercent(state: BossFightState): number {
  return Math.round((state.bossHP / state.bossMaxHP) * 100);
}

/**
 * Hero HP as percentage (hearts-based).
 */
export function getHeroHPPercent(state: BossFightState): number {
  return Math.round((state.heroHearts / state.maxHearts) * 100);
}
