import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { serializeFloor } from '@/systems/TilemapSerializer';
import { parseTiledMap } from '@/systems/TilemapParser';
import { generateFloor } from '@/systems/LayoutSystem';
import { placeProps } from '@/systems/PropPlacer';
import { buildCircuitPaths } from '@/systems/CircuitPathSystem';
import type { ThemeId } from '@/systems/ThemeSystem';
import type { FloorDescriptor } from '@/types';

describe('TilemapSerializer + TilemapParser', () => {
  const arbDifficulty = fc.constantFrom<ThemeId>('beginner', 'normal', 'hard');
  const arbLevel = fc.integer({ min: 1, max: 5 });
  const arbSeed = fc.integer({ min: 0, max: 2147483647 });

  function buildCompleteFloor(difficulty: ThemeId, level: number, seed: number): FloorDescriptor {
    const { floor } = generateFloor({ difficulty, levelNumber: level, seed });
    const propResult = placeProps({ floor, seed, difficulty });
    const floorWithProps: FloorDescriptor = {
      ...floor,
      collision: propResult.collision,
      propsLayer: propResult.propsLayer,
      props: propResult.props,
    };
    const { paths } = buildCircuitPaths(floorWithProps);
    return { ...floorWithProps, circuitPaths: paths };
  }

  // Feature: dungeon-visual-overhaul, Property 23: Round trip descriptor → JSON → descriptor
  it('serialize then parse produces equivalent descriptor for valid floors', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const floor = buildCompleteFloor(difficulty, level, seed);
        const serResult = serializeFloor(floor);
        expect(serResult.ok).toBe(true);
        if (!serResult.ok) return;

        const parseResult = parseTiledMap(serResult.json);
        expect(parseResult.ok).toBe(true);
        if (!parseResult.ok) return;

        const parsed = parseResult.floor;
        expect(parsed.width).toBe(floor.width);
        expect(parsed.height).toBe(floor.height);
        expect(parsed.ground).toEqual(floor.ground);
        expect(parsed.collision).toEqual(floor.collision);
        expect(parsed.propsLayer).toEqual(floor.propsLayer);
        expect(parsed.spawn).toEqual(floor.spawn);

        expect(parsed.objectives.length).toBe(floor.objectives.length);
        for (let i = 0; i < floor.objectives.length; i++) {
          expect(parsed.objectives[i].type).toBe(floor.objectives[i].type);
          expect(parsed.objectives[i].tile).toEqual(floor.objectives[i].tile);
        }

        expect(parsed.props.length).toBe(floor.props.length);
        for (let i = 0; i < floor.props.length; i++) {
          expect(parsed.props[i].type).toBe(floor.props[i].type);
          expect(parsed.props[i].tile).toEqual(floor.props[i].tile);
          expect(parsed.props[i].blocking).toBe(floor.props[i].blocking);
        }

        expect(parsed.circuitPaths.length).toBe(floor.circuitPaths.length);
        for (let i = 0; i < floor.circuitPaths.length; i++) {
          expect(parsed.circuitPaths[i].objectiveId).toBe(floor.circuitPaths[i].objectiveId);
          expect(parsed.circuitPaths[i].tiles).toEqual(floor.circuitPaths[i].tiles);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 24: Round trip JSON → descriptor → JSON
  it('serialized JSON has correct structure: 4 layers, puny-dungeon tileset, width*height values', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const floor = buildCompleteFloor(difficulty, level, seed);
        const serResult = serializeFloor(floor);
        expect(serResult.ok).toBe(true);
        if (!serResult.ok) return;

        const json = serResult.json;
        expect(json.width).toBe(floor.width);
        expect(json.height).toBe(floor.height);
        expect(json.tilesets[0].name).toBe('puny-dungeon');
        expect(json.tilesets[0].columns).toBe(26);
        expect(json.tilesets[0].tilewidth).toBe(16);
        expect(json.tilesets[0].tileheight).toBe(16);

        const tileLayers = json.layers.filter((l) => l.type === 'tilelayer');
        const objLayers = json.layers.filter((l) => l.type === 'objectgroup');
        expect(tileLayers).toHaveLength(3);
        expect(objLayers).toHaveLength(1);

        for (const tl of tileLayers) {
          if ('data' in tl) {
            expect(tl.data.length).toBe(floor.width * floor.height);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 25: Errores explícitos del parser
  it('parser returns errors for degraded JSON inputs without throwing', () => {
    // Not an object
    const r1 = parseTiledMap('string');
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error.code).toBe('not-an-object');

    const r2 = parseTiledMap(null);
    expect(r2.ok).toBe(false);

    const r3 = parseTiledMap(42);
    expect(r3.ok).toBe(false);

    // Missing dimensions
    const r4 = parseTiledMap({ layers: [], tilesets: [{ name: 'puny-dungeon' }] });
    expect(r4.ok).toBe(false);
    if (!r4.ok) expect(r4.error.code).toBe('missing-dimension');

    // Missing tileset
    const r5 = parseTiledMap({ width: 14, height: 11, layers: [], tilesets: [] });
    expect(r5.ok).toBe(false);
    if (!r5.ok) expect(r5.error.code).toBe('missing-tileset');

    // Missing layers
    const r6 = parseTiledMap({ width: 14, height: 11, tilesets: [{ name: 'puny-dungeon' }], layers: [] });
    expect(r6.ok).toBe(false);
    if (!r6.ok) {
      expect(r6.error.code).toBe('missing-layer');
      expect(r6.error.missing).toContain('ground');
      expect(r6.error.missing).toContain('collision');
      expect(r6.error.missing).toContain('objects');
    }
  });

  // Feature: dungeon-visual-overhaul, Property 26: Tolerancia a la ausencia de la capa props
  it('parser tolerates missing props layer and produces zero props', () => {
    fc.assert(
      fc.property(arbDifficulty, arbLevel, arbSeed, (difficulty, level, seed) => {
        const floor = buildCompleteFloor(difficulty, level, seed);
        const serResult = serializeFloor(floor);
        if (!serResult.ok) return;

        // Remove the props layer from JSON
        const json = { ...serResult.json };
        json.layers = json.layers.filter((l) => !('name' in l && l.name === 'props'));

        const parseResult = parseTiledMap(json);
        expect(parseResult.ok).toBe(true);
        if (!parseResult.ok) return;

        expect(parseResult.floor.propsLayer.every((v) => v === 0)).toBe(true);
        // Rest of the fields should still be correct
        expect(parseResult.floor.ground).toEqual(floor.ground);
        expect(parseResult.floor.collision).toEqual(floor.collision);
        expect(parseResult.floor.spawn).toEqual(floor.spawn);
      }),
      { numRuns: 100 },
    );
  });
});
