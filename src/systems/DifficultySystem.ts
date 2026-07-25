/**
 * DifficultySystem — Configuration and rules per difficulty mode.
 * Independent of Phaser (pure logic, testable without DOM/canvas).
 *
 * Modes:
 * - Beginner: autosave every puzzle, hints always, guides visible, reduced HP loss
 * - Normal: manual save at 30%/60%, hints after fail, no guides, standard HP loss
 * - Hard: no saves, no hints, no guides, increased HP loss
 */

import type { DifficultyMode } from '@/types';

export interface DifficultyConfig {
  mode: DifficultyMode;
  displayName: string;
  description: string;

  // Timer
  puzzleTimerSeconds: number;
  bossAttackIntervalSeconds: number;

  // HP
  hpLossPerWrongAnswer: number;
  hpLossOnTimeout: number;
  hpRecoveryPerRestRoom: number;

  // Hints
  hintsEnabled: boolean;
  hintsShowOnFirstAttempt: boolean;
  hintsShowAfterAttempts: number;

  // Guides
  guidesVisible: boolean;

  // Saves
  saveEnabled: boolean;
  autoSave: boolean;
  saveCheckpoints: number[];

  // Boss
  bossTimerSeconds: number;
}

const DIFFICULTY_CONFIGS: Record<DifficultyMode, DifficultyConfig> = {
  beginner: {
    mode: 'beginner',
    displayName: 'Beginner',
    description: 'Full guidance, auto-save, generous hints. Perfect for learning.',
    puzzleTimerSeconds: 90,
    bossAttackIntervalSeconds: 20,
    hpLossPerWrongAnswer: 5,
    hpLossOnTimeout: 10,
    hpRecoveryPerRestRoom: 30,
    hintsEnabled: true,
    hintsShowOnFirstAttempt: true,
    hintsShowAfterAttempts: 1,
    guidesVisible: true,
    saveEnabled: true,
    autoSave: true,
    saveCheckpoints: [],
    bossTimerSeconds: 20,
  },
  normal: {
    mode: 'normal',
    displayName: 'Normal',
    description: 'Balanced challenge. Manual saves at 30% and 60%. Hints after mistakes.',
    puzzleTimerSeconds: 60,
    bossAttackIntervalSeconds: 15,
    hpLossPerWrongAnswer: 10,
    hpLossOnTimeout: 15,
    hpRecoveryPerRestRoom: 25,
    hintsEnabled: true,
    hintsShowOnFirstAttempt: false,
    hintsShowAfterAttempts: 2,
    guidesVisible: false,
    saveEnabled: true,
    autoSave: false,
    saveCheckpoints: [30, 60],
    bossTimerSeconds: 15,
  },
  hard: {
    mode: 'hard',
    displayName: 'Hard',
    description: 'No saves, no hints, no mercy. Prove your DevOps expertise.',
    puzzleTimerSeconds: 45,
    bossAttackIntervalSeconds: 10,
    hpLossPerWrongAnswer: 15,
    hpLossOnTimeout: 20,
    hpRecoveryPerRestRoom: 15,
    hintsEnabled: false,
    hintsShowOnFirstAttempt: false,
    hintsShowAfterAttempts: 0,
    guidesVisible: false,
    saveEnabled: false,
    autoSave: false,
    saveCheckpoints: [],
    bossTimerSeconds: 10,
  },
};

/**
 * Get the full configuration for a difficulty mode.
 */
export function getDifficultyConfig(mode: DifficultyMode): DifficultyConfig {
  return DIFFICULTY_CONFIGS[mode];
}

/**
 * Get all available difficulty modes.
 */
export function getAllModes(): DifficultyMode[] {
  return ['beginner', 'normal', 'hard'];
}

/**
 * Check if hints should be shown given the mode and current attempt count.
 */
export function shouldShowHint(mode: DifficultyMode, attemptCount: number): boolean {
  const config = DIFFICULTY_CONFIGS[mode];
  if (!config.hintsEnabled) return false;
  if (config.hintsShowOnFirstAttempt) return true;
  return attemptCount >= config.hintsShowAfterAttempts;
}

/**
 * Check if a save is allowed at the current progress percentage.
 */
export function canSaveAtProgress(mode: DifficultyMode, progressPercent: number): boolean {
  const config = DIFFICULTY_CONFIGS[mode];
  if (!config.saveEnabled) return false;
  if (config.autoSave) return true;

  return config.saveCheckpoints.some((cp) => {
    return progressPercent >= cp && progressPercent <= cp + 5;
  });
}

/**
 * Calculate progress percentage based on fragments collected.
 */
export function calculateProgress(fragmentsCollected: number, totalFragments: number): number {
  if (totalFragments === 0) return 0;
  return Math.round((fragmentsCollected / totalFragments) * 100);
}
