/**
 * AudioManager — Centralized audio control for the game.
 * Manages SFX playback, mute state, and volume.
 * Integrates with Phaser's sound system.
 */

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
    { key: 'sfx-step', path: 'assets/sounds/step.mp3' },
    { key: 'sfx-interact', path: 'assets/sounds/interact.mp3' },
    { key: 'sfx-correct', path: 'assets/sounds/correct.mp3' },
    { key: 'sfx-incorrect', path: 'assets/sounds/incorrect.mp3' },
    { key: 'sfx-fragment', path: 'assets/sounds/fragment.mp3' },
    { key: 'sfx-boss-hit', path: 'assets/sounds/boss-hit.mp3' },
    { key: 'sfx-boss-attack', path: 'assets/sounds/boss-attack.mp3' },
    { key: 'sfx-victory', path: 'assets/sounds/victory.mp3' },
    { key: 'sfx-damage', path: 'assets/sounds/damage.mp3' },
    { key: 'sfx-door', path: 'assets/sounds/door.mp3' },
  ];
}

/**
 * Play a sound effect. Respects mute and volume. Fails silently if sound not loaded.
 */
export function playSFX(
  scene: { sound: { play: (key: string, config?: object) => void; get: (key: string) => unknown } },
  key: SoundKey
): void {
  const settings = getAudioSettings();
  if (settings.muted) return;

  try {
    if (scene.sound.get(key)) {
      scene.sound.play(key, { volume: settings.volume });
    }
  } catch {
    // Silent fail — audio files are optional
  }
}
