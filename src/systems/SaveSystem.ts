/**
 * SaveSystem — Manages game state persistence via localStorage.
 * Independent of Phaser (pure logic, testable without DOM/canvas).
 *
 * Save structure in localStorage:
 * - `cq-save-{mode}-{slot}` → serialized SaveData
 * - `cq-profile-{username}` → PlayerProfile
 * - `cq-leaderboard` → LeaderboardEntry[]
 */

import type { DifficultyMode } from '@/types';

export interface SaveData {
  version: number;
  timestamp: string;
  mode: DifficultyMode;
  username: string;
  currentLevel: number;
  currentScore: number;
  heroHP: number;
  fragmentsCollected: string[];
  totalPuzzlesSolved: number;
}

const SAVE_VERSION = 1;
const SAVE_PREFIX = 'cq-save';

/**
 * Save game state to localStorage.
 */
export function saveGame(mode: DifficultyMode, slot: number, data: SaveData): boolean {
  try {
    const key = `${SAVE_PREFIX}-${mode}-${slot}`;
    const serialized = JSON.stringify({ ...data, version: SAVE_VERSION });
    localStorage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load a saved game from localStorage.
 * Returns null if no save exists or if the save is corrupted.
 */
export function loadGame(mode: DifficultyMode, slot: number): SaveData | null {
  try {
    const key = `${SAVE_PREFIX}-${mode}-${slot}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const data = JSON.parse(raw) as SaveData;
    if (data.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Check if a save exists for a given mode and slot.
 */
export function hasSave(mode: DifficultyMode, slot: number): boolean {
  const key = `${SAVE_PREFIX}-${mode}-${slot}`;
  return localStorage.getItem(key) !== null;
}

/**
 * Delete a saved game.
 */
export function deleteSave(mode: DifficultyMode, slot: number): void {
  const key = `${SAVE_PREFIX}-${mode}-${slot}`;
  localStorage.removeItem(key);
}

/**
 * Get all existing saves for a mode (scans slots 0-9).
 */
export function getSavesForMode(mode: DifficultyMode): Array<{ slot: number; data: SaveData }> {
  const saves: Array<{ slot: number; data: SaveData }> = [];
  for (let slot = 0; slot < 10; slot++) {
    const data = loadGame(mode, slot);
    if (data) {
      saves.push({ slot, data });
    }
  }
  return saves;
}

/**
 * Create a SaveData object from current game state.
 */
export function createSaveData(
  mode: DifficultyMode,
  username: string,
  currentLevel: number,
  currentScore: number,
  heroHP: number,
  fragmentsCollected: string[],
  totalPuzzlesSolved: number
): SaveData {
  return {
    version: SAVE_VERSION,
    timestamp: new Date().toISOString(),
    mode,
    username,
    currentLevel,
    currentScore,
    heroHP,
    fragmentsCollected,
    totalPuzzlesSolved,
  };
}

/**
 * Get the most recent save across all slots for a mode.
 */
export function getMostRecentSave(mode: DifficultyMode): { slot: number; data: SaveData } | null {
  const saves = getSavesForMode(mode);
  if (saves.length === 0) return null;

  return saves.reduce((latest, current) => {
    return new Date(current.data.timestamp) > new Date(latest.data.timestamp)
      ? current
      : latest;
  });
}
