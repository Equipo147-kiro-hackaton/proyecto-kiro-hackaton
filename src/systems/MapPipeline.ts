/**
 * MapPipeline — Pure orchestrator that chains ThemeSystem → LayoutSystem →
 * MapValidator → PropPlacer → CircuitPathSystem → TilemapSerializer.
 *
 * No import of 'phaser'. This is the single entry point that ExplorationScene
 * will call to obtain a complete, validated FloorDescriptor + Tiled JSON.
 */

import type { FloorDescriptor, ValidationResult } from '@/types';
import { resolveTheme, type Theme } from '@/systems/ThemeSystem';
import { generateFloor } from '@/systems/LayoutSystem';
import { validateFloor } from '@/systems/MapValidator';
import { placeProps } from '@/systems/PropPlacer';
import { buildCircuitPaths } from '@/systems/CircuitPathSystem';
import { serializeFloor, type TiledMapJson } from '@/systems/TilemapSerializer';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface FloorBuildRequest {
  difficulty: unknown;
  levelNumber: unknown;
  seed: number;
}

export interface FloorBuildResult {
  floor: FloorDescriptor;
  theme: Theme;
  validation: ValidationResult;
  mapKey: string;
  /** null if serialization failed; diagnostics explains the cause. */
  json: TiledMapJson | null;
  attempts: number;
  usedFallback: boolean;
  /** Accumulated diagnostics from the entire chain. */
  diagnostics: string[];
  elapsedMs: number;
}

// ─── Main Function ───────────────────────────────────────────────────────────

/**
 * Execute the full map generation pipeline:
 * ThemeSystem → LayoutSystem → MapValidator → PropPlacer →
 * CircuitPathSystem → MapValidator (revalidation) → TilemapSerializer.
 */
export function buildFloor(request: FloorBuildRequest): FloorBuildResult {
  const startTime = performance.now();
  const diagnostics: string[] = [];

  // 1. Resolve theme
  const theme = resolveTheme(request.difficulty, request.levelNumber);
  if (theme.isFallback) {
    diagnostics.push(`theme:fallback`);
  }

  // 2. Generate floor with validation and retry logic
  const layoutOutcome = generateFloor(request);
  if (layoutOutcome.usedFallback) {
    diagnostics.push(`layout:fallback seed=${request.seed}`);
  }

  let floor = layoutOutcome.floor;

  // 3. Place props on the validated floor
  const propResult = placeProps({
    floor,
    seed: request.seed,
    difficulty: theme.id,
  });

  // Update floor with prop results
  floor = {
    ...floor,
    collision: propResult.collision,
    propsLayer: propResult.propsLayer,
    props: propResult.props,
  };

  // 4. Build circuit paths on the final collision array
  const circuitResult = buildCircuitPaths(floor);
  floor = {
    ...floor,
    circuitPaths: circuitResult.paths,
  };

  if (circuitResult.violations.length > 0) {
    diagnostics.push(
      `circuit:unreachable ${circuitResult.violations.map((v) => `(${v.row},${v.column})`).join(',')}`,
    );
  }

  // 5. Revalidate post-props
  const validation = validateFloor(floor);

  // 6. Serialize to Tiled JSON
  const serResult = serializeFloor(floor);
  let json: TiledMapJson | null = null;
  let mapKey = `floor-${floor.difficulty}-${floor.levelNumber}-${floor.seed}`;

  if (serResult.ok) {
    json = serResult.json;
    mapKey = serResult.mapKey;
  } else {
    diagnostics.push(`serialize:failed ${serResult.error.code}`);
  }

  const elapsedMs = performance.now() - startTime;

  return {
    floor,
    theme,
    validation,
    mapKey,
    json,
    attempts: layoutOutcome.attempts,
    usedFallback: layoutOutcome.usedFallback,
    diagnostics,
    elapsedMs,
  };
}
