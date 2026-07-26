/**
 * MusicManager — Procedural ambient music using Web Audio API.
 *
 * Generates different ambient soundscapes per scenario type:
 * - 'menu': calm pad with slow LFO
 * - 'office': lo-fi ambient with subtle rhythmic pulse
 * - 'server': electronic hum with data-like arpeggios
 * - 'cloud': ethereal pad with reverb feel
 * - 'boss': intense low drone with fast pulse
 *
 * Supports crossfade between tracks, volume control, and mute.
 * Uses AudioManager settings for volume/mute state.
 */

import { getAudioSettings } from '@/lib/AudioManager';

export type MusicTrack = 'menu' | 'office' | 'server' | 'cloud' | 'boss' | 'victory';

interface TrackConfig {
  baseFreq: number;
  waveform: OscillatorType;
  lfoRate: number;
  lfoDepth: number;
  filterFreq: number;
  gain: number;
}

const TRACK_CONFIGS: Record<MusicTrack, TrackConfig> = {
  menu: { baseFreq: 220, waveform: 'sine', lfoRate: 0.3, lfoDepth: 10, filterFreq: 800, gain: 0.12 },
  office: { baseFreq: 165, waveform: 'triangle', lfoRate: 0.5, lfoDepth: 5, filterFreq: 600, gain: 0.10 },
  server: { baseFreq: 110, waveform: 'sawtooth', lfoRate: 2.0, lfoDepth: 15, filterFreq: 400, gain: 0.08 },
  cloud: { baseFreq: 330, waveform: 'sine', lfoRate: 0.2, lfoDepth: 20, filterFreq: 1200, gain: 0.10 },
  boss: { baseFreq: 82, waveform: 'square', lfoRate: 4.0, lfoDepth: 8, filterFreq: 300, gain: 0.14 },
  victory: { baseFreq: 440, waveform: 'sine', lfoRate: 0.4, lfoDepth: 12, filterFreq: 2000, gain: 0.12 },
};

let audioContext: AudioContext | null = null;
let currentOscillator: OscillatorNode | null = null;
let currentLFO: OscillatorNode | null = null;
let currentGainNode: GainNode | null = null;
let _currentFilterNode: BiquadFilterNode | null = null;
let currentTrack: MusicTrack | null = null;
let isStopping = false;

function getContext(): AudioContext | null {
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => { /* ignore */ });
  }
  return audioContext;
}

/**
 * Play a music track. If a different track is already playing, crossfades.
 * If the same track is already playing, does nothing.
 */
export function playMusic(track: MusicTrack): void {
  const settings = getAudioSettings();
  if (settings.muted) {
    currentTrack = track; // Remember for when unmuted
    return;
  }

  if (currentTrack === track && currentOscillator && !isStopping) return;

  if (currentOscillator) {
    crossfadeTo(track);
  } else {
    startTrack(track);
  }
}

/**
 * Stop all music with a fade-out.
 */
export function stopMusic(): void {
  if (!currentGainNode || !currentOscillator) return;

  isStopping = true;
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  currentGainNode.gain.setValueAtTime(currentGainNode.gain.value, now);
  currentGainNode.gain.linearRampToValueAtTime(0, now + 0.5);

  const osc = currentOscillator;
  const lfo = currentLFO;
  setTimeout(() => {
    try { osc.stop(); } catch { /* ignore */ }
    try { lfo?.stop(); } catch { /* ignore */ }
  }, 600);

  currentOscillator = null;
  currentLFO = null;
  currentGainNode = null;
  _currentFilterNode = null;
  currentTrack = null;
  isStopping = false;
}

/**
 * Update music volume (called when settings change).
 */
export function updateMusicVolume(): void {
  if (!currentGainNode || !currentTrack) return;
  const settings = getAudioSettings();

  if (settings.muted) {
    currentGainNode.gain.value = 0;
  } else {
    const config = TRACK_CONFIGS[currentTrack];
    currentGainNode.gain.value = config.gain * settings.volume;
  }
}

/**
 * Resume music after unmute (if a track was remembered).
 */
export function resumeAfterUnmute(): void {
  if (currentTrack && !currentOscillator) {
    startTrack(currentTrack);
  } else {
    updateMusicVolume();
  }
}

/**
 * Get current playing track name (or null).
 */
export function getCurrentTrack(): MusicTrack | null {
  return currentTrack;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function startTrack(track: MusicTrack): void {
  const ctx = getContext();
  if (!ctx) return;

  const config = TRACK_CONFIGS[track];
  const settings = getAudioSettings();
  const volume = settings.muted ? 0 : config.gain * settings.volume;

  // Main oscillator
  const osc = ctx.createOscillator();
  osc.type = config.waveform;
  osc.frequency.value = config.baseFreq;

  // LFO for vibrato/tremolo
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = config.lfoRate;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = config.lfoDepth;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  // Filter
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = config.filterFreq;
  filter.Q.value = 1;

  // Gain (volume)
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0;

  // Chain: osc → filter → gain → destination
  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  lfo.start();

  // Fade in
  const now = ctx.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(volume, now + 1.0);

  currentOscillator = osc;
  currentLFO = lfo;
  currentGainNode = gainNode;
  _currentFilterNode = filter;
  currentTrack = track;
  isStopping = false;
}

function crossfadeTo(track: MusicTrack): void {
  const ctx = getContext();
  if (!ctx || !currentGainNode) return;

  // Fade out current
  const now = ctx.currentTime;
  currentGainNode.gain.setValueAtTime(currentGainNode.gain.value, now);
  currentGainNode.gain.linearRampToValueAtTime(0, now + 0.8);

  const oldOsc = currentOscillator;
  const oldLfo = currentLFO;

  // Stop old nodes after fade
  setTimeout(() => {
    try { oldOsc?.stop(); } catch { /* ignore */ }
    try { oldLfo?.stop(); } catch { /* ignore */ }
  }, 900);

  // Clear references and start new track
  currentOscillator = null;
  currentLFO = null;
  currentGainNode = null;
  _currentFilterNode = null;

  // Start new track after a brief overlap
  setTimeout(() => {
    startTrack(track);
  }, 400);
}
