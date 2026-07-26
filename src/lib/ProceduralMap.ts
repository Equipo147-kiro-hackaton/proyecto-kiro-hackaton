/**
 * ProceduralMap — Generates Tiled-compatible JSON tilemaps at runtime.
 * Uses the Puny Dungeon tileset (26 columns x 20 rows, 16x16 tiles).
 *
 * This replaces static .json tilemap files with procedurally generated maps,
 * ensuring each playthrough has a different layout.
 *
 * Tileset layout (puny-dungeon.png, 416x320, 16x16 tiles):
 * - Row 0-2: Wall tiles (variations)
 * - Row 3-5: Floor tiles (stone, dirt, mossy)
 * - Row 6-7: Door, chest, stairs, pillars
 * - Row 8-10: Traps (spikes, blades, pits)
 * - Row 11-14: Characters, items
 * - Row 15-19: Water, lava, decorations
 */

import Phaser from 'phaser';
import type { ScenarioType } from '@/systems/MapLoader';

const TILESET_COLS = 26;
const TILE_SIZE = 16;

// Tile indices (1-based for Tiled format, 0 = empty)
const TILES = {
  // Floors (row 3-4 area, approximate)
  FLOOR_STONE_1: 79,
  FLOOR_STONE_2: 80,
  FLOOR_STONE_3: 81,
  FLOOR_DIRT_1: 105,
  FLOOR_DIRT_2: 106,
  FLOOR_MOSSY: 107,

  // Walls (row 0-2)
  WALL_TOP: 1,
  WALL_MID: 27,
  WALL_BOT: 53,
  WALL_LEFT: 2,
  WALL_RIGHT: 3,
  WALL_CORNER_TL: 4,
  WALL_CORNER_TR: 5,

  // Decorations
  PILLAR: 157,
  TORCH: 158,
  CRACK: 82,
  MOSS: 108,

  // Objects
  DOOR: 131,
  CHEST: 132,
  TERMINAL: 133,
  CRATE: 134,
} as const;

interface MapData {
  mapKey: string;
  json: object;
}

/**
 * Generate a procedural dungeon map for a given level.
 * Returns a Tiled-compatible JSON object ready to be loaded by Phaser.
 */
export function generateProceduralMap(
  levelNumber: number,
  scenario: ScenarioType,
  mapWidth = 20,
  mapHeight = 15
): MapData {
  const seed = levelNumber * 31337;
  let rng = seed;
  const next = (): number => {
    rng = (rng * 1664525 + 1013904223) & 0x7fffffff;
    return rng / 0x7fffffff;
  };

  // Generate ground layer (all floor tiles with variation)
  const groundLayer: number[] = [];
  const collisionLayer: number[] = [];

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      // Borders are walls
      if (x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1) {
        groundLayer.push(TILES.WALL_MID);
        collisionLayer.push(TILES.WALL_MID);
      }
      // Second ring — partial walls (corridors)
      else if (x === 1 || y === 1 || x === mapWidth - 2 || y === mapHeight - 2) {
        groundLayer.push(TILES.WALL_BOT);
        collisionLayer.push(TILES.WALL_BOT);
      }
      // Interior — floors with variation
      else {
        const floorVariant = next();
        if (floorVariant < 0.6) groundLayer.push(TILES.FLOOR_STONE_1);
        else if (floorVariant < 0.8) groundLayer.push(TILES.FLOOR_STONE_2);
        else if (floorVariant < 0.9) groundLayer.push(TILES.FLOOR_STONE_3);
        else groundLayer.push(TILES.FLOOR_MOSSY);
        collisionLayer.push(0);
      }
    }
  }

  // Add some interior walls/pillars for interest (10-15% of interior)
  for (let y = 3; y < mapHeight - 3; y++) {
    for (let x = 3; x < mapWidth - 3; x++) {
      const idx = y * mapWidth + x;
      if (collisionLayer[idx] !== 0) continue;
      if (next() < 0.08) {
        collisionLayer[idx] = TILES.PILLAR;
        groundLayer[idx] = TILES.PILLAR;
      }
    }
  }

  // Build objects array for interactables (spawn, terminals, door)
  const objects: Array<{
    id: number;
    name: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    properties: Array<{ name: string; type: string; value: string | number | boolean }>;
  }> = [];

  let objId = 1;

  // Spawn point (near top-left interior)
  objects.push({
    id: objId++,
    name: 'spawn',
    type: 'spawn',
    x: 3 * TILE_SIZE,
    y: 3 * TILE_SIZE,
    width: TILE_SIZE,
    height: TILE_SIZE,
    properties: [{ name: 'objectType', type: 'string', value: 'spawn' }],
  });

  // Place 5 terminals (fragment interactables) at random walkable positions
  const terminalPositions: Array<{ x: number; y: number }> = [];
  let attempts = 0;
  while (terminalPositions.length < 5 && attempts < 200) {
    attempts++;
    const tx = 3 + Math.floor(next() * (mapWidth - 6));
    const ty = 3 + Math.floor(next() * (mapHeight - 6));
    const idx = ty * mapWidth + tx;
    if (collisionLayer[idx] !== 0) continue;
    if (tx === 3 && ty === 3) continue; // Skip spawn
    if (terminalPositions.some(p => p.x === tx && p.y === ty)) continue;
    terminalPositions.push({ x: tx, y: ty });
  }

  terminalPositions.forEach((pos, i) => {
    objects.push({
      id: objId++,
      name: `terminal_${i}`,
      type: 'terminal',
      x: pos.x * TILE_SIZE,
      y: pos.y * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
      properties: [
        { name: 'objectType', type: 'string', value: 'terminal' },
        { name: 'fragmentId', type: 'string', value: `frag-l${levelNumber}-0${i + 1}` },
        { name: 'puzzleId', type: 'string', value: `puzzle-${i}` },
      ],
    });
  });

  // Place door (exit) near bottom-right
  const doorX = mapWidth - 4;
  const doorY = mapHeight - 4;
  // Ensure door tile is walkable
  const doorIdx = doorY * mapWidth + doorX;
  collisionLayer[doorIdx] = 0;
  groundLayer[doorIdx] = TILES.FLOOR_STONE_1;

  objects.push({
    id: objId++,
    name: 'exit_door',
    type: 'door',
    x: doorX * TILE_SIZE,
    y: doorY * TILE_SIZE,
    width: TILE_SIZE,
    height: TILE_SIZE,
    properties: [
      { name: 'objectType', type: 'string', value: 'door' },
    ],
  });

  // Build Tiled JSON format
  const tiledJson = {
    compressionlevel: -1,
    height: mapHeight,
    infinite: false,
    layers: [
      {
        data: groundLayer,
        height: mapHeight,
        id: 1,
        name: 'ground',
        opacity: 1,
        type: 'tilelayer',
        visible: true,
        width: mapWidth,
        x: 0,
        y: 0,
      },
      {
        data: collisionLayer,
        height: mapHeight,
        id: 2,
        name: 'collision',
        opacity: 1,
        type: 'tilelayer',
        visible: true,
        width: mapWidth,
        x: 0,
        y: 0,
      },
      {
        draworder: 'topdown',
        id: 3,
        name: 'objects',
        objects,
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
    nextlayerid: 4,
    nextobjectid: objId,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.10',
    tileheight: TILE_SIZE,
    tilesets: [
      {
        columns: TILESET_COLS,
        firstgid: 1,
        image: '../tilesets/puny-dungeon.png',
        imageheight: 320,
        imagewidth: 416,
        margin: 0,
        name: 'puny-dungeon',
        spacing: 0,
        tilecount: TILESET_COLS * 20,
        tileheight: TILE_SIZE,
        tilewidth: TILE_SIZE,
      },
    ],
    tilewidth: TILE_SIZE,
    type: 'map',
    version: '1.10',
    width: mapWidth,
  };

  const mapKey = `proc-map-level-${levelNumber}`;
  return { mapKey, json: tiledJson };
}

/**
 * Register a procedural map as a tilemap in Phaser's cache.
 */
export function registerProceduralMap(scene: Phaser.Scene, mapData: MapData): void {
  if (!scene.cache.tilemap.exists(mapData.mapKey)) {
    scene.cache.tilemap.add(mapData.mapKey, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: mapData.json });
  }
}
