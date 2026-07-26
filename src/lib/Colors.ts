/**
 * Colors — Centralized color palette for Cloud Quest: DevOps Dungeon.
 * Cyberpunk/terminal aesthetic with high contrast for readability.
 *
 * Usage: import { COLORS } from '@/lib/Colors';
 */

/** Hex string colors for Phaser text styles */
export const COLORS = {
  // Backgrounds
  BG_DARK: '#0a0a1a',
  BG_PANEL: '#1a1a2e',
  BG_PANEL_HOVER: '#2a2a4a',
  BG_PANEL_BORDER: '#333355',

  // Primary palette
  PRIMARY_CYAN: '#00ffcc',
  PRIMARY_BLUE: '#4488ff',

  // Accents
  ACCENT_GOLD: '#ffcc00',
  ACCENT_ORANGE: '#ff8844',

  // Semantic
  DANGER_RED: '#ff3366',
  SUCCESS_GREEN: '#44ff88',
  WARNING_YELLOW: '#ffdd44',

  // Text
  TEXT_WHITE: '#e0e0e0',
  TEXT_DIM: '#888888',
  TEXT_MUTED: '#555555',

  // Difficulty
  DIFFICULTY_BEGINNER: '#44cc44',
  DIFFICULTY_NORMAL: '#cccc44',
  DIFFICULTY_HARD: '#cc4444',

  // Items / Categories
  CATEGORY_SYNTAX: '#ff6666',
  CATEGORY_LOGIC: '#ffcc44',
  CATEGORY_DEVOPS: '#4488ff',
  CATEGORY_MEMORY: '#44cc88',

  // HUD
  HUD_HEARTS: '#ff3366',
  HUD_HEARTS_EMPTY: '#333333',
  HUD_FRAGMENTS: '#66ccff',
  HUD_SCORE: '#ffdd44',
} as const;

/** Numeric hex colors for Phaser graphics (fillStyle, tint, etc.) */
export const COLORS_HEX = {
  BG_DARK: 0x0a0a1a,
  BG_PANEL: 0x1a1a2e,
  BG_PANEL_HOVER: 0x2a2a4a,
  BG_PANEL_BORDER: 0x333355,

  PRIMARY_CYAN: 0x00ffcc,
  PRIMARY_BLUE: 0x4488ff,

  ACCENT_GOLD: 0xffcc00,
  ACCENT_ORANGE: 0xff8844,

  DANGER_RED: 0xff3366,
  SUCCESS_GREEN: 0x44ff88,
  WARNING_YELLOW: 0xffdd44,

  TEXT_WHITE: 0xe0e0e0,

  PARTICLE_CYAN: 0x00ffcc,
  PARTICLE_GOLD: 0xffcc00,
  PARTICLE_GREEN: 0x44ff88,

  HUD_FRAGMENTS: 0x66ccff,
  HUD_SCORE: 0xffdd44,
} as const;

/** Shared text style presets for consistent typography */
export const TEXT_STYLES = {
  TITLE: {
    fontSize: '24px',
    fontFamily: 'monospace',
    color: COLORS.TEXT_WHITE,
    fontStyle: 'bold',
  },
  SUBTITLE: {
    fontSize: '14px',
    fontFamily: 'monospace',
    color: COLORS.TEXT_DIM,
  },
  BUTTON: {
    fontSize: '16px',
    fontFamily: 'monospace',
    color: COLORS.PRIMARY_CYAN,
    fontStyle: 'bold',
  },
  BUTTON_DANGER: {
    fontSize: '16px',
    fontFamily: 'monospace',
    color: COLORS.DANGER_RED,
    fontStyle: 'bold',
  },
  HUD: {
    fontSize: '10px',
    fontFamily: 'monospace',
    color: COLORS.TEXT_WHITE,
  },
  SCORE_POPUP: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: COLORS.ACCENT_GOLD,
    fontStyle: 'bold',
  },
} as const;
