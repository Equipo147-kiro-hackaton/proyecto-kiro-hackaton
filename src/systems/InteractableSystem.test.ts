import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  parseInteractables,
  findInteractableInRange,
  findNearbyInteractables,
  activateInteractable,
  areAllFragmentInteractablesActivated,
  getFragmentProgress,
  type TiledObjectData,
} from './InteractableSystem';
import type { Interactable } from '@/types';

// Feature: cloud-quest-devops-dungeon, Property 1: InteractableSystem parses objects correctly
// Feature: cloud-quest-devops-dungeon, Property 2: Proximity detection is symmetric and bounded
// Feature: cloud-quest-devops-dungeon, Property 3: Activation tracking is consistent

describe('InteractableSystem', () => {
  // ─── parseInteractables ─────────────────────────────────────────────────

  describe('parseInteractables', () => {
    const sampleObjects: TiledObjectData[] = [
      {
        id: 1, name: 'spawn', type: 'spawn',
        x: 32, y: 32, width: 16, height: 16,
        properties: [{ name: 'objectType', type: 'string', value: 'spawn' }],
      },
      {
        id: 2, name: 'terminal_1', type: 'interactable',
        x: 64, y: 48, width: 16, height: 16,
        properties: [
          { name: 'objectType', type: 'string', value: 'terminal' },
          { name: 'fragmentId', type: 'string', value: 'frag-01' },
          { name: 'puzzleId', type: 'string', value: 'syn-001' },
        ],
      },
      {
        id: 3, name: 'server_1', type: 'interactable',
        x: 128, y: 96, width: 16, height: 16,
        properties: [
          { name: 'objectType', type: 'string', value: 'server' },
          { name: 'fragmentId', type: 'string', value: 'frag-02' },
          { name: 'puzzleId', type: 'string', value: 'dev-001' },
        ],
      },
      {
        id: 4, name: 'door_exit', type: 'door',
        x: 160, y: 112, width: 16, height: 16,
        properties: [
          { name: 'objectType', type: 'string', value: 'door' },
          { name: 'locked', type: 'bool', value: true },
        ],
      },
    ];

    it('parses interactable objects and ignores non-interactables (spawn)', () => {
      const result = parseInteractables(sampleObjects, 16, 16);
      // spawn is not a valid interactable type, so it should be excluded
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.type)).toEqual(['terminal', 'server', 'door']);
    });

    it('converts pixel coordinates to tile coordinates', () => {
      const result = parseInteractables(sampleObjects, 16, 16);
      expect(result[0].tileX).toBe(4);  // 64 / 16
      expect(result[0].tileY).toBe(3);  // 48 / 16
      expect(result[1].tileX).toBe(8);  // 128 / 16
      expect(result[1].tileY).toBe(6);  // 96 / 16
    });

    it('preserves fragmentId and puzzleId properties', () => {
      const result = parseInteractables(sampleObjects, 16, 16);
      expect(result[0].fragmentId).toBe('frag-01');
      expect(result[0].puzzleId).toBe('syn-001');
      expect(result[1].fragmentId).toBe('frag-02');
    });

    it('preserves locked property for doors', () => {
      const result = parseInteractables(sampleObjects, 16, 16);
      const door = result.find((r) => r.type === 'door');
      expect(door?.locked).toBe(true);
    });

    it('initializes all interactables as not activated', () => {
      const result = parseInteractables(sampleObjects, 16, 16);
      for (const obj of result) {
        expect(obj.activated).toBe(false);
      }
    });

    it('returns empty array for empty objects list', () => {
      expect(parseInteractables([], 16, 16)).toHaveLength(0);
    });

    it('handles objects without properties gracefully', () => {
      const objs: TiledObjectData[] = [
        { id: 1, name: 'orphan', type: 'unknown', x: 0, y: 0, width: 16, height: 16 },
      ];
      expect(parseInteractables(objs, 16, 16)).toHaveLength(0);
    });
  });

  // ─── findInteractableInRange ────────────────────────────────────────────

  describe('findInteractableInRange', () => {
    const interactables: Interactable[] = [
      { id: 'i1', type: 'terminal', tileX: 5, tileY: 3, fragmentId: 'f1', activated: false },
      { id: 'i2', type: 'server', tileX: 8, tileY: 6, fragmentId: 'f2', activated: false },
      { id: 'i3', type: 'door', tileX: 10, tileY: 7, locked: true, activated: false },
    ];

    it('finds interactable when hero is facing it', () => {
      // Hero at (5, 4) facing up (dy=-1) → facing tile (5, 3) where terminal is
      const result = findInteractableInRange(5, 4, 0, -1, interactables);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('i1');
    });

    it('finds interactable when hero faces right toward it', () => {
      // Hero at (7, 6) facing right (dx=1) → facing tile (8, 6) where server is
      const result = findInteractableInRange(7, 6, 1, 0, interactables);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('i2');
    });

    it('returns null when no interactable at facing tile', () => {
      // Hero at (5, 4) facing down (dy=1) → facing tile (5, 5) — nothing there
      const result = findInteractableInRange(5, 4, 0, 1, interactables);
      expect(result).toBeNull();
    });

    it('returns null when hero is not adjacent', () => {
      // Hero at (0, 0) facing right → (1, 0) — nothing there
      const result = findInteractableInRange(0, 0, 1, 0, interactables);
      expect(result).toBeNull();
    });

    it('does not find interactable behind the hero', () => {
      // Hero at (5, 2) facing up (dy=-1) → facing tile (5, 1), terminal at (5, 3)
      const result = findInteractableInRange(5, 2, 0, -1, interactables);
      expect(result).toBeNull();
    });
  });

  // ─── findNearbyInteractables ────────────────────────────────────────────

  describe('findNearbyInteractables', () => {
    const interactables: Interactable[] = [
      { id: 'i1', type: 'terminal', tileX: 5, tileY: 3, activated: false },
      { id: 'i2', type: 'server', tileX: 5, tileY: 5, activated: false },
      { id: 'i3', type: 'whiteboard', tileX: 6, tileY: 4, activated: false },
      { id: 'i4', type: 'door', tileX: 20, tileY: 20, activated: false },
    ];

    it('finds all adjacent interactables (range 1)', () => {
      // Hero at (5, 4): i1 at (5,3)=dist 1, i2 at (5,5)=dist 1, i3 at (6,4)=dist 1
      const result = findNearbyInteractables(5, 4, interactables, 1);
      expect(result).toHaveLength(3);
    });

    it('excludes distant interactables', () => {
      // Hero at (5, 4): i4 at (20,20) is too far
      const result = findNearbyInteractables(5, 4, interactables, 1);
      expect(result.find((i) => i.id === 'i4')).toBeUndefined();
    });

    it('excludes the hero tile itself (range > 0 required)', () => {
      // Hero standing on (5, 3) — i1 at same tile should NOT be found (distance = 0)
      const result = findNearbyInteractables(5, 3, interactables, 1);
      expect(result.find((i) => i.id === 'i1')).toBeUndefined();
    });

    it('returns empty array when nothing is nearby', () => {
      const result = findNearbyInteractables(0, 0, interactables, 1);
      expect(result).toHaveLength(0);
    });

    it('respects larger range', () => {
      // Hero at (5, 4), range 2: should include i4? No (20,20), but i1-i3 yes
      const result = findNearbyInteractables(5, 4, interactables, 2);
      expect(result).toHaveLength(3);
    });

    // Property: nearby count is always ≤ total interactables
    it('property: nearby count never exceeds total', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 30 }),
          fc.integer({ min: 0, max: 30 }),
          fc.integer({ min: 1, max: 5 }),
          (hx, hy, range) => {
            const nearby = findNearbyInteractables(hx, hy, interactables, range);
            expect(nearby.length).toBeLessThanOrEqual(interactables.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── activateInteractable ───────────────────────────────────────────────

  describe('activateInteractable', () => {
    it('marks an interactable as activated', () => {
      const interactables: Interactable[] = [
        { id: 'i1', type: 'terminal', tileX: 5, tileY: 3, activated: false },
        { id: 'i2', type: 'server', tileX: 8, tileY: 6, activated: false },
      ];
      const result = activateInteractable('i1', interactables);
      expect(result).toBe(true);
      expect(interactables[0].activated).toBe(true);
      expect(interactables[1].activated).toBe(false);
    });

    it('returns false for non-existent id', () => {
      const interactables: Interactable[] = [
        { id: 'i1', type: 'terminal', tileX: 5, tileY: 3, activated: false },
      ];
      expect(activateInteractable('nonexistent', interactables)).toBe(false);
    });

    it('is idempotent — activating twice keeps it activated', () => {
      const interactables: Interactable[] = [
        { id: 'i1', type: 'terminal', tileX: 5, tileY: 3, activated: false },
      ];
      activateInteractable('i1', interactables);
      activateInteractable('i1', interactables);
      expect(interactables[0].activated).toBe(true);
    });
  });

  // ─── areAllFragmentInteractablesActivated ───────────────────────────────

  describe('areAllFragmentInteractablesActivated', () => {
    it('returns true when all fragment interactables are activated', () => {
      const interactables: Interactable[] = [
        { id: 'i1', type: 'terminal', tileX: 5, tileY: 3, fragmentId: 'f1', activated: true },
        { id: 'i2', type: 'server', tileX: 8, tileY: 6, fragmentId: 'f2', activated: true },
        { id: 'i3', type: 'door', tileX: 10, tileY: 7, activated: false }, // door, no fragment
      ];
      expect(areAllFragmentInteractablesActivated(interactables)).toBe(true);
    });

    it('returns false when some fragment interactables are not activated', () => {
      const interactables: Interactable[] = [
        { id: 'i1', type: 'terminal', tileX: 5, tileY: 3, fragmentId: 'f1', activated: true },
        { id: 'i2', type: 'server', tileX: 8, tileY: 6, fragmentId: 'f2', activated: false },
      ];
      expect(areAllFragmentInteractablesActivated(interactables)).toBe(false);
    });

    it('returns true when there are no fragment interactables', () => {
      const interactables: Interactable[] = [
        { id: 'i1', type: 'door', tileX: 10, tileY: 7, activated: false },
      ];
      expect(areAllFragmentInteractablesActivated(interactables)).toBe(true);
    });

    it('returns true for empty array', () => {
      expect(areAllFragmentInteractablesActivated([])).toBe(true);
    });
  });

  // ─── getFragmentProgress ────────────────────────────────────────────────

  describe('getFragmentProgress', () => {
    it('returns correct progress counts', () => {
      const interactables: Interactable[] = [
        { id: 'i1', type: 'terminal', tileX: 5, tileY: 3, fragmentId: 'f1', activated: true },
        { id: 'i2', type: 'server', tileX: 8, tileY: 6, fragmentId: 'f2', activated: false },
        { id: 'i3', type: 'whiteboard', tileX: 2, tileY: 2, fragmentId: 'f3', activated: true },
        { id: 'i4', type: 'door', tileX: 10, tileY: 7, activated: false }, // not a fragment
      ];
      const progress = getFragmentProgress(interactables);
      expect(progress.activated).toBe(2);
      expect(progress.total).toBe(3);
    });

    it('returns 0/0 for no fragment interactables', () => {
      const interactables: Interactable[] = [
        { id: 'i1', type: 'door', tileX: 10, tileY: 7, activated: false },
      ];
      const progress = getFragmentProgress(interactables);
      expect(progress.activated).toBe(0);
      expect(progress.total).toBe(0);
    });

    // Property: activated ≤ total always
    it('property: activated count never exceeds total', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              type: fc.constantFrom('terminal', 'server', 'whiteboard') as fc.Arbitrary<'terminal' | 'server' | 'whiteboard'>,
              tileX: fc.integer({ min: 0, max: 20 }),
              tileY: fc.integer({ min: 0, max: 20 }),
              fragmentId: fc.option(fc.string(), { nil: undefined }),
              activated: fc.boolean(),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (items) => {
            const interactables: Interactable[] = items.map((item) => ({
              ...item,
              activated: item.activated ?? false,
            }));
            const progress = getFragmentProgress(interactables);
            expect(progress.activated).toBeLessThanOrEqual(progress.total);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
