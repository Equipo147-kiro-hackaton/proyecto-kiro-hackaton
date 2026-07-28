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

// ─── Dungeon Visual Overhaul: geometría ──────────────────────────────────────

/**
 * Reference to a tile by row and column in the FloorDescriptor grid.
 * The flat index is computed as `row * width + column`.
 */
export interface TileRef {
  row: number;
  column: number;
}

export type RoomRole = 'start' | 'terminal' | 'boss' | 'rest';

export interface Room {
  id: string;
  role: RoomRole;
  /** Fila del tile superior izquierdo del área caminable. */
  row: number;
  /** Columna del tile superior izquierdo del área caminable. */
  column: number;
  /** Ancho en tiles caminables, sin contar el perímetro bloqueante. */
  width: number;
  height: number;
}

export interface Corridor {
  id: string;
  fromRoomId: string;
  toRoomId: string;
  /** Tiles caminables tallados, en orden desde fromRoomId hasta toRoomId. */
  tiles: TileRef[];
  width: 1 | 2;
}

export type ObjectiveType = 'terminal' | 'door';

export interface Objective {
  id: string;
  type: ObjectiveType;
  tile: TileRef;
  roomId: string;
  /** Solo en objetivos de tipo terminal. */
  fragmentId?: string;
  puzzleId?: string;
  activated: boolean;
}

export type PropType =
  | 'server-rack'
  | 'crt-monitor'
  | 'server-tower'
  | 'power-panel'
  | 'cable-bundle'
  | 'energy-container'
  | 'corrupt-container'
  | 'padlock';

export interface Prop {
  id: string;
  type: PropType;
  tile: TileRef;
  blocking: boolean;
  /** Índice de tile del tileset. Es el valor escrito en collision si blocking. */
  tileIndex: number;
}

export interface CircuitPath {
  objectiveId: string;
  /** Primer tile = spawn, último tile = tile del objetivo. Sin repetidos. */
  tiles: TileRef[];
}

/**
 * FloorDescriptor — Estructura de datos independiente de Phaser que describe
 * salas, corredores, tiles, spawn, terminales, puertas y posición del jefe.
 *
 * COLLISION CONTRACT:
 * In the `collision` array, value `0` means Tile_Caminable (walkable) and
 * any value !== 0 means Tile_Bloqueante (blocking). The array is flat,
 * indexed by `row * width + column`, with length `width * height`.
 */
export interface FloorDescriptor {
  levelNumber: number;
  difficulty: DifficultyMode;
  themeId: 'beginner' | 'normal' | 'hard';
  /** Semilla efectiva del intento que produjo este descriptor. */
  seed: number;
  width: number;
  height: number;
  /** Índices de tile de piso y vacío. Longitud width × height. */
  ground: number[];
  /** Índices de tile de prop, 0 donde no hay prop. Longitud width × height. */
  propsLayer: number[];
  /** 0 = caminable, distinto de 0 = bloqueante. Longitud width × height. */
  collision: number[];
  rooms: Room[];
  corridors: Corridor[];
  spawn: TileRef;
  /** Orden estable: terminales por (row, column), puerta al final. */
  objectives: Objective[];
  props: Prop[];
  circuitPaths: CircuitPath[];
}

// ─── Dungeon Visual Overhaul: validación ─────────────────────────────────────

export interface Violation {
  /** Identificador de la comprobación incumplida (ValidationCheck). */
  check: string;
  row: number;
  column: number;
  /** Contexto legible: capa afectada, cantidad esperada/recibida, id de objetivo. */
  detail?: string;
}

export interface ValidationResult {
  valid: boolean;
  violations: Violation[];
}
