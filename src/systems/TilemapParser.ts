/**
 * TilemapParser — Pure system that converts a Tiled-format JSON object
 * back into a FloorDescriptor.
 *
 * No import of 'phaser'.
 */

import type { CircuitPath, FloorDescriptor, Objective, ObjectiveType, Prop, PropType, TileRef } from '@/types';

// ─── Public Types ────────────────────────────────────────────────────────────

export type ParseErrorCode =
  | 'not-an-object'
  | 'missing-dimension'
  | 'missing-tileset'
  | 'missing-layer'
  | 'layer-size-mismatch'
  | 'missing-object-declaration';

export interface ParseError {
  code: ParseErrorCode;
  message: string;
  missing: string[];
  layer?: string;
  expected?: number;
  received?: number;
}

export type ParseResult =
  | { ok: true; floor: FloorDescriptor }
  | { ok: false; error: ParseError };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getProperty(
  properties: Array<{ name: string; type: string; value: string | number | boolean }>,
  name: string,
): string | number | boolean | undefined {
  const prop = properties.find((p) => p.name === name);
  return prop?.value;
}

function parseTileRefString(tilesStr: string): TileRef[] {
  if (!tilesStr) return [];
  return tilesStr.split(';').map((pair) => {
    const [rowStr, colStr] = pair.split(',');
    return { row: Number(rowStr), column: Number(colStr) };
  });
}

// ─── Main Function ───────────────────────────────────────────────────────────

export function parseTiledMap(input: unknown): ParseResult {
  if (!isObject(input)) {
    return { ok: false, error: { code: 'not-an-object', message: 'Input is not a JSON object', missing: [] } };
  }

  const json = input;

  const missingDims: string[] = [];
  if (typeof json['width'] !== 'number') missingDims.push('width');
  if (typeof json['height'] !== 'number') missingDims.push('height');
  if (missingDims.length > 0) {
    return { ok: false, error: { code: 'missing-dimension', message: `Missing dimensions: ${missingDims.join(', ')}`, missing: missingDims } };
  }

  const width = json['width'] as number;
  const height = json['height'] as number;

  const tilesets = json['tilesets'];
  if (!Array.isArray(tilesets) || tilesets.length === 0 || !isObject(tilesets[0]) || tilesets[0]['name'] !== 'puny-dungeon') {
    return { ok: false, error: { code: 'missing-tileset', message: 'Missing or invalid puny-dungeon tileset declaration', missing: ['puny-dungeon tileset'] } };
  }

  const layers = json['layers'];
  if (!Array.isArray(layers)) {
    return { ok: false, error: { code: 'missing-layer', message: 'No layers array found', missing: ['ground', 'collision', 'objects'] } };
  }

  const layerMap = new Map<string, Record<string, unknown>>();
  for (const layer of layers) {
    if (isObject(layer) && typeof layer['name'] === 'string') {
      layerMap.set(layer['name'] as string, layer);
    }
  }

  const missingLayers: string[] = [];
  if (!layerMap.has('ground')) missingLayers.push('ground');
  if (!layerMap.has('collision')) missingLayers.push('collision');
  if (!layerMap.has('objects')) missingLayers.push('objects');
  if (missingLayers.length > 0) {
    return { ok: false, error: { code: 'missing-layer', message: `Missing layers: ${missingLayers.join(', ')}`, missing: missingLayers } };
  }

  const expectedSize = width * height;

  const groundData = layerMap.get('ground')!['data'];
  if (!Array.isArray(groundData) || groundData.length !== expectedSize) {
    return { ok: false, error: { code: 'layer-size-mismatch', message: 'ground layer size mismatch', missing: [], layer: 'ground', expected: expectedSize, received: Array.isArray(groundData) ? groundData.length : 0 } };
  }

  const collisionData = layerMap.get('collision')!['data'];
  if (!Array.isArray(collisionData) || collisionData.length !== expectedSize) {
    return { ok: false, error: { code: 'layer-size-mismatch', message: 'collision layer size mismatch', missing: [], layer: 'collision', expected: expectedSize, received: Array.isArray(collisionData) ? collisionData.length : 0 } };
  }

  let propsLayerData: number[];
  if (layerMap.has('props')) {
    const propsData = layerMap.get('props')!['data'];
    if (!Array.isArray(propsData) || propsData.length !== expectedSize) {
      return { ok: false, error: { code: 'layer-size-mismatch', message: 'props layer size mismatch', missing: [], layer: 'props', expected: expectedSize, received: Array.isArray(propsData) ? propsData.length : 0 } };
    }
    propsLayerData = propsData as number[];
  } else {
    propsLayerData = new Array<number>(expectedSize).fill(0);
  }

  const objectsLayerRaw = layerMap.get('objects')!;
  const objectsArray = objectsLayerRaw['objects'];
  if (!Array.isArray(objectsArray)) {
    return { ok: false, error: { code: 'missing-object-declaration', message: 'objects layer has no objects array', missing: ['objects array'] } };
  }

  let spawn: TileRef | null = null;
  const objectives: Objective[] = [];
  const props: Prop[] = [];
  const circuitPaths: CircuitPath[] = [];

  for (const entry of objectsArray) {
    if (!isObject(entry)) continue;
    const type = entry['type'] as string;
    const properties = (entry['properties'] as Array<{ name: string; type: string; value: string | number | boolean }>) ?? [];

    if (type === 'spawn') {
      const row = getProperty(properties, 'row');
      const column = getProperty(properties, 'column');
      if (typeof row === 'number' && typeof column === 'number') {
        spawn = { row, column };
      }
    } else if (type === 'terminal' || type === 'door') {
      const row = getProperty(properties, 'row');
      const column = getProperty(properties, 'column');
      const roomId = getProperty(properties, 'roomId');
      const activated = getProperty(properties, 'activated');
      const fragmentId = getProperty(properties, 'fragmentId');
      const puzzleId = getProperty(properties, 'puzzleId');
      if (typeof row === 'number' && typeof column === 'number') {
        objectives.push({
          id: entry['name'] as string,
          type: type as ObjectiveType,
          tile: { row, column },
          roomId: typeof roomId === 'string' ? roomId : 'room-0',
          activated: typeof activated === 'boolean' ? activated : false,
          ...(typeof fragmentId === 'string' ? { fragmentId } : {}),
          ...(typeof puzzleId === 'string' ? { puzzleId } : {}),
        });
      }
    } else if (type === 'prop') {
      const propType = getProperty(properties, 'propType');
      const row = getProperty(properties, 'row');
      const column = getProperty(properties, 'column');
      const blocking = getProperty(properties, 'blocking');
      const tileIndex = getProperty(properties, 'tileIndex');
      if (typeof row === 'number' && typeof column === 'number' && typeof propType === 'string') {
        props.push({
          id: entry['name'] as string,
          type: propType as PropType,
          tile: { row, column },
          blocking: typeof blocking === 'boolean' ? blocking : false,
          tileIndex: typeof tileIndex === 'number' ? tileIndex : 0,
        });
      }
    } else if (type === 'circuit') {
      const objectiveId = getProperty(properties, 'objectiveId');
      const tilesStr = getProperty(properties, 'tiles');
      if (typeof objectiveId === 'string' && typeof tilesStr === 'string') {
        circuitPaths.push({ objectiveId, tiles: parseTileRefString(tilesStr) });
      }
    }
  }

  const missingDeclarations: string[] = [];
  if (spawn === null) missingDeclarations.push('spawn');
  if (objectives.length === 0) missingDeclarations.push('objectives');
  if (circuitPaths.length === 0) missingDeclarations.push('circuitPaths');
  if (missingDeclarations.length > 0) {
    return { ok: false, error: { code: 'missing-object-declaration', message: `Missing declarations in objects layer: ${missingDeclarations.join(', ')}`, missing: missingDeclarations } };
  }

  const floor: FloorDescriptor = {
    levelNumber: 1,
    difficulty: 'normal',
    themeId: 'normal',
    seed: 0,
    width,
    height,
    ground: groundData as number[],
    propsLayer: propsLayerData,
    collision: collisionData as number[],
    rooms: [],
    corridors: [],
    spawn: spawn!,
    objectives,
    props,
    circuitPaths,
  };

  return { ok: true, floor };
}
