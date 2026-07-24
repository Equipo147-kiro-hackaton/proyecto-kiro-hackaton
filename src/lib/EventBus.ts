import Phaser from 'phaser';

export const EventBus = new Phaser.Events.EventEmitter();

export const EVENTS = {
  PUZZLE_SUBMITTED: 'puzzle:submitted',
  TIMER_EXPIRED:    'timer:expired',
  BUG_DEFEATED:     'bug:defeated',
  HERO_HP_CHANGED:  'hero:hpChanged',
  RUN_ENDED:        'run:ended',
  SCORE_SAVED:      'score:saved',
  SCORE_NOT_SAVED:  'score:notSaved',
} as const;
