/**
 * TilemapSerializer — Pure system that converts a FloorDescriptor into
 * a Tiled-format JSON object for Phaser tilemap loading.
 *
 * No import of 'phaser'.
 */

import type { FloorDescriptor, TileRef } from '@/types';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface TiledTileLayer {
  data: number[];
  height: number;
  id: number;
  name: 'ground' | 'props' | 'collision';
  opacity: 1;
  type: 'tilelayer';
  visible: true;
  width: number;
  x: 0;
  y: 0;
}

export interface TiledObjectEntry {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Array<{ name: string; type: string; value: string | number | boolean }>;
}

export interface TiledObjectLayer {
  draworder: 'topdown';
  id: number;
  name: 'objects';
  objects: TiledObjectEntry[];
  opacity: 1;
  type: 'objectgroup';
  visible: true;
  x: 0;
  y: 0;
}

export interface TiledTilesetRef {
  columns: 26;
  firstgid: 1;
  image: string;
  imageheight: number;
  imagewidth: number;
  margin: 0;
  name: 'puny-dungeon';
  spacing: 0;
  tilecount: number;
  tileheight: 16;
  tilewidth: 16;
}

export interface TiledMapJson {
  compressionlevel: -1;
  height: number;
  infinite: false;
  layers: Array<TiledTileLayer | TiledObjectLayer>;
  nextlayerid: number;
  nextobjectid: number;
  orientation: 'orthogonal';
  renderorder: 'right-down';
  tiledversion: string;
  tileheight: 16;
  tilesets: [TiledTilesetRef];
  tilewidth: 16;
  type: 'map';
  version: string;
  width: number;
}

export type SerializeErrorCode =
  | 'ground-length-mismatch'
  | 'props-length-mismatch'
  | 'collision-length-mismatch'
  | 'dimensions-out-of-range'
  | 'spawn-out-of-bounds';

export interface SerializeError {
  code: SerializeErrorCode;
  message: string;
  expected?: number;
  received?: number;
}

export type SerializeResult =
  | { ok: true; mapKey: string; json: TiledMapJson }
  | { ok: false; error: SerializeError };

// ─── Constants ───────────────────────────────────────────────────────────────

const TILE_SIZE = 16;
const TILESET_COLUMNS = 26;
const TILESET_ROWS = 20;
const TILESET_IMAGE = 'puny-dungeon.png';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tileRefToString(tiles: readonly TileRef[]): string {
  return tiles.map((t) => `${t.row},${t.column}`).join(';');
}

// ─── Main Function ───────────────────────────────────────────────────────────

export function serializeFloor(floor: FloorDescriptor): SerializeResult {
  const expectedSize = floor.width * floor.height;

  if (floor.ground.length !== expectedSize) {
    return { ok: false, error: { code: 'ground-length-mismatch', message: `ground layer has ${floor.ground.length} values, expected ${expectedSize}`, expected: expectedSize, received: floor.ground.length } };
  }
  if (floor.propsLayer.length !== expectedSize) {
    return { ok: false, error: { code: 'props-length-mismatch', message: `props layer has ${floor.propsLayer.length} values, expected ${expectedSize}`, expected: expectedSize, received: floor.propsLayer.length } };
  }
  if (floor.collision.length !== expectedSize) {
    return { ok: false, error: { code: 'collision-length-mismatch', message: `collision layer has ${floor.collision.length} values, expected ${expectedSize}`, expected: expectedSize, received: floor.collision.length } };
  }
  if (floor.width < 10 || floor.width > 40 || floor.height < 10 || floor.height > 40) {
    return { ok: false, error: { code: 'dimensions-out-of-range', message: `dimensions ${floor.width}x${floor.height} out of valid range [10,40]` } };
  }
  if (floor.spawn.row < 0 || floor.spawn.row >= floor.height || floor.spawn.column < 0 || floor.spawn.column >= floor.width) {
    return { ok: false, error: { code: 'spawn-out-of-bounds', message: `spawn (${floor.spawn.row},${floor.spawn.column}) out of bounds` } };
  }

  const groundLayer: TiledTileLayer = { data: [...floor.ground], height: floor.height, id: 1, name: 'ground', opacity: 1, type: 'tilelayer', visible: true, width: floor.width, x: 0, y: 0 };
  const propsLayer: TiledTileLayer = { data: [...floor.propsLayer], height: floor.height, id: 2, name: 'props', opacity: 1, type: 'tilelayer', visible: true, width: floor.width, x: 0, y: 0 };
  const collisionLayer: TiledTileLayer = { data: [...floor.collision], height: floor.height, id: 3, name: 'collision', opacity: 1, type: 'tilelayer', visible: true, width: floor.width, x: 0, y: 0 };

  const objects: TiledObjectEntry[] = [];
  let objectId = 1;

  objects.push({
    id: objectId++, name: 'spawn', type: 'spawn',
    x: floor.spawn.column * TILE_SIZE, y: floor.spawn.row * TILE_SIZE,
    width: TILE_SIZE, height: TILE_SIZE,
    properties: [
      { name: 'row', type: 'int', value: floor.spawn.row },
      { name: 'column', type: 'int', value: floor.spawn.column },
    ],
  });

  for (const obj of floor.objectives) {
    const properties: Array<{ name: string; type: string; value: string | number | boolean }> = [
      { name: 'objectType', type: 'string', value: obj.type },
      { name: 'objectiveType', type: 'string', value: obj.type },
      { name: 'row', type: 'int', value: obj.tile.row },
      { name: 'column', type: 'int', value: obj.tile.column },
      { name: 'roomId', type: 'string', value: obj.roomId },
      { name: 'activated', type: 'bool', value: obj.activated },
    ];

    // Only terminals get fragmentId and puzzleId
    if (obj.type === 'terminal') {
      properties.push({ name: 'fragmentId', type: 'string', value: obj.fragmentId ?? `fragment-${obj.id}` });
      properties.push({ name: 'puzzleId', type: 'string', value: obj.puzzleId ?? `puzzle-${obj.id}` });
    }

    objects.push({
      id: objectId++, name: obj.id, type: obj.type,
      x: obj.tile.column * TILE_SIZE, y: obj.tile.row * TILE_SIZE,
      width: TILE_SIZE, height: TILE_SIZE,
      properties,
    });
  }

  for (const prop of floor.props) {
    objects.push({
      id: objectId++, name: prop.id, type: 'prop',
      x: prop.tile.column * TILE_SIZE, y: prop.tile.row * TILE_SIZE,
      width: TILE_SIZE, height: TILE_SIZE,
      properties: [
        { name: 'objectType', type: 'string', value: 'prop' },
        { name: 'propType', type: 'string', value: prop.type },
        { name: 'row', type: 'int', value: prop.tile.row },
        { name: 'column', type: 'int', value: prop.tile.column },
        { name: 'blocking', type: 'bool', value: prop.blocking },
        { name: 'tileIndex', type: 'int', value: prop.tileIndex },
      ],
    });
  }

  for (const cp of floor.circuitPaths) {
    objects.push({
      id: objectId++, name: cp.objectiveId, type: 'circuit',
      x: 0, y: 0, width: 0, height: 0,
      properties: [
        { name: 'objectType', type: 'string', value: 'circuit' },
        { name: 'objectiveId', type: 'string', value: cp.objectiveId },
        { name: 'tiles', type: 'string', value: tileRefToString(cp.tiles) },
      ],
    });
  }

  const objectsLayer: TiledObjectLayer = { draworder: 'topdown', id: 4, name: 'objects', objects, opacity: 1, type: 'objectgroup', visible: true, x: 0, y: 0 };

  const tileset: TiledTilesetRef = { columns: 26, firstgid: 1, image: TILESET_IMAGE, imageheight: TILESET_ROWS * TILE_SIZE, imagewidth: TILESET_COLUMNS * TILE_SIZE, margin: 0, name: 'puny-dungeon', spacing: 0, tilecount: TILESET_COLUMNS * TILESET_ROWS, tileheight: TILE_SIZE, tilewidth: TILE_SIZE };

  const mapKey = `floor-${floor.difficulty}-${floor.levelNumber}-${floor.seed}`;

  const json: TiledMapJson = {
    compressionlevel: -1, height: floor.height, infinite: false,
    layers: [groundLayer, propsLayer, collisionLayer, objectsLayer],
    nextlayerid: 5, nextobjectid: objectId, orientation: 'orthogonal',
    renderorder: 'right-down', tiledversion: '1.10.2', tileheight: TILE_SIZE,
    tilesets: [tileset], tilewidth: TILE_SIZE, type: 'map', version: '1.10', width: floor.width,
  };

  return { ok: true, mapKey, json };
}
