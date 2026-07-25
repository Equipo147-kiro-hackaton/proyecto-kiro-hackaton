// Cloud Quest: DevOps Dungeon — Shared TypeScript Types
// All interfaces and types used across scenes, systems, lib, and API.

// ─── Puzzle Types ────────────────────────────────────────────────────────────

export type PuzzleCategory = 'syntax' | 'logic' | 'devops' | 'memory';

export interface Puzzle {
  id: string;
  category: PuzzleCategory;
  question: string;
  correctAnswer: string;
  hints: [string, ...string[]]; // 1–3 hints, min 1 enforced by tuple type
  difficulty: number;           // 1–3
}

// ─── Level / Room Types ──────────────────────────────────────────────────────

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

// ─── Player Profile ──────────────────────────────────────────────────────────

export interface PlayerProfile {
  username: string;
  personalBest: number;
  updatedAt: string; // ISO 8601 UTC
}

// ─── Score Types ─────────────────────────────────────────────────────────────

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

export interface ScoreEvent {
  levelNumber: number;
  remainingSeconds: number;
  bugDifficulty: number;
  hasScoreMultiplier: boolean;
}

// ─── Run Result & End-Screen Data ────────────────────────────────────────────

export interface RunResult {
  username: string;
  score: number;
  highestLevel: number;
  totalPuzzlesSolved: number;
  totalBugsDefeated: number;
  timestamp: string; // UTC ISO 8601
}

export interface GameOverData {
  score: number;
  levelReached: number;
  totalBugsDefeated: number;
  totalPuzzlesSolved: number;
}

export interface VictoryData {
  score: number;
  totalBugsDefeated: number;
  totalPuzzlesSolved: number;
}
