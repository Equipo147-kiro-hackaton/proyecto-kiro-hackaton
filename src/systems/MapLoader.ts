/**
 * MapLoader — Maps level numbers to tilemap assets and tilesets.
 * Provides the configuration needed to load the correct map for each level.
 *
 * Level → Scenario mapping:
 * - Levels 1:     Office (onboarding)
 * - Levels 2–3:   Server Room
 * - Levels 4–5:   Cloud (abstract)
 */

export type ScenarioType = 'office' | 'server' | 'cloud';

export interface MapConfig {
  /** Key used for Phaser's tilemapTiledJSON loader */
  mapKey: string;
  /** Path to the tilemap JSON file (relative to public/) */
  mapPath: string;
  /** Key used for the tileset image in Phaser */
  tilesetKey: string;
  /** Path to the tileset image (relative to public/) */
  tilesetPath: string;
  /** Name of the tileset as defined in the Tiled JSON */
  tilesetName: string;
  /** Scenario type for visual/audio theming */
  scenario: ScenarioType;
  /** Display name for the level */
  displayName: string;
  /** Associated level ID for fragments */
  levelId: string;
}

/**
 * Map configuration registry.
 * Each level number maps to its tilemap configuration.
 */
const MAP_CONFIGS: Record<number, MapConfig> = {
  1: {
    mapKey: 'map-level-1',
    mapPath: 'assets/tilemaps/level-office.json',
    tilesetKey: 'tiles-office',
    tilesetPath: 'assets/tilesets/office-tileset.png',
    tilesetName: 'office',
    scenario: 'office',
    displayName: 'The Office — Onboarding',
    levelId: 'level-1',
  },
  2: {
    mapKey: 'map-level-2',
    mapPath: 'assets/tilemaps/level-server.json',
    tilesetKey: 'tiles-server',
    tilesetPath: 'assets/tilesets/server-tileset.png',
    tilesetName: 'server',
    scenario: 'server',
    displayName: 'Server Room — Build Pipeline',
    levelId: 'level-2',
  },
  3: {
    mapKey: 'map-level-3',
    mapPath: 'assets/tilemaps/level-server.json',
    tilesetKey: 'tiles-server',
    tilesetPath: 'assets/tilesets/server-tileset.png',
    tilesetName: 'server',
    scenario: 'server',
    displayName: 'Server Room — Deployment',
    levelId: 'level-3',
  },
  4: {
    mapKey: 'map-level-4',
    mapPath: 'assets/tilemaps/level-cloud.json',
    tilesetKey: 'tiles-cloud',
    tilesetPath: 'assets/tilesets/cloud-tileset.png',
    tilesetName: 'cloud',
    scenario: 'cloud',
    displayName: 'Cloud — Security Pipeline',
    levelId: 'level-4',
  },
  5: {
    mapKey: 'map-level-5',
    mapPath: 'assets/tilemaps/level-cloud.json',
    tilesetKey: 'tiles-cloud',
    tilesetPath: 'assets/tilesets/cloud-tileset.png',
    tilesetName: 'cloud',
    scenario: 'cloud',
    displayName: 'Cloud — Full Production',
    levelId: 'level-5',
  },
};

/**
 * Get the map configuration for a specific level number.
 * Returns null if the level doesn't exist.
 */
export function getMapConfig(levelNumber: number): MapConfig | null {
  return MAP_CONFIGS[levelNumber] ?? null;
}

/**
 * Get all available level numbers.
 */
export function getAvailableLevels(): number[] {
  return Object.keys(MAP_CONFIGS).map(Number).sort((a, b) => a - b);
}

/**
 * Get the total number of levels.
 */
export function getTotalLevels(): number {
  return Object.keys(MAP_CONFIGS).length;
}

/**
 * Get the scenario type for a level.
 */
export function getScenarioForLevel(levelNumber: number): ScenarioType | null {
  const config = MAP_CONFIGS[levelNumber];
  return config?.scenario ?? null;
}

/**
 * Get all unique tileset keys needed for preloading.
 * Returns deduplicated list of {key, path} pairs.
 */
export function getUniqueTilesets(): Array<{ key: string; path: string }> {
  const seen = new Set<string>();
  const result: Array<{ key: string; path: string }> = [];

  for (const config of Object.values(MAP_CONFIGS)) {
    if (!seen.has(config.tilesetKey)) {
      seen.add(config.tilesetKey);
      result.push({ key: config.tilesetKey, path: config.tilesetPath });
    }
  }

  return result;
}

/**
 * Get all unique map keys needed for preloading.
 * Returns deduplicated list of {key, path} pairs.
 */
export function getUniqueMaps(): Array<{ key: string; path: string }> {
  const seen = new Set<string>();
  const result: Array<{ key: string; path: string }> = [];

  for (const config of Object.values(MAP_CONFIGS)) {
    if (!seen.has(config.mapKey)) {
      seen.add(config.mapKey);
      result.push({ key: config.mapKey, path: config.mapPath });
    }
  }

  return result;
}
