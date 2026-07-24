import type { Room, Level, LevelSequence } from '@/types';

/**
 * LevelGenerator — procedural level generation for each run.
 *
 * Independent of Phaser (pure logic, testable without DOM/canvas).
 */

export const BASE_HP = 100;
export const BASE_STEPS = 3;

/**
 * Mulberry32 — simple seeded 32-bit PRNG.
 * Returns a function that produces a float in [0, 1) on each call.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compute a layout signature string for uniqueness checks.
 * Signature = roomCount + sorted room type distribution.
 */
function getLayoutSignature(level: Level): string {
  const typeCounts: Record<string, number> = { combat: 0, rest: 0, item: 0 };
  for (const room of level.rooms) {
    typeCounts[room.type]++;
  }
  return `${level.rooms.length}:${typeCounts.combat}-${typeCounts.rest}-${typeCounts.item}`;
}

export class LevelGenerator {
  /**
   * Generate a full run sequence (5–10 levels).
   * If no seed provided, generate a random one.
   */
  generate(seed?: number): LevelSequence {
    const actualSeed = seed ?? Math.floor(Math.random() * 2147483647);
    const rng = mulberry32(actualSeed);

    // Determine level count: random between 5 and 10
    const levelCount = 5 + Math.floor(rng() * 6); // 5..10

    const levels: Level[] = [];
    const usedSignatures = new Set<string>();

    for (let i = 1; i <= levelCount; i++) {
      // Derive a sub-seed for each level
      const levelSeed = Math.floor(rng() * 2147483647);
      let level = this.generateLevel(i, levelSeed);
      let signature = getLayoutSignature(level);

      // Ensure unique layout signature within the run
      let regenerateAttempts = 0;
      while (usedSignatures.has(signature) && regenerateAttempts < 10) {
        const newSeed = Math.floor(rng() * 2147483647);
        level = this.generateLevel(i, newSeed);
        signature = getLayoutSignature(level);
        regenerateAttempts++;
      }

      usedSignatures.add(signature);
      levels.push(level);
    }

    return { levels, seed: actualSeed };
  }

  /**
   * Generate a single level at position N with the given seed.
   * Validates navigability; retries up to 3 times.
   * Falls back to getFallbackLevel(n) if all attempts fail.
   */
  private generateLevel(n: number, seed: number): Level {
    const MAX_ATTEMPTS = 3;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const attemptSeed = seed + attempt;
      const rng = mulberry32(attemptSeed);

      // Room count: 3–7
      const roomCount = 3 + Math.floor(rng() * 5); // 3..7

      // Build room types ensuring ≥1 combat and ≥1 rest
      const roomTypes: Array<'combat' | 'rest' | 'item'> = [];

      // Guarantee at least 1 combat and 1 rest
      roomTypes.push('combat');
      roomTypes.push('rest');

      // Fill remaining rooms randomly
      const possibleTypes: Array<'combat' | 'rest' | 'item'> = ['combat', 'rest', 'item'];
      for (let i = 2; i < roomCount; i++) {
        const typeIndex = Math.floor(rng() * possibleTypes.length);
        roomTypes.push(possibleTypes[typeIndex]);
      }

      // Shuffle room types using Fisher-Yates
      for (let i = roomTypes.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [roomTypes[i], roomTypes[j]] = [roomTypes[j], roomTypes[i]];
      }

      // Create rooms
      const rooms: Room[] = roomTypes.map((type, index) => {
        const room: Room = {
          id: `room-${n}-${index}`,
          type,
          connections: [],
          isEntrance: index === 0,
          isExit: index === roomCount - 1,
        };

        if (type === 'combat') {
          room.bugId = `bug-${n}-${index}`;
        }

        return room;
      });

      // Create connections to form a connected graph
      // Strategy: create a linear backbone path from entrance to exit,
      // then add random extra connections for variety
      for (let i = 0; i < rooms.length - 1; i++) {
        rooms[i].connections.push(rooms[i + 1].id);
        rooms[i + 1].connections.push(rooms[i].id);
      }

      // Add 0–2 extra random connections for non-linearity
      const extraConnections = Math.floor(rng() * 3);
      for (let e = 0; e < extraConnections; e++) {
        const a = Math.floor(rng() * rooms.length);
        const b = Math.floor(rng() * rooms.length);
        if (a !== b && !rooms[a].connections.includes(rooms[b].id)) {
          rooms[a].connections.push(rooms[b].id);
          rooms[b].connections.push(rooms[a].id);
        }
      }

      // Validate navigability
      if (this.hasNavigablePath(rooms)) {
        return {
          levelNumber: n,
          rooms,
          bugBaseHP: BASE_HP * (1 + 0.10 * (n - 1)),
          puzzleStepCount: BASE_STEPS + Math.floor((n - 1) / 2),
        };
      }
    }

    // All attempts failed — log and return fallback
    console.warn(
      `LevelGenerator: Failed to generate valid level ${n} after ${MAX_ATTEMPTS} attempts. Using fallback.`
    );
    return this.getFallbackLevel(n);
  }

  /**
   * Guarantee path from entrance to exit via BFS.
   * Returns true if exit is reachable from entrance.
   */
  hasNavigablePath(rooms: Room[]): boolean {
    const entrance = rooms.find((r) => r.isEntrance);
    const exit = rooms.find((r) => r.isExit);

    if (!entrance || !exit) {
      return false;
    }

    if (entrance.id === exit.id) {
      return true;
    }

    const visited = new Set<string>();
    const queue: string[] = [entrance.id];
    visited.add(entrance.id);

    const roomMap = new Map<string, Room>();
    for (const room of rooms) {
      roomMap.set(room.id, room);
    }

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (currentId === exit.id) {
        return true;
      }

      const current = roomMap.get(currentId);
      if (!current) continue;

      for (const connId of current.connections) {
        if (!visited.has(connId)) {
          visited.add(connId);
          queue.push(connId);
        }
      }
    }

    return false;
  }

  /**
   * Fallback level for index n (pre-defined layout).
   * Simple linear layout: entrance → combat → rest → combat → exit
   * Applies difficulty scaling based on n.
   */
  getFallbackLevel(n: number): Level {
    const rooms: Room[] = [
      {
        id: `room-${n}-0`,
        type: 'combat',
        connections: [`room-${n}-1`],
        bugId: `bug-${n}-0`,
        isEntrance: true,
        isExit: false,
      },
      {
        id: `room-${n}-1`,
        type: 'rest',
        connections: [`room-${n}-0`, `room-${n}-2`],
        isEntrance: false,
        isExit: false,
      },
      {
        id: `room-${n}-2`,
        type: 'combat',
        connections: [`room-${n}-1`, `room-${n}-3`],
        bugId: `bug-${n}-2`,
        isEntrance: false,
        isExit: false,
      },
      {
        id: `room-${n}-3`,
        type: 'combat',
        connections: [`room-${n}-2`],
        bugId: `bug-${n}-3`,
        isEntrance: false,
        isExit: true,
      },
    ];

    return {
      levelNumber: n,
      rooms,
      bugBaseHP: BASE_HP * (1 + 0.10 * (n - 1)),
      puzzleStepCount: BASE_STEPS + Math.floor((n - 1) / 2),
    };
  }
}
