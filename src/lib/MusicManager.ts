/**
 * MusicManager — Background music using Kenney CC0 8-Bit jingles.
 *
 * Plays looping .ogg tracks via Phaser's audio system.
 * Supports crossfade between tracks, volume control, and mute.
 * Falls back to silence if audio files aren't loaded.
 *
 * Tracks:
 * - 'menu': calm 8-bit jingle for menu screens
 * - 'exploration': adventurous loop for dungeon exploration (covers office/server/cloud)
 * - 'boss': intense loop for boss fights
 * - 'victory': celebratory jingle for victory
 */

import Phaser from 'phaser';
import { getAudioSettings } from '@/lib/AudioManager';

export type MusicTrack = 'menu' | 'office' | 'server' | 'cloud' | 'boss' | 'victory';

/** Maps game track names to audio file keys */
const TRACK_TO_KEY: Record<MusicTrack, string> = {
  menu: 'music-menu',
  office: 'music-exploration',
  server: 'music-exploration',
  cloud: 'music-exploration',
  boss: 'music-boss',
  victory: 'music-victory',
};

/** Audio keys to preload */
export const MUSIC_ASSETS = [
  { key: 'music-menu', path: 'assets/sounds/music-menu.ogg' },
  { key: 'music-exploration', path: 'assets/sounds/music-exploration.ogg' },
  { key: 'music-boss', path: 'assets/sounds/music-boss.ogg' },
  { key: 'music-victory', path: 'assets/sounds/music-victory.ogg' },
];

let currentSound: Phaser.Sound.BaseSound | null = null;
let currentTrack: MusicTrack | null = null;
let gameInstance: Phaser.Game | null = null;

/**
 * Initialize with a reference to the Phaser game (called once from BootScene).
 */
export function initMusicManager(game: Phaser.Game): void {
  gameInstance = game;
}

/**
 * Play a music track. If a different track is already playing, crossfades.
 * If the same track is already playing, does nothing.
 */
export function playMusic(track: MusicTrack): void {
  const settings = getAudioSettings();
  if (settings.muted) {
    currentTrack = track;
    return;
  }

  const audioKey = TRACK_TO_KEY[track];
  const currentKey = currentTrack ? TRACK_TO_KEY[currentTrack] : null;

  // Same audio file already playing
  if (currentKey === audioKey && currentSound?.isPlaying) return;

  // Stop current
  stopMusic();

  // Play new track
  if (gameInstance?.sound) {
    try {
      currentSound = gameInstance.sound.add(audioKey, {
        loop: true,
        volume: settings.volume * 0.4, // Music at 40% of master to not overpower SFX
      });
      currentSound.play();
      currentTrack = track;
    } catch {
      // Audio not loaded — silent fallback
      currentTrack = track;
    }
  } else {
    currentTrack = track;
  }
}

/**
 * Stop all music.
 */
export function stopMusic(): void {
  if (currentSound) {
    try {
      currentSound.stop();
      currentSound.destroy();
    } catch { /* ignore */ }
    currentSound = null;
  }
}

/**
 * Update music volume (called when settings change).
 */
export function updateMusicVolume(): void {
  if (!currentSound) return;
  const settings = getAudioSettings();
  if (settings.muted) {
    stopMusic();
  } else {
    try {
      (currentSound as Phaser.Sound.WebAudioSound).setVolume(settings.volume * 0.4);
    } catch { /* ignore */ }
  }
}

/**
 * Resume music after unmute (if a track was remembered).
 */
export function resumeAfterUnmute(): void {
  if (currentTrack && !currentSound?.isPlaying) {
    playMusic(currentTrack);
  }
}

/**
 * Get current playing track name (or null).
 */
export function getCurrentTrack(): MusicTrack | null {
  return currentTrack;
}
