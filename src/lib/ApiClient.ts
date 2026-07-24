import type { ScorePayload, LeaderboardEntry, PlayerProfile } from '@/types';

/**
 * ApiClient — thin fetch wrapper over the Amplify REST API endpoints.
 * 
 * All requests use AbortController with a 5-second timeout.
 * Base URL read from VITE_API_BASE_URL environment variable.
 * 
 * NOTE: This is a stub implementation. Full implementation in Task 9.1.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const TIMEOUT_MS = 5000;

function createAbortController(): { controller: AbortController; timeoutId: ReturnType<typeof setTimeout> } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return { controller, timeoutId };
}

/** POST /scores — submit run result */
export async function submitScore(payload: ScorePayload): Promise<void> {
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
  } finally {
    clearTimeout(timeoutId);
  }
}

/** GET /scores — fetch top leaderboard entries */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
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
  } finally {
    clearTimeout(timeoutId);
  }
}

/** POST /players — create or retrieve player profile */
export async function getOrCreatePlayer(username: string): Promise<PlayerProfile> {
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
  } finally {
    clearTimeout(timeoutId);
  }
}
