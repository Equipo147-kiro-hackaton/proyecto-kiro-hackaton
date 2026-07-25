/**
 * MovementSystem — Pure logic for tile-based movement and collision detection.
 * Independent of Phaser (testable without DOM/canvas).
 */

export type MovementDirection = 'up' | 'down' | 'left' | 'right';

export interface TilePosition {
  tileX: number;
  tileY: number;
}

export interface MovementResult {
  success: boolean;
  newPosition: TilePosition;
  blocked: boolean;
}

/**
 * Get the delta (dx, dy) for a movement direction.
 */
export function getDirectionDelta(direction: MovementDirection): { dx: number; dy: number } {
  switch (direction) {
    case 'up': return { dx: 0, dy: -1 };
    case 'down': return { dx: 0, dy: 1 };
    case 'left': return { dx: -1, dy: 0 };
    case 'right': return { dx: 1, dy: 0 };
  }
}

/**
 * Calculate the target tile position after moving in a direction.
 */
export function getTargetTile(current: TilePosition, direction: MovementDirection): TilePosition {
  const delta = getDirectionDelta(direction);
  return {
    tileX: current.tileX + delta.dx,
    tileY: current.tileY + delta.dy,
  };
}

/**
 * Attempt a movement: check if target is within bounds and walkable.
 * @param current - Current tile position
 * @param direction - Direction to move
 * @param collisionData - Flat array of collision tile indices (0 = walkable)
 * @param mapWidth - Width of the map in tiles
 * @param mapHeight - Height of the map in tiles
 * @returns MovementResult indicating success or failure
 */
export function attemptMove(
  current: TilePosition,
  direction: MovementDirection,
  collisionData: number[],
  mapWidth: number,
  mapHeight: number
): MovementResult {
  const target = getTargetTile(current, direction);

  // Bounds check
  if (target.tileX < 0 || target.tileX >= mapWidth || target.tileY < 0 || target.tileY >= mapHeight) {
    return { success: false, newPosition: current, blocked: true };
  }

  // Collision check
  const tileIndex = target.tileY * mapWidth + target.tileX;
  const tileValue = collisionData[tileIndex];

  if (tileValue !== 0) {
    // Blocked by wall/obstacle
    return { success: false, newPosition: current, blocked: true };
  }

  // Success
  return { success: true, newPosition: target, blocked: false };
}

/**
 * Get the tile the entity is facing (one step ahead without moving).
 */
export function getFacingTile(current: TilePosition, direction: MovementDirection): TilePosition {
  return getTargetTile(current, direction);
}

/**
 * Check if two tile positions are adjacent (Manhattan distance = 1).
 */
export function areTilesAdjacent(a: TilePosition, b: TilePosition): boolean {
  const dx = Math.abs(a.tileX - b.tileX);
  const dy = Math.abs(a.tileY - b.tileY);
  return (dx + dy) === 1;
}

/**
 * Check if two tile positions are within a certain range.
 * Uses Chebyshev distance (max of dx, dy).
 */
export function areTilesInRange(a: TilePosition, b: TilePosition, range: number): boolean {
  const dx = Math.abs(a.tileX - b.tileX);
  const dy = Math.abs(a.tileY - b.tileY);
  return Math.max(dx, dy) <= range;
}

/**
 * Convert pixel position to tile position.
 */
export function pixelToTile(pixelX: number, pixelY: number, tileSize: number): TilePosition {
  return {
    tileX: Math.floor(pixelX / tileSize),
    tileY: Math.floor(pixelY / tileSize),
  };
}

/**
 * Convert tile position to pixel position (center of tile).
 */
export function tileToCenterPixel(
  tileX: number,
  tileY: number,
  tileSize: number
): { pixelX: number; pixelY: number } {
  return {
    pixelX: tileX * tileSize + tileSize / 2,
    pixelY: tileY * tileSize + tileSize / 2,
  };
}
