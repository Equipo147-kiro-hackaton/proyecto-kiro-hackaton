/**
 * LayoutSystem — Pure system that generates FloorDescriptors from
 * difficulty, level number and seed.
 *
 * No import of 'phaser'. Uses Prng for deterministic generation.
 */

import type {
  Corridor,
  DifficultyMode,
  FloorDescriptor,
  Objective,
  Room,
  TileRef,
  ValidationResult,
} from '@/types';
import { createPrng, type Prng } from '@/lib/Prng';
import { validateFloor } from '@/systems/MapValidator';
import type { ThemeId } from '@/systems/ThemeSystem';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface LayoutRequest {
  difficulty: unknown;
  levelNumber: unknown;
  seed: number;
}

export interface LayoutOutcome {
  floor: FloorDescriptor;
  validation: ValidationResult;
  /** Attempts consumed, counting the initial. 1..10. */
  attempts: number;
  usedFallback: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const KNUTH_MULT = 2654435761;
const MAX_ATTEMPTS = 10;
const WALL_MID = 27;
const VOID_TILE = 27;

const GRID_COLS = 2;
const GRID_ROWS = 3;
const CELL_W = 12;
const CELL_H = 11;
const MULTI_WIDTH = GRID_COLS * CELL_W + 2;  // 26
const MULTI_HEIGHT = GRID_ROWS * CELL_H + 2; // 35

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeDifficulty(value: unknown): DifficultyMode {
  if (value === 'beginner' || value === 'normal' || value === 'hard') {
    return value;
  }
  return 'normal';
}

function clampLevel(value: unknown): number {
  const n = typeof value === 'number' ? Math.round(value) : 1;
  return Math.max(1, Math.min(5, n));
}

export function terminalCountFor(themeId: ThemeId): number {
  switch (themeId) {
    case 'beginner': return 2;
    case 'normal': return 3;
    case 'hard': return 5;
  }
}

function chebyshevDistance(a: TileRef, b: TileRef): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.column - b.column));
}

function selectDispersed(
  prng: Prng,
  candidates: TileRef[],
  count: number,
  minSeparation: number,
): TileRef[] {
  const selected: TileRef[] = [];
  let separation = minSeparation;

  while (selected.length < count && separation >= 1) {
    const startIdx = prng.intInRange(0, candidates.length - 1);
    for (let i = 0; i < candidates.length && selected.length < count; i++) {
      const idx = (startIdx + i) % candidates.length;
      const tile = candidates[idx];
      const farEnough = selected.every((s) => chebyshevDistance(s, tile) >= separation);
      if (farEnough) {
        selected.push(tile);
      }
    }
    if (selected.length < count) {
      separation--;
      if (separation >= 1) {
        selected.length = 0;
      }
    }
  }

  if (selected.length < count) {
    const remaining = candidates.filter(
      (c) => !selected.some((s) => s.row === c.row && s.column === c.column),
    );
    for (let i = 0; i < remaining.length && selected.length < count; i++) {
      selected.push(remaining[i]);
    }
  }

  return selected;
}

function interiorTiles(room: Room): TileRef[] {
  const tiles: TileRef[] = [];
  for (let r = room.row + 1; r < room.row + room.height - 1; r++) {
    for (let c = room.column + 1; c < room.column + room.width - 1; c++) {
      tiles.push({ row: r, column: c });
    }
  }
  return tiles;
}

function carveRoom(
  room: Room,
  ground: number[],
  collision: number[],
  width: number,
  prng: Prng,
  floorTiles: readonly number[],
): void {
  for (let r = room.row; r < room.row + room.height; r++) {
    for (let c = room.column; c < room.column + room.width; c++) {
      const idx = r * width + c;
      ground[idx] = prng.pick(floorTiles);
      collision[idx] = 0;
    }
  }
}

function roomCenter(room: Room): TileRef {
  return {
    row: room.row + Math.floor(room.height / 2),
    column: room.column + Math.floor(room.width / 2),
  };
}

// ─── Single Room (Beginner) ──────────────────────────────────────────────────

export function generateSingleRoomFloor(levelNumber: number, seed: number): FloorDescriptor {
  const prng = createPrng((seed ^ Math.imul(levelNumber, KNUTH_MULT)) >>> 0);
  const roomW = prng.intInRange(10, 14);
  const roomH = prng.intInRange(8, 11);
  const width = roomW + 2;
  const height = roomH + 2;

  const ground = new Array<number>(width * height).fill(VOID_TILE);
  const collision = new Array<number>(width * height).fill(WALL_MID);

  const room: Room = { id: 'room-0', role: 'start', row: 1, column: 1, width: roomW, height: roomH };
  const floorTiles = [79, 80, 81] as const;
  carveRoom(room, ground, collision, width, prng, floorTiles);

  const interior = interiorTiles(room);
  const spawn = prng.pick(interior);

  const candidates = interior.filter(
    (t) => !(t.row === spawn.row && t.column === spawn.column),
  );
  candidates.sort((a, b) => a.row - b.row || a.column - b.column);

  const chosen = selectDispersed(prng, candidates, 3, 2);

  const objectives: Objective[] = [
    { id: 'obj-0', type: 'terminal', tile: chosen[0], roomId: 'room-0', activated: false },
    { id: 'obj-1', type: 'terminal', tile: chosen[1], roomId: 'room-0', activated: false },
    { id: 'obj-2', type: 'door', tile: chosen[2], roomId: 'room-0', activated: false },
  ];

  return {
    levelNumber,
    difficulty: 'beginner',
    themeId: 'beginner',
    seed,
    width,
    height,
    ground,
    propsLayer: new Array<number>(width * height).fill(0),
    collision,
    rooms: [room],
    corridors: [],
    spawn,
    objectives,
    props: [],
    circuitPaths: [],
  };
}

// ─── Multi-Room (Normal / Hard) ──────────────────────────────────────────────

interface GridCell {
  gridRow: number;
  gridCol: number;
  row0: number;
  col0: number;
}

function buildGrid(): GridCell[] {
  const cells: GridCell[] = [];
  for (let gr = 0; gr < GRID_ROWS; gr++) {
    for (let gc = 0; gc < GRID_COLS; gc++) {
      cells.push({
        gridRow: gr,
        gridCol: gc,
        row0: 1 + gr * CELL_H,
        col0: 1 + gc * CELL_W,
      });
    }
  }
  return cells;
}

function carveCorridor(
  from: TileRef,
  to: TileRef,
  ground: number[],
  collision: number[],
  width: number,
  corridorWidth: 1 | 2,
  prng: Prng,
  floorTiles: readonly number[],
): TileRef[] {
  const tiles: TileRef[] = [];
  const mapHeight = collision.length / width;

  // L-shaped corridor: vertical first, then horizontal
  const rStart = from.row;
  const rEnd = to.row;
  const rDir = rStart <= rEnd ? 1 : -1;
  for (let r = rStart; r !== rEnd + rDir; r += rDir) {
    for (let w = 0; w < corridorWidth; w++) {
      const c = from.column + w;
      if (c >= 0 && c < width && r >= 0 && r < mapHeight) {
        tiles.push({ row: r, column: c });
        const idx = r * width + c;
        ground[idx] = prng.pick(floorTiles);
        collision[idx] = 0;
      }
    }
  }

  const cStart = from.column;
  const cEnd = to.column;
  const cDir = cStart <= cEnd ? 1 : -1;
  for (let c = cStart; c !== cEnd + cDir; c += cDir) {
    for (let w = 0; w < corridorWidth; w++) {
      const r = to.row + w;
      if (r >= 0 && r < mapHeight && c >= 0 && c < width) {
        tiles.push({ row: r, column: c });
        const idx = r * width + c;
        ground[idx] = prng.pick(floorTiles);
        collision[idx] = 0;
      }
    }
  }

  return tiles;
}

export function generateMultiRoomFloor(
  levelNumber: number,
  seed: number,
  terminalCount: number,
): FloorDescriptor {
  const prng = createPrng((seed ^ Math.imul(levelNumber, KNUTH_MULT)) >>> 0);
  const roomCount = prng.intInRange(4, 6);

  const allCells = buildGrid();
  const chosen = prng.sample(allCells, roomCount);

  // Ensure top-most and bottom-most grid rows are represented
  const hasTop = chosen.some((c) => c.gridRow === 0);
  const hasBottom = chosen.some((c) => c.gridRow === GRID_ROWS - 1);
  if (!hasTop) {
    const topCells = allCells.filter((c) => c.gridRow === 0);
    chosen[0] = prng.pick(topCells);
  }
  if (!hasBottom) {
    const bottomCells = allCells.filter((c) => c.gridRow === GRID_ROWS - 1);
    chosen[chosen.length - 1] = prng.pick(bottomCells);
  }

  chosen.sort((a, b) => a.gridRow - b.gridRow || a.gridCol - b.gridCol);

  const width = MULTI_WIDTH;
  const height = MULTI_HEIGHT;
  const ground = new Array<number>(width * height).fill(VOID_TILE);
  const collision = new Array<number>(width * height).fill(WALL_MID);
  const floorTiles = [79, 80, 81] as const;

  const rooms: Room[] = [];
  for (let i = 0; i < chosen.length; i++) {
    const cell = chosen[i];
    const roomW = prng.intInRange(5, 10);
    const roomH = prng.intInRange(4, 8);
    const maxOffR = CELL_H - roomH - 1;
    const maxOffC = CELL_W - roomW - 1;
    const offR = maxOffR > 1 ? prng.intInRange(1, maxOffR) : 1;
    const offC = maxOffC > 1 ? prng.intInRange(1, maxOffC) : 1;

    const room: Room = {
      id: `room-${i}`,
      role: 'rest',
      row: cell.row0 + offR,
      column: cell.col0 + offC,
      width: roomW,
      height: roomH,
    };
    rooms.push(room);
    carveRoom(room, ground, collision, width, prng, floorTiles);
  }

  rooms[0].role = 'start';
  rooms[rooms.length - 1].role = 'boss';

  const corridors: Corridor[] = [];
  for (let i = 0; i < rooms.length - 1; i++) {
    const from = roomCenter(rooms[i]);
    const to = roomCenter(rooms[i + 1]);
    const corridorWidth: 1 | 2 = prng.intInRange(1, 2) as 1 | 2;
    const tiles = carveCorridor(from, to, ground, collision, width, corridorWidth, prng, floorTiles);
    corridors.push({
      id: `cor-${i}`,
      fromRoomId: rooms[i].id,
      toRoomId: rooms[i + 1].id,
      tiles,
      width: corridorWidth,
    });
  }

  const startRoom = rooms[0];
  const startInterior = interiorTiles(startRoom);
  const spawn = startInterior.length > 0
    ? prng.pick(startInterior)
    : { row: startRoom.row, column: startRoom.column };

  const bossRoom = rooms[rooms.length - 1];
  const bossInterior = interiorTiles(bossRoom);
  const doorCandidates = bossInterior.filter(
    (t) => !(t.row === spawn.row && t.column === spawn.column),
  );
  const door = doorCandidates.length > 0
    ? prng.pick(doorCandidates)
    : { row: bossRoom.row, column: bossRoom.column };

  const objPrng = prng.fork('objectives');
  const terminalCandidates: TileRef[] = [];
  for (const room of rooms) {
    if (room.role === 'boss') continue;
    const roomInterior = interiorTiles(room);
    for (const t of roomInterior) {
      if (t.row === spawn.row && t.column === spawn.column) continue;
      if (t.row === door.row && t.column === door.column) continue;
      terminalCandidates.push(t);
    }
  }
  terminalCandidates.sort((a, b) => a.row - b.row || a.column - b.column);
  const terminals = selectDispersed(objPrng, terminalCandidates, terminalCount, 3);

  const objectives: Objective[] = terminals
    .sort((a, b) => a.row - b.row || a.column - b.column)
    .map((tile, i) => ({
      id: `obj-${i}`,
      type: 'terminal' as const,
      tile,
      roomId: rooms.find((r) =>
        tile.row >= r.row && tile.row < r.row + r.height &&
        tile.column >= r.column && tile.column < r.column + r.width,
      )?.id ?? 'room-0',
      activated: false,
    }));

  objectives.push({
    id: `obj-${terminals.length}`,
    type: 'door',
    tile: door,
    roomId: bossRoom.id,
    activated: false,
  });

  const difficulty: DifficultyMode = terminalCount === 2 ? 'beginner' : terminalCount === 3 ? 'normal' : 'hard';

  return {
    levelNumber,
    difficulty,
    themeId: difficulty,
    seed,
    width,
    height,
    ground,
    propsLayer: new Array<number>(width * height).fill(0),
    collision,
    rooms,
    corridors,
    spawn,
    objectives,
    props: [],
    circuitPaths: [],
  };
}

// ─── Fallback Floor ──────────────────────────────────────────────────────────

export function createFallbackFloor(levelNumber: number): FloorDescriptor {
  const width = 14;
  const height = 11;
  const ground = new Array<number>(width * height).fill(VOID_TILE);
  const collision = new Array<number>(width * height).fill(WALL_MID);

  for (let r = 1; r <= 9; r++) {
    for (let c = 1; c <= 12; c++) {
      const idx = r * width + c;
      ground[idx] = 79;
      collision[idx] = 0;
    }
  }

  const spawn: TileRef = { row: 2, column: 2 };
  const objectives: Objective[] = [
    { id: 'obj-0', type: 'terminal', tile: { row: 2, column: 5 }, roomId: 'room-0', activated: false },
    { id: 'obj-1', type: 'terminal', tile: { row: 2, column: 8 }, roomId: 'room-0', activated: false },
    { id: 'obj-2', type: 'door', tile: { row: 9, column: 11 }, roomId: 'room-0', activated: false },
  ];

  const room: Room = { id: 'room-0', role: 'start', row: 1, column: 1, width: 12, height: 9 };

  return {
    levelNumber,
    difficulty: 'normal',
    themeId: 'normal',
    seed: 0,
    width,
    height,
    ground,
    propsLayer: new Array<number>(width * height).fill(0),
    collision,
    rooms: [room],
    corridors: [],
    spawn,
    objectives,
    props: [],
    circuitPaths: [],
  };
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

export function generateFloor(request: LayoutRequest): LayoutOutcome {
  const difficulty = normalizeDifficulty(request.difficulty);
  const levelNumber = clampLevel(request.levelNumber);
  const themeId: ThemeId = difficulty;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const effectiveSeed = (request.seed + attempt) % 2147483648;

    const floor = difficulty === 'beginner'
      ? generateSingleRoomFloor(levelNumber, effectiveSeed)
      : generateMultiRoomFloor(levelNumber, effectiveSeed, terminalCountFor(themeId));

    const validation = validateFloor(floor);
    if (validation.valid) {
      return { floor, validation, attempts: attempt + 1, usedFallback: false };
    }
  }

  const fallback = createFallbackFloor(levelNumber);
  const validation = validateFloor(fallback);
  return { floor: fallback, validation, attempts: MAX_ATTEMPTS, usedFallback: true };
}
