import type { ScoreEvent, RunResult } from '@/types';
import { EventBus, EVENTS } from '@/lib/EventBus';
import { submitScore as apiSubmitScore } from '@/lib/ApiClient';

/**
 * ScoreSystem — handles score calculation, speed bonus, bug defeat bonus,
 * and score persistence with retry logic.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export class ScoreSystem {
  /**
   * Calculate score increment for a solved puzzle.
   *
   * Formula:
   *   base = 100 * levelNumber
   *   + 50 if remainingSeconds > 30 (Speed Bonus)
   *   × 2 if hasScoreMultiplier
   */
  calculateIncrement(event: ScoreEvent): number {
    let score = 100 * event.levelNumber;

    // Speed Bonus: +50 if more than 30 seconds remaining
    if (event.remainingSeconds > 30) {
      score += 50;
    }

    // Score Multiplier: double the score
    if (event.hasScoreMultiplier) {
      score *= 2;
    }

    return score;
  }

  /**
   * Calculate bug defeat bonus.
   * Returns 100 * difficulty.
   */
  calculateBugDefeatBonus(difficulty: number): number {
    return 100 * difficulty;
  }

  /**
   * Persist run result to backend.
   * On success, emits EVENTS.SCORE_SAVED and returns true.
   * On failure, schedules one retry after 30 seconds and returns false.
   */
  async submitScore(result: RunResult): Promise<boolean> {
    try {
      await apiSubmitScore({
        username: result.username,
        score: result.score,
        highestLevel: result.highestLevel,
        timestamp: new Date().toISOString(),
      });
      EventBus.emit(EVENTS.SCORE_SAVED);
      return true;
    } catch {
      this.scheduleRetry(result, 30000);
      return false;
    }
  }

  /**
   * Schedule one retry attempt after delayMs.
   * If the retry also fails, emits EVENTS.SCORE_NOT_SAVED.
   */
  scheduleRetry(result: RunResult, delayMs: number): void {
    setTimeout(async () => {
      try {
        await apiSubmitScore({
          username: result.username,
          score: result.score,
          highestLevel: result.highestLevel,
          timestamp: new Date().toISOString(),
        });
        EventBus.emit(EVENTS.SCORE_SAVED);
      } catch {
        EventBus.emit(EVENTS.SCORE_NOT_SAVED);
      }
    }, delayMs);
  }
}
