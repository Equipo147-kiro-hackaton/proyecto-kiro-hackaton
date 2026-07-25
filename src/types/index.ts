/**
 * Shared TypeScript types and interfaces for Cloud Quest: DevOps Dungeon.
 * This file is the contract between all systems, scenes, and the API.
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

// ─── Level & Room Types ──────────────────────────────────────────────────────

export interface Room {
  id: string;
  type: 'combat' | 'rest' | 'item';
  connections: string[];        // IDs of connected rooms
  bugId?: string;               // present only in combat rooms
  isEntrance: boolean;
  isExit: boolean;
}

export interface Level {
  levelNumber: number;
  rooms: Room[];
  bugBaseHP: number;            // = BASE_HP * (1 + 0.10 * (levelNumber - 1))
  puzzleStepCount: number;      // = BASE_STEPS + floor((levelNumber - 1) / 2)
}

export interface LevelSequence {
  levels: Level[];              // length in [5, 10]
  seed: number;
}

// ─── Item Types ──────────────────────────────────────────────────────────────

export type ItemType =
  | 'Timer_Extension'
  | 'HP_Recovery'
  | 'Hint_Revealer'
  | 'Score_Multiplier'
  | 'Bug_Weakener'
  | 'Second_Chance';

export interface Item {
  id: string;
  type: ItemType;
  description: string;
}

export interface HeroItemSlots {
  active: Item[]; // max 3 items
}

// ─── Run State ───────────────────────────────────────────────────────────────

export interface RunState {
  sessionId: string;
  username: string;
  currentScore: number;
  currentLevel: number;
  highestLevelReached: number;
  heroHP: number;                         // 0–100
  activeItems: Item[];                    // max 3
  levelSequence: LevelSequence;
  currentRoom: Room | null;
  currentPuzzle: Puzzle | null;
  timerSeconds: number;
  hintsShown: number;
  totalPuzzlesSolved: number;
  totalBugsDefeated: number;
  scoreMultiplierRoomsRemaining: number;  // 0 = inactive
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
  hasScoreMultiplier: boolean;
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
