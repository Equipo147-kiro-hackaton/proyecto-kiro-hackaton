import { ScoreEvent, RunResult, ScorePayload } from '@/types';
import { EventBus, EVENTS } from '@/lib/EventBus';

/**
 * ScoreSystem — Handles score calculation, speed bonus, bug defeat bonus,
 * and persistence with retry mechanism.
 *
 * Pure logic system, independent of Phaser.
 * Uses a submitFn dependency injection to decouple from ApiClient.
 */

/** Speed bonus threshold in seconds */
const SPEED_BONUS_THRESHOLD = 30;

/** Speed bonus points */
const SPEED_BONUS_POINTS = 50;

/** Retry delay in milliseconds (30 seconds) */
const RETRY_DELAY_MS = 30_000;

/** Type for the score submission function (injected dependency) */
export type SubmitScoreFn = (payload: ScorePayload) => Promise<void>;

export class ScoreSystem {
  private submitFn: SubmitScoreFn | null;
  private retryTimer: ReturnType<typeof setTimeout> | null;

  constructor(submitFn?: SubmitScoreFn) {
    this.submitFn = submitFn ?? null;
    this.retryTimer = null;
  }

  /**
   * Set or replace the score submission function.
   * Called when ApiClient becomes available.
   */
  setSubmitFn(fn: SubmitScoreFn): void {
    this.submitFn = fn;
  }

  /**
   * Calculate score increment for a solved puzzle.
   *
   * Formula:
   *   base = 100 × levelNumber
   *   + 50 if remainingSeconds > 30 (Speed Bonus)
   *   × 2 if hasScoreMultiplier
   */
  calculateIncrement(event: ScoreEvent): number {
    let score = 100 * event.levelNumber;

    if (event.remainingSeconds > SPEED_BONUS_THRESHOLD) {
      score += SPEED_BONUS_POINTS;
    }

    if (event.hasScoreMultiplier) {
      score *= 2;
    }

    return score;
  }

  /**
   * Calculate bug defeat bonus.
   * Formula: 100 × bugDifficulty
   */
  calculateBugBonus(bugDifficulty: number): number {
    return 100 * bugDifficulty;
  }

  /**
   * Persist run result to backend.
   * Returns true on success, false on failure.
   * On failure, schedules a single retry after 30 seconds.
   */
  async submitScore(result: RunResult): Promise<boolean> {
    if (!this.submitFn) {
      this.emitNotSaved();
      return false;
    }

    const payload: ScorePayload = {
      username: result.username,
      score: result.score,
      highestLevel: result.highestLevel,
      timestamp: result.timestamp,
    };

    try {
      await this.submitFn(payload);
      EventBus.emit(EVENTS.SCORE_SAVED);
      return true;
    } catch {
      this.scheduleRetry(payload);
      return false;
    }
  }

  /**
   * Cancel any pending retry timer.
   * Called when starting a new run or cleaning up.
   */
  cancelRetry(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Schedule a single retry attempt after RETRY_DELAY_MS.
   * On retry failure, emits SCORE_NOT_SAVED event.
   */
  private scheduleRetry(payload: ScorePayload): void {
    this.cancelRetry();

    this.retryTimer = setTimeout(async () => {
      this.retryTimer = null;

      if (!this.submitFn) {
        this.emitNotSaved();
        return;
      }

      try {
        await this.submitFn(payload);
        EventBus.emit(EVENTS.SCORE_SAVED);
      } catch {
        this.emitNotSaved();
      }
    }, RETRY_DELAY_MS);
  }

  /**
   * Emit the SCORE_NOT_SAVED event to notify the UI.
   */
  private emitNotSaved(): void {
    EventBus.emit(EVENTS.SCORE_NOT_SAVED);
  }
}
