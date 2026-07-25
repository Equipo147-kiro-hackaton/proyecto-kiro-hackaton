import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { FragmentSystem } from './FragmentSystem';
import { FRAGMENT_POOL, getAvailableLevelIds, getPipelineOrder } from '@/data/fragments';

// Feature: cloud-quest-devops-dungeon, Property 1: Fragment weights sum to 100 per level
// Feature: cloud-quest-devops-dungeon, Property 2: Collecting all fragments marks level complete
// Feature: cloud-quest-devops-dungeon, Property 3: Boss weight calculation preserves critical multiplier

describe('FragmentSystem', () => {
  let system: FragmentSystem;

  beforeEach(() => {
    system = new FragmentSystem();
  });

  // ─── getFragmentsForLevel ───────────────────────────────────────────────

  describe('getFragmentsForLevel', () => {
    it('returns fragments for existing levels', () => {
      const fragments = system.getFragmentsForLevel('level-1');
      expect(fragments.length).toBeGreaterThanOrEqual(5);
    });

    it('returns empty array for non-existent level', () => {
      expect(system.getFragmentsForLevel('nonexistent')).toHaveLength(0);
    });

    it('each fragment has required fields', () => {
      const fragments = system.getFragmentsForLevel('level-1');
      for (const f of fragments) {
        expect(f.id).toBeTruthy();
        expect(f.levelId).toBe('level-1');
        expect(f.order).toBeGreaterThan(0);
        expect(f.content).toBeTruthy();
        expect(f.description).toBeTruthy();
        expect(f.difficulty).toBeGreaterThanOrEqual(1);
        expect(f.difficulty).toBeLessThanOrEqual(3);
        expect(f.weight).toBeGreaterThan(0);
        expect(typeof f.isCritical).toBe('boolean');
      }
    });
  });

  // ─── Weight validation (Property-based) ─────────────────────────────────

  describe('fragment weight validation', () => {
    // Property: weights for each level sum to exactly 100
    it('property: weights sum to 100 for every level', () => {
      const levelIds = getAvailableLevelIds();
      for (const levelId of levelIds) {
        const fragments = FRAGMENT_POOL[levelId];
        const totalWeight = fragments.reduce((sum, f) => sum + f.weight, 0);
        expect(totalWeight).toBe(100);
      }
    });

    // Property: every level has at least one critical fragment
    it('property: every level has at least one critical fragment', () => {
      const levelIds = getAvailableLevelIds();
      for (const levelId of levelIds) {
        const fragments = FRAGMENT_POOL[levelId];
        const criticals = fragments.filter((f) => f.isCritical);
        expect(criticals.length).toBeGreaterThanOrEqual(1);
      }
    });

    // Property: fragment orders are sequential (1, 2, 3, ...)
    it('property: fragment orders form a sequential sequence', () => {
      const levelIds = getAvailableLevelIds();
      for (const levelId of levelIds) {
        const fragments = FRAGMENT_POOL[levelId];
        const orders = fragments.map((f) => f.order).sort((a, b) => a - b);
        for (let i = 0; i < orders.length; i++) {
          expect(orders[i]).toBe(i + 1);
        }
      }
    });

    // Property: fragment IDs are unique within a level
    it('property: fragment IDs are unique within each level', () => {
      const levelIds = getAvailableLevelIds();
      for (const levelId of levelIds) {
        const fragments = FRAGMENT_POOL[levelId];
        const ids = fragments.map((f) => f.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }
    });

    // Property: fragment IDs are globally unique
    it('property: fragment IDs are globally unique', () => {
      const allIds: string[] = [];
      for (const levelId of getAvailableLevelIds()) {
        for (const f of FRAGMENT_POOL[levelId]) {
          allIds.push(f.id);
        }
      }
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });
  });

  // ─── initLevel & collectFragment ────────────────────────────────────────

  describe('initLevel & collectFragment', () => {
    it('initLevel creates tracking states for all fragments', () => {
      system.initLevel('level-1');
      const progress = system.getLevelProgress('level-1');
      expect(progress.totalRequired).toBe(5);
      expect(progress.collected).toHaveLength(5);
      expect(progress.isComplete).toBe(false);
    });

    it('collectFragment marks a fragment as collected', () => {
      system.initLevel('level-1');
      const result = system.collectFragment('frag-l1-01');
      expect(result).toBe(true);
      expect(system.isFragmentCollected('frag-l1-01')).toBe(true);
    });

    it('collectFragment returns false for unknown fragment', () => {
      system.initLevel('level-1');
      expect(system.collectFragment('nonexistent')).toBe(false);
    });

    it('collecting all fragments marks level as complete', () => {
      system.initLevel('level-1');
      const fragments = system.getFragmentsForLevel('level-1');
      for (const f of fragments) {
        system.collectFragment(f.id);
      }
      expect(system.isLevelComplete('level-1')).toBe(true);
    });

    it('partial collection does not mark level as complete', () => {
      system.initLevel('level-1');
      system.collectFragment('frag-l1-01');
      system.collectFragment('frag-l1-02');
      expect(system.isLevelComplete('level-1')).toBe(false);
    });

    // Property: collecting all fragments always results in isComplete = true
    it('property: collecting all fragments completes the level', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getAvailableLevelIds()),
          (levelId) => {
            const s = new FragmentSystem();
            s.initLevel(levelId);
            const fragments = s.getFragmentsForLevel(levelId);
            for (const f of fragments) {
              s.collectFragment(f.id);
            }
            expect(s.isLevelComplete(levelId)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── isLevelComplete ────────────────────────────────────────────────────

  describe('isLevelComplete', () => {
    it('returns false for uninitialized level', () => {
      expect(system.isLevelComplete('level-1')).toBe(false);
    });

    it('returns false immediately after init', () => {
      system.initLevel('level-2');
      expect(system.isLevelComplete('level-2')).toBe(false);
    });
  });

  // ─── getCollectedFragments ──────────────────────────────────────────────

  describe('getCollectedFragments', () => {
    it('returns only collected fragments', () => {
      system.initLevel('level-1');
      system.collectFragment('frag-l1-01');
      system.collectFragment('frag-l1-03');

      const collected = system.getCollectedFragments('level-1');
      expect(collected).toHaveLength(2);
      expect(collected[0].id).toBe('frag-l1-01');
      expect(collected[1].id).toBe('frag-l1-03');
    });

    it('returns empty array for uninitialized level', () => {
      expect(system.getCollectedFragments('level-1')).toHaveLength(0);
    });
  });

  // ─── calculateBossWeights ───────────────────────────────────────────────

  describe('calculateBossWeights', () => {
    it('applies ×1.5 multiplier to critical fragments', () => {
      system.initLevel('level-1');
      // Collect all
      const fragments = system.getFragmentsForLevel('level-1');
      for (const f of fragments) {
        system.collectFragment(f.id);
      }

      const weights = system.calculateBossWeights('level-1');
      
      for (const w of weights) {
        if (w.fragment.isCritical) {
          expect(w.effectiveWeight).toBe(Math.round(w.fragment.weight * 1.5));
        } else {
          expect(w.effectiveWeight).toBe(w.fragment.weight);
        }
      }
    });

    it('returns weights only for collected fragments', () => {
      system.initLevel('level-1');
      system.collectFragment('frag-l1-01');
      system.collectFragment('frag-l1-04'); // critical

      const weights = system.calculateBossWeights('level-1');
      expect(weights).toHaveLength(2);
    });

    // Property: effective weight ≥ base weight for all fragments
    it('property: effective weight >= base weight always', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getAvailableLevelIds()),
          (levelId) => {
            const s = new FragmentSystem();
            s.initLevel(levelId);
            const fragments = s.getFragmentsForLevel(levelId);
            for (const f of fragments) {
              s.collectFragment(f.id);
            }
            const weights = s.calculateBossWeights(levelId);
            for (const w of weights) {
              expect(w.effectiveWeight).toBeGreaterThanOrEqual(w.fragment.weight);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── validateOrder ──────────────────────────────────────────────────────

  describe('validateOrder', () => {
    it('marks all positions correct for correct order', () => {
      const fragments = system.getFragmentsForLevel('level-1');
      const correctOrder = fragments
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((f) => f.id);

      const result = system.validateOrder('level-1', correctOrder);
      expect(result.every((r) => r.isCorrect)).toBe(true);
    });

    it('marks incorrect positions for wrong order', () => {
      const fragments = system.getFragmentsForLevel('level-1');
      const reversedOrder = fragments
        .slice()
        .sort((a, b) => b.order - a.order) // reverse
        .map((f) => f.id);

      const result = system.validateOrder('level-1', reversedOrder);
      // At least the first position should be incorrect (since reversed)
      expect(result[0].isCorrect).toBe(false);
    });

    it('handles empty input', () => {
      const result = system.validateOrder('level-1', []);
      expect(result).toHaveLength(0);
    });
  });

  // ─── isPlacementCorrect ─────────────────────────────────────────────────

  describe('isPlacementCorrect', () => {
    it('returns true for correct placement at position', () => {
      expect(system.isPlacementCorrect('level-1', 'frag-l1-01', 0)).toBe(true);
      expect(system.isPlacementCorrect('level-1', 'frag-l1-02', 1)).toBe(true);
    });

    it('returns false for incorrect placement', () => {
      expect(system.isPlacementCorrect('level-1', 'frag-l1-05', 0)).toBe(false);
    });

    it('returns false for out-of-bounds position', () => {
      expect(system.isPlacementCorrect('level-1', 'frag-l1-01', 99)).toBe(false);
      expect(system.isPlacementCorrect('level-1', 'frag-l1-01', -1)).toBe(false);
    });
  });

  // ─── getTotalWeight ─────────────────────────────────────────────────────

  describe('getTotalWeight', () => {
    it('returns 100 for all valid levels', () => {
      for (const levelId of getAvailableLevelIds()) {
        expect(system.getTotalWeight(levelId)).toBe(100);
      }
    });

    it('returns 0 for non-existent level', () => {
      expect(system.getTotalWeight('nonexistent')).toBe(0);
    });
  });

  // ─── reset ──────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('clears all collected fragment states', () => {
      system.initLevel('level-1');
      system.collectFragment('frag-l1-01');
      system.reset();
      expect(system.isFragmentCollected('frag-l1-01')).toBe(false);
      expect(system.isLevelComplete('level-1')).toBe(false);
    });

    it('resetLevel only clears specified level', () => {
      system.initLevel('level-1');
      system.initLevel('level-2');
      system.collectFragment('frag-l1-01');
      system.collectFragment('frag-l2-01');

      system.resetLevel('level-1');

      expect(system.isFragmentCollected('frag-l1-01')).toBe(false);
      expect(system.isFragmentCollected('frag-l2-01')).toBe(true);
    });
  });

  // ─── getPipelineOrder helper ────────────────────────────────────────────

  describe('getPipelineOrder (data helper)', () => {
    it('returns ordered content strings for a level', () => {
      const order = getPipelineOrder('level-1');
      expect(order).toHaveLength(5);
      expect(order[0]).toBe('git checkout -b feature');
      expect(order[4]).toBe('merge to main');
    });

    it('returns empty array for non-existent level', () => {
      expect(getPipelineOrder('nonexistent')).toHaveLength(0);
    });
  });
});
