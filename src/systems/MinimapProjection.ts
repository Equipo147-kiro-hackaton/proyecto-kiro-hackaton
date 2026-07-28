/**
 * MinimapProjection — Pure system that computes minimap cell positions
 * from FloorDescriptor data and hero position.
 *
 * No import of 'phaser'.
 */

import type { Objective, TileRef } from '@/types';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface MinimapProjectionInput {
  width: number;
  height: number;
  collision: readonly number[];
  discovered: ReadonlySet<number>;
  heroTile: TileRef;
  objectives: readonly Objective[];
}

export type MinimapCellKind = 'walkable' | 'blocking' | 'hero' | 'objective';

export interface MinimapCell {
  x: number;
  y: number;
  size: number;
  kind: MinimapCellKind;
}

export interface MinimapProjectionResult {
  scale: number;
  originX: number;
  originY: number;
  widthPx: number;
  heightPx: number;
  cells: MinimapCell[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const MINIMAP_MAX_PX = 120;
export const MINIMAP_MARGIN_PX = 8;
export const DISCOVERY_RADIUS = 3;

const VIEWPORT_HEIGHT = 540;

// ─── Public Functions ────────────────────────────────────────────────────────

export function computeMinimapScale(width: number, height: number): number {
  const maxDim = Math.max(width, height);
  if (maxDim <= 0) return 0;
  return Math.max(1, Math.floor(MINIMAP_MAX_PX / maxDim));
}

export function discoveredAround(
  heroTile: TileRef,
  radius: number,
  width: number,
  height: number,
): number[] {
  const indices: number[] = [];
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const r = heroTile.row + dr;
      const c = heroTile.column + dc;
      if (r >= 0 && r < height && c >= 0 && c < width) {
        indices.push(r * width + c);
      }
    }
  }
  return indices;
}

export function selectActiveObjective(
  objectives: readonly Objective[],
  heroTile: TileRef,
  discovered: ReadonlySet<number>,
  width: number,
): Objective | null {
  let best: Objective | null = null;
  let bestDist = Infinity;
  let bestRow = Infinity;
  let bestCol = Infinity;

  for (const obj of objectives) {
    if (obj.activated) continue;
    const idx = obj.tile.row * width + obj.tile.column;
    if (!discovered.has(idx)) continue;

    const dist = Math.abs(obj.tile.row - heroTile.row) + Math.abs(obj.tile.column - heroTile.column);

    if (
      dist < bestDist ||
      (dist === bestDist && obj.tile.row < bestRow) ||
      (dist === bestDist && obj.tile.row === bestRow && obj.tile.column < bestCol)
    ) {
      best = obj;
      bestDist = dist;
      bestRow = obj.tile.row;
      bestCol = obj.tile.column;
    }
  }

  return best;
}

export function projectMinimap(input: MinimapProjectionInput): MinimapProjectionResult {
  const { width, height, collision, discovered, heroTile, objectives } = input;

  if (width < 1 || width > 40 || height < 1 || height > 40) {
    return {
      scale: 0,
      originX: MINIMAP_MARGIN_PX,
      originY: VIEWPORT_HEIGHT - MINIMAP_MARGIN_PX,
      widthPx: 0,
      heightPx: 0,
      cells: [],
    };
  }

  const scale = computeMinimapScale(width, height);
  const colsVisible = Math.min(width, Math.floor(MINIMAP_MAX_PX / scale));
  const rowsVisible = Math.min(height, Math.floor(MINIMAP_MAX_PX / scale));
  const widthPx = colsVisible * scale;
  const heightPx = rowsVisible * scale;
  const originX = MINIMAP_MARGIN_PX;
  const originY = VIEWPORT_HEIGHT - MINIMAP_MARGIN_PX - heightPx;

  const cells: MinimapCell[] = [];

  for (const idx of discovered) {
    const r = Math.floor(idx / width);
    const c = idx % width;
    if (r >= rowsVisible || c >= colsVisible) continue;

    const kind: MinimapCellKind = collision[idx] === 0 ? 'walkable' : 'blocking';
    cells.push({ x: originX + c * scale, y: originY + r * scale, size: scale, kind });
  }

  if (heroTile.row < rowsVisible && heroTile.column < colsVisible) {
    cells.push({ x: originX + heroTile.column * scale, y: originY + heroTile.row * scale, size: scale, kind: 'hero' });
  }

  const activeObj = selectActiveObjective(objectives, heroTile, discovered, width);
  if (activeObj && activeObj.tile.row < rowsVisible && activeObj.tile.column < colsVisible) {
    cells.push({ x: originX + activeObj.tile.column * scale, y: originY + activeObj.tile.row * scale, size: scale, kind: 'objective' });
  }

  return { scale, originX, originY, widthPx, heightPx, cells };
}
