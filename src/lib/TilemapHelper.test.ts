import { describe, it, expect } from 'vitest';
import {
  getObjectProperty,
  getObjectsByType,
  getSpawnPoint,
  getExitDoor,
  isTileWalkable,
  pixelToTile,
  tileToPixel,
  validateTilemap,
  hasNavigablePath,
  type TiledMap,
  type TiledObject,
} from './TilemapHelper';

// Feature: cloud-quest-devops-dungeon, Property 1: TilemapHelper utilities

describe('TilemapHelper', () => {
  // ─── getObjectProperty ──────────────────────────────────────────────────

  describe('getObjectProperty', () => {
    it('returns the value of an existing property', () => {
      const obj: TiledObject = {
        id: 1, name: 'test', type: 'interactable',
        x: 0, y: 0, width: 16, height: 16, visible: true,
        properties: [
          { name: 'objectType', type: 'string', value: 'terminal' },
          { name: 'puzzleId', type: 'string', value: 'syn-001' },
        ],
      };
      expect(getObjectProperty(obj, 'objectType')).toBe('terminal');
      expect(getObjectProperty(obj, 'puzzleId')).toBe('syn-001');
    });

    it('returns undefined for a non-existent property', () => {
      const obj: TiledObject = {
        id: 1, name: 'test', type: 'interactable',
        x: 0, y: 0, width: 16, height: 16, visible: true,
        properties: [
          { name: 'objectType', type: 'string', value: 'terminal' },
        ],
      };
      expect(getObjectProperty(obj, 'nonExistent')).toBeUndefined();
    });

    it('returns undefined when properties is undefined', () => {
      const obj: TiledObject = {
        id: 1, name: 'test', type: 'interactable',
        x: 0, y: 0, width: 16, height: 16, visible: true,
      };
      expect(getObjectProperty(obj, 'anything')).toBeUndefined();
    });
  });

  // ─── getObjectsByType ───────────────────────────────────────────────────

  describe('getObjectsByType', () => {
    const testMap: TiledMap = {
      width: 10, height: 10, tilewidth: 16, tileheight: 16,
      layers: [
        { id: 1, name: 'ground', type: 'tilelayer', data: [], width: 10, height: 10 },
        {
          id: 2, name: 'objects', type: 'objectgroup',
          objects: [
            {
              id: 1, name: 'spawn', type: 'spawn',
              x: 32, y: 32, width: 16, height: 16, visible: true,
              properties: [{ name: 'objectType', type: 'string', value: 'spawn' }],
            },
            {
              id: 2, name: 'terminal_1', type: 'interactable',
              x: 64, y: 64, width: 16, height: 16, visible: true,
              properties: [{ name: 'objectType', type: 'string', value: 'terminal' }],
            },
            {
              id: 3, name: 'terminal_2', type: 'interactable',
              x: 96, y: 96, width: 16, height: 16, visible: true,
              properties: [{ name: 'objectType', type: 'string', value: 'terminal' }],
            },
          ],
        },
      ],
    };

    it('returns all objects of the specified type', () => {
      const terminals = getObjectsByType(testMap, 'terminal');
      expect(terminals).toHaveLength(2);
      expect(terminals[0].name).toBe('terminal_1');
      expect(terminals[1].name).toBe('terminal_2');
    });

    it('returns empty array for non-existent type', () => {
      const result = getObjectsByType(testMap, 'nonExistent');
      expect(result).toHaveLength(0);
    });

    it('returns empty array when no objects layer exists', () => {
      const mapNoObjects: TiledMap = {
        width: 10, height: 10, tilewidth: 16, tileheight: 16,
        layers: [{ id: 1, name: 'ground', type: 'tilelayer', data: [], width: 10, height: 10 }],
      };
      expect(getObjectsByType(mapNoObjects, 'terminal')).toHaveLength(0);
    });
  });

  // ─── getSpawnPoint / getExitDoor ────────────────────────────────────────

  describe('getSpawnPoint', () => {
    it('returns spawn coordinates when spawn exists', () => {
      const map: TiledMap = {
        width: 10, height: 10, tilewidth: 16, tileheight: 16,
        layers: [{
          id: 1, name: 'objects', type: 'objectgroup',
          objects: [{
            id: 1, name: 'spawn', type: 'spawn',
            x: 48, y: 32, width: 16, height: 16, visible: true,
            properties: [{ name: 'objectType', type: 'string', value: 'spawn' }],
          }],
        }],
      };
      expect(getSpawnPoint(map)).toEqual({ x: 48, y: 32 });
    });

    it('returns null when no spawn exists', () => {
      const map: TiledMap = {
        width: 10, height: 10, tilewidth: 16, tileheight: 16,
        layers: [{ id: 1, name: 'objects', type: 'objectgroup', objects: [] }],
      };
      expect(getSpawnPoint(map)).toBeNull();
    });
  });

  describe('getExitDoor', () => {
    it('returns door coordinates when door exists', () => {
      const map: TiledMap = {
        width: 10, height: 10, tilewidth: 16, tileheight: 16,
        layers: [{
          id: 1, name: 'objects', type: 'objectgroup',
          objects: [{
            id: 1, name: 'exit', type: 'door',
            x: 128, y: 96, width: 16, height: 16, visible: true,
            properties: [{ name: 'objectType', type: 'string', value: 'door' }],
          }],
        }],
      };
      expect(getExitDoor(map)).toEqual({ x: 128, y: 96 });
    });
  });

  // ─── isTileWalkable ─────────────────────────────────────────────────────

  describe('isTileWalkable', () => {
    // 5x5 map with walls on borders and open center
    const collisionData = [
      2, 2, 2, 2, 2,
      2, 0, 0, 0, 2,
      2, 0, 0, 0, 2,
      2, 0, 0, 0, 2,
      2, 2, 2, 2, 2,
    ];
    const width = 5;

    it('returns true for walkable tiles (index 0)', () => {
      expect(isTileWalkable(collisionData, width, 1, 1)).toBe(true);
      expect(isTileWalkable(collisionData, width, 2, 2)).toBe(true);
      expect(isTileWalkable(collisionData, width, 3, 3)).toBe(true);
    });

    it('returns false for wall tiles (index != 0)', () => {
      expect(isTileWalkable(collisionData, width, 0, 0)).toBe(false);
      expect(isTileWalkable(collisionData, width, 4, 4)).toBe(false);
      expect(isTileWalkable(collisionData, width, 2, 0)).toBe(false);
    });

    it('returns false for out-of-bounds coordinates', () => {
      expect(isTileWalkable(collisionData, width, -1, 0)).toBe(false);
      expect(isTileWalkable(collisionData, width, 0, -1)).toBe(false);
      expect(isTileWalkable(collisionData, width, 5, 0)).toBe(false);
      expect(isTileWalkable(collisionData, width, 0, 5)).toBe(false);
    });
  });

  // ─── pixelToTile / tileToPixel ──────────────────────────────────────────

  describe('pixelToTile', () => {
    it('converts pixel coordinates to tile coordinates', () => {
      expect(pixelToTile(0, 0, 16, 16)).toEqual({ tileX: 0, tileY: 0 });
      expect(pixelToTile(16, 16, 16, 16)).toEqual({ tileX: 1, tileY: 1 });
      expect(pixelToTile(31, 31, 16, 16)).toEqual({ tileX: 1, tileY: 1 });
      expect(pixelToTile(32, 48, 16, 16)).toEqual({ tileX: 2, tileY: 3 });
    });
  });

  describe('tileToPixel', () => {
    it('converts tile coordinates to pixel coordinates', () => {
      expect(tileToPixel(0, 0, 16, 16)).toEqual({ pixelX: 0, pixelY: 0 });
      expect(tileToPixel(1, 1, 16, 16)).toEqual({ pixelX: 16, pixelY: 16 });
      expect(tileToPixel(3, 5, 16, 16)).toEqual({ pixelX: 48, pixelY: 80 });
    });
  });

  // ─── validateTilemap ────────────────────────────────────────────────────

  describe('validateTilemap', () => {
    it('returns valid for a complete map', () => {
      const map: TiledMap = {
        width: 10, height: 10, tilewidth: 16, tileheight: 16,
        layers: [
          { id: 1, name: 'ground', type: 'tilelayer', data: new Array(100).fill(1), width: 10, height: 10 },
          { id: 2, name: 'collision', type: 'tilelayer', data: new Array(100).fill(0), width: 10, height: 10 },
          {
            id: 3, name: 'objects', type: 'objectgroup',
            objects: [
              { id: 1, name: 's', type: 'spawn', x: 16, y: 16, width: 16, height: 16, visible: true, properties: [{ name: 'objectType', type: 'string', value: 'spawn' }] },
              { id: 2, name: 'd', type: 'door', x: 128, y: 128, width: 16, height: 16, visible: true, properties: [{ name: 'objectType', type: 'string', value: 'door' }] },
            ],
          },
        ],
      };
      const result = validateTilemap(map);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns errors for missing layers', () => {
      const map: TiledMap = {
        width: 10, height: 10, tilewidth: 16, tileheight: 16,
        layers: [],
      };
      const result = validateTilemap(map);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing ground layer');
      expect(result.errors).toContain('Missing collision layer');
      expect(result.errors).toContain('Missing spawn point');
      expect(result.errors).toContain('Missing exit door');
    });
  });

  // ─── hasNavigablePath ───────────────────────────────────────────────────

  describe('hasNavigablePath', () => {
    it('returns true when path exists from start to end', () => {
      // 5x5 map: walls on border, open center
      const collisionData = [
        2, 2, 2, 2, 2,
        2, 0, 0, 0, 2,
        2, 0, 0, 0, 2,
        2, 0, 0, 0, 2,
        2, 2, 2, 2, 2,
      ];
      expect(hasNavigablePath(collisionData, 5, 1, 1, 3, 3)).toBe(true);
    });

    it('returns false when path is blocked', () => {
      // 5x5 map: wall divides map vertically
      const collisionData = [
        2, 2, 2, 2, 2,
        2, 0, 2, 0, 2,
        2, 0, 2, 0, 2,
        2, 0, 2, 0, 2,
        2, 2, 2, 2, 2,
      ];
      expect(hasNavigablePath(collisionData, 5, 1, 1, 3, 1)).toBe(false);
    });

    it('returns true when start equals end', () => {
      const collisionData = [0, 0, 0, 0];
      expect(hasNavigablePath(collisionData, 2, 0, 0, 0, 0)).toBe(true);
    });

    it('handles L-shaped paths', () => {
      // Path must go around an obstacle
      const collisionData = [
        0, 0, 0, 0, 0,
        0, 0, 2, 2, 0,
        0, 0, 2, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
      ];
      expect(hasNavigablePath(collisionData, 5, 0, 0, 3, 2)).toBe(true);
    });
  });
});
