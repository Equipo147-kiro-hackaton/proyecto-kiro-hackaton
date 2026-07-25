import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getDirectionDelta,
  getTargetTile,
  attemptMove,
  getFacingTile,
  areTilesAdjacent,
  areTilesInRange,
  pixelToTile,
  tileToCenterPixel,
  type MovementDirection,
  type TilePosition,
} from './MovementSystem';

// Feature: cloud-quest-devops-dungeon, Property 1: Movement direction deltas are unit vectors
// Feature: cloud-quest-devops-dungeon, Property 2: Movement respects collision data
// Feature: cloud-quest-devops-dungeon, Property 3: Adjacency is symmetric

describe('MovementSystem', () => {
  // ─── getDirectionDelta ──────────────────────────────────────────────────

  describe('getDirectionDelta', () => {
    it('returns correct deltas for all directions', () => {
      expect(getDirectionDelta('up')).toEqual({ dx: 0, dy: -1 });
      expect(getDirectionDelta('down')).toEqual({ dx: 0, dy: 1 });
      expect(getDirectionDelta('left')).toEqual({ dx: -1, dy: 0 });
      expect(getDirectionDelta('right')).toEqual({ dx: 1, dy: 0 });
    });

    // Property: all deltas have Manhattan distance of exactly 1
    it('all direction deltas have Manhattan distance of 1', () => {
      const directions: MovementDirection[] = ['up', 'down', 'left', 'right'];
      for (const dir of directions) {
        const delta = getDirectionDelta(dir);
        expect(Math.abs(delta.dx) + Math.abs(delta.dy)).toBe(1);
      }
    });
  });

  // ─── getTargetTile ──────────────────────────────────────────────────────

  describe('getTargetTile', () => {
    it('computes target correctly from origin', () => {
      expect(getTargetTile({ tileX: 5, tileY: 5 }, 'up')).toEqual({ tileX: 5, tileY: 4 });
      expect(getTargetTile({ tileX: 5, tileY: 5 }, 'down')).toEqual({ tileX: 5, tileY: 6 });
      expect(getTargetTile({ tileX: 5, tileY: 5 }, 'left')).toEqual({ tileX: 4, tileY: 5 });
      expect(getTargetTile({ tileX: 5, tileY: 5 }, 'right')).toEqual({ tileX: 6, tileY: 5 });
    });

    // Property: moving and then moving back returns to original position
    it('property: move + opposite move returns to origin', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100, max: 100 }),
          fc.integer({ min: -100, max: 100 }),
          (x, y) => {
            const start: TilePosition = { tileX: x, tileY: y };
            // Move right then left
            const afterRight = getTargetTile(start, 'right');
            const backToStart = getTargetTile(afterRight, 'left');
            expect(backToStart).toEqual(start);
            // Move down then up
            const afterDown = getTargetTile(start, 'down');
            const backToStart2 = getTargetTile(afterDown, 'up');
            expect(backToStart2).toEqual(start);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── attemptMove ────────────────────────────────────────────────────────

  describe('attemptMove', () => {
    // 5x5 map: walls on border, open center
    const collisionData = [
      2, 2, 2, 2, 2,
      2, 0, 0, 0, 2,
      2, 0, 0, 0, 2,
      2, 0, 0, 0, 2,
      2, 2, 2, 2, 2,
    ];
    const width = 5;
    const height = 5;

    it('allows movement to a walkable tile', () => {
      const result = attemptMove({ tileX: 1, tileY: 1 }, 'right', collisionData, width, height);
      expect(result.success).toBe(true);
      expect(result.newPosition).toEqual({ tileX: 2, tileY: 1 });
      expect(result.blocked).toBe(false);
    });

    it('blocks movement into a wall tile', () => {
      const result = attemptMove({ tileX: 1, tileY: 1 }, 'up', collisionData, width, height);
      expect(result.success).toBe(false);
      expect(result.newPosition).toEqual({ tileX: 1, tileY: 1 }); // stays in place
      expect(result.blocked).toBe(true);
    });

    it('blocks movement out of bounds', () => {
      const result = attemptMove({ tileX: 0, tileY: 0 }, 'left', collisionData, width, height);
      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
    });

    it('blocks movement to negative coordinates', () => {
      const result = attemptMove({ tileX: 0, tileY: 0 }, 'up', collisionData, width, height);
      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
    });

    // Property: a blocked move never changes position
    it('property: blocked moves preserve position', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4 }),
          fc.integer({ min: 0, max: 4 }),
          fc.constantFrom('up', 'down', 'left', 'right') as fc.Arbitrary<MovementDirection>,
          (x, y, dir) => {
            const start: TilePosition = { tileX: x, tileY: y };
            const result = attemptMove(start, dir, collisionData, width, height);
            if (!result.success) {
              expect(result.newPosition).toEqual(start);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property: successful move always changes position by exactly 1 tile
    it('property: successful moves change position by exactly 1 Manhattan distance', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }),
          fc.integer({ min: 1, max: 3 }),
          fc.constantFrom('up', 'down', 'left', 'right') as fc.Arbitrary<MovementDirection>,
          (x, y, dir) => {
            const start: TilePosition = { tileX: x, tileY: y };
            const result = attemptMove(start, dir, collisionData, width, height);
            if (result.success) {
              const dx = Math.abs(result.newPosition.tileX - start.tileX);
              const dy = Math.abs(result.newPosition.tileY - start.tileY);
              expect(dx + dy).toBe(1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── getFacingTile ──────────────────────────────────────────────────────

  describe('getFacingTile', () => {
    it('returns the tile in front of the entity', () => {
      expect(getFacingTile({ tileX: 3, tileY: 3 }, 'up')).toEqual({ tileX: 3, tileY: 2 });
      expect(getFacingTile({ tileX: 3, tileY: 3 }, 'right')).toEqual({ tileX: 4, tileY: 3 });
    });
  });

  // ─── areTilesAdjacent ───────────────────────────────────────────────────

  describe('areTilesAdjacent', () => {
    it('returns true for horizontally adjacent tiles', () => {
      expect(areTilesAdjacent({ tileX: 3, tileY: 5 }, { tileX: 4, tileY: 5 })).toBe(true);
    });

    it('returns true for vertically adjacent tiles', () => {
      expect(areTilesAdjacent({ tileX: 3, tileY: 5 }, { tileX: 3, tileY: 6 })).toBe(true);
    });

    it('returns false for diagonal tiles', () => {
      expect(areTilesAdjacent({ tileX: 3, tileY: 5 }, { tileX: 4, tileY: 6 })).toBe(false);
    });

    it('returns false for same tile', () => {
      expect(areTilesAdjacent({ tileX: 3, tileY: 3 }, { tileX: 3, tileY: 3 })).toBe(false);
    });

    it('returns false for distant tiles', () => {
      expect(areTilesAdjacent({ tileX: 0, tileY: 0 }, { tileX: 5, tileY: 5 })).toBe(false);
    });

    // Property: adjacency is symmetric
    it('property: adjacency is symmetric', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (x1, y1, x2, y2) => {
            const a: TilePosition = { tileX: x1, tileY: y1 };
            const b: TilePosition = { tileX: x2, tileY: y2 };
            expect(areTilesAdjacent(a, b)).toBe(areTilesAdjacent(b, a));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ─── areTilesInRange ────────────────────────────────────────────────────

  describe('areTilesInRange', () => {
    it('returns true for tiles within range', () => {
      expect(areTilesInRange({ tileX: 5, tileY: 5 }, { tileX: 6, tileY: 6 }, 1)).toBe(true);
      expect(areTilesInRange({ tileX: 5, tileY: 5 }, { tileX: 7, tileY: 5 }, 2)).toBe(true);
    });

    it('returns false for tiles out of range', () => {
      expect(areTilesInRange({ tileX: 0, tileY: 0 }, { tileX: 3, tileY: 3 }, 2)).toBe(false);
    });

    it('range 0 only matches same tile', () => {
      expect(areTilesInRange({ tileX: 5, tileY: 5 }, { tileX: 5, tileY: 5 }, 0)).toBe(true);
      expect(areTilesInRange({ tileX: 5, tileY: 5 }, { tileX: 6, tileY: 5 }, 0)).toBe(false);
    });
  });

  // ─── pixelToTile / tileToCenterPixel ────────────────────────────────────

  describe('pixelToTile', () => {
    it('converts pixel positions to tile coordinates', () => {
      expect(pixelToTile(0, 0, 16)).toEqual({ tileX: 0, tileY: 0 });
      expect(pixelToTile(8, 8, 16)).toEqual({ tileX: 0, tileY: 0 });
      expect(pixelToTile(16, 16, 16)).toEqual({ tileX: 1, tileY: 1 });
      expect(pixelToTile(31, 31, 16)).toEqual({ tileX: 1, tileY: 1 });
    });
  });

  describe('tileToCenterPixel', () => {
    it('returns the center pixel of a tile', () => {
      expect(tileToCenterPixel(0, 0, 16)).toEqual({ pixelX: 8, pixelY: 8 });
      expect(tileToCenterPixel(1, 1, 16)).toEqual({ pixelX: 24, pixelY: 24 });
      expect(tileToCenterPixel(3, 5, 16)).toEqual({ pixelX: 56, pixelY: 88 });
    });

    // Property: tileToCenterPixel is always within the tile bounds
    it('property: center pixel is always within tile bounds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50 }),
          fc.integer({ min: 0, max: 50 }),
          fc.constantFrom(8, 16, 32) as fc.Arbitrary<number>,
          (tx, ty, tileSize) => {
            const { pixelX, pixelY } = tileToCenterPixel(tx, ty, tileSize);
            expect(pixelX).toBeGreaterThanOrEqual(tx * tileSize);
            expect(pixelX).toBeLessThan((tx + 1) * tileSize);
            expect(pixelY).toBeGreaterThanOrEqual(ty * tileSize);
            expect(pixelY).toBeLessThan((ty + 1) * tileSize);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
