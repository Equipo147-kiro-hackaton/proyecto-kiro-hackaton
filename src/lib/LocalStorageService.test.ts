import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOrCreateProfile,
  loadProfile,
  saveProfile,
  updatePersonalBest,
  loadLeaderboard,
  submitScore,
  clearLeaderboard,
  profileExists,
  deleteProfile,
  clearAllGameData,
} from './LocalStorageService';

// Feature: cloud-quest-devops-dungeon, Property 1: Profile persistence round-trip
// Feature: cloud-quest-devops-dungeon, Property 2: Leaderboard maintains top 10 sorted

describe('LocalStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getOrCreateProfile', () => {
    it('creates a new profile if none exists', () => {
      const profile = getOrCreateProfile('newplayer');
      expect(profile.username).toBe('newplayer');
      expect(profile.personalBest).toBe(0);
      expect(profile.updatedAt).toBeTruthy();
    });

    it('returns existing profile if it exists', () => {
      const created = getOrCreateProfile('existinguser');
      created.personalBest = 500;
      saveProfile(created);

      const loaded = getOrCreateProfile('existinguser');
      expect(loaded.personalBest).toBe(500);
    });

    it('is case-insensitive', () => {
      getOrCreateProfile('TestUser');
      const loaded = loadProfile('testuser');
      expect(loaded).not.toBeNull();
      expect(loaded!.username).toBe('TestUser');
    });
  });

  describe('loadProfile / saveProfile', () => {
    it('round-trip preserves data', () => {
      const profile = { username: 'hero', personalBest: 1200, updatedAt: '2024-01-01T00:00:00Z' };
      saveProfile(profile);
      const loaded = loadProfile('hero');
      expect(loaded).toEqual(profile);
    });

    it('returns null for non-existent profile', () => {
      expect(loadProfile('nobody')).toBeNull();
    });
  });

  describe('updatePersonalBest', () => {
    it('updates when new score is higher', () => {
      getOrCreateProfile('player1');
      const updated = updatePersonalBest('player1', 300);
      expect(updated).toBe(true);
      const profile = loadProfile('player1');
      expect(profile!.personalBest).toBe(300);
    });

    it('does not update when score is lower', () => {
      const p = getOrCreateProfile('player2');
      p.personalBest = 500;
      saveProfile(p);
      const updated = updatePersonalBest('player2', 200);
      expect(updated).toBe(false);
      expect(loadProfile('player2')!.personalBest).toBe(500);
    });

    it('returns false for non-existent profile', () => {
      expect(updatePersonalBest('ghost', 100)).toBe(false);
    });
  });

  describe('profileExists / deleteProfile', () => {
    it('profileExists returns true after creation', () => {
      getOrCreateProfile('test');
      expect(profileExists('test')).toBe(true);
    });

    it('profileExists returns false when no profile', () => {
      expect(profileExists('nobody')).toBe(false);
    });

    it('deleteProfile removes the profile', () => {
      getOrCreateProfile('todelete');
      deleteProfile('todelete');
      expect(profileExists('todelete')).toBe(false);
    });
  });

  describe('loadLeaderboard', () => {
    it('returns empty array when no leaderboard exists', () => {
      expect(loadLeaderboard()).toEqual([]);
    });

    it('returns entries sorted by score descending', () => {
      submitScore('a', 100);
      submitScore('b', 500);
      submitScore('c', 250);
      const board = loadLeaderboard();
      expect(board[0].score).toBe(500);
      expect(board[1].score).toBe(250);
      expect(board[2].score).toBe(100);
    });
  });

  describe('submitScore', () => {
    it('adds a score to the leaderboard', () => {
      const position = submitScore('player1', 1000);
      expect(position).toBe(1);
      const board = loadLeaderboard();
      expect(board).toHaveLength(1);
      expect(board[0].username).toBe('player1');
    });

    it('maintains only top 10 entries', () => {
      for (let i = 0; i < 12; i++) {
        submitScore(`player${i}`, (i + 1) * 100);
      }
      const board = loadLeaderboard();
      expect(board).toHaveLength(10);
      expect(board[0].score).toBe(1200);
      expect(board[9].score).toBe(300);
    });

    it('returns null when score does not make top 10', () => {
      for (let i = 0; i < 10; i++) {
        submitScore(`top${i}`, 5000 + i * 100);
      }
      const position = submitScore('loser', 1);
      expect(position).toBeNull();
    });

    it('returns correct position for new entry', () => {
      submitScore('first', 1000);
      submitScore('second', 500);
      const pos = submitScore('third', 750);
      expect(pos).toBe(2);
    });
  });

  describe('clearLeaderboard', () => {
    it('removes all leaderboard entries', () => {
      submitScore('a', 100);
      submitScore('b', 200);
      clearLeaderboard();
      expect(loadLeaderboard()).toHaveLength(0);
    });
  });

  describe('clearAllGameData', () => {
    it('removes all cq- prefixed keys but keeps others', () => {
      getOrCreateProfile('user1');
      submitScore('user1', 500);
      localStorage.setItem('unrelated-key', 'keep');

      clearAllGameData();

      expect(loadProfile('user1')).toBeNull();
      expect(loadLeaderboard()).toHaveLength(0);
      expect(localStorage.getItem('unrelated-key')).toBe('keep');
    });
  });
});
