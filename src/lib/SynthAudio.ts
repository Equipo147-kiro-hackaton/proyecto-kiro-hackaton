/**
 * SynthAudio — Procedural sound effect generator using Web Audio API.
 * Generates retro 8-bit style SFX at runtime without external files.
 * 
 * Each sound is a short burst (50-500ms) of synthesized waveforms.
 * Volume and mute are controlled by the caller (AudioManager).
 */

let audioContext: AudioContext | null = null;

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

/** Default volume (can be overridden by caller) */
let currentVolume = 0.7;

/**
 * Set the volume for synth audio (called by AudioManager).
 */
export function setSynthVolume(vol: number): void {
  currentVolume = Math.max(0, Math.min(1, vol));
}

/**
 * Play a synthesized sound effect.
 * All sounds are non-blocking and fire-and-forget.
 */
export function playSynth(type: string): void {
  const ctx = getContext();
  if (!ctx) return;

  switch (type) {
    case 'sfx-correct': playCorrect(ctx); break;
    case 'sfx-incorrect': playIncorrect(ctx); break;
    case 'sfx-fragment': playFragment(ctx); break;
    case 'sfx-boss-hit': playBossHit(ctx); break;
    case 'sfx-boss-attack': playBossAttack(ctx); break;
    case 'sfx-victory': playVictory(ctx); break;
    case 'sfx-damage': playDamage(ctx); break;
    case 'sfx-door': playDoor(ctx); break;
    case 'sfx-interact': playInteract(ctx); break;
    case 'sfx-step': playStep(ctx); break;
  }
}

// ─── Sound Definitions ────────────────────────────────────────────────────

function playCorrect(ctx: AudioContext): void {
  // Ascending arpeggio: C5 → E5 → G5
  const vol = currentVolume * 0.3;
  const now = ctx.currentTime;
  playTone(ctx, 523, now, 0.08, vol, 'square');
  playTone(ctx, 659, now + 0.08, 0.08, vol, 'square');
  playTone(ctx, 784, now + 0.16, 0.12, vol * 1.2, 'square');
}

function playIncorrect(ctx: AudioContext): void {
  // Descending buzz: E4 → C4
  const vol = currentVolume * 0.25;
  const now = ctx.currentTime;
  playTone(ctx, 330, now, 0.1, vol, 'sawtooth');
  playTone(ctx, 262, now + 0.1, 0.15, vol, 'sawtooth');
}

function playFragment(ctx: AudioContext): void {
  // Sparkle: high pitch shimmer
  const vol = currentVolume * 0.2;
  const now = ctx.currentTime;
  playTone(ctx, 1047, now, 0.05, vol, 'sine');
  playTone(ctx, 1319, now + 0.05, 0.05, vol, 'sine');
  playTone(ctx, 1568, now + 0.10, 0.1, vol * 0.8, 'sine');
}

function playBossHit(ctx: AudioContext): void {
  // Impact: low thump + mid crack
  const vol = currentVolume * 0.35;
  const now = ctx.currentTime;
  playTone(ctx, 100, now, 0.08, vol, 'sine');
  playNoise(ctx, now + 0.02, 0.06, vol * 0.5);
  playTone(ctx, 200, now + 0.05, 0.1, vol * 0.6, 'square');
}

function playBossAttack(ctx: AudioContext): void {
  // Sweep down: alarm-like
  const vol = currentVolume * 0.3;
  const now = ctx.currentTime;
  playSweep(ctx, 800, 200, now, 0.2, vol, 'sawtooth');
}

function playVictory(ctx: AudioContext): void {
  // Fanfare: ascending major chord arpeggio
  const vol = currentVolume * 0.25;
  const now = ctx.currentTime;
  playTone(ctx, 523, now, 0.1, vol, 'square');
  playTone(ctx, 659, now + 0.1, 0.1, vol, 'square');
  playTone(ctx, 784, now + 0.2, 0.1, vol, 'square');
  playTone(ctx, 1047, now + 0.3, 0.2, vol * 1.3, 'square');
}

function playDamage(ctx: AudioContext): void {
  // Hit: noise burst + low tone
  const vol = currentVolume * 0.3;
  const now = ctx.currentTime;
  playNoise(ctx, now, 0.08, vol);
  playTone(ctx, 150, now, 0.12, vol * 0.7, 'square');
}

function playDoor(ctx: AudioContext): void {
  // Mechanical: sweep up
  const vol = currentVolume * 0.2;
  const now = ctx.currentTime;
  playSweep(ctx, 200, 600, now, 0.25, vol, 'triangle');
}

function playInteract(ctx: AudioContext): void {
  // Click: short blip
  const vol = currentVolume * 0.2;
  const now = ctx.currentTime;
  playTone(ctx, 880, now, 0.04, vol, 'square');
  playTone(ctx, 1100, now + 0.04, 0.03, vol * 0.7, 'square');
}

function playStep(ctx: AudioContext): void {
  // Soft tap
  const vol = currentVolume * 0.08;
  const now = ctx.currentTime;
  playNoise(ctx, now, 0.03, vol);
}

// ─── Primitives ───────────────────────────────────────────────────────────

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

function playSweep(
  ctx: AudioContext,
  startFreq: number,
  endFreq: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, startTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

function playNoise(
  ctx: AudioContext,
  startTime: number,
  duration: number,
  volume: number
): void {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(startTime);
  source.stop(startTime + duration + 0.01);
}
