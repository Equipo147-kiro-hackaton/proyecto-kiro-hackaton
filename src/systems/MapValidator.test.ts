import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateFloor, reachableFrom } from '@/systems/MapValidator';
import { generateFloor } from '@/systems/LayoutSystem';
import type { FloorDescriptor } from '@/types';
import type { ThemeId } from '@/systems/ThemeSystem';

/** Reference BFS implementation independent of production code. */
function referenceBfs(
  collision: readonly number[],
  width: number,
  height: number,
  startRow: number,
  startCol: number,
): Set<number> {
  const visited = new Set<number>();
  const startIdx = startRow * width + startCol;
  if (startRow < 0 || startRow >= height || startCol < 0 || startCol >= width) return visited;
  if (collision[startIdx] !== 0) return visited;
  visited.add(startIdx);
  const queue = [startIdx];
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
      queue.push(ni);
    }
  }
  return visited;
}

describe('MapValidator', () => {
  const arbDifficulty = fc.constantFrom<ThemeId>('beginner', 'normal', 'hard');
  const arbLevel = fc.integer({ min: 1, max: 5 });
  const arbSeed = fc.integer({ min: 0, max: 2147483647 });

  // Feature: dungeon-visual-overhaul, Property 10: El validador reporta una violación por incumplimiento
  it('reports violations for mutated descriptors that break checks', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const { floor } = generateFloor({ difficulty, levelNumber: level, seed });

        // Mutation 1: open a perimeter tile
        const mutated1: FloorDescriptor = {
          ...floor,
          collision: [...floor.collision],
        };
        mutated1.collision[0] = 0;
        const result1 = validateFloor(mutated1);
        expect(result1.valid).toBe(false);
        expect(result1.violations.some((v) => v.check === 'perimeter-blocking')).toBe(true);

        // Mutation 2: make spawn tile blocking
        const mutated2: FloorDescriptor = {
          ...floor,
          collision: [...floor.collision],
        };
        const spawnIdx = floor.spawn.row * floor.width + floor.spawn.column;
        mutated2.collision[spawnIdx] = 99;
        const result2 = validateFloor(mutated2);
        expect(result2.valid).toBe(false);
        expect(result2.violations.some((v) => v.check === 'spawn-walkable')).toBe(true);

        // Mutation 3: wall off an objective
        if (floor.objectives.length > 0) {
          const mutated3: FloorDescriptor = {
            ...floor,
            collision: [...floor.collision],
          };
          const obj = floor.objectives[0];
          const objIdx = obj.tile.row * floor.width + obj.tile.column;
          mutated3.collision[objIdx] = 99;
          const result3 = validateFloor(mutated3);
          expect(result3.valid).toBe(false);
          expect(result3.violations.some((v) => v.check === 'objective-walkable')).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 11: El validador no lanza ante descriptores estructuralmente inválidos
  it('does not throw for structurally invalid descriptors, returns violations', () => {
    fc.assert(
      fc.property(arbSeed, (seed) => {
        const badLength: FloorDescriptor = {
          levelNumber: 1,
          difficulty: 'normal',
          themeId: 'normal',
          seed,
          width: 14,
          height: 11,
          ground: new Array(100).fill(0),
          propsLayer: new Array(100).fill(0),
          collision: new Array(100).fill(0),
          rooms: [],
          corridors: [],
          spawn: { row: 2, column: 2 },
          objectives: [],
          props: [],
          circuitPaths: [],
        };
        const r1 = validateFloor(badLength);
        expect(r1.valid).toBe(false);
        expect(r1.violations.some((v) => v.check === 'collision-length')).toBe(true);

        const badDims: FloorDescriptor = {
          levelNumber: 1,
          difficulty: 'normal',
          themeId: 'normal',
          seed,
          width: 5,
          height: 5,
          ground: new Array(25).fill(0),
          propsLayer: new Array(25).fill(0),
          collision: new Array(25).fill(0),
          rooms: [],
          corridors: [],
          spawn: { row: 2, column: 2 },
          objectives: [],
          props: [],
          circuitPaths: [],
        };
        const r2 = validateFloor(badDims);
        expect(r2.valid).toBe(false);
        expect(r2.violations.some((v) => v.check === 'dimensions')).toBe(true);

        const badSpawn: FloorDescriptor = {
          levelNumber: 1,
          difficulty: 'normal',
          themeId: 'normal',
          seed,
          width: 14,
          height: 11,
          ground: new Array(154).fill(0),
          propsLayer: new Array(154).fill(0),
          collision: new Array(154).fill(27),
          rooms: [],
          corridors: [],
          spawn: { row: 99, column: 99 },
          objectives: [],
          props: [],
          circuitPaths: [],
        };
        const r3 = validateFloor(badSpawn);
        expect(r3.valid).toBe(false);
        expect(r3.violations.some((v) => v.check === 'spawn-in-bounds')).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // Verify reachableFrom matches reference BFS
  it('reachableFrom matches reference BFS implementation', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const { floor } = generateFloor({ difficulty, levelNumber: level, seed });
        const production = reachableFrom(
          floor.collision, floor.width, floor.height,
          floor.spawn.row, floor.spawn.column,
        );
        const reference = referenceBfs(
          floor.collision, floor.width, floor.height,
          floor.spawn.row, floor.spawn.column,
        );
        expect(production.size).toBe(reference.size);
        for (const idx of production) {
          expect(reference.has(idx)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
