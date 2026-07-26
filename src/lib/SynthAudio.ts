/**
 * SynthAudio — Sound effect generator using ZzFX (MIT).
 * https://github.com/KilledByAPixel/ZzFX
 *
 * Each sound is defined as a ZzFX parameter array, producing high-quality
 * retro-style SFX without any external audio files.
 *
 * ZzFX parameters (20 total):
 * volume, randomness, frequency, attack, sustain, release, shape, shapeCurve,
 * slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation,
 * bitCrush, delay, sustainVolume, decay, tremolo
 */

import { zzfx, ZZFX } from 'zzfx';
import type { SoundKey } from '@/lib/AudioManager';

/**
 * ZzFX presets for each game sound effect.
 * Generated and tuned using https://killedbyapixel.github.io/ZzFX/
 */
const SFX_PRESETS: Record<SoundKey, (number | undefined)[]> = {
  // Soft footstep click
  'sfx-step': [0.2, 0, 200, , 0.01, 0.01, 4, 0.5, , , , , , , , , , 0.5, 0.01],

  // UI interaction blip (friendly beep)
  'sfx-interact': [0.4, 0, 880, 0.01, 0.05, 0.1, 1, 1.5, , , 200, 0.03, , , , , , 0.7, 0.02],

  // Correct answer — ascending triumphant jingle
  'sfx-correct': [0.5, 0, 587, 0.02, 0.15, 0.3, 1, 0.5, , , 400, 0.05, 0.05, , , , , 0.8, 0.1],

  // Incorrect answer — descending buzz
  'sfx-incorrect': [0.4, 0, 200, 0.01, 0.1, 0.2, 3, 2, , , -100, 0.05, , , , 0.5, , 0.6, 0.05],

  // Fragment collected — magical tinkle
  'sfx-fragment': [0.5, 0, 1200, 0.01, 0.08, 0.2, 1, 1, , , 300, 0.02, 0.04, , , , , 0.8, 0.05],

  // Boss hit — heavy impact thud
  'sfx-boss-hit': [0.6, 0, 150, 0.01, 0.05, 0.15, 4, 3, , , , , , 0.5, , 0.3, , 0.9, 0.02],

  // Boss attack — aggressive slash
  'sfx-boss-attack': [0.5, 0, 300, 0.01, 0.03, 0.1, 4, 2, -20, , , , , 0.8, , , , 0.7, 0.03],

  // Victory — celebratory fanfare
  'sfx-victory': [0.6, 0, 523, 0.02, 0.2, 0.4, 1, 0.5, , , 200, 0.08, 0.08, , , , , 0.9, 0.15],

  // Damage taken — painful hit
  'sfx-damage': [0.5, 0, 100, 0.01, 0.05, 0.1, 4, 3, , , -50, 0.02, , 0.3, , 0.5, , 0.7, 0.02],

  // Door open — metallic creak
  'sfx-door': [0.3, 0, 400, 0.02, 0.1, 0.2, 2, 1, 10, , 100, 0.05, 0.02, , , , , 0.6, 0.08],
};

/** Current volume multiplier (set by AudioManager) */
let currentVolume = 0.7;

/**
 * Set the volume for synth audio.
 */
export function setSynthVolume(vol: number): void {
  currentVolume = Math.max(0, Math.min(1, vol));
  ZZFX.volume = currentVolume;
}

/**
 * Play a sound effect by key using ZzFX.
 */
export function playSynth(key: SoundKey): void {
  const preset = SFX_PRESETS[key];
  if (!preset) return;

  // Apply volume to the first parameter (volume) of the preset
  const params = [...preset];
  params[0] = (params[0] ?? 0.5) * currentVolume;

  zzfx(...params);
}
