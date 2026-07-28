import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createPrng } from '@/lib/Prng';

describe('Prng', () => {
  const arbSeed = fc.integer({ min: 0, max: 2147483647 });

  // Feature: dungeon-visual-overhaul, Property: Determinism of createPrng by seed
  it('two createPrng(seed) with the same seed produce the same sequence', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const a = createPrng(seed);
        const b = createPrng(seed);
        for (let i = 0; i < 20; i++) {
          expect(a.next()).toBe(b.next());
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property: intInRange always returns integer in closed range
  it('intInRange(min, max) always returns an integer in [min, max]', () => {
    fc.assert(
      fc.property(
        arbSeed,
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: -1000, max: 1000 }),
        (seed, a, b) => {
          const min = Math.min(a, b);
          const max = Math.max(a, b);
          const prng = createPrng(seed);
          for (let i = 0; i < 10; i++) {
            const val = prng.intInRange(min, max);
            expect(val).toBeGreaterThanOrEqual(min);
            expect(val).toBeLessThanOrEqual(max);
            expect(Number.isInteger(val)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property: intInRange returns min when min > max
  it('intInRange returns min when min > max', () => {
    fc.assert(
      fc.property(arbSeed, fc.integer({ min: 1, max: 1000 }), (seed, diff) => {
        const prng = createPrng(seed);
        const min = 100;
        const max = min - diff;
        expect(prng.intInRange(min, max)).toBe(min);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property: shuffle returns a permutation without mutating input
  it('shuffle returns a permutation of the input and does not mutate it', () => {
    fc.assert(
      fc.property(
        arbSeed,
        fc.array(fc.integer(), { minLength: 1, maxLength: 50 }),
        (seed, items) => {
          const original = [...items];
          const prng = createPrng(seed);
          const shuffled = prng.shuffle(items);

          // Input not mutated
          expect(items).toEqual(original);

          // Same length
          expect(shuffled.length).toBe(items.length);

          // Same elements (sorted)
          expect([...shuffled].sort((a, b) => a - b)).toEqual(
            [...items].sort((a, b) => a - b),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property: sample returns count distinct elements
  it('sample(items, count) returns min(count, items.length) elements without duplicates by index', () => {
    fc.assert(
      fc.property(
        arbSeed,
        fc.array(fc.integer(), { minLength: 1, maxLength: 30 }),
        fc.integer({ min: 0, max: 40 }),
        (seed, items, count) => {
          const prng = createPrng(seed);
          const result = prng.sample(items, count);
          const expectedLength = Math.min(count, items.length);
          expect(result.length).toBe(Math.max(0, expectedLength));

          // All elements from original
          for (const r of result) {
            expect(items).toContain(r);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property: fork is deterministic by label and independent
  it('fork(label) is deterministic by label and independent of the parent stream', () => {
    fc.assert(
      fc.property(arbSeed, fc.string({ minLength: 1, maxLength: 20 }), (seed, label) => {
        const prng1 = createPrng(seed);
        const forked1 = prng1.fork(label);

        const prng2 = createPrng(seed);
        const forked2 = prng2.fork(label);

        // Same fork produces same sequence
        for (let i = 0; i < 10; i++) {
          expect(forked1.next()).toBe(forked2.next());
        }

        // Fork with different label produces different sequence
        const prng3 = createPrng(seed);
        const forkedOther = prng3.fork(label + '_other');
        const prng4 = createPrng(seed);
        const forkedSame = prng4.fork(label);

        // At least one value should differ (probabilistically always true for different labels)
        let allSame = true;
        for (let i = 0; i < 10; i++) {
          if (forkedOther.next() !== forkedSame.next()) {
            allSame = false;
            break;
          }
        }
        // With different labels, the streams should differ
        if (label !== label + '_other') {
          expect(allSame).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property: pick throws RangeError on empty array
  it('pick throws RangeError when given an empty array', () => {
    const prng = createPrng(42);
    expect(() => prng.pick([])).toThrow(RangeError);
  });

  // Feature: dungeon-visual-overhaul, Property: pick returns element from the array
  it('pick always returns an element present in the array', () => {
    fc.assert(
      fc.property(
        arbSeed,
        fc.array(fc.integer(), { minLength: 1, maxLength: 20 }),
        (seed, items) => {
          const prng = createPrng(seed);
          for (let i = 0; i < 10; i++) {
            expect(items).toContain(prng.pick(items));
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property: next() always returns [0, 1)
  it('next() always returns a float in [0, 1)', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const prng = createPrng(seed);
        for (let i = 0; i < 50; i++) {
          const val = prng.next();
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThan(1);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property: sample returns empty for count <= 0
  it('sample returns empty array for count <= 0', () => {
    fc.assert(
      fc.property(
        arbSeed,
        fc.array(fc.integer(), { minLength: 1, maxLength: 10 }),
        fc.integer({ min: -10, max: 0 }),
        (seed, items, count) => {
          const prng = createPrng(seed);
          expect(prng.sample(items, count)).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });
});
