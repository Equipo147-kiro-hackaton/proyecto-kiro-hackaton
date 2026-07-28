import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildFloor } from '@/systems/MapPipeline';
import type { ThemeId } from '@/systems/ThemeSystem';

describe('MapPipeline', () => {
  const arbDifficulty = fc.constantFrom<ThemeId>('beginner', 'normal', 'hard');
  const arbLevel = fc.integer({ min: 1, max: 5 });
  const arbSeed = fc.integer({ min: 0, max: 2147483647 });

  /** Reference BFS independent of production code. */
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

  // Feature: dungeon-visual-overhaul, Property 6: El spawn es siempre caminable y pertenece a la sala de inicio
  it('spawn is always walkable and belongs to the start room', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const { floor } = buildFloor({ difficulty, levelNumber: level, seed });

        const spawnIdx = floor.spawn.row * floor.width + floor.spawn.column;
        expect(floor.collision[spawnIdx]).toBe(0);

        const startRoom = floor.rooms.find((r) => r.role === 'start');
        expect(startRoom).toBeDefined();
        const inStart =
          floor.spawn.row >= startRoom!.row &&
          floor.spawn.row < startRoom!.row + startRoom!.height &&
          floor.spawn.column >= startRoom!.column &&
          floor.spawn.column < startRoom!.column + startRoom!.width;
        expect(inStart).toBe(true);

        for (const obj of floor.objectives) {
          expect(
            obj.tile.row === floor.spawn.row && obj.tile.column === floor.spawn.column,
          ).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 7: El perímetro es siempre bloqueante
  it('perimeter tiles are always blocking', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const { floor } = buildFloor({ difficulty, levelNumber: level, seed });

        for (let c = 0; c < floor.width; c++) {
          expect(floor.collision[c]).not.toBe(0);
          expect(floor.collision[(floor.height - 1) * floor.width + c]).not.toBe(0);
        }
        for (let r = 1; r < floor.height - 1; r++) {
          expect(floor.collision[r * floor.width]).not.toBe(0);
          expect(floor.collision[r * floor.width + (floor.width - 1)]).not.toBe(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 8: Alcanzabilidad de todo objetivo después de aplicar props
  it('every objective is reachable from spawn after props are placed', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const { floor } = buildFloor({ difficulty, levelNumber: level, seed });

        const reachable = referenceBfs(
          floor.collision,
          floor.width,
          floor.height,
          floor.spawn.row,
          floor.spawn.column,
        );

        for (const obj of floor.objectives) {
          const objIdx = obj.tile.row * floor.width + obj.tile.column;
          expect(floor.collision[objIdx]).toBe(0);
          expect(reachable.has(objIdx)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 55: Presupuesto de tiempo de la cadena de generación
  it('buildFloor completes in 500ms or less', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const result = buildFloor({ difficulty, levelNumber: level, seed });
        expect(result.elapsedMs).toBeLessThanOrEqual(500);
      }),
      { numRuns: 100 },
    );
  });

  // Additional: pipeline produces valid floor with JSON
  it('buildFloor always produces a valid floor with JSON output', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const result = buildFloor({ difficulty, levelNumber: level, seed });

        expect(result.validation.valid).toBe(true);
        expect(result.validation.violations).toHaveLength(0);
        expect(result.json).not.toBeNull();

        if (difficulty === 'beginner' || difficulty === 'normal' || difficulty === 'hard') {
          expect(result.theme.id).toBe(difficulty);
          expect(result.theme.isFallback).toBe(false);
        }

        expect(result.floor.circuitPaths.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});
