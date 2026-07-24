import type { Item, RunState, HeroItemSlots } from '@/types';
import { ITEM_DEFINITIONS } from '@/data/items';

/**
 * ItemSystem — manages item pool, selection, application, and stacking rules.
 * Independent of Phaser; operates purely on data types.
 */
export class ItemSystem {
  private pool: Item[];
  private awarded: Set<string>;

  /** Maximum timer value for cap purposes */
  private static readonly TIMER_MAX = 90;

  constructor() {
    this.pool = [...ITEM_DEFINITIONS];
    this.awarded = new Set<string>();
  }

  /**
   * Draw 2 random distinct items from the un-awarded pool.
   * If only 1 item remains, returns a single-element tuple.
   * Returns items without marking them as awarded (that happens on applyItem).
   */
  drawSelection(): [Item, Item] | [Item] {
    const available = this.pool.filter((item) => !this.awarded.has(item.id));

    if (available.length === 0) {
      // Should not happen in normal flow, but handle gracefully
      // Return the first item from the full pool as a safety net
      return [this.pool[0]];
    }

    if (available.length === 1) {
      return [available[0]];
    }

    // Pick 2 distinct random items
    const firstIndex = Math.floor(Math.random() * available.length);
    let secondIndex = Math.floor(Math.random() * (available.length - 1));
    if (secondIndex >= firstIndex) {
      secondIndex += 1;
    }

    return [available[firstIndex], available[secondIndex]];
  }

  /**
   * Apply item effect to run state and mark item as awarded.
   * Consumable items (Timer_Extension, HP_Recovery) are applied immediately.
   * Persistent items (Hint_Revealer, Score_Multiplier, Bug_Weakener, Second_Chance)
   * are added to activeItems if there is room (< 3).
   */
  applyItem(item: Item, runState: RunState): void {
    // Mark as awarded (removed from pool for the rest of the run)
    this.awarded.add(item.id);

    switch (item.type) {
      case 'Timer_Extension':
        // Add 15 seconds, cap at 90 (maximum possible timer value)
        runState.timerSeconds = Math.min(
          runState.timerSeconds + 15,
          ItemSystem.TIMER_MAX
        );
        break;

      case 'HP_Recovery':
        // Restore 20 HP, cap at 100
        runState.heroHP = Math.min(runState.heroHP + 20, 100);
        break;

      case 'Score_Multiplier':
        // Non-stackable: only set if not already active
        if (runState.scoreMultiplierRoomsRemaining === 0) {
          runState.scoreMultiplierRoomsRemaining = 3;
        }
        // Add to activeItems if room available
        if (runState.activeItems.length < 3) {
          runState.activeItems.push(item);
        }
        break;

      case 'Hint_Revealer':
      case 'Bug_Weakener':
      case 'Second_Chance':
        // Persistent items — add to activeItems if room available
        if (runState.activeItems.length < 3) {
          runState.activeItems.push(item);
        }
        break;
    }
  }

  /**
   * Check if hero can accept a new item (fewer than 3 active items).
   */
  canAccept(slots: HeroItemSlots): boolean {
    return slots.active.length < 3;
  }

  /**
   * Reset the item system for a new Run.
   * Clears awarded set and reloads the full item pool.
   */
  reset(): void {
    this.awarded.clear();
    this.pool = [...ITEM_DEFINITIONS];
  }
}
