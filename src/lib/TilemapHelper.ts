/**
 * TilemapHelper — Utility functions for parsing and validating Tiled tilemap data.
 * Independent of Phaser (pure logic, testable without DOM/canvas).
 */

export interface TiledObjectProperty {
  name: string;
  type: string;
  value: string | number | boolean;
}

export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  properties?: TiledObjectProperty[];
}

export interface TiledLayer {
  id: number;
  name: string;
  type: 'tilelayer' | 'objectgroup';
  data?: number[];
  objects?: TiledObject[];
  width?: number;
  height?: number;
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
}

/**
 * Get a property value from a Tiled object's properties array.
 */
export function getObjectProperty(
  obj: TiledObject,
  name: string
): string | number | boolean | undefined {
  if (!obj.properties) return undefined;
  const prop = obj.properties.find((p) => p.name === name);
  return prop?.value;
}

/**
 * Get all objects from the object layer with a specific objectType property.
 */
export function getObjectsByType(map: TiledMap, objectType: string): TiledObject[] {
  const objectLayer = map.layers.find(
    (l) => l.type === 'objectgroup' && l.name === 'objects'
  );
  if (!objectLayer?.objects) return [];

  return objectLayer.objects.filter((obj) => {
    const type = getObjectProperty(obj, 'objectType');
    return type === objectType;
  });
}

/**
 * Get the spawn point from the tilemap objects layer.
 * Returns pixel coordinates {x, y} or null if not found.
 */
export function getSpawnPoint(map: TiledMap): { x: number; y: number } | null {
  const spawns = getObjectsByType(map, 'spawn');
  if (spawns.length === 0) return null;
  return { x: spawns[0].x, y: spawns[0].y };
}

/**
 * Get the exit door from the tilemap objects layer.
 * Returns pixel coordinates {x, y} or null if not found.
 */
export function getExitDoor(map: TiledMap): { x: number; y: number } | null {
  const doors = getObjectsByType(map, 'door');
  if (doors.length === 0) return null;
  return { x: doors[0].x, y: doors[0].y };
}

/**
 * Check if a tile position is walkable (not blocked by collision).
 * Tile index 0 means empty/walkable. Any other index means collision.
 * @param collisionData - flat array of tile indices for the collision layer
 * @param width - map width in tiles
 * @param tileX - x position in tile coordinates
 * @param tileY - y position in tile coordinates
 */
export function isTileWalkable(
  collisionData: number[],
  width: number,
  tileX: number,
  tileY: number
): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= width) return false;
  const height = collisionData.length / width;
  if (tileY >= height) return false;

  const index = tileY * width + tileX;
  return collisionData[index] === 0;
}

/**
 * Convert pixel coordinates to tile coordinates.
 */
export function pixelToTile(
  pixelX: number,
  pixelY: number,
  tileWidth: number,
  tileHeight: number
): { tileX: number; tileY: number } {
  return {
    tileX: Math.floor(pixelX / tileWidth),
    tileY: Math.floor(pixelY / tileHeight),
  };
}

/**
 * Convert tile coordinates to pixel coordinates (top-left of tile).
 */
export function tileToPixel(
  tileX: number,
  tileY: number,
  tileWidth: number,
  tileHeight: number
): { pixelX: number; pixelY: number } {
  return {
    pixelX: tileX * tileWidth,
    pixelY: tileY * tileHeight,
  };
}

/**
 * Validate that a tilemap has the required structure:
 * - At least a ground layer
 * - At least a collision layer
 * - At least one spawn point
 * - At least one exit door
 */
export function validateTilemap(map: TiledMap): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const groundLayer = map.layers.find(
    (l) => l.type === 'tilelayer' && l.name === 'ground'
  );
  if (!groundLayer) errors.push('Missing ground layer');

  const collisionLayer = map.layers.find(
    (l) => l.type === 'tilelayer' && l.name === 'collision'
  );
  if (!collisionLayer) errors.push('Missing collision layer');

  const spawn = getSpawnPoint(map);
  if (!spawn) errors.push('Missing spawn point');

  const exit = getExitDoor(map);
  if (!exit) errors.push('Missing exit door');

  return { valid: errors.length === 0, errors };
}

/**
 * BFS to check if there's a navigable path from spawn to exit
 * using the collision layer data.
 */
export function hasNavigablePath(
  collisionData: number[],
  width: number,
  startTileX: number,
  startTileY: number,
  endTileX: number,
  endTileY: number
): boolean {
  const height = collisionData.length / width;
  const visited = new Set<string>();
  const queue: Array<{ x: number; y: number }> = [{ x: startTileX, y: startTileY }];
  visited.add(`${startTileX},${startTileY}`);

  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
    { dx: 1, dy: 0 },  // right
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.x === endTileX && current.y === endTileY) {
      return true;
    }

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const key = `${nx},${ny}`;

      if (
        nx >= 0 && nx < width &&
        ny >= 0 && ny < height &&
        !visited.has(key) &&
        isTileWalkable(collisionData, width, nx, ny)
      ) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return false;
}
