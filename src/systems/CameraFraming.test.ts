import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeCameraFrame,
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT,
  TILE_SIZE,
  BOUNDS_PADDING_PX,
  FALLBACK_ZOOM,
} from '@/systems/CameraFraming';

describe('CameraFraming', () => {
  const arbDifficulty = fc.constantFrom('beginner', 'normal', 'hard');
  const arbWidth = fc.integer({ min: 12, max: 40 });
  const arbHeight = fc.integer({ min: 10, max: 40 });

  // Feature: dungeon-visual-overhaul, Property 37: Encuadre de cámara para todo tamaño de mapa
  it('produces valid zoom, viewport, bounds, and lerp for all valid inputs', () => {
    fc.assert(
      fc.property(arbDifficulty, arbWidth, arbHeight, (difficulty, w, h) => {
        const frame = computeCameraFrame(difficulty, w, h);

        expect(frame.isFallback).toBe(false);
        expect(frame.zoom).toBeGreaterThanOrEqual(1.5);
        expect(frame.zoom).toBeLessThanOrEqual(3.0);

        if (difficulty === 'beginner') {
          expect(frame.zoom).toBe(3.0);
        } else {
          const expected = Math.round(Math.max(1.5, Math.min(2.5, VIEWPORT_WIDTH / (w * TILE_SIZE))) * 100) / 100;
          expect(frame.zoom).toBe(expected);
        }

        expect(frame.viewport).toEqual({ x: 0, y: 0, width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

        expect(frame.bounds.x).toBe(-BOUNDS_PADDING_PX);
        expect(frame.bounds.y).toBe(-BOUNDS_PADDING_PX);
        expect(frame.bounds.width).toBe(w * TILE_SIZE + BOUNDS_PADDING_PX * 2);
        expect(frame.bounds.height).toBe(h * TILE_SIZE + BOUNDS_PADDING_PX * 2);
        expect(frame.bounds.width).toBeGreaterThan(0);
        expect(frame.bounds.height).toBeGreaterThan(0);

        expect(frame.followLerp).toBeGreaterThanOrEqual(0.09);
        expect(frame.followLerp).toBeLessThanOrEqual(0.11);

        const mapPxW = w * TILE_SIZE;
        const mapPxH = h * TILE_SIZE;
        expect(frame.centerX).toBe(mapPxW * frame.zoom <= VIEWPORT_WIDTH);
        expect(frame.centerY).toBe(mapPxH * frame.zoom <= VIEWPORT_HEIGHT);

        const frame2 = computeCameraFrame(difficulty, w, h);
        expect(frame).toEqual(frame2);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 38: Encuadre de reserva ante entradas inválidas
  it('returns fallback frame for invalid inputs without throwing', () => {
    const invalidInputs: Array<[unknown, unknown, unknown]> = [
      [null, 14, 11],
      ['NORMAL', 14, 11],
      ['beginner', null, 11],
      ['beginner', 14, null],
      ['beginner', -1, 11],
      ['beginner', 0, 11],
      ['beginner', Infinity, 11],
      ['beginner', NaN, 11],
      [undefined, 14, 11],
      [42, 14, 11],
      ['normal', 'abc', 11],
    ];

    for (const [diff, w, h] of invalidInputs) {
      const frame = computeCameraFrame(diff, w, h);
      expect(frame.zoom).toBe(FALLBACK_ZOOM);
      expect(frame.viewport).toEqual({ x: 0, y: 0, width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });
      expect(frame.isFallback).toBe(true);
    }
  });

  it('normal with 26 tiles wide produces zoom 2.31', () => {
    const frame = computeCameraFrame('normal', 26, 35);
    expect(frame.zoom).toBe(2.31);
    expect(frame.isFallback).toBe(false);
  });

  it('beginner with 14x11 tiles at zoom 3.0 centers in both axes', () => {
    const frame = computeCameraFrame('beginner', 14, 11);
    expect(frame.centerX).toBe(true);
    expect(frame.centerY).toBe(true);
  });
});
