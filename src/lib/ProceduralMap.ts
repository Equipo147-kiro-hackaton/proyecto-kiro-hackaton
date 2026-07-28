/**
 * ProceduralMap — Registers Tiled-compatible JSON tilemaps in Phaser's cache.
 *
 * The map generation logic has been moved to the MapPipeline system
 * (src/systems/MapPipeline.ts). This module now only provides the
 * registration utility used by ExplorationScene.
 */

import Phaser from 'phaser';

interface MapData {
  mapKey: string;
  json: object;
}

/**
 * Register a procedural map as a tilemap in Phaser's cache.
 */
export function registerProceduralMap(scene: Phaser.Scene, mapData: MapData): void {
  if (!scene.cache.tilemap.exists(mapData.mapKey)) {
    scene.cache.tilemap.add(mapData.mapKey, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: mapData.json });
  }
}
