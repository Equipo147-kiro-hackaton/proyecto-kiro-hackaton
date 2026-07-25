import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveGame,
  loadGame,
  hasSave,
  deleteSave,
  createSaveData,
  getMostRecentSave,
} from './SaveSystem';

// Feature: cloud-quest-devops-dungeon, Property 1: Save/load round-trip preserves data
// Feature: cloud-quest-devops-dungeon, Property 2: Save operations respect mode/slot isolation

describe('SaveSystem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('createSaveData', () => {
    it('creates a valid SaveData object', () => {
      const data = createSaveData('normal', 'testuser', 2, 500, 80, ['frag-1', 'frag-2'], 5);
      expect(data.version).toBe(1);
      expect(data.mode).toBe('normal');
      expect(data.username).toBe('testuser');
      expect(data.currentLevel).toBe(2);
      expect(data.currentScore).toBe(500);
      expect(data.heroHP).toBe(80);
      expect(data.fragmentsCollected).toEqual(['frag-1', 'frag-2']);
      expect(data.totalPuzzlesSolved).toBe(5);
      expect(data.timestamp).toBeTruthy();
    });
  });

  describe('saveGame / loadGame round-trip', () => {
    it('save and load returns identical data', () => {
      const data = createSaveData('beginner', 'hero1', 3, 1200, 65, ['f1', 'f2', 'f3'], 8);
      const saved = saveGame('beginner', 0, data);
      expect(saved).toBe(true);

      const loaded = loadGame('beginner', 0);
      expect(loaded).not.toBeNull();
      expect(loaded!.username).toBe('hero1');
      expect(loaded!.currentLevel).toBe(3);
      expect(loaded!.currentScore).toBe(1200);
      expect(loaded!.heroHP).toBe(65);
      expect(loaded!.fragmentsCollected).toEqual(['f1', 'f2', 'f3']);
      expect(loaded!.totalPuzzlesSolved).toBe(8);
    });

    it('returns null when loading non-existent save', () => {
      expect(loadGame('normal', 5)).toBeNull();
    });

    it('different modes/slots are isolated', () => {
      const data1 = createSaveData('beginner', 'user1', 1, 100, 100, [], 0);
      const data2 = createSaveData('hard', 'user2', 4, 2000, 30, ['f1'], 15);

      saveGame('beginner', 0, data1);
      saveGame('hard', 0, data2);

      const loaded1 = loadGame('beginner', 0);
      const loaded2 = loadGame('hard', 0);
      expect(loaded1!.username).toBe('user1');
      expect(loaded2!.username).toBe('user2');
    });
  });

  describe('hasSave', () => {
    it('returns false when no save exists', () => {
      expect(hasSave('normal', 0)).toBe(false);
    });

    it('returns true after saving', () => {
      const data = createSaveData('normal', 'test', 1, 0, 100, [], 0);
      saveGame('normal', 0, data);
      expect(hasSave('normal', 0)).toBe(true);
    });
  });

  describe('deleteSave', () => {
    it('removes a save', () => {
      const data = createSaveData('normal', 'test', 1, 0, 100, [], 0);
      saveGame('normal', 0, data);
      expect(hasSave('normal', 0)).toBe(true);

      deleteSave('normal', 0);
      expect(hasSave('normal', 0)).toBe(false);
      expect(loadGame('normal', 0)).toBeNull();
    });

    it('does not throw when deleting non-existent save', () => {
      expect(() => deleteSave('hard', 9)).not.toThrow();
    });
  });

  describe('getMostRecentSave', () => {
    it('returns null when no saves exist', () => {
      expect(getMostRecentSave('normal')).toBeNull();
    });

    it('returns the most recent save by timestamp', () => {
      const older = createSaveData('normal', 'test', 1, 100, 90, [], 1);
      older.timestamp = '2024-01-01T00:00:00.000Z';
      saveGame('normal', 0, older);

      const newer = createSaveData('normal', 'test', 2, 500, 70, ['f1'], 5);
      newer.timestamp = '2024-06-15T12:00:00.000Z';
      saveGame('normal', 1, newer);

      const most = getMostRecentSave('normal');
      expect(most).not.toBeNull();
      expect(most!.slot).toBe(1);
      expect(most!.data.currentLevel).toBe(2);
    });
  });
});
