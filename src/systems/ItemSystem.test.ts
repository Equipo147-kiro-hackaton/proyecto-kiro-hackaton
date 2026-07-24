import { describe, it, expect, beforeEach } from 'vitest';
import { ItemSystem } from './ItemSystem';
import { ITEM_DEFINITIONS } from '@/data/items';
import type { RunState, Item, HeroItemSlots, LevelSequence } from '@/types';

function createDefaultRunState(): RunState {
  return {
    sessionId: 'test-session',
    username: 'testuser',
    currentScore: 0,
    currentLevel: 1,
    highestLevelReached: 1,
    heroHP: 80,
    activeItems: [],
    levelSequence: { levels: [], seed: 42 } as LevelSequence,
    currentRoom: null,
    currentPuzzle: null,
    timerSeconds: 45,
    hintsShown: 0,
    totalPuzzlesSolved: 0,
    totalBugsDefeated: 0,
    scoreMultiplierRoomsRemaining: 0,
  };
}

describe('ItemSystem', () => {
  let system: ItemSystem;

  beforeEach(() => {
    system = new ItemSystem();
  });

  describe('drawSelection()', () => {
    it('returns 2 distinct items from the pool', () => {
      const selection = system.drawSelection();
      expect(selection.length).toBe(2);
      expect(selection[0].id).not.toBe(selection[1].id);
    });

    it('returns items from the ITEM_DEFINITIONS pool', () => {
      const selection = system.drawSelection();
      const poolIds = ITEM_DEFINITIONS.map((i) => i.id);
      for (const item of selection) {
        expect(poolIds).toContain(item.id);
      }
    });

    it('does not return awarded items', () => {
      const runState = createDefaultRunState();
      // Award all but one item
      const allItems = ITEM_DEFINITIONS;
      for (let i = 0; i < allItems.length - 1; i++) {
        system.applyItem(allItems[i], runState);
      }
      const selection = system.drawSelection();
      expect(selection.length).toBe(1);
      expect(selection[0].id).toBe(allItems[allItems.length - 1].id);
    });

    it('returns single item when only 1 remains in pool', () => {
      const runState = createDefaultRunState();
      // Award all but one
      const allItems = ITEM_DEFINITIONS;
      for (let i = 0; i < allItems.length - 1; i++) {
        system.applyItem(allItems[i], runState);
      }
      const selection = system.drawSelection();
      expect(selection.length).toBe(1);
    });
  });

  describe('applyItem()', () => {
    it('Timer_Extension: adds 15 seconds capped at 90', () => {
      const runState = createDefaultRunState();
      runState.timerSeconds = 45;
      const item = ITEM_DEFINITIONS.find((i) => i.type === 'Timer_Extension')!;
      system.applyItem(item, runState);
      expect(runState.timerSeconds).toBe(60);
    });

    it('Timer_Extension: caps at 90', () => {
      const runState = createDefaultRunState();
      runState.timerSeconds = 80;
      const item = ITEM_DEFINITIONS.find((i) => i.type === 'Timer_Extension')!;
      system.applyItem(item, runState);
      expect(runState.timerSeconds).toBe(90);
    });

    it('HP_Recovery: restores 20 HP capped at 100', () => {
      const runState = createDefaultRunState();
      runState.heroHP = 60;
      const item = ITEM_DEFINITIONS.find((i) => i.type === 'HP_Recovery')!;
      system.applyItem(item, runState);
      expect(runState.heroHP).toBe(80);
    });

    it('HP_Recovery: caps at 100', () => {
      const runState = createDefaultRunState();
      runState.heroHP = 90;
      const item = ITEM_DEFINITIONS.find((i) => i.type === 'HP_Recovery')!;
      system.applyItem(item, runState);
      expect(runState.heroHP).toBe(100);
    });

    it('Score_Multiplier: sets scoreMultiplierRoomsRemaining to 3', () => {
      const runState = createDefaultRunState();
      const item = ITEM_DEFINITIONS.find((i) => i.type === 'Score_Multiplier')!;
      system.applyItem(item, runState);
      expect(runState.scoreMultiplierRoomsRemaining).toBe(3);
      expect(runState.activeItems).toContain(item);
    });

    it('Score_Multiplier: non-stackable — does not override if already active', () => {
      const runState = createDefaultRunState();
      runState.scoreMultiplierRoomsRemaining = 2;
      const item = ITEM_DEFINITIONS.find((i) => i.type === 'Score_Multiplier')!;
      system.applyItem(item, runState);
      expect(runState.scoreMultiplierRoomsRemaining).toBe(2);
    });

    it('Hint_Revealer: adds to activeItems', () => {
      const runState = createDefaultRunState();
      const item = ITEM_DEFINITIONS.find((i) => i.type === 'Hint_Revealer')!;
      system.applyItem(item, runState);
      expect(runState.activeItems).toContain(item);
    });

    it('Bug_Weakener: adds to activeItems', () => {
      const runState = createDefaultRunState();
      const item = ITEM_DEFINITIONS.find((i) => i.type === 'Bug_Weakener')!;
      system.applyItem(item, runState);
      expect(runState.activeItems).toContain(item);
    });

    it('Second_Chance: adds to activeItems', () => {
      const runState = createDefaultRunState();
      const item = ITEM_DEFINITIONS.find((i) => i.type === 'Second_Chance')!;
      system.applyItem(item, runState);
      expect(runState.activeItems).toContain(item);
    });

    it('does not add persistent items to activeItems if already at 3', () => {
      const runState = createDefaultRunState();
      // Fill activeItems with 3 dummy items
      runState.activeItems = [
        { id: 'dummy1', type: 'Hint_Revealer', description: '' },
        { id: 'dummy2', type: 'Bug_Weakener', description: '' },
        { id: 'dummy3', type: 'Second_Chance', description: '' },
      ];
      const item = ITEM_DEFINITIONS.find((i) => i.type === 'Score_Multiplier')!;
      system.applyItem(item, runState);
      expect(runState.activeItems.length).toBe(3);
    });

    it('marks item as awarded after application', () => {
      const runState = createDefaultRunState();
      const item = ITEM_DEFINITIONS.find((i) => i.type === 'HP_Recovery')!;
      system.applyItem(item, runState);
      // Drawing should not return this item anymore
      const selections: string[] = [];
      for (let i = 0; i < 20; i++) {
        const sel = system.drawSelection();
        for (const s of sel) {
          selections.push(s.id);
        }
      }
      expect(selections).not.toContain(item.id);
    });
  });

  describe('canAccept()', () => {
    it('returns true when fewer than 3 active items', () => {
      const slots: HeroItemSlots = { active: [] };
      expect(system.canAccept(slots)).toBe(true);
    });

    it('returns true when 2 active items', () => {
      const slots: HeroItemSlots = {
        active: [ITEM_DEFINITIONS[0], ITEM_DEFINITIONS[1]],
      };
      expect(system.canAccept(slots)).toBe(true);
    });

    it('returns false when 3 active items', () => {
      const slots: HeroItemSlots = {
        active: [ITEM_DEFINITIONS[0], ITEM_DEFINITIONS[1], ITEM_DEFINITIONS[2]],
      };
      expect(system.canAccept(slots)).toBe(false);
    });
  });

  describe('reset()', () => {
    it('clears awarded set and restores full pool', () => {
      const runState = createDefaultRunState();
      // Award some items
      system.applyItem(ITEM_DEFINITIONS[0], runState);
      system.applyItem(ITEM_DEFINITIONS[1], runState);

      system.reset();

      // After reset, all items should be available again
      const selection = system.drawSelection();
      expect(selection.length).toBe(2);
      // Verify awarded items can appear again (run multiple draws)
      const allDrawnIds = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const sel = system.drawSelection();
        for (const s of sel) {
          allDrawnIds.add(s.id);
        }
      }
      expect(allDrawnIds.has(ITEM_DEFINITIONS[0].id)).toBe(true);
      expect(allDrawnIds.has(ITEM_DEFINITIONS[1].id)).toBe(true);
    });
  });
});
