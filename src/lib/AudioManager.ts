/**
 * AudioManager — Centralized audio control for the game.
 * Manages SFX playback, mute state, and volume.
 * Integrates with Phaser's sound system and SynthAudio fallback.
 */

import { playSynth, setSynthVolume } from '@/lib/SynthAudio';

export type SoundKey =
  | 'sfx-step'
  | 'sfx-interact'
  | 'sfx-correct'
  | 'sfx-incorrect'
  | 'sfx-fragment'
  | 'sfx-boss-hit'
  | 'sfx-boss-attack'
  | 'sfx-victory'
  | 'sfx-damage'
  | 'sfx-door';

const AUDIO_SETTINGS_KEY = 'cq-audio-settings';

interface AudioSettings {
  muted: boolean;
  volume: number;
}

export function getAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as AudioSettings;
  } catch { /* ignore */ }
  return { muted: false, volume: 0.7 };
}

export function saveAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function toggleMute(): boolean {
  const settings = getAudioSettings();
  settings.muted = !settings.muted;
  saveAudioSettings(settings);
  return settings.muted;
}

export function setVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(1, volume));
  const settings = getAudioSettings();
  settings.volume = clamped;
  saveAudioSettings(settings);
}

export function isMuted(): boolean {
  return getAudioSettings().muted;
}

export function getSoundAssets(): Array<{ key: SoundKey; path: string }> {
  return [
    { key: 'sfx-step', path: 'assets/sounds/step.ogg' },
    { key: 'sfx-interact', path: 'assets/sounds/interact.ogg' },
    { key: 'sfx-correct', path: 'assets/sounds/correct.ogg' },
    { key: 'sfx-incorrect', path: 'assets/sounds/incorrect.ogg' },
    { key: 'sfx-fragment', path: 'assets/sounds/fragment.ogg' },
    { key: 'sfx-boss-hit', path: 'assets/sounds/boss-hit.ogg' },
    { key: 'sfx-boss-attack', path: 'assets/sounds/boss-attack.ogg' },
    { key: 'sfx-victory', path: 'assets/sounds/victory.ogg' },
    { key: 'sfx-damage', path: 'assets/sounds/damage.ogg' },
    { key: 'sfx-door', path: 'assets/sounds/door.ogg' },
  ];
}

/**
 * Play a sound effect. Respects mute and volume.
 * Tries Phaser sound system first; falls back to SynthAudio (Web Audio API).
 */
export function playSFX(
  scene: { sound: { play: (key: string, config?: object) => void; get: (key: string) => unknown } },
  key: SoundKey
): void {
  const settings = getAudioSettings();
  if (settings.muted) return;

  // Try Phaser's sound system first (if .mp3 files are loaded)
  try {
    if (scene.sound.get(key)) {
      scene.sound.play(key, { volume: settings.volume });
      return;
    }
  } catch {
    // Fall through to synth
  }

  // Fallback: use procedural synth audio (no external files needed)
  setSynthVolume(settings.volume);
  playSynth(key);
}
