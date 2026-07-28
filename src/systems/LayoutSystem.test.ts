import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateFloor,
  createFallbackFloor,
  terminalCountFor,
} from '@/systems/LayoutSystem';
import { validateFloor } from '@/systems/MapValidator';
import type { ThemeId } from '@/systems/ThemeSystem';

describe('LayoutSystem', () => {
  const arbDifficulty = fc.constantFrom<ThemeId>('beginner', 'normal', 'hard');
  const arbLevel = fc.integer({ min: 1, max: 5 });
  const arbSeed = fc.integer({ min: 0, max: 2147483647 });

  // Feature: dungeon-visual-overhaul, Property 1: Determinismo del LayoutSystem
  it('two generateFloor calls with same args produce identical descriptors', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const a = generateFloor({ difficulty, levelNumber: level, seed });
        const b = generateFloor({ difficulty, levelNumber: level, seed });
        expect(a.floor.width).toBe(b.floor.width);
        expect(a.floor.height).toBe(b.floor.height);
        expect(a.floor.collision).toEqual(b.floor.collision);
        expect(a.floor.rooms).toEqual(b.floor.rooms);
        expect(a.floor.corridors).toEqual(b.floor.corridors);
        expect(a.floor.spawn).toEqual(b.floor.spawn);
        expect(a.floor.objectives).toEqual(b.floor.objectives);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 2: Estructura de la planta beginner
  it('beginner produces 1 room with role start, 0 corridors, correct dimensions', () => {
    fc.assert(
      fc.property(arbLevel, arbSeed, (level, seed) => {
        const { floor } = generateFloor({ difficulty: 'beginner', levelNumber: level, seed });
        expect(floor.rooms).toHaveLength(1);
        expect(floor.rooms[0].role).toBe('start');
        expect(floor.corridors).toHaveLength(0);
        const room = floor.rooms[0];
        expect(room.width).toBeGreaterThanOrEqual(10);
        expect(room.width).toBeLessThanOrEqual(14);
        expect(room.height).toBeGreaterThanOrEqual(8);
        expect(room.height).toBeLessThanOrEqual(11);
        expect(floor.width).toBeGreaterThanOrEqual(12);
        expect(floor.width).toBeLessThanOrEqual(16);
        expect(floor.height).toBeGreaterThanOrEqual(10);
        expect(floor.height).toBeLessThanOrEqual(13);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 3: Estructura de la planta multi-sala
  it('normal/hard produces 4-6 rooms with correct dimensions, start and boss roles, no overlap', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ThemeId>('normal', 'hard'),
        arbLevel,
        arbSeed,
        (difficulty, level, seed) => {
          const { floor } = generateFloor({ difficulty, levelNumber: level, seed });
          expect(floor.rooms.length).toBeGreaterThanOrEqual(4);
          expect(floor.rooms.length).toBeLessThanOrEqual(6);
          for (const room of floor.rooms) {
            expect(room.width).toBeGreaterThanOrEqual(5);
            expect(room.width).toBeLessThanOrEqual(10);
            expect(room.height).toBeGreaterThanOrEqual(4);
            expect(room.height).toBeLessThanOrEqual(8);
          }
          expect(floor.width).toBeGreaterThanOrEqual(20);
          expect(floor.width).toBeLessThanOrEqual(40);
          expect(floor.height).toBeGreaterThanOrEqual(20);
          expect(floor.height).toBeLessThanOrEqual(40);
          const startRooms = floor.rooms.filter((r) => r.role === 'start');
          const bossRooms = floor.rooms.filter((r) => r.role === 'boss');
          expect(startRooms).toHaveLength(1);
          expect(bossRooms).toHaveLength(1);
          expect(startRooms[0].id).not.toBe(bossRooms[0].id);
          for (const room of floor.rooms) {
            expect(['start', 'terminal', 'boss', 'rest']).toContain(room.role);
          }
          for (let i = 0; i < floor.rooms.length; i++) {
            for (let j = i + 1; j < floor.rooms.length; j++) {
              const ri = floor.rooms[i];
              const rj = floor.rooms[j];
              const overlapH = ri.column < rj.column + rj.width && rj.column < ri.column + ri.width;
              const overlapV = ri.row < rj.row + rj.height && rj.row < ri.row + ri.height;
              expect(overlapH && overlapV).toBe(false);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 4: Paridad topológica entre normal y hard
  it('normal and hard with same seed produce same topology, different terminal count', () => {
    fc.assert(
      fc.property(arbLevel, arbSeed, (level, seed) => {
        const normal = generateFloor({ difficulty: 'normal', levelNumber: level, seed });
        const hard = generateFloor({ difficulty: 'hard', levelNumber: level, seed });
        expect(normal.floor.width).toBe(hard.floor.width);
        expect(normal.floor.height).toBe(hard.floor.height);
        expect(normal.floor.rooms.length).toBe(hard.floor.rooms.length);
        for (let i = 0; i < normal.floor.rooms.length; i++) {
          expect(normal.floor.rooms[i].row).toBe(hard.floor.rooms[i].row);
          expect(normal.floor.rooms[i].column).toBe(hard.floor.rooms[i].column);
          expect(normal.floor.rooms[i].width).toBe(hard.floor.rooms[i].width);
          expect(normal.floor.rooms[i].height).toBe(hard.floor.rooms[i].height);
        }
        expect(normal.floor.corridors.length).toBe(hard.floor.corridors.length);
        const normalTerminals = normal.floor.objectives.filter((o) => o.type === 'terminal');
        const hardTerminals = hard.floor.objectives.filter((o) => o.type === 'terminal');
        expect(normalTerminals).toHaveLength(3);
        expect(hardTerminals).toHaveLength(5);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 5: Conteo y disyunción de objetivos
  it('correct terminal count per difficulty, exactly 1 door, all tiles distinct from spawn', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const { floor } = generateFloor({ difficulty, levelNumber: level, seed });
        const terminals = floor.objectives.filter((o) => o.type === 'terminal');
        const doors = floor.objectives.filter((o) => o.type === 'door');
        const expected = terminalCountFor(difficulty);
        expect(terminals).toHaveLength(expected);
        expect(doors).toHaveLength(1);
        if (floor.rooms.length > 1) {
          const bossRoom = floor.rooms.find((r) => r.role === 'boss');
          expect(bossRoom).toBeDefined();
          expect(doors[0].roomId).toBe(bossRoom!.id);
        }
        const allTiles = floor.objectives.map((o) => `${o.tile.row},${o.tile.column}`);
        const uniqueTiles = new Set(allTiles);
        expect(uniqueTiles.size).toBe(allTiles.length);
        expect(uniqueTiles.has(`${floor.spawn.row},${floor.spawn.column}`)).toBe(false);
        if (floor.rooms.length > 1) {
          const bossRoom = floor.rooms.find((r) => r.role === 'boss')!;
          for (const t of terminals) {
            const inBoss =
              t.tile.row >= bossRoom.row &&
              t.tile.row < bossRoom.row + bossRoom.height &&
              t.tile.column >= bossRoom.column &&
              t.tile.column < bossRoom.column + bossRoom.width;
            expect(inBoss).toBe(false);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 9: Todo descriptor entregado por generateFloor es válido
  it('generateFloor always produces a valid descriptor', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const { floor, validation } = generateFloor({ difficulty, levelNumber: level, seed });
        expect(validation.valid).toBe(true);
        expect(validation.violations).toHaveLength(0);
        const revalidation = validateFloor(floor);
        expect(revalidation.valid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 12: Cota de intentos y semilla efectiva
  it('attempts are between 1 and 10, effective seed in expected range', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const result = generateFloor({ difficulty, levelNumber: level, seed });
        expect(result.attempts).toBeGreaterThanOrEqual(1);
        expect(result.attempts).toBeLessThanOrEqual(10);
        if (!result.usedFallback) {
          const effectiveSeed = (seed + result.attempts - 1) % 2147483648;
          expect(result.floor.seed).toBe(effectiveSeed);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 13: Dificultad no reconocida en el LayoutSystem
  it('unrecognized difficulty produces same as normal', () => {
    fc.assert(
      fc.property(arbLevel, arbSeed, (level, seed) => {
        const normal = generateFloor({ difficulty: 'normal', levelNumber: level, seed });
        const unknown = generateFloor({ difficulty: 'INVALID', levelNumber: level, seed });
        expect(unknown.floor.width).toBe(normal.floor.width);
        expect(unknown.floor.height).toBe(normal.floor.height);
        expect(unknown.floor.rooms).toEqual(normal.floor.rooms);
        expect(unknown.floor.corridors).toEqual(normal.floor.corridors);
        expect(unknown.floor.spawn).toEqual(normal.floor.spawn);
        expect(unknown.floor.objectives).toEqual(normal.floor.objectives);
      }),
      { numRuns: 100 },
    );
  });

  // ─── Unit tests ────────────────────────────────────────────────────────────

  describe('createFallbackFloor', () => {
    it('produces a valid 14x11 map with spawn (2,2) and 3 objectives', () => {
      const floor = createFallbackFloor(1);
      expect(floor.width).toBe(14);
      expect(floor.height).toBe(11);
      expect(floor.spawn).toEqual({ row: 2, column: 2 });
      expect(floor.objectives).toHaveLength(3);
      expect(floor.objectives[0].tile).toEqual({ row: 2, column: 5 });
      expect(floor.objectives[1].tile).toEqual({ row: 2, column: 8 });
      expect(floor.objectives[2].tile).toEqual({ row: 9, column: 11 });
      expect(floor.objectives[2].type).toBe('door');
      expect(floor.props).toHaveLength(0);
      const validation = validateFloor(floor);
      expect(validation.valid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });
  });

  describe('terminalCountFor', () => {
    it('returns 2 for beginner, 3 for normal, 5 for hard', () => {
      expect(terminalCountFor('beginner')).toBe(2);
      expect(terminalCountFor('normal')).toBe(3);
      expect(terminalCountFor('hard')).toBe(5);
    });
  });
});
