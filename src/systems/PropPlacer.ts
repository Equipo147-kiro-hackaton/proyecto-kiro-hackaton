/**
 * PropPlacer — Pure system that places datacenter props deterministically
 * on a FloorDescriptor, respecting collision and reachability constraints.
 *
 * No import of 'phaser'.
 */

import type { FloorDescriptor, Prop, PropType, TileRef } from '@/types';
import { createPrng } from '@/lib/Prng';
import { allObjectivesReachable } from '@/systems/MapValidator';
import type { ThemeId } from '@/systems/ThemeSystem';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface PropPlacementRequest {
  floor: FloorDescriptor;
  seed: number;
  difficulty: ThemeId;
}

export interface PropPlacementResult {
  props: Prop[];
  /** Copy of the collision array with blocking props written. */
  collision: number[];
  /** Props layer for Tiled JSON: tileIndex per tile, 0 where no prop. */
  propsLayer: number[];
  /** Props discarded because they broke reachability. */
  discarded: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAX_PROPS_PER_FLOOR = 40;

const PROP_SEED_XOR = 0x5bf03635;

/** Blocking prop types. */
export const BLOCKING_PROP_TYPES: readonly PropType[] = [
  'server-rack',
  'server-tower',
  'power-panel',
];

/** Prop type → tile index in the puny-dungeon tileset. */
const PROP_TILE_INDEX: Record<PropType, number> = {
  'server-rack': 157,
  'crt-monitor': 133,
  'server-tower': 183,
  'power-panel': 184,
  'cable-bundle': 108,
  'energy-container': 132,
  'corrupt-container': 134,
  'padlock': 131,
};

/** Weighted prop type selection. Higher weight = more likely. */
const PROP_WEIGHTS: Array<{ type: PropType; weight: number; borderOnly: boolean }> = [
  { type: 'server-rack', weight: 28, borderOnly: true },
  { type: 'crt-monitor', weight: 18, borderOnly: false },
  { type: 'cable-bundle', weight: 16, borderOnly: false },
  { type: 'server-tower', weight: 14, borderOnly: false },
  { type: 'power-panel', weight: 10, borderOnly: false },
  { type: 'energy-container', weight: 10, borderOnly: false },
  { type: 'padlock', weight: 4, borderOnly: false },
];

const DIRS: readonly [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isBlockingProp(type: PropType): boolean {
  return (BLOCKING_PROP_TYPES as readonly string[]).includes(type);
}

function flatIndex(tile: TileRef, width: number): number {
  return tile.row * width + tile.column;
}

function hasCardinalBlockingNeighbor(
  tile: TileRef,
  collision: readonly number[],
  width: number,
  height: number,
): boolean {
  for (const [dr, dc] of DIRS) {
    const nr = tile.row + dr;
    const nc = tile.column + dc;
    if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
    if (collision[nr * width + nc] !== 0) return true;
  }
  return false;
}

// ─── Main Function ───────────────────────────────────────────────────────────

export function placeProps(request: PropPlacementRequest): PropPlacementResult {
  const { floor, seed, difficulty } = request;
  const prng = createPrng((seed ^ PROP_SEED_XOR) >>> 0);
  const collision = [...floor.collision];
  const propsLayer = new Array<number>(floor.width * floor.height).fill(0);
  const props: Prop[] = [];
  let discarded = 0;

  // Build exclusion set
  const excluded = new Set<number>();
  excluded.add(flatIndex(floor.spawn, floor.width));

  for (const obj of floor.objectives) {
    const objIdx = flatIndex(obj.tile, floor.width);
    excluded.add(objIdx);
    for (const [dr, dc] of DIRS) {
      const nr = obj.tile.row + dr;
      const nc = obj.tile.column + dc;
      if (nr >= 0 && nr < floor.height && nc >= 0 && nc < floor.width) {
        excluded.add(nr * floor.width + nc);
      }
    }
  }

  for (const cp of floor.circuitPaths) {
    for (const t of cp.tiles) {
      excluded.add(flatIndex(t, floor.width));
    }
  }

  for (const cor of floor.corridors) {
    for (const t of cor.tiles) {
      excluded.add(flatIndex(t, floor.width));
    }
  }

  const occupied = new Set<number>();
  const sortedRooms = [...floor.rooms].sort((a, b) => a.row - b.row || a.column - b.column);

  for (const room of sortedRooms) {
    if (props.length >= MAX_PROPS_PER_FLOOR) break;

    const roomTiles: TileRef[] = [];
    for (let r = room.row; r < room.row + room.height; r++) {
      for (let c = room.column; c < room.column + room.width; c++) {
        if (collision[r * floor.width + c] === 0) {
          roomTiles.push({ row: r, column: c });
        }
      }
    }

    const borderTiles = roomTiles.filter((t) =>
      hasCardinalBlockingNeighbor(t, collision, floor.width, floor.height),
    );
    const P = borderTiles.length;
    const minN = Math.floor(0.12 * P);
    const maxN = Math.floor(0.25 * P);

    if (maxN === 0) continue;

    const N = prng.intInRange(minN, maxN);

    const candidates = roomTiles.filter((t) => {
      const idx = flatIndex(t, floor.width);
      return !excluded.has(idx) && !occupied.has(idx);
    });

    const shuffled = prng.shuffle(candidates);
    let placed = 0;

    for (const tile of shuffled) {
      if (placed >= N || props.length >= MAX_PROPS_PER_FLOOR) break;

      const idx = flatIndex(tile, floor.width);
      const isBorder = hasCardinalBlockingNeighbor(tile, collision, floor.width, floor.height);

      let type = choosePropType(prng, isBorder);

      if (difficulty === 'hard' && type === 'energy-container') {
        type = 'corrupt-container';
      }

      const blocking = isBlockingProp(type);

      if (blocking) {
        if (type === 'server-rack' && !isBorder) continue;

        collision[idx] = PROP_TILE_INDEX[type];
        if (!allObjectivesReachable(collision, floor)) {
          collision[idx] = 0;
          discarded++;
          continue;
        }
      }

      const prop: Prop = {
        id: `prop-${props.length}`,
        type,
        tile,
        blocking,
        tileIndex: PROP_TILE_INDEX[type],
      };

      props.push(prop);
      propsLayer[idx] = prop.tileIndex;
      occupied.add(idx);
      placed++;
    }
  }

  return { props, collision, propsLayer, discarded };
}

function choosePropType(
  prng: { intInRange(min: number, max: number): number },
  isBorder: boolean,
): PropType {
  const available = isBorder
    ? PROP_WEIGHTS
    : PROP_WEIGHTS.filter((w) => !w.borderOnly);

  const totalWeight = available.reduce((sum, w) => sum + w.weight, 0);
  let roll = prng.intInRange(0, totalWeight - 1);

  for (const entry of available) {
    roll -= entry.weight;
    if (roll < 0) return entry.type;
  }

  return available[available.length - 1].type;
}
