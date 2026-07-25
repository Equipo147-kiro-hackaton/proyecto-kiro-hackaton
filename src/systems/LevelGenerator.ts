import { Room, Level, LevelSequence } from '@/types';

/**
 * LevelGenerator — Procedural level generation with BFS path validation,
 * difficulty scaling, and fallback levels.
 *
 * Pure logic system, independent of Phaser.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/** Base HP for bugs at level 1 */
export const BASE_HP = 100;

/** Base puzzle step count at level 1 */
export const BASE_STEPS = 3;

/** Min rooms per level (inclusive) */
const MIN_ROOMS = 3;

/** Max rooms per level (inclusive) */
const MAX_ROOMS = 7;

/** Min levels per run (inclusive) */
const MIN_LEVELS = 5;

/** Max levels per run (inclusive) */
const MAX_LEVELS = 10;

/** Max generation attempts before falling back */
const MAX_GENERATION_ATTEMPTS = 3;

// ─── Seeded Random ───────────────────────────────────────────────────────────

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 * Produces deterministic sequences given the same seed.
 */
function createRng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded integer in range [min, max] (inclusive).
 */
function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// ─── LevelGenerator Class ────────────────────────────────────────────────────

export class LevelGenerator {
  /**
   * Generate a full run sequence (5–10 levels).
   * Uses a seed for reproducibility; generates a random seed if none provided.
   */
  generate(seed?: number): LevelSequence {
    const actualSeed = seed ?? Math.floor(Math.random() * 2147483647);
    const rng = createRng(actualSeed);

    const levelCount = randomInt(rng, MIN_LEVELS, MAX_LEVELS);
    const levels: Level[] = [];
    const usedConfigs = new Set<string>();

    for (let n = 1; n <= levelCount; n++) {
      const level = this.generateLevelWithRetry(n, rng, usedConfigs);
      levels.push(level);
    }

    return { levels, seed: actualSeed };
  }

  /**
   * Attempt to generate a level up to MAX_GENERATION_ATTEMPTS times.
   * Falls back to a pre-defined layout on failure.
   */
  private generateLevelWithRetry(
    n: number,
    rng: () => number,
    usedConfigs: Set<string>,
  ): Level {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const level = this.generateLevel(n, rng);

      if (!this.hasNavigablePath(level.rooms)) {
        continue;
      }

      const configKey = this.getConfigKey(level);
      if (usedConfigs.has(configKey)) {
        continue;
      }

      usedConfigs.add(configKey);
      return level;
    }

    // Log generation failure for diagnostics
    console.warn(
      `[LevelGenerator] Failed to generate valid level ${n} after ${MAX_GENERATION_ATTEMPTS} attempts. Using fallback.`,
    );

    const fallback = this.getFallbackLevel(n);
    usedConfigs.add(this.getConfigKey(fallback));
    return fallback;
  }

  /**
   * Generate a single level at position N.
   * Ensures at least 1 combat room and 1 rest room.
   * Room count: [3, 7].
   */
  private generateLevel(n: number, rng: () => number): Level {
    const roomCount = randomInt(rng, MIN_ROOMS, MAX_ROOMS);
    const rooms: Room[] = [];

    // Create rooms with IDs
    for (let i = 0; i < roomCount; i++) {
      rooms.push({
        id: `room-${n}-${i}`,
        type: 'combat', // placeholder, assigned below
        connections: [],
        isEntrance: i === 0,
        isExit: i === roomCount - 1,
      });
    }

    // Assign room types: guarantee at least 1 combat and 1 rest
    this.assignRoomTypes(rooms, rng);

    // Generate connections (linear path + random shortcuts)
    this.generateConnections(rooms, rng);

    // Assign bug IDs to combat rooms
    this.assignBugs(rooms, n);

    return {
      levelNumber: n,
      rooms,
      bugBaseHP: this.calculateBugHP(n),
      puzzleStepCount: this.calculatePuzzleSteps(n),
    };
  }

  /**
   * Assign room types ensuring at least 1 combat and 1 rest room.
   * Entrance and exit are never rest rooms to keep navigation clear.
   */
  private assignRoomTypes(rooms: Room[], rng: () => number): void {
    const roomTypes: Array<'combat' | 'rest' | 'item'> = [
      'combat',
      'rest',
      'item',
    ];

    // Assign all rooms randomly first
    for (const room of rooms) {
      room.type = roomTypes[randomInt(rng, 0, 2)];
    }

    // Guarantee at least 1 combat room
    const hasCombat = rooms.some((r) => r.type === 'combat');
    if (!hasCombat) {
      // Pick a non-entrance, non-exit room or fallback to index 0
      const candidates = rooms.filter((r) => !r.isEntrance && !r.isExit);
      const target =
        candidates.length > 0
          ? candidates[randomInt(rng, 0, candidates.length - 1)]
          : rooms[0];
      target.type = 'combat';
    }

    // Guarantee at least 1 rest room
    const hasRest = rooms.some((r) => r.type === 'rest');
    if (!hasRest) {
      // Pick a non-combat, non-entrance, non-exit room or fallback
      const candidates = rooms.filter(
        (r) => r.type !== 'combat' && !r.isEntrance && !r.isExit,
      );
      if (candidates.length > 0) {
        candidates[randomInt(rng, 0, candidates.length - 1)].type = 'rest';
      } else {
        // If all are combat, convert a non-entrance/exit combat room
        const combatCandidates = rooms.filter(
          (r) => r.type === 'combat' && !r.isEntrance && !r.isExit,
        );
        if (combatCandidates.length > 0) {
          combatCandidates[
            randomInt(rng, 0, combatCandidates.length - 1)
          ].type = 'rest';
        } else {
          // Absolute fallback: convert exit to rest (only possible with 2 rooms)
          rooms[rooms.length - 1].type = 'rest';
        }
      }
    }
  }

  /**
   * Generate room connections ensuring a linear path from entrance to exit,
   * with random additional shortcuts for variety.
   */
  private generateConnections(rooms: Room[], rng: () => number): void {
    // Base linear path: 0→1→2→...→N-1
    for (let i = 0; i < rooms.length - 1; i++) {
      this.connect(rooms[i], rooms[i + 1]);
    }

    // Add random shortcuts (skip connections) for variety
    const extraConnections = randomInt(rng, 0, Math.floor(rooms.length / 2));
    for (let i = 0; i < extraConnections; i++) {
      const fromIdx = randomInt(rng, 0, rooms.length - 2);
      const toIdx = randomInt(rng, fromIdx + 1, rooms.length - 1);

      // Only add if not already connected
      if (!rooms[fromIdx].connections.includes(rooms[toIdx].id)) {
        this.connect(rooms[fromIdx], rooms[toIdx]);
      }
    }
  }

  /**
   * Create a bidirectional connection between two rooms.
   */
  private connect(roomA: Room, roomB: Room): void {
    if (!roomA.connections.includes(roomB.id)) {
      roomA.connections.push(roomB.id);
    }
    if (!roomB.connections.includes(roomA.id)) {
      roomB.connections.push(roomA.id);
    }
  }

  /**
   * Assign bug IDs to combat rooms based on level number.
   */
  private assignBugs(rooms: Room[], levelNumber: number): void {
    let bugIndex = 0;
    for (const room of rooms) {
      if (room.type === 'combat') {
        room.bugId = `bug-${levelNumber}-${bugIndex}`;
        bugIndex++;
      }
    }
  }

  /**
   * BFS from entrance to exit. Returns true if a navigable path exists.
   */
  hasNavigablePath(rooms: Room[]): boolean {
    if (rooms.length === 0) {
      return false;
    }

    const entrance = rooms.find((r) => r.isEntrance);
    const exit = rooms.find((r) => r.isExit);

    if (!entrance || !exit) {
      return false;
    }

    if (entrance.id === exit.id) {
      return true;
    }

    const roomMap = new Map<string, Room>();
    for (const room of rooms) {
      roomMap.set(room.id, room);
    }

    const visited = new Set<string>();
    const queue: string[] = [entrance.id];
    visited.add(entrance.id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (currentId === exit.id) {
        return true;
      }

      const current = roomMap.get(currentId);
      if (!current) {
        continue;
      }

      for (const neighborId of current.connections) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    return false;
  }

  /**
   * Pre-defined fallback level for a given level index.
   * Guaranteed to have a navigable path, at least 1 combat and 1 rest room.
   */
  getFallbackLevel(n: number): Level {
    // Fallback: 4 rooms in linear layout (entrance→combat→rest→exit)
    const rooms: Room[] = [
      {
        id: `fallback-${n}-0`,
        type: 'combat',
        connections: [`fallback-${n}-1`],
        bugId: `bug-${n}-0`,
        isEntrance: true,
        isExit: false,
      },
      {
        id: `fallback-${n}-1`,
        type: 'rest',
        connections: [`fallback-${n}-0`, `fallback-${n}-2`],
        isEntrance: false,
        isExit: false,
      },
      {
        id: `fallback-${n}-2`,
        type: 'combat',
        connections: [`fallback-${n}-1`, `fallback-${n}-3`],
        bugId: `bug-${n}-1`,
        isEntrance: false,
        isExit: false,
      },
      {
        id: `fallback-${n}-3`,
        type: 'rest',
        connections: [`fallback-${n}-2`],
        isEntrance: false,
        isExit: true,
      },
    ];

    return {
      levelNumber: n,
      rooms,
      bugBaseHP: this.calculateBugHP(n),
      puzzleStepCount: this.calculatePuzzleSteps(n),
    };
  }

  /**
   * Bug HP formula: BASE_HP × (1 + 0.10 × (N − 1))
   */
  private calculateBugHP(n: number): number {
    return BASE_HP * (1 + 0.1 * (n - 1));
  }

  /**
   * Puzzle step count formula: BASE_STEPS + floor((N − 1) / 2)
   */
  private calculatePuzzleSteps(n: number): number {
    return BASE_STEPS + Math.floor((n - 1) / 2);
  }

  /**
   * Generate a configuration key for uniqueness checking.
   * Based on room count and bug placement pattern.
   */
  private getConfigKey(level: Level): string {
    const bugPositions = level.rooms
      .map((r, i) => (r.type === 'combat' ? i : -1))
      .filter((i) => i >= 0)
      .join(',');
    return `${level.rooms.length}:${bugPositions}`;
  }
}
