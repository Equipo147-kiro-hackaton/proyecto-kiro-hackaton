import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { placeProps, isBlockingProp, MAX_PROPS_PER_FLOOR } from '@/systems/PropPlacer';
import { generateFloor } from '@/systems/LayoutSystem';
import type { ThemeId } from '@/systems/ThemeSystem';
import type { FloorDescriptor } from '@/types';

describe('PropPlacer', () => {
  const arbDifficulty = fc.constantFrom<ThemeId>('beginner', 'normal', 'hard');
  const arbLevel = fc.integer({ min: 1, max: 5 });
  const arbSeed = fc.integer({ min: 0, max: 2147483647 });

  function buildFloorForTest(difficulty: ThemeId, level: number, seed: number): FloorDescriptor {
    return generateFloor({ difficulty, levelNumber: level, seed }).floor;
  }

  // Feature: dungeon-visual-overhaul, Property 14: Consistencia entre props y arreglo de colisión
  it('blocking props have their tileIndex in collision, non-blocking have 0', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const floor = buildFloorForTest(difficulty, level, seed);
        const result = placeProps({ floor, seed, difficulty });

        for (const prop of result.props) {
          const idx = prop.tile.row * floor.width + prop.tile.column;
          if (prop.blocking) {
            expect(result.collision[idx]).toBe(prop.tileIndex);
            expect(result.collision[idx]).not.toBe(0);
          } else {
            expect(result.collision[idx]).toBe(0);
          }
        }

        for (let i = 0; i < result.collision.length; i++) {
          if (result.collision[i] !== floor.collision[i]) {
            const prop = result.props.find(
              (p) => p.tile.row * floor.width + p.tile.column === i,
            );
            expect(prop).toBeDefined();
            expect(prop!.blocking).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 15: Exclusiones, unicidad y cota de props
  it('props respect exclusions, uniqueness, and max count', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const floor = buildFloorForTest(difficulty, level, seed);
        const result = placeProps({ floor, seed, difficulty });

        const spawnIdx = floor.spawn.row * floor.width + floor.spawn.column;
        const objectiveIndices = new Set(
          floor.objectives.map((o) => o.tile.row * floor.width + o.tile.column),
        );
        const corridorIndices = new Set(
          floor.corridors.flatMap((c) => c.tiles.map((t) => t.row * floor.width + t.column)),
        );

        expect(result.props.length).toBeLessThanOrEqual(MAX_PROPS_PER_FLOOR);

        const propIndices = new Set<number>();
        for (const prop of result.props) {
          const idx = prop.tile.row * floor.width + prop.tile.column;
          expect(idx).not.toBe(spawnIdx);
          expect(objectiveIndices.has(idx)).toBe(false);
          expect(corridorIndices.has(idx)).toBe(false);
          expect(propIndices.has(idx)).toBe(false);
          propIndices.add(idx);

          if (prop.type === 'server-rack') {
            // server-rack must be adjacent to a blocking tile (perimeter or other prop)
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
            const hasBorder = dirs.some(([dr, dc]) => {
              const nr = prop.tile.row + dr;
              const nc = prop.tile.column + dc;
              if (nr < 0 || nr >= floor.height || nc < 0 || nc >= floor.width) return false;
              // Check against result collision (includes room perimeter + placed blocking props)
              return result.collision[nr * floor.width + nc] !== 0;
            });
            expect(hasBorder).toBe(true);
          }
        }

        for (const room of floor.rooms) {
          let borderCount = 0;
          for (let r = room.row; r < room.row + room.height; r++) {
            for (let c = room.column; c < room.column + room.width; c++) {
              if (floor.collision[r * floor.width + c] !== 0) continue;
              const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
              const hasBorder = dirs.some(([dr, dc]) => {
                const nr = r + dr;
                const nc = c + dc;
                if (nr < 0 || nr >= floor.height || nc < 0 || nc >= floor.width) return false;
                return floor.collision[nr * floor.width + nc] !== 0;
              });
              if (hasBorder) borderCount++;
            }
          }
          const roomProps = result.props.filter((p) =>
            p.tile.row >= room.row && p.tile.row < room.row + room.height &&
            p.tile.column >= room.column && p.tile.column < room.column + room.width,
          );
          expect(roomProps.length).toBeLessThanOrEqual(Math.floor(0.25 * borderCount));
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 16: Determinismo del PropPlacer
  it('two placeProps calls with same args produce identical results', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const floor = buildFloorForTest(difficulty, level, seed);
        const a = placeProps({ floor, seed, difficulty });
        const b = placeProps({ floor, seed, difficulty });

        expect(a.props.length).toBe(b.props.length);
        for (let i = 0; i < a.props.length; i++) {
          expect(a.props[i].type).toBe(b.props[i].type);
          expect(a.props[i].tile).toEqual(b.props[i].tile);
          expect(a.props[i].blocking).toBe(b.props[i].blocking);
        }
        expect(a.collision).toEqual(b.collision);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 17: Sustitución del contenedor corrupto en hard
  it('hard has no energy-container, corrupt-container is non-blocking', () => {
    fc.assert(
      fc.property(arbLevel, arbSeed, (level, seed) => {
        const hardFloor = buildFloorForTest('hard', level, seed);
        const hardResult = placeProps({ floor: hardFloor, seed, difficulty: 'hard' });

        // Hard has no energy-container
        expect(hardResult.props.every((p) => p.type !== 'energy-container')).toBe(true);

        // All corrupt-containers are non-blocking
        for (const hp of hardResult.props) {
          if (hp.type === 'corrupt-container') {
            expect(hp.blocking).toBe(false);
          }
        }

        // Normal has no corrupt-container
        const normalFloor = buildFloorForTest('normal', level, seed);
        const normalResult = placeProps({ floor: normalFloor, seed, difficulty: 'normal' });
        expect(normalResult.props.every((p) => p.type !== 'corrupt-container')).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('classifies prop types correctly', () => {
    expect(isBlockingProp('server-rack')).toBe(true);
    expect(isBlockingProp('server-tower')).toBe(true);
    expect(isBlockingProp('power-panel')).toBe(true);
    expect(isBlockingProp('crt-monitor')).toBe(false);
    expect(isBlockingProp('cable-bundle')).toBe(false);
    expect(isBlockingProp('energy-container')).toBe(false);
    expect(isBlockingProp('corrupt-container')).toBe(false);
    expect(isBlockingProp('padlock')).toBe(false);
  });
});
