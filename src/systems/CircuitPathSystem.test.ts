import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildCircuitPaths, maxCircuitLength, circuitTileColor } from '@/systems/CircuitPathSystem';
import { generateFloor } from '@/systems/LayoutSystem';
import type { ThemeId } from '@/systems/ThemeSystem';
import type { FloorDescriptor, TileRef } from '@/types';

/** Reference BFS shortest path length, independent of production code. */
function referenceShortestLength(
  collision: readonly number[],
  width: number,
  height: number,
  from: TileRef,
  to: TileRef,
): number | null {
  if (from.row === to.row && from.column === to.column) return 1;
  const fromIdx = from.row * width + from.column;
  const toIdx = to.row * width + to.column;
  if (collision[fromIdx] !== 0 || collision[toIdx] !== 0) return null;
  const visited = new Set<number>([fromIdx]);
  const dist = new Map<number, number>([[fromIdx, 1]]);
  const queue = [fromIdx];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const r = Math.floor(idx / width);
    const c = idx % width;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
      const ni = nr * width + nc;
      if (collision[ni] !== 0 || visited.has(ni)) continue;
      visited.add(ni);
      dist.set(ni, (dist.get(idx) ?? 0) + 1);
      if (ni === toIdx) return dist.get(ni)!;
      queue.push(ni);
    }
  }
  return null;
}

describe('CircuitPathSystem', () => {
  const arbDifficulty = fc.constantFrom<ThemeId>('beginner', 'normal', 'hard');
  const arbLevel = fc.integer({ min: 1, max: 5 });
  const arbSeed = fc.integer({ min: 0, max: 2147483647 });

  function buildFloor(difficulty: ThemeId, level: number, seed: number): FloorDescriptor {
    return generateFloor({ difficulty, levelNumber: level, seed }).floor;
  }

  // Feature: dungeon-visual-overhaul, Property 18: Todo circuit path está bien formado
  it('each circuit path starts at spawn, ends at objective, is walkable and cardinal-adjacent', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const floor = buildFloor(difficulty, level, seed);
        const { paths } = buildCircuitPaths(floor);

        const reachableObjectives = floor.objectives.filter((o) => {
          const idx = o.tile.row * floor.width + o.tile.column;
          return floor.collision[idx] === 0;
        });
        expect(paths.length).toBe(reachableObjectives.length);

        for (const path of paths) {
          const obj = floor.objectives.find((o) => o.id === path.objectiveId);
          expect(obj).toBeDefined();

          expect(path.tiles[0]).toEqual(floor.spawn);
          expect(path.tiles[path.tiles.length - 1]).toEqual(obj!.tile);

          for (const t of path.tiles) {
            expect(t.row).toBeGreaterThanOrEqual(0);
            expect(t.row).toBeLessThan(floor.height);
            expect(t.column).toBeGreaterThanOrEqual(0);
            expect(t.column).toBeLessThan(floor.width);
            expect(floor.collision[t.row * floor.width + t.column]).toBe(0);
          }

          for (let i = 1; i < path.tiles.length; i++) {
            const prev = path.tiles[i - 1];
            const curr = path.tiles[i];
            const dr = Math.abs(curr.row - prev.row);
            const dc = Math.abs(curr.column - prev.column);
            expect(dr + dc).toBe(1);
          }

          const indices = path.tiles.map((t) => t.row * floor.width + t.column);
          expect(new Set(indices).size).toBe(indices.length);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 19: Cota de longitud de los circuit paths
  it('circuit path length <= floor(1.5 * shortest path length)', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const floor = buildFloor(difficulty, level, seed);
        const { paths } = buildCircuitPaths(floor);

        for (const path of paths) {
          const obj = floor.objectives.find((o) => o.id === path.objectiveId)!;
          const refLen = referenceShortestLength(
            floor.collision, floor.width, floor.height,
            floor.spawn, obj.tile,
          );
          if (refLen !== null) {
            expect(path.tiles.length).toBeLessThanOrEqual(maxCircuitLength(refLen));
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 20: Determinismo del CircuitPathSystem
  it('two buildCircuitPaths calls with same floor produce identical results', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const floor = buildFloor(difficulty, level, seed);
        const a = buildCircuitPaths(floor);
        const b = buildCircuitPaths(floor);

        expect(a.paths.length).toBe(b.paths.length);
        for (let i = 0; i < a.paths.length; i++) {
          expect(a.paths[i].objectiveId).toBe(b.paths[i].objectiveId);
          expect(a.paths[i].tiles).toEqual(b.paths[i].tiles);
        }
        expect(a.violations).toEqual(b.violations);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 21: Objetivo inalcanzable en la construcción de circuitos
  it('walling off an objective omits its circuit and reports a violation', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const floor = buildFloor(difficulty, level, seed);
        if (floor.objectives.length === 0) return;

        const target = floor.objectives[0];
        const mutated: FloorDescriptor = { ...floor, collision: [...floor.collision] };
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
          const nr = target.tile.row + dr;
          const nc = target.tile.column + dc;
          if (nr >= 0 && nr < floor.height && nc >= 0 && nc < floor.width) {
            mutated.collision[nr * floor.width + nc] = 99;
          }
        }

        const { paths, violations } = buildCircuitPaths(mutated);

        const hasWalledPath = paths.some((p) => p.objectiveId === target.id);
        expect(hasWalledPath).toBe(false);

        expect(violations.some((v) =>
          v.row === target.tile.row && v.column === target.tile.column,
        )).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 22: Color de un tile compartido por varios circuitos
  it('shared tile shows primary if any circuit leads to non-activated objective', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const floor = buildFloor(difficulty, level, seed);
        const { paths } = buildCircuitPaths(floor);
        if (paths.length < 2) return;

        const activated = new Set<string>();
        const spawnTile = floor.spawn;
        const color = circuitTileColor(spawnTile, paths, activated);
        expect(color).toBe('primary');

        const allActivated = new Set(paths.map((p) => p.objectiveId));
        const colorAll = circuitTileColor(spawnTile, paths, allActivated);
        expect(colorAll).toBe('secondary');

        if (paths.length >= 2) {
          const partial = new Set([paths[0].objectiveId]);
          const colorPartial = circuitTileColor(spawnTile, paths, partial);
          expect(colorPartial).toBe('primary');
        }
      }),
      { numRuns: 100 },
    );
  });
});
