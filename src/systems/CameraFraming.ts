/**
 * CameraFraming — Pure system that computes camera zoom and bounds
 * from difficulty and map dimensions.
 *
 * No import of 'phaser'.
 */

// ─── Public Types ────────────────────────────────────────────────────────────

export interface CameraRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraFrame {
  /** 1.5 – 3.0 */
  zoom: number;
  viewport: CameraRect;
  bounds: CameraRect;
  /** Interpolation factor for camera follow: 0.10. */
  followLerp: number;
  centerX: boolean;
  centerY: boolean;
  isFallback: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const VIEWPORT_WIDTH = 960;
export const VIEWPORT_HEIGHT = 540;
export const TILE_SIZE = 16;
export const BOUNDS_PADDING_PX = 16;
export const FALLBACK_ZOOM = 2.5;
export const FOLLOW_LERP = 0.1;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function roundTo2(x: number): number {
  return Math.round(x * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isValidDifficulty(value: unknown): value is 'beginner' | 'normal' | 'hard' {
  return value === 'beginner' || value === 'normal' || value === 'hard';
}

// ─── Main Function ───────────────────────────────────────────────────────────

/**
 * Compute camera frame parameters from difficulty and map dimensions.
 *
 * - beginner: zoom 3.0
 * - normal/hard: clamp(960 / (widthTiles * 16), 1.5, 2.5) rounded to 2 decimals
 * - Invalid/missing inputs: fallback zoom 2.5
 *
 * Bounds include 16px padding on each side.
 */
export function computeCameraFrame(
  difficulty: unknown,
  mapWidthTiles: unknown,
  mapHeightTiles: unknown,
): CameraFrame {
  const viewport: CameraRect = { x: 0, y: 0, width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT };

  if (
    !isValidDifficulty(difficulty) ||
    typeof mapWidthTiles !== 'number' ||
    typeof mapHeightTiles !== 'number' ||
    mapWidthTiles <= 0 ||
    mapHeightTiles <= 0 ||
    !Number.isFinite(mapWidthTiles) ||
    !Number.isFinite(mapHeightTiles)
  ) {
    return {
      zoom: FALLBACK_ZOOM,
      viewport,
      bounds: { ...viewport },
      followLerp: FOLLOW_LERP,
      centerX: false,
      centerY: false,
      isFallback: true,
    };
  }

  const mapPxW = mapWidthTiles * TILE_SIZE;
  const mapPxH = mapHeightTiles * TILE_SIZE;

  let zoom: number;
  if (difficulty === 'beginner') {
    zoom = 3.0;
  } else {
    zoom = roundTo2(clamp(VIEWPORT_WIDTH / mapPxW, 1.5, 2.5));
  }

  const bounds: CameraRect = {
    x: -BOUNDS_PADDING_PX,
    y: -BOUNDS_PADDING_PX,
    width: mapPxW + BOUNDS_PADDING_PX * 2,
    height: mapPxH + BOUNDS_PADDING_PX * 2,
  };

  const centerX = (mapPxW * zoom) <= VIEWPORT_WIDTH;
  const centerY = (mapPxH * zoom) <= VIEWPORT_HEIGHT;

  return {
    zoom,
    viewport,
    bounds,
    followLerp: FOLLOW_LERP,
    centerX,
    centerY,
    isFallback: false,
  };
}
