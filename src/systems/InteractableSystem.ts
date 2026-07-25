/**
 * InteractableSystem — Pure logic for managing interactable objects in a level.
 * Independent of Phaser (testable without DOM/canvas).
 *
 * Responsibilities:
 * - Parse interactables from tilemap object data
 * - Detect which interactable (if any) the hero can interact with
 * - Track activation state (which objects have been activated)
 * - Provide interaction range checking
 */

import type { Interactable, InteractableType } from '@/types';

export interface TiledObjectData {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: Array<{ name: string; type: string; value: string | number | boolean }>;
}

/**
 * Parse interactables from Tiled object layer data.
 * Converts pixel coordinates to tile coordinates.
 */
export function parseInteractables(
  objects: TiledObjectData[],
  tileWidth: number,
  tileHeight: number
): Interactable[] {
  const interactables: Interactable[] = [];

  for (const obj of objects) {
    const objectType = getProperty(obj, 'objectType') as string | undefined;

    // Only include recognized interactable types
    const validTypes: InteractableType[] = ['terminal', 'server', 'whiteboard', 'door', 'checkpoint'];
    if (!objectType || !validTypes.includes(objectType as InteractableType)) {
      continue;
    }

    const interactable: Interactable = {
      id: `interactable-${obj.id}`,
      type: objectType as InteractableType,
      tileX: Math.floor(obj.x / tileWidth),
      tileY: Math.floor(obj.y / tileHeight),
      fragmentId: getProperty(obj, 'fragmentId') as string | undefined,
      puzzleId: getProperty(obj, 'puzzleId') as string | undefined,
      locked: getProperty(obj, 'locked') as boolean | undefined,
      activated: false,
    };

    interactables.push(interactable);
  }

  return interactables;
}

/**
 * Find the closest interactable within interaction range of the hero.
 * Returns the interactable if found, or null.
 *
 * Interaction range: hero must be adjacent (Manhattan distance 1)
 * AND facing the interactable.
 */
export function findInteractableInRange(
  heroTileX: number,
  heroTileY: number,
  facingDx: number,
  facingDy: number,
  interactables: Interactable[]
): Interactable | null {
  // The tile the hero is facing
  const facingTileX = heroTileX + facingDx;
  const facingTileY = heroTileY + facingDy;

  // Check if any interactable is at the facing tile
  for (const obj of interactables) {
    if (obj.tileX === facingTileX && obj.tileY === facingTileY) {
      return obj;
    }
  }

  return null;
}

/**
 * Find any interactable adjacent to the hero (within Manhattan distance 1),
 * regardless of facing direction. Used for proximity indicator.
 */
export function findNearbyInteractables(
  heroTileX: number,
  heroTileY: number,
  interactables: Interactable[],
  range = 1
): Interactable[] {
  return interactables.filter((obj) => {
    const dx = Math.abs(obj.tileX - heroTileX);
    const dy = Math.abs(obj.tileY - heroTileY);
    return (dx + dy) <= range && (dx + dy) > 0;
  });
}

/**
 * Mark an interactable as activated.
 * Returns true if the interactable was found and activated, false otherwise.
 */
export function activateInteractable(
  interactableId: string,
  interactables: Interactable[]
): boolean {
  const obj = interactables.find((i) => i.id === interactableId);
  if (!obj) return false;
  obj.activated = true;
  return true;
}

/**
 * Check if all puzzle/fragment interactables in a level have been activated.
 */
export function areAllFragmentInteractablesActivated(interactables: Interactable[]): boolean {
  const fragmentInteractables = interactables.filter((i) => i.fragmentId != null);
  if (fragmentInteractables.length === 0) return true;
  return fragmentInteractables.every((i) => i.activated);
}

/**
 * Get count of activated vs total fragment interactables.
 */
export function getFragmentProgress(interactables: Interactable[]): {
  activated: number;
  total: number;
} {
  const fragmentInteractables = interactables.filter((i) => i.fragmentId != null);
  const activated = fragmentInteractables.filter((i) => i.activated).length;
  return { activated, total: fragmentInteractables.length };
}

/**
 * Get a property from a Tiled object's properties array.
 */
function getProperty(
  obj: TiledObjectData,
  name: string
): string | number | boolean | undefined {
  if (!obj.properties) return undefined;
  const prop = obj.properties.find((p) => p.name === name);
  return prop?.value;
}
