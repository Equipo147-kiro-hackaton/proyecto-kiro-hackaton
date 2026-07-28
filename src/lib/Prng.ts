/**
 * Prng — Deterministic pseudo-random number generator using linear congruential method.
 *
 * Uses the same congruence as the rest of the project:
 *   rng = (rng * 1664525 + 1013904223) & 0x7fffffff
 *
 * No system in this module calls Math.random.
 * This is the sole source of determinism for map generation by seed.
 */

export interface Prng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in the closed range [min, max]. Returns min if min > max. */
  intInRange(min: number, max: number): number;
  /** Element from a non-empty array; throws RangeError if empty. */
  pick<T>(items: readonly T[]): T;
  /** Shuffled copy via Fisher-Yates. Does not mutate the input. */
  shuffle<T>(items: readonly T[]): T[];
  /** Sample without replacement of size count (or less if count > items.length). */
  sample<T>(items: readonly T[], count: number): T[];
  /** Derived independent stream, identified by label. */
  fork(label: string): Prng;
}

const MULTIPLIER = 1664525;
const INCREMENT = 1013904223;
const MASK = 0x7fffffff;

function advance(state: number): number {
  return ((state * MULTIPLIER + INCREMENT) | 0) & MASK;
}

/** Hash a string label to a 32-bit integer for fork derivation. */
function hashLabel(label: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = (h * 0x01000193) | 0;
  }
  return h & MASK;
}

/**
 * Create a new deterministic PRNG from a seed.
 * Two calls with the same seed produce identical sequences.
 */
export function createPrng(seed: number): Prng {
  let state = (seed | 0) & MASK;

  function next(): number {
    state = advance(state);
    return state / (MASK + 1);
  }

  function intInRange(min: number, max: number): number {
    if (min > max) return min;
    const range = max - min + 1;
    return min + Math.floor(next() * range);
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new RangeError('Cannot pick from an empty array');
    }
    return items[intInRange(0, items.length - 1)];
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = intInRange(0, i);
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function sample<T>(items: readonly T[], count: number): T[] {
    const n = Math.min(count, items.length);
    if (n <= 0) return [];
    const shuffled = shuffle(items);
    return shuffled.slice(0, n);
  }

  function fork(label: string): Prng {
    const derivedSeed = (state ^ hashLabel(label)) & MASK;
    return createPrng(derivedSeed);
  }

  return { next, intInRange, pick, shuffle, sample, fork };
}
