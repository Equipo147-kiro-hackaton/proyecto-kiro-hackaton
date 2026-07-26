/**
 * Shared TypeScript types and interfaces for Cloud Quest: DevOps Dungeon (v2).
 * This file is the contract between all systems, scenes, and the API.
 *
 * Legacy types removed in v2: Room, Level, LevelSequence, Item, HeroItemSlots,
 * ItemType, RunState. The v2 flow passes run state directly via scene.start data.
 */

// ─── Puzzle Types ────────────────────────────────────────────────────────────

export type PuzzleCategory = 'syntax' | 'logic' | 'devops' | 'memory';

export interface Puzzle {
  id: string;
  category: PuzzleCategory;
  question: string;
  correctAnswer: string;
  hints: [string, ...string[]]; // 1–3 hints, min 1 enforced by tuple
  difficulty: number;           // 1–3
}

// ─── Player & Leaderboard Types ──────────────────────────────────────────────

export interface PlayerProfile {
  username: string;
  personalBest: number;
  updatedAt: string; // ISO 8601 UTC
}

export interface ScorePayload {
  username: string;
  score: number;
  highestLevel: number;
  timestamp: string; // UTC ISO 8601
}

export interface LeaderboardEntry {
  username: string;
  score: number;
  runDate: string; // YYYY-MM-DD
}

// ─── Score & Event Types ─────────────────────────────────────────────────────

export interface ScoreEvent {
  levelNumber: number;
  remainingSeconds: number;
  bugDifficulty: number;
  hasScoreMultiplier: boolean;  // legacy; kept for ScoreSystem backward compat
}

export interface RunResult {
  username: string;
  score: number;
  highestLevel: number;
  totalPuzzlesSolved: number;
  totalBugsDefeated: number;
}

// ─── Scene Data Types ────────────────────────────────────────────────────────

export interface GameOverData {
  score: number;
  levelReached: number;
  bugsDefeated: number;
  puzzlesSolved: number;
}

export interface VictoryData {
  score: number;
  levelReached: number;
  bugsDefeated: number;
  puzzlesSolved: number;
}

// ─── Interactable Types ──────────────────────────────────────────────────────

export type InteractableType = 'terminal' | 'server' | 'whiteboard' | 'door' | 'checkpoint';

export interface Interactable {
  id: string;
  type: InteractableType;
  tileX: number;
  tileY: number;
  fragmentId?: string;
  puzzleId?: string;
  locked?: boolean;
  activated?: boolean;
}

export interface InteractionEvent {
  interactable: Interactable;
  heroTileX: number;
  heroTileY: number;
}

// ─── Fragment Types ──────────────────────────────────────────────────────────

export interface Fragment {
  id: string;
  levelId: string;
  order: number;             // Position in the correct pipeline sequence
  content: string;           // Display label (e.g., "npm test", "docker build")
  description: string;       // Hint about what this fragment does
  difficulty: number;        // 1–3, affects boss damage weight
  weight: number;            // Percentage of boss HP this fragment removes (0–100)
  isCritical: boolean;       // If true, deals ×1.5 damage to boss
}

export interface FragmentState {
  fragmentId: string;
  collected: boolean;
  solvedCorrectly: boolean;
}

export interface FragmentProgress {
  levelId: string;
  collected: FragmentState[];
  totalRequired: number;
  isComplete: boolean;
}

// ─── Difficulty Types ────────────────────────────────────────────────────────

export type DifficultyMode = 'beginner' | 'normal' | 'hard';

// ─── Localization Types (v2) ─────────────────────────────────────────────────

export type Locale = 'en' | 'es';

// ─── Hero Variants (v2) ──────────────────────────────────────────────────────

export type HeroVariant = 'classic' | 'devops' | 'cyberpunk';

/** Map difficulty to hero variant (used in ExplorationScene and MainMenuScene) */
export const HERO_VARIANT_BY_DIFFICULTY: Record<DifficultyMode, HeroVariant> = {
  beginner: 'classic',
  normal: 'devops',
  hard: 'cyberpunk',
};

// ─── Story Types (v2) ────────────────────────────────────────────────────────

export interface Story {
  id: string;
  levelId: string;
  type: 'intro' | 'outro';
  locale: Locale;
  text: string;
  learnedConcepts?: string[];    // for outros only
  realWorldExample?: string;     // for outros only
}
