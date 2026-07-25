import { describe, it, expect } from 'vitest';
import { LEVEL_DEFINITIONS, getLevelDefinition, getLevelById, getTotalLevelCount } from './levels';
import { FRAGMENT_POOL } from './fragments';

// Feature: cloud-quest-devops-dungeon, Property 1: Level definitions are consistent with fragment data
// Feature: cloud-quest-devops-dungeon, Property 2: Pipeline orders reference valid fragments

describe('Level Definitions', () => {
  describe('structure validation', () => {
    it('has 5 levels defined', () => {
      expect(LEVEL_DEFINITIONS).toHaveLength(5);
      expect(getTotalLevelCount()).toBe(5);
    });

    it('levels are numbered sequentially 1-5', () => {
      const numbers = LEVEL_DEFINITIONS.map((l) => l.levelNumber);
      expect(numbers).toEqual([1, 2, 3, 4, 5]);
    });

    it('each level has a unique ID', () => {
      const ids = LEVEL_DEFINITIONS.map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('each level has at least one puzzle category', () => {
      for (const level of LEVEL_DEFINITIONS) {
        expect(level.puzzleCategories.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('each level has at least 5 fragments', () => {
      for (const level of LEVEL_DEFINITIONS) {
        expect(level.fragmentIds.length).toBeGreaterThanOrEqual(5);
      }
    });

    it('pipeline order matches fragment IDs', () => {
      for (const level of LEVEL_DEFINITIONS) {
        expect(level.pipelineOrder).toEqual(level.fragmentIds);
      }
    });
  });

  describe('consistency with FRAGMENT_POOL', () => {
    it('every level ID matches a key in FRAGMENT_POOL', () => {
      for (const level of LEVEL_DEFINITIONS) {
        expect(FRAGMENT_POOL[level.id]).toBeDefined();
      }
    });

    it('every fragmentId in level matches a fragment in FRAGMENT_POOL', () => {
      for (const level of LEVEL_DEFINITIONS) {
        const poolFragments = FRAGMENT_POOL[level.id];
        for (const fragId of level.fragmentIds) {
          const found = poolFragments.find((f) => f.id === fragId);
          expect(found).toBeDefined();
        }
      }
    });

    it('fragment count in level matches FRAGMENT_POOL count', () => {
      for (const level of LEVEL_DEFINITIONS) {
        const poolCount = FRAGMENT_POOL[level.id].length;
        expect(level.fragmentIds.length).toBe(poolCount);
      }
    });
  });

  describe('getLevelDefinition', () => {
    it('returns level by number', () => {
      const level = getLevelDefinition(1);
      expect(level).toBeDefined();
      expect(level!.name).toContain('Office');
    });

    it('returns undefined for invalid number', () => {
      expect(getLevelDefinition(99)).toBeUndefined();
    });
  });

  describe('getLevelById', () => {
    it('returns level by ID', () => {
      const level = getLevelById('level-3');
      expect(level).toBeDefined();
      expect(level!.levelNumber).toBe(3);
    });

    it('returns undefined for invalid ID', () => {
      expect(getLevelById('nonexistent')).toBeUndefined();
    });
  });

  describe('scenario progression', () => {
    it('level 1 is office', () => {
      expect(getLevelDefinition(1)!.scenario).toBe('office');
    });

    it('levels 2-3 are server', () => {
      expect(getLevelDefinition(2)!.scenario).toBe('server');
      expect(getLevelDefinition(3)!.scenario).toBe('server');
    });

    it('levels 4-5 are cloud', () => {
      expect(getLevelDefinition(4)!.scenario).toBe('cloud');
      expect(getLevelDefinition(5)!.scenario).toBe('cloud');
    });
  });

  describe('boss fight data', () => {
    it('every level has a boss name and description', () => {
      for (const level of LEVEL_DEFINITIONS) {
        expect(level.bossName.length).toBeGreaterThan(0);
        expect(level.bossDescription.length).toBeGreaterThan(0);
      }
    });
  });
});
