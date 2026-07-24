import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RunResult } from '@/types';

// Mock Phaser to avoid canvas initialization in jsdom
vi.mock('phaser', () => {
  class EventEmitter {
    private listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    on(event: string, fn: (...args: unknown[]) => void) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
      return this;
    }
    emit(event: string, ...args: unknown[]) {
      (this.listeners[event] ?? []).forEach(fn => fn(...args));
      return this;
    }
    removeAllListeners() {
      this.listeners = {};
      return this;
    }
  }
  return {
    default: { Events: { EventEmitter } },
    Events: { EventEmitter },
  };
});

// Mock ApiClient
vi.mock('@/lib/ApiClient', () => ({
  submitScore: vi.fn(),
}));

import { ScoreSystem } from './ScoreSystem';
import { EventBus, EVENTS } from '@/lib/EventBus';
import { submitScore as mockApiSubmitScore } from '@/lib/ApiClient';

describe('ScoreSystem', () => {
  let scoreSystem: ScoreSystem;

  beforeEach(() => {
    scoreSystem = new ScoreSystem();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    EventBus.removeAllListeners();
  });

  describe('calculateIncrement', () => {
    it('calculates base score as 100 * levelNumber', () => {
      const result = scoreSystem.calculateIncrement({
        levelNumber: 3,
        remainingSeconds: 20,
        bugDifficulty: 1,
        hasScoreMultiplier: false,
      });
      expect(result).toBe(300);
    });

    it('adds 50 Speed Bonus when remainingSeconds > 30', () => {
      const result = scoreSystem.calculateIncrement({
        levelNumber: 2,
        remainingSeconds: 31,
        bugDifficulty: 1,
        hasScoreMultiplier: false,
      });
      expect(result).toBe(250); // 200 + 50
    });

    it('does not add Speed Bonus when remainingSeconds = 30', () => {
      const result = scoreSystem.calculateIncrement({
        levelNumber: 2,
        remainingSeconds: 30,
        bugDifficulty: 1,
        hasScoreMultiplier: false,
      });
      expect(result).toBe(200);
    });

    it('does not add Speed Bonus when remainingSeconds < 30', () => {
      const result = scoreSystem.calculateIncrement({
        levelNumber: 1,
        remainingSeconds: 10,
        bugDifficulty: 1,
        hasScoreMultiplier: false,
      });
      expect(result).toBe(100);
    });

    it('doubles score when hasScoreMultiplier is true (no speed bonus)', () => {
      const result = scoreSystem.calculateIncrement({
        levelNumber: 5,
        remainingSeconds: 10,
        bugDifficulty: 2,
        hasScoreMultiplier: true,
      });
      expect(result).toBe(1000); // 500 * 2
    });

    it('doubles score including speed bonus when both apply', () => {
      const result = scoreSystem.calculateIncrement({
        levelNumber: 3,
        remainingSeconds: 45,
        bugDifficulty: 1,
        hasScoreMultiplier: true,
      });
      expect(result).toBe(700); // (300 + 50) * 2
    });

    it('handles level 1 with all bonuses', () => {
      const result = scoreSystem.calculateIncrement({
        levelNumber: 1,
        remainingSeconds: 60,
        bugDifficulty: 3,
        hasScoreMultiplier: true,
      });
      expect(result).toBe(300); // (100 + 50) * 2
    });
  });

  describe('calculateBugDefeatBonus', () => {
    it('returns 100 * difficulty for difficulty 1', () => {
      expect(scoreSystem.calculateBugDefeatBonus(1)).toBe(100);
    });

    it('returns 100 * difficulty for difficulty 2', () => {
      expect(scoreSystem.calculateBugDefeatBonus(2)).toBe(200);
    });

    it('returns 100 * difficulty for difficulty 3', () => {
      expect(scoreSystem.calculateBugDefeatBonus(3)).toBe(300);
    });
  });

  describe('submitScore', () => {
    const runResult: RunResult = {
      username: 'testPlayer',
      score: 1500,
      highestLevel: 5,
      totalPuzzlesSolved: 10,
      totalBugsDefeated: 7,
    };

    it('returns true and emits SCORE_SAVED on successful submission', async () => {
      vi.mocked(mockApiSubmitScore).mockResolvedValueOnce(undefined);

      const scoreSavedHandler = vi.fn();
      EventBus.on(EVENTS.SCORE_SAVED, scoreSavedHandler);

      const result = await scoreSystem.submitScore(runResult);

      expect(result).toBe(true);
      expect(scoreSavedHandler).toHaveBeenCalledOnce();
      expect(mockApiSubmitScore).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testPlayer',
          score: 1500,
          highestLevel: 5,
        })
      );
    });

    it('returns false and schedules retry on failure', async () => {
      vi.mocked(mockApiSubmitScore).mockRejectedValueOnce(new Error('Network error'));

      const result = await scoreSystem.submitScore(runResult);

      expect(result).toBe(false);
    });
  });

  describe('scheduleRetry', () => {
    const runResult: RunResult = {
      username: 'retryPlayer',
      score: 800,
      highestLevel: 3,
      totalPuzzlesSolved: 5,
      totalBugsDefeated: 3,
    };

    it('retries submission after specified delay', async () => {
      vi.mocked(mockApiSubmitScore).mockResolvedValueOnce(undefined);

      const scoreSavedHandler = vi.fn();
      EventBus.on(EVENTS.SCORE_SAVED, scoreSavedHandler);

      scoreSystem.scheduleRetry(runResult, 30000);

      // Not called immediately
      expect(mockApiSubmitScore).not.toHaveBeenCalled();

      // Advance timer by 30 seconds
      await vi.advanceTimersByTimeAsync(30000);

      expect(mockApiSubmitScore).toHaveBeenCalledOnce();
      expect(scoreSavedHandler).toHaveBeenCalledOnce();
    });

    it('emits SCORE_NOT_SAVED when retry also fails', async () => {
      vi.mocked(mockApiSubmitScore).mockRejectedValueOnce(new Error('Still failing'));

      const scoreNotSavedHandler = vi.fn();
      EventBus.on(EVENTS.SCORE_NOT_SAVED, scoreNotSavedHandler);

      scoreSystem.scheduleRetry(runResult, 30000);

      await vi.advanceTimersByTimeAsync(30000);

      expect(scoreNotSavedHandler).toHaveBeenCalledOnce();
    });
  });
});
