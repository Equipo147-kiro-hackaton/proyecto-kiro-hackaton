import { Item, HeroItemSlots, RunState } from '@/types';
import { ITEM_DEFINITIONS } from '@/data/items';

/**
 * ItemSystem — Manages item pool, selection without replacement,
 * effect application, and active item cap enforcement.
 *
 * Pure logic system, independent of Phaser.
 */

/** Maximum number of active items the hero can carry */
export const MAX_ACTIVE_ITEMS = 3;

/** HP cap for the hero */
const MAX_HP = 100;

/** Timer extension amount in seconds */
const TIMER_EXTENSION_AMOUNT = 15;

/** HP recovery amount */
const HP_RECOVERY_AMOUNT = 20;

/** Score multiplier duration in rooms */
const SCORE_MULTIPLIER_DURATION = 3;

/** Bug weakener reduction percentage */
const BUG_WEAKENER_REDUCTION = 0.30;

export class ItemSystem {
  private pool: Item[];
  private awarded: Set<string>;

  constructor() {
    this.pool = [];
    this.awarded = new Set();
    this.initializePool();
  }

  /**
   * Draw 2 random distinct items from the un-awarded pool.
   * Returns [Item, Item] if 2+ available, [Item] if only 1, or empty array if none.
   */
  drawSelection(): [Item, Item] | [Item] | [] {
    const available = this.pool.filter((item) => !this.awarded.has(item.id));

    if (available.length === 0) {
      return [];
    }

    if (available.length === 1) {
      return [available[0]];
    }

    // Pick 2 distinct items
    const firstIndex = Math.floor(Math.random() * available.length);
    const first = available[firstIndex];

    const remaining = available.filter((_, i) => i !== firstIndex);
    const secondIndex = Math.floor(Math.random() * remaining.length);
    const second = remaining[secondIndex];

    return [first, second];
  }

  /**
   * Apply the item's effect to the run state and mark it as awarded.
   * The item is removed from the available pool for the rest of the run.
   */
  applyItem(item: Item, runState: RunState): void {
    this.awarded.add(item.id);

    switch (item.type) {
      case 'Timer_Extension':
        this.applyTimerExtension(runState);
        break;

      case 'HP_Recovery':
        this.applyHPRecovery(runState);
        break;

      case 'Hint_Revealer':
        this.applyHintRevealer(item, runState);
        break;

      case 'Score_Multiplier':
        this.applyScoreMultiplier(item, runState);
        break;

      case 'Bug_Weakener':
        this.applyBugWeakener(item, runState);
        break;

      case 'Second_Chance':
        this.applySecondChance(item, runState);
        break;
    }
  }

  /**
   * Check if the hero can accept a new item (fewer than 3 active items).
   */
  canAccept(slots: HeroItemSlots): boolean {
    return slots.active.length < MAX_ACTIVE_ITEMS;
  }

  /**
   * Reset the item pool and awarded tracking for a new Run.
   */
  reset(): void {
    this.awarded.clear();
    this.initializePool();
  }

  /**
   * Get the bug weakener reduction factor.
   * Used by GameScene to reduce bug HP before combat.
   */
  getBugWeakenerReduction(): number {
    return BUG_WEAKENER_REDUCTION;
  }

  /**
   * Check if a specific item type is currently active in the run state.
   */
  isItemActive(itemType: Item['type'], runState: RunState): boolean {
    return runState.activeItems.some((item) => item.type === itemType);
  }

  // ─── Private Effect Methods ──────────────────────────────────────────────

  /**
   * Timer_Extension: Adds 15s to the active timer, capped at initial max.
   * The initial max is determined by boss status: 90 for boss, 60 for standard.
   */
  private applyTimerExtension(runState: RunState): void {
    // Determine the timer max based on current puzzle context
    // Standard timer is 60s, boss timer is 90s
    const timerMax = runState.timerSeconds > 60 ? 90 : 60;
    runState.timerSeconds = Math.min(
      runState.timerSeconds + TIMER_EXTENSION_AMOUNT,
      timerMax,
    );
  }

  /**
   * HP_Recovery: Restores 20 HP, capped at 100.
   */
  private applyHPRecovery(runState: RunState): void {
    runState.heroHP = Math.min(runState.heroHP + HP_RECOVERY_AMOUNT, MAX_HP);
  }

  /**
   * Hint_Revealer: Added to active items; effect is triggered by GameScene
   * on next incorrect answer.
   */
  private applyHintRevealer(item: Item, runState: RunState): void {
    runState.activeItems.push(item);
  }

  /**
   * Score_Multiplier: Doubles base score for next 3 rooms.
   * Non-stackable: if already active, does not add a second multiplier.
   */
  private applyScoreMultiplier(item: Item, runState: RunState): void {
    // Non-stackable check
    if (runState.scoreMultiplierRoomsRemaining > 0) {
      return;
    }

    runState.scoreMultiplierRoomsRemaining = SCORE_MULTIPLIER_DURATION;
    runState.activeItems.push(item);
  }

  /**
   * Bug_Weakener: Added to active items; effect is applied by GameScene
   * to reduce the next bug's HP by 30% (rounded down).
   */
  private applyBugWeakener(item: Item, runState: RunState): void {
    runState.activeItems.push(item);
  }

  /**
   * Second_Chance: Added to active items; triggers once when HP would reach 0,
   * setting HP to 1 instead. Removed from active items after triggering.
   */
  private applySecondChance(item: Item, runState: RunState): void {
    runState.activeItems.push(item);
  }

  /**
   * Initialize the pool from static item definitions.
   */
  private initializePool(): void {
    this.pool = [...ITEM_DEFINITIONS];
  }
}
