import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  createBossFightState,
  placeFragment,
  bossAutoAttack,
  shouldBossAttack,
  getRemainingSlots,
  getBossHPPercent,
  getHeroHPPercent,
  type BossFightState,
} from './BossFightSystem';
import type { Fragment } from '@/types';

// Feature: cloud-quest-devops-dungeon, Property 1: Correct placements reduce boss HP
// Feature: cloud-quest-devops-dungeon, Property 2: Incorrect placements cost hearts
// Feature: cloud-quest-devops-dungeon, Property 3: Boss auto-attack respects timing

const TEST_FRAGMENTS: Fragment[] = [
  { id: 'f1', levelId: 'l1', order: 1, content: 'step 1', description: '', difficulty: 1, weight: 20, isCritical: false },
  { id: 'f2', levelId: 'l1', order: 2, content: 'step 2', description: '', difficulty: 1, weight: 15, isCritical: false },
  { id: 'f3', levelId: 'l1', order: 3, content: 'step 3', description: '', difficulty: 2, weight: 25, isCritical: true },
  { id: 'f4', levelId: 'l1', order: 4, content: 'step 4', description: '', difficulty: 2, weight: 20, isCritical: false },
  { id: 'f5', levelId: 'l1', order: 5, content: 'step 5', description: '', difficulty: 3, weight: 20, isCritical: true },
];

const CORRECT_ORDER = ['f1', 'f2', 'f3', 'f4', 'f5'];

describe('BossFightSystem', () => {
  let state: BossFightState;

  beforeEach(() => {
    state = createBossFightState();
  });

  describe('createBossFightState', () => {
    it('creates initial state with full HP and hearts', () => {
      expect(state.bossHP).toBe(100);
      expect(state.heroHearts).toBe(4);
      expect(state.isComplete).toBe(false);
      expect(state.victory).toBe(false);
      expect(state.nextSlotIndex).toBe(0);
      expect(state.placedFragments).toHaveLength(0);
    });
  });

  describe('placeFragment — correct placement', () => {
    it('reduces boss HP by fragment weight for non-critical', () => {
      const result = placeFragment(state, 'f1', CORRECT_ORDER, TEST_FRAGMENTS);
      expect(result.correct).toBe(true);
      expect(result.damageDealt).toBe(20);
      expect(result.isCritical).toBe(false);
      expect(result.bossHPAfter).toBe(80);
      expect(result.heroHeartsAfter).toBe(4);
    });

    it('applies x1.5 multiplier for critical fragments', () => {
      state.nextSlotIndex = 2;
      const result = placeFragment(state, 'f3', CORRECT_ORDER, TEST_FRAGMENTS);
      expect(result.correct).toBe(true);
      expect(result.damageDealt).toBe(38);
      expect(result.isCritical).toBe(true);
    });

    it('advances nextSlotIndex after correct placement', () => {
      placeFragment(state, 'f1', CORRECT_ORDER, TEST_FRAGMENTS);
      expect(state.nextSlotIndex).toBe(1);
      placeFragment(state, 'f2', CORRECT_ORDER, TEST_FRAGMENTS);
      expect(state.nextSlotIndex).toBe(2);
    });

    it('triggers victory when boss HP reaches 0', () => {
      state.bossHP = 15;
      state.nextSlotIndex = 1;
      const result = placeFragment(state, 'f2', CORRECT_ORDER, TEST_FRAGMENTS);
      expect(result.victory).toBe(true);
      expect(state.isComplete).toBe(true);
      expect(state.victory).toBe(true);
    });
  });

  describe('placeFragment — incorrect placement', () => {
    it('costs 1 heart on wrong placement', () => {
      const result = placeFragment(state, 'f3', CORRECT_ORDER, TEST_FRAGMENTS);
      expect(result.correct).toBe(false);
      expect(result.damageDealt).toBe(0);
      expect(result.heroHeartsAfter).toBe(3);
    });

    it('does not advance slot index on wrong placement', () => {
      placeFragment(state, 'f5', CORRECT_ORDER, TEST_FRAGMENTS);
      expect(state.nextSlotIndex).toBe(0);
    });

    it('triggers defeat when hearts reach 0', () => {
      state.heroHearts = 1;
      const result = placeFragment(state, 'f5', CORRECT_ORDER, TEST_FRAGMENTS);
      expect(result.defeat).toBe(true);
      expect(state.isComplete).toBe(true);
      expect(state.victory).toBe(false);
    });

    it('does nothing after fight is complete', () => {
      state.isComplete = true;
      const result = placeFragment(state, 'f1', CORRECT_ORDER, TEST_FRAGMENTS);
      expect(result.correct).toBe(false);
      expect(result.damageDealt).toBe(0);
    });
  });

  describe('bossAutoAttack', () => {
    it('reduces hero hearts by 1', () => {
      const result = bossAutoAttack(state);
      expect(result.heroHeartsAfter).toBe(3);
      expect(result.defeat).toBe(false);
    });

    it('triggers defeat when hearts reach 0', () => {
      state.heroHearts = 1;
      const result = bossAutoAttack(state);
      expect(result.heroHeartsAfter).toBe(0);
      expect(result.defeat).toBe(true);
    });

    it('does nothing when fight is already complete', () => {
      state.isComplete = true;
      state.heroHearts = 2;
      const result = bossAutoAttack(state);
      expect(result.heroHeartsAfter).toBe(2);
    });
  });

  describe('shouldBossAttack', () => {
    it('returns false when interval has not elapsed', () => {
      const now = state.lastActionTime + 5000;
      expect(shouldBossAttack(state, 10000, now)).toBe(false);
    });

    it('returns true when interval has elapsed', () => {
      const now = state.lastActionTime + 15000;
      expect(shouldBossAttack(state, 10000, now)).toBe(true);
    });

    it('returns false when fight is complete', () => {
      state.isComplete = true;
      const now = state.lastActionTime + 99999;
      expect(shouldBossAttack(state, 10000, now)).toBe(false);
    });
  });

  describe('getRemainingSlots', () => {
    it('returns total minus placed', () => {
      expect(getRemainingSlots(state, 5)).toBe(5);
      state.nextSlotIndex = 3;
      expect(getRemainingSlots(state, 5)).toBe(2);
    });
  });

  describe('getBossHPPercent / getHeroHPPercent', () => {
    it('returns correct percentages', () => {
      expect(getBossHPPercent(state)).toBe(100);
      state.bossHP = 50;
      expect(getBossHPPercent(state)).toBe(50);

      expect(getHeroHPPercent(state)).toBe(100);
      state.heroHearts = 2;
      expect(getHeroHPPercent(state)).toBe(50);
    });
  });

  describe('property-based tests', () => {
    it('property: correct placements always reduce boss HP', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4 }),
          (slotIndex) => {
            const s = createBossFightState();
            s.nextSlotIndex = slotIndex;
            const hpBefore = s.bossHP;
            const result = placeFragment(s, CORRECT_ORDER[slotIndex], CORRECT_ORDER, TEST_FRAGMENTS);
            if (result.correct) {
              expect(s.bossHP).toBeLessThan(hpBefore);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: incorrect placements never reduce boss HP', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4 }),
          (slotIndex) => {
            const s = createBossFightState();
            s.nextSlotIndex = slotIndex;
            const hpBefore = s.bossHP;
            const wrongId = CORRECT_ORDER[(slotIndex + 2) % 5];
            placeFragment(s, wrongId, CORRECT_ORDER, TEST_FRAGMENTS);
            expect(s.bossHP).toBe(hpBefore);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: hero hearts never go below 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (attacks) => {
            const s = createBossFightState();
            for (let i = 0; i < attacks; i++) {
              bossAutoAttack(s);
            }
            expect(s.heroHearts).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('property: boss HP never goes below 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (placements) => {
            const s = createBossFightState();
            for (let i = 0; i < Math.min(placements, 5); i++) {
              placeFragment(s, CORRECT_ORDER[i], CORRECT_ORDER, TEST_FRAGMENTS);
            }
            expect(s.bossHP).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
