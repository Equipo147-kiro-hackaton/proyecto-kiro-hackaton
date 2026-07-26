import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock zzfx to avoid AudioContext requirement in test environment
vi.mock('zzfx', () => ({
  zzfx: vi.fn(),
  ZZFX: { volume: 0.3, sampleRate: 44100, x: null },
}));

import {
  getAudioSettings,
  saveAudioSettings,
  toggleMute,
  setVolume,
  isMuted,
  getSoundAssets,
} from './AudioManager';

// Feature: cloud-quest-devops-dungeon, Property 1: Audio settings persistence
// Feature: cloud-quest-devops-dungeon, Property 2: Mute toggle is consistent

describe('AudioManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getAudioSettings', () => {
    it('returns defaults when no settings saved', () => {
      const settings = getAudioSettings();
      expect(settings.muted).toBe(false);
      expect(settings.volume).toBe(0.7);
    });

    it('returns saved settings', () => {
      saveAudioSettings({ muted: true, volume: 0.3 });
      const settings = getAudioSettings();
      expect(settings.muted).toBe(true);
      expect(settings.volume).toBe(0.3);
    });
  });

  describe('toggleMute', () => {
    it('toggles from unmuted to muted', () => {
      const result = toggleMute();
      expect(result).toBe(true);
      expect(isMuted()).toBe(true);
    });

    it('toggles back to unmuted', () => {
      toggleMute();
      const result = toggleMute();
      expect(result).toBe(false);
      expect(isMuted()).toBe(false);
    });

    it('persists across reads', () => {
      toggleMute();
      const settings = getAudioSettings();
      expect(settings.muted).toBe(true);
    });
  });

  describe('setVolume', () => {
    it('sets volume between 0 and 1', () => {
      setVolume(0.5);
      expect(getAudioSettings().volume).toBe(0.5);
    });

    it('clamps volume to 0', () => {
      setVolume(-0.5);
      expect(getAudioSettings().volume).toBe(0);
    });

    it('clamps volume to 1', () => {
      setVolume(1.5);
      expect(getAudioSettings().volume).toBe(1);
    });
  });

  describe('getSoundAssets', () => {
    it('returns 10 sound assets', () => {
      expect(getSoundAssets()).toHaveLength(10);
    });

    it('all assets have key and path', () => {
      for (const asset of getSoundAssets()) {
        expect(asset.key).toBeTruthy();
        expect(asset.path).toMatch(/\.mp3$/);
      }
    });

    it('all keys are unique', () => {
      const keys = getSoundAssets().map((a) => a.key);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });
});
