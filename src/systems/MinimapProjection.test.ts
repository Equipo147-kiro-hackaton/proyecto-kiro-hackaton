import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeMinimapScale,
  projectMinimap,
  discoveredAround,
  selectActiveObjective,
  MINIMAP_MAX_PX,
  MINIMAP_MARGIN_PX,
} from '@/systems/MinimapProjection';
import type { Objective, TileRef } from '@/types';

describe('MinimapProjection', () => {
  const arbWidth = fc.integer({ min: 10, max: 40 });
  const arbHeight = fc.integer({ min: 10, max: 40 });

  // Feature: dungeon-visual-overhaul, Property 39: Proyección dentro de límites
  it('cells are within 120x120 bounds at correct position for valid maps', () => {
    fc.assert(
      fc.property(arbWidth, arbHeight, (width, height) => {
        const collision = new Array(width * height).fill(0);
        for (let c = 0; c < width; c++) { collision[c] = 27; collision[(height - 1) * width + c] = 27; }
        for (let r = 0; r < height; r++) { collision[r * width] = 27; collision[r * width + width - 1] = 27; }

        const discovered = new Set<number>();
        for (let i = 0; i < collision.length; i++) discovered.add(i);

        const result = projectMinimap({ width, height, collision, discovered, heroTile: { row: 2, column: 2 }, objectives: [] });

        expect(result.scale).toBe(computeMinimapScale(width, height));

        for (const cell of result.cells) {
          expect(cell.x).toBeGreaterThanOrEqual(MINIMAP_MARGIN_PX);
          expect(cell.x + cell.size).toBeLessThanOrEqual(MINIMAP_MARGIN_PX + MINIMAP_MAX_PX);
          expect(cell.y).toBeGreaterThanOrEqual(0);
          expect(cell.y + cell.size).toBeLessThanOrEqual(540);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 40: Solo tiles descubiertos
  it('only discovered tiles appear as walkable/blocking cells', () => {
    fc.assert(
      fc.property(arbWidth, arbHeight, fc.integer({ min: 0, max: 100 }), (width, height, count) => {
        const collision = new Array(width * height).fill(0);
        const discovered = new Set<number>();
        for (let i = 0; i < Math.min(count, collision.length); i++) discovered.add(i);

        const result = projectMinimap({ width, height, collision, discovered, heroTile: { row: 1, column: 1 }, objectives: [] });

        const tileCells = result.cells.filter((c) => c.kind === 'walkable' || c.kind === 'blocking');
        for (const cell of tileCells) {
          const c = Math.floor((cell.x - result.originX) / result.scale);
          const r = Math.floor((cell.y - result.originY) / result.scale);
          expect(discovered.has(r * width + c)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 41: Descubrimiento por Chebyshev
  it('discoveredAround returns exactly the Chebyshev <= 3 neighborhood', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 40 }),
        fc.integer({ min: 10, max: 40 }),
        fc.integer({ min: 0, max: 39 }),
        fc.integer({ min: 0, max: 39 }),
        (width, height, heroRow, heroCol) => {
          const hr = Math.min(heroRow, height - 1);
          const hc = Math.min(heroCol, width - 1);
          const indices = discoveredAround({ row: hr, column: hc }, 3, width, height);

          for (const idx of indices) {
            const r = Math.floor(idx / width);
            const c = idx % width;
            expect(Math.max(Math.abs(r - hr), Math.abs(c - hc))).toBeLessThanOrEqual(3);
          }

          const idxSet = new Set(indices);
          for (let dr = -3; dr <= 3; dr++) {
            for (let dc = -3; dc <= 3; dc++) {
              const r = hr + dr;
              const c = hc + dc;
              if (r >= 0 && r < height && c >= 0 && c < width) {
                expect(idxSet.has(r * width + c)).toBe(true);
              }
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 42: Selección del objetivo activo
  it('selectActiveObjective picks closest by Manhattan, ties by row then col', () => {
    const heroTile: TileRef = { row: 5, column: 5 };
    const width = 20;
    const objectives: Objective[] = [
      { id: 'obj-0', type: 'terminal', tile: { row: 5, column: 8 }, roomId: 'r0', activated: false },
      { id: 'obj-1', type: 'terminal', tile: { row: 3, column: 5 }, roomId: 'r0', activated: false },
      { id: 'obj-2', type: 'door', tile: { row: 10, column: 10 }, roomId: 'r1', activated: false },
    ];
    const discovered = new Set(objectives.map((o) => o.tile.row * width + o.tile.column));

    expect(selectActiveObjective(objectives, heroTile, discovered, width)?.id).toBe('obj-1');

    objectives[1].activated = true;
    expect(selectActiveObjective(objectives, heroTile, discovered, width)?.id).toBe('obj-0');

    // Undiscovered objectives are skipped
    objectives[1].activated = false;
    const partial = new Set([objectives[2].tile.row * width + objectives[2].tile.column]);
    expect(selectActiveObjective(objectives, heroTile, partial, width)?.id).toBe('obj-2');

    // No qualifying objectives → null
    expect(selectActiveObjective(objectives, heroTile, new Set(), width)).toBeNull();
  });

  // Feature: dungeon-visual-overhaul, Property 43: Proyección vacía para dimensiones fuera de rango
  it('returns empty projection for out-of-range dimensions', () => {
    for (const { width, height } of [{ width: 0, height: 10 }, { width: 41, height: 20 }, { width: -1, height: 10 }]) {
      const result = projectMinimap({ width, height, collision: [], discovered: new Set(), heroTile: { row: 0, column: 0 }, objectives: [] });
      expect(result.cells).toHaveLength(0);
      expect(result.scale).toBe(0);
    }
  });
});
