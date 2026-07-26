/**
 * LocalStorageService — Complete local persistence layer replacing API calls.
 * Handles player profiles, leaderboard, and game state without backend.
 *
 * Keys used in localStorage:
 * - `cq-profile-{username}` — PlayerProfile
 * - `cq-leaderboard` — LeaderboardEntry[] (top 10)
 * - `cq-save-{mode}-{slot}` — SaveData (handled by SaveSystem)
 */

import type { PlayerProfile, LeaderboardEntry } from '@/types';

const PROFILE_PREFIX = 'cq-profile';
const LEADERBOARD_KEY = 'cq-leaderboard';
const MAX_LEADERBOARD_ENTRIES = 10;

// ─── Player Profile ───────────────────────────────────────────────────────

/**
 * Get or create a player profile by username.
 * If the profile doesn't exist, creates one with personalBest = 0.
 */
export function getOrCreateProfile(username: string): PlayerProfile {
  const existing = loadProfile(username);
  if (existing) return existing;

  const profile: PlayerProfile = {
    username,
    personalBest: 0,
    updatedAt: new Date().toISOString(),
  };

  saveProfile(profile);
  return profile;
}

/**
 * Load a player profile from localStorage.
 */
export function loadProfile(username: string): PlayerProfile | null {
  try {
    const key = `${PROFILE_PREFIX}-${username.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerProfile;
  } catch {
    return null;
  }
}

/**
 * Save a player profile to localStorage.
 */
export function saveProfile(profile: PlayerProfile): boolean {
  try {
    const key = `${PROFILE_PREFIX}-${profile.username.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

/**
 * Update personal best if the new score is higher.
 * Returns true if the personal best was updated.
 */
export function updatePersonalBest(username: string, score: number): boolean {
  const profile = loadProfile(username);
  if (!profile) return false;

  if (score > profile.personalBest) {
    profile.personalBest = score;
    profile.updatedAt = new Date().toISOString();
    saveProfile(profile);
    return true;
  }
  return false;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────

/**
 * Load the leaderboard from localStorage.
 * Returns top 10 entries sorted by score descending.
 */
export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const entries = JSON.parse(raw) as LeaderboardEntry[];
    return entries
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_LEADERBOARD_ENTRIES);
  } catch {
    return [];
  }
}

/**
 * Submit a score to the leaderboard.
 * Only keeps the BEST score per username (one entry per player).
 * Returns the position (1-based) if it made the leaderboard, or null if not.
 */
export function submitScore(username: string, score: number): number | null {
  const entries = loadLeaderboard();

  // Check if user already has an entry
  const existingIndex = entries.findIndex(
    (e) => e.username.toLowerCase() === username.toLowerCase()
  );

  if (existingIndex !== -1) {
    // Only update if new score is higher
    if (score <= entries[existingIndex].score) {
      // Score not better — return existing position
      return existingIndex + 1;
    }
    // Remove old entry (will be replaced with new higher score)
    entries.splice(existingIndex, 1);
  }

  const newEntry: LeaderboardEntry = {
    username,
    score,
    runDate: new Date().toISOString().split('T')[0],
  };

  entries.push(newEntry);
  entries.sort((a, b) => b.score - a.score);
  const trimmed = entries.slice(0, MAX_LEADERBOARD_ENTRIES);

  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
  } catch {
    return null;
  }

  const position = trimmed.findIndex(
    (e) => e.username.toLowerCase() === username.toLowerCase() && e.score === score
  );

  if (position === -1) return null;
  return position + 1;
}

/**
 * Clear the entire leaderboard.
 */
export function clearLeaderboard(): void {
  localStorage.removeItem(LEADERBOARD_KEY);
}

// ─── Utility ──────────────────────────────────────────────────────────────

/**
 * Check if a username exists in local profiles.
 */
export function profileExists(username: string): boolean {
  return loadProfile(username) !== null;
}

/**
 * Delete a player profile.
 */
export function deleteProfile(username: string): void {
  const key = `${PROFILE_PREFIX}-${username.toLowerCase()}`;
  localStorage.removeItem(key);
}

/**
 * Clear all game data from localStorage (profiles, leaderboard, saves).
 */
export function clearAllGameData(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cq-')) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}
