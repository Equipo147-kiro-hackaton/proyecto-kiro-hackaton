/**
 * MapValidator — Pure system that verifies the collision contract and
 * reachability of a FloorDescriptor.
 *
 * No import of 'phaser'.
 */

import type { FloorDescriptor, ValidationResult, Violation } from '@/types';

// ─── Public Constants ────────────────────────────────────────────────────────

export const VALIDATION_CHECKS = [
  'collision-length',
  'dimensions',
  'spawn-in-bounds',
  'spawn-walkable',
  'perimeter-blocking',
  'objective-walkable',
  'objective-reachable',
] as const;

export type ValidationCheck = (typeof VALIDATION_CHECKS)[number];

// ─── Directions ──────────────────────────────────────────────────────────────

const DIRS: readonly [number, number][] = [
  [-1, 0], // up
  [1, 0],  // down
  [0, -1], // left
  [0, 1],  // right
];

// ─── BFS ─────────────────────────────────────────────────────────────────────

/**
 * Flat indices reachable from (startRow, startColumn) by cardinal adjacency.
 * Returns empty set if start is out of bounds or on a blocking tile.
 */
export function reachableFrom(
  collision: readonly number[],
  width: number,
  height: number,
  startRow: number,
  startColumn: number,
): Set<number> {
  const visited = new Set<number>();

  if (startRow < 0 || startRow >= height || startColumn < 0 || startColumn >= width) {
    return visited;
  }

  const startIndex = startRow * width + startColumn;
  if (collision[startIndex] !== 0) {
    return visited;
  }

  visited.add(startIndex);
  const queue: [number, number][] = [[startRow, startColumn]];
  let head = 0;

  while (head < queue.length) {
    const [r, c] = queue[head++];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
      const ni = nr * width + nc;
      if (collision[ni] !== 0) continue;
      if (visited.has(ni)) continue;
      visited.add(ni);
      queue.push([nr, nc]);
    }
  }

  return visited;
}

/**
 * Quick check: are all objectives reachable from spawn?
 * Used by PropPlacer before confirming a blocking prop.
 */
export function allObjectivesReachable(
  collision: readonly number[],
  floor: Pick<FloorDescriptor, 'width' | 'height' | 'spawn' | 'objectives'>,
): boolean {
  const reachable = reachableFrom(
    collision,
    floor.width,
    floor.height,
    floor.spawn.row,
    floor.spawn.column,
  );
  return floor.objectives.every((o) => {
    const idx = o.tile.row * floor.width + o.tile.column;
    return reachable.has(idx);
  });
}

/**
 * Filter violations by a specific check type.
 */
export function violationsByCheck(
  result: ValidationResult,
  check: ValidationCheck,
): Violation[] {
  return result.violations.filter((v) => v.check === check);
}

// ─── Main Validation ─────────────────────────────────────────────────────────

/**
 * Validate a FloorDescriptor. Runs all checks and returns one violation per
 * failing tile instead of short-circuiting.
 */
export function validateFloor(floor: FloorDescriptor): ValidationResult {
  const violations: Violation[] = [];

  // Structural checks first (Req 3.14)
  if (floor.collision.length !== floor.width * floor.height) {
    violations.push({
      check: 'collision-length',
      row: 0,
      column: 0,
      detail: `expected ${floor.width * floor.height}, received ${floor.collision.length}`,
    });
  }

  if (floor.width < 10 || floor.width > 40 || floor.height < 10 || floor.height > 40) {
    violations.push({
      check: 'dimensions',
      row: 0,
      column: 0,
      detail: `width=${floor.width}, height=${floor.height}, valid range [10, 40]`,
    });
  }

  const spawnInBounds =
    floor.spawn.row >= 0 &&
    floor.spawn.row < floor.height &&
    floor.spawn.column >= 0 &&
    floor.spawn.column < floor.width;

  if (!spawnInBounds) {
    violations.push({
      check: 'spawn-in-bounds',
      row: floor.spawn.row,
      column: floor.spawn.column,
      detail: `spawn (${floor.spawn.row}, ${floor.spawn.column}) out of map bounds ${floor.width}x${floor.height}`,
    });
  }

  // If structural issues exist, bail early (Req 3.14)
  if (violations.length > 0) {
    return { valid: false, violations };
  }

  // Semantic checks
  const spawnIndex = floor.spawn.row * floor.width + floor.spawn.column;
  if (floor.collision[spawnIndex] !== 0) {
    violations.push({
      check: 'spawn-walkable',
      row: floor.spawn.row,
      column: floor.spawn.column,
    });
  }

  // Perimeter check (Req 3.5)
  for (let c = 0; c < floor.width; c++) {
    if (floor.collision[c] === 0) {
      violations.push({ check: 'perimeter-blocking', row: 0, column: c });
    }
    if (floor.collision[(floor.height - 1) * floor.width + c] === 0) {
      violations.push({ check: 'perimeter-blocking', row: floor.height - 1, column: c });
    }
  }
  for (let r = 1; r < floor.height - 1; r++) {
    if (floor.collision[r * floor.width] === 0) {
      violations.push({ check: 'perimeter-blocking', row: r, column: 0 });
    }
    if (floor.collision[r * floor.width + (floor.width - 1)] === 0) {
      violations.push({ check: 'perimeter-blocking', row: r, column: floor.width - 1 });
    }
  }

  // Reachability (single BFS from spawn)
  const reachable = reachableFrom(
    floor.collision,
    floor.width,
    floor.height,
    floor.spawn.row,
    floor.spawn.column,
  );

  for (const obj of floor.objectives) {
    const objIndex = obj.tile.row * floor.width + obj.tile.column;

    if (floor.collision[objIndex] !== 0) {
      violations.push({
        check: 'objective-walkable',
        row: obj.tile.row,
        column: obj.tile.column,
        detail: obj.type === 'door' ? 'door/boss-access' : obj.id,
      });
    }

    if (!reachable.has(objIndex)) {
      violations.push({
        check: 'objective-reachable',
        row: obj.tile.row,
        column: obj.tile.column,
        detail: obj.type === 'door' ? 'door/boss-access' : obj.id,
      });
    }
  }

  return { valid: violations.length === 0, violations };
}
