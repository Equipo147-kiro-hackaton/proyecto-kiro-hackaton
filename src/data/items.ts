import { Item } from '@/types';

/**
 * ITEM_DEFINITIONS — All 6 item types available in the game.
 * Items are drawn from this pool during a Run and applied to the hero.
 */
export const ITEM_DEFINITIONS: Item[] = [
  {
    id: 'timer-ext',
    type: 'Timer_Extension',
    description: 'Adds 15s to the active timer (capped at initial max).',
  },
  {
    id: 'hp-recovery',
    type: 'HP_Recovery',
    description: 'Restores 20 HP (max 100).',
  },
  {
    id: 'hint-revealer',
    type: 'Hint_Revealer',
    description: 'Auto-shows next hint on your next incorrect answer.',
  },
  {
    id: 'score-mult',
    type: 'Score_Multiplier',
    description: 'Doubles base score for next 3 rooms (non-stackable).',
  },
  {
    id: 'bug-weakener',
    type: 'Bug_Weakener',
    description: "Reduces next bug's HP by 30% (rounded down).",
  },
  {
    id: 'second-chance',
    type: 'Second_Chance',
    description: 'Once: when HP would hit 0, set it to 1 instead.',
  },
];
