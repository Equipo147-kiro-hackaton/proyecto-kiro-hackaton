import type { ScorePayload, LeaderboardEntry, PlayerProfile } from '@/types';
import { loadLeaderboard as loadLocalLeaderboard, submitScore as submitLocalScore } from '@/lib/LocalStorageService';

/**
 * ApiClient — thin fetch wrapper over the Amplify REST API endpoints.
 * 
 * All requests use AbortController with a 5-second timeout.
 * Base URL read from VITE_API_BASE_URL environment variable.
 * 
 * Offline-first strategy:
 * - API calls are attempted first
 * - On failure (timeout, network error, no API configured), falls back to localStorage
 * - Callers never see an unhandled rejection for standard operations
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const TIMEOUT_MS = 5000;

/** Whether the API is configured (has a base URL) */
function isApiConfigured(): boolean {
  return API_BASE_URL.length > 0;
}

function createAbortController(): { controller: AbortController; timeoutId: ReturnType<typeof setTimeout> } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return { controller, timeoutId };
}

/**
 * POST /scores — submit run result.
 * Falls back to localStorage on failure.
 */
export async function submitScore(payload: ScorePayload): Promise<void> {
  // Always save locally first (offline-first)
  submitLocalScore(payload.username, payload.score);

  if (!isApiConfigured()) return;

  const { controller, timeoutId } = createAbortController();
  try {
    const response = await fetch(`${API_BASE_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Score submission failed: HTTP ${response.status}`);
    }
  } catch {
    // Silent fail — score already saved locally
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * GET /scores — fetch top leaderboard entries.
 * Falls back to localStorage on failure.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!isApiConfigured()) {
    return loadLocalLeaderboard();
  }

  const { controller, timeoutId } = createAbortController();
  try {
    const response = await fetch(`${API_BASE_URL}/scores`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Leaderboard fetch failed: HTTP ${response.status}`);
    }
    return await response.json() as LeaderboardEntry[];
  } catch {
    // Fallback to local leaderboard
    return loadLocalLeaderboard();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * POST /players — create or retrieve player profile.
 * Falls back to localStorage on failure.
 */
export async function getOrCreatePlayer(username: string): Promise<PlayerProfile> {
  if (!isApiConfigured()) {
    return { username, personalBest: 0, updatedAt: new Date().toISOString() };
  }

  const { controller, timeoutId } = createAbortController();
  try {
    const response = await fetch(`${API_BASE_URL}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Player profile request failed: HTTP ${response.status}`);
    }
    return await response.json() as PlayerProfile;
  } catch {
    // Fallback — caller should use LocalStorageService
    return { username, personalBest: 0, updatedAt: new Date().toISOString() };
  } finally {
    clearTimeout(timeoutId);
  }
}
