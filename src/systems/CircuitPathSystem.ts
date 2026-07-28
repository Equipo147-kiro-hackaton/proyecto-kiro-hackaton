/**
 * CircuitPathSystem — Pure system that computes luminous circuit paths
 * from spawn to each objective using BFS shortest paths.
 *
 * No import of 'phaser'.
 */

import type { CircuitPath, FloorDescriptor, TileRef, Violation } from '@/types';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface CircuitPathResult {
  paths: CircuitPath[];
  /** One violation per unreachable objective; remaining circuits are preserved. */
  violations: Violation[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Fixed exploration order for deterministic BFS: up, left, right, down. */
const DIRS: readonly [number, number][] = [[-1, 0], [0, -1], [0, 1], [1, 0]];

// ─── Public API ──────────────────────────────────────────────────────────────

/** Maximum allowed circuit length: floor(1.5 × shortest path length). */
export function maxCircuitLength(shortestLength: number): number {
  return Math.floor(1.5 * shortestLength);
}

/**
 * BFS shortest path with fixed exploration order [up, left, right, down].
 * Returns the path as array of TileRef (including start and end), or null
 * if unreachable. The fixed order makes the path deterministic.
 */
export function shortestPath(
  collision: readonly number[],
  width: number,
  height: number,
  from: TileRef,
  to: TileRef,
): TileRef[] | null {
  if (from.row === to.row && from.column === to.column) {
    return [{ row: from.row, column: from.column }];
  }

  const fromIdx = from.row * width + from.column;
  const toIdx = to.row * width + to.column;

  if (collision[fromIdx] !== 0 || collision[toIdx] !== 0) return null;

  const visited = new Set<number>();
  visited.add(fromIdx);

  const pred = new Map<number, number>();
  pred.set(fromIdx, -1);

  const queue: number[] = [fromIdx];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    const cr = Math.floor(current / width);
    const cc = current % width;

    for (const [dr, dc] of DIRS) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
      const ni = nr * width + nc;
      if (collision[ni] !== 0 || visited.has(ni)) continue;

      visited.add(ni);
      pred.set(ni, current);

      if (ni === toIdx) {
        const path: TileRef[] = [];
        let idx = ni;
        while (idx !== -1) {
          path.push({ row: Math.floor(idx / width), column: idx % width });
          idx = pred.get(idx) ?? -1;
        }
        path.reverse();
        return path;
      }

      queue.push(ni);
    }
  }

  return null;
}

/**
 * Build circuit paths from spawn to each objective.
 * Uses BFS shortest path (deterministic due to fixed exploration order).
 */
export function buildCircuitPaths(floor: FloorDescriptor): CircuitPathResult {
  const paths: CircuitPath[] = [];
  const violations: Violation[] = [];

  for (const obj of floor.objectives) {
    if (obj.tile.row === floor.spawn.row && obj.tile.column === floor.spawn.column) {
      paths.push({ objectiveId: obj.id, tiles: [{ row: floor.spawn.row, column: floor.spawn.column }] });
      continue;
    }

    const path = shortestPath(
      floor.collision,
      floor.width,
      floor.height,
      floor.spawn,
      obj.tile,
    );

    if (path === null) {
      violations.push({
        check: 'objective-reachable',
        row: obj.tile.row,
        column: obj.tile.column,
        detail: `circuit path unreachable for ${obj.id}`,
      });
      continue;
    }

    paths.push({ objectiveId: obj.id, tiles: path });
  }

  return { paths, violations };
}

/**
 * Determine the color for a circuit tile based on activation state.
 * Returns 'primary' if at least one circuit through this tile leads to
 * a non-activated objective, 'secondary' otherwise.
 */
export function circuitTileColor(
  tile: TileRef,
  paths: readonly CircuitPath[],
  activatedObjectiveIds: ReadonlySet<string>,
): 'primary' | 'secondary' {
  for (const path of paths) {
    if (activatedObjectiveIds.has(path.objectiveId)) continue;
    const inPath = path.tiles.some((t) => t.row === tile.row && t.column === tile.column);
    if (inPath) return 'primary';
  }
  return 'secondary';
}
