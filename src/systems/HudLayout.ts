/**
 * HudLayout — Pure system for HUD geometry, formatting, and state logic.
 *
 * No import of 'phaser'.
 */

import type { DifficultyMode } from '@/types';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface HudRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HudState {
  hp: number;
  hpMax: number;
  objectivesActivated: number;
  objectivesTotal: number;
  score: number;
  difficulty: DifficultyMode;
  hasReceivedData: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const HUD_BLOCKS = {
  status: { x: 8, y: 8, width: 292, height: 68 } as HudRect,
  score: { x: 660, y: 8, width: 292, height: 52 } as HudRect,
  controls: { x: 660, y: 448, width: 292, height: 84 } as HudRect,
  topBand: { x: 330, y: 8, width: 300, height: 28 } as HudRect,
} as const;

export const HUD_FORBIDDEN_REGION: HudRect = { x: 240, y: 135, width: 480, height: 270 };

// ─── Formatting ──────────────────────────────────────────────────────────────

/** clamp(ceil(hp / 25), 0, 4) — Requirement 8.5 */
export function hpSegments(hp: number): number {
  return Math.max(0, Math.min(4, Math.ceil(hp / 25)));
}

/** Format: `HP_actual/100` */
export function hpText(hp: number): string {
  return `${Math.max(0, Math.min(hp, 100))}/${100}`;
}

/** Format: `X/N` — Requirement 8.6 */
export function objectiveCounterText(activated: number, total: number): string {
  const clampedTotal = Math.max(1, Math.min(5, total));
  const clampedActivated = Math.max(0, Math.min(clampedTotal, activated));
  return `${clampedActivated}/${clampedTotal}`;
}

// ─── Geometry ────────────────────────────────────────────────────────────────

/** Check if two rects intersect. */
export function intersects(a: HudRect, b: HudRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Visible blocks for a given difficulty.
 * - `hard`: omits controls block (Req 8.10)
 * - `normal`/`hard`: includes topBand (Req 8.13)
 * - `beginner`: no topBand, no controls omission
 */
export function hudBlocksFor(difficulty: DifficultyMode): HudRect[] {
  const blocks: HudRect[] = [HUD_BLOCKS.status, HUD_BLOCKS.score];

  if (difficulty !== 'hard') {
    blocks.push(HUD_BLOCKS.controls);
  }

  if (difficulty === 'normal' || difficulty === 'hard') {
    blocks.push(HUD_BLOCKS.topBand);
  }

  return blocks;
}

// ─── State Reducer ───────────────────────────────────────────────────────────

export function createInitialHudState(difficulty: DifficultyMode, objectivesTotal: number): HudState {
  return {
    hp: 100,
    hpMax: 100,
    objectivesActivated: 0,
    objectivesTotal: Math.max(1, Math.min(5, objectivesTotal)),
    score: 0,
    difficulty,
    hasReceivedData: false,
  };
}

export interface HudUpdate {
  type: 'hp' | 'objectives' | 'score';
  hp?: number;
  objectivesActivated?: number;
  objectivesTotal?: number;
  score?: number;
}

/**
 * Apply an event update to the HUD state.
 * After first update, hasReceivedData becomes true and state never reverts to defaults.
 */
export function applyHudUpdate(state: HudState, update: HudUpdate): HudState {
  const next = { ...state, hasReceivedData: true };

  switch (update.type) {
    case 'hp':
      if (typeof update.hp === 'number') {
        next.hp = update.hp;
      }
      break;
    case 'objectives':
      if (typeof update.objectivesActivated === 'number') {
        next.objectivesActivated = update.objectivesActivated;
      }
      if (typeof update.objectivesTotal === 'number') {
        next.objectivesTotal = Math.max(1, Math.min(5, update.objectivesTotal));
      }
      break;
    case 'score':
      if (typeof update.score === 'number') {
        next.score = update.score;
      }
      break;
  }

  return next;
}
