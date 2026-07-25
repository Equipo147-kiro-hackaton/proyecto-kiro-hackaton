import { describe, it, expect } from 'vitest';
import {
  getMapConfig,
  getAvailableLevels,
  getTotalLevels,
  getScenarioForLevel,
  getUniqueTilesets,
  getUniqueMaps,
} from './MapLoader';

// Feature: cloud-quest-devops-dungeon, Property 1: MapLoader provides correct configs per level

describe('MapLoader', () => {
  describe('getMapConfig', () => {
    it('returns config for level 1 (office)', () => {
      const config = getMapConfig(1);
      expect(config).not.toBeNull();
      expect(config!.scenario).toBe('office');
      expect(config!.levelId).toBe('level-1');
      expect(config!.mapPath).toContain('office');
    });

    it('returns config for level 2 (server)', () => {
      const config = getMapConfig(2);
      expect(config).not.toBeNull();
      expect(config!.scenario).toBe('server');
      expect(config!.levelId).toBe('level-2');
    });

    it('returns config for level 4 (cloud)', () => {
      const config = getMapConfig(4);
      expect(config).not.toBeNull();
      expect(config!.scenario).toBe('cloud');
      expect(config!.levelId).toBe('level-4');
    });

    it('returns null for non-existent level', () => {
      expect(getMapConfig(99)).toBeNull();
      expect(getMapConfig(0)).toBeNull();
    });

    it('all configs have required fields', () => {
      for (const level of getAvailableLevels()) {
        const config = getMapConfig(level);
        expect(config).not.toBeNull();
        expect(config!.mapKey).toBeTruthy();
        expect(config!.mapPath).toBeTruthy();
        expect(config!.tilesetKey).toBeTruthy();
        expect(config!.tilesetPath).toBeTruthy();
        expect(config!.tilesetName).toBeTruthy();
        expect(config!.scenario).toBeTruthy();
        expect(config!.displayName).toBeTruthy();
        expect(config!.levelId).toBeTruthy();
      }
    });
  });

  describe('getAvailableLevels', () => {
    it('returns levels 1-5 in order', () => {
      const levels = getAvailableLevels();
      expect(levels).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('getTotalLevels', () => {
    it('returns 5', () => {
      expect(getTotalLevels()).toBe(5);
    });
  });

  describe('getScenarioForLevel', () => {
    it('maps levels to correct scenarios', () => {
      expect(getScenarioForLevel(1)).toBe('office');
      expect(getScenarioForLevel(2)).toBe('server');
      expect(getScenarioForLevel(3)).toBe('server');
      expect(getScenarioForLevel(4)).toBe('cloud');
      expect(getScenarioForLevel(5)).toBe('cloud');
    });

    it('returns null for invalid level', () => {
      expect(getScenarioForLevel(0)).toBeNull();
    });
  });

  describe('getUniqueTilesets', () => {
    it('returns 3 unique tilesets (office, server, cloud)', () => {
      const tilesets = getUniqueTilesets();
      expect(tilesets).toHaveLength(3);
      const keys = tilesets.map((t) => t.key);
      expect(keys).toContain('tiles-office');
      expect(keys).toContain('tiles-server');
      expect(keys).toContain('tiles-cloud');
    });

    it('all paths point to PNG files', () => {
      for (const tileset of getUniqueTilesets()) {
        expect(tileset.path).toMatch(/\.png$/);
      }
    });
  });

  describe('getUniqueMaps', () => {
    it('returns deduplicated map entries', () => {
      const maps = getUniqueMaps();
      // Levels 2&3 share a map, levels 4&5 share a map
      expect(maps.length).toBeLessThanOrEqual(5);
      expect(maps.length).toBeGreaterThanOrEqual(3);
    });

    it('all paths point to JSON files', () => {
      for (const map of getUniqueMaps()) {
        expect(map.path).toMatch(/\.json$/);
      }
    });
  });
});
