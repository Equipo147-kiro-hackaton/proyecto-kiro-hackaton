/**
 * MusicManager — DISABLED (no-op stub).
 *
 * Background music has been removed. All exported signatures are preserved
 * so consuming scenes compile without changes. SFX (ZzFX + Kenney .ogg)
 * continue to work via AudioManager / SynthAudio.
 */

import Phaser from 'phaser';

export type MusicTrack = 'menu' | 'office' | 'server' | 'cloud' | 'boss' | 'victory';

/** No music assets to preload */
export const MUSIC_ASSETS: { key: string; path: string }[] = [];

/**
 * Initialize music manager (no-op).
 */
export function initMusicManager(_game: Phaser.Game): void {
  // no-op
}

/**
 * Play a music track (no-op).
 */
export function playMusic(_track: MusicTrack): void {
  // no-op
}

/**
 * Stop all music (no-op).
 */
export function stopMusic(): void {
  // no-op
}

/**
 * Update music volume (no-op).
 */
export function updateMusicVolume(): void {
  // no-op
}

/**
 * Resume music after unmute (no-op).
 */
export function resumeAfterUnmute(): void {
  // no-op
}

/**
 * Get current playing track name — always null.
 */
export function getCurrentTrack(): MusicTrack | null {
  return null;
}
