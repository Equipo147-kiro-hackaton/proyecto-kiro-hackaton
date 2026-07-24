import { describe, test, expect } from 'vitest';
import type { Puzzle, RunState } from '@/types';

describe('Type shape validation', () => {
  describe('Puzzle hints tuple constraint', () => {
    test('Puzzle with 1 hint satisfies [string, ...string[]] tuple', () => {
      const puzzle: Puzzle = {
        id: 'test-001',
        category: 'syntax',
        question: 'Fix the error',
        correctAnswer: 'answer',
        hints: ['hint one'],
        difficulty: 1,
      };
      expect(puzzle.hints.length).toBeGreaterThanOrEqual(1);
      expect(puzzle.hints.length).toBeLessThanOrEqual(3);
      expect(puzzle.hints[0]).toBeDefined();
      expect(typeof puzzle.hints[0]).toBe('string');
    });

    test('Puzzle with 2 hints satisfies [string, ...string[]] tuple', () => {
      const puzzle: Puzzle = {
        id: 'test-002',
        category: 'logic',
        question: 'Trace the output',
        correctAnswer: '42',
        hints: ['hint one', 'hint two'],
        difficulty: 2,
      };
      expect(puzzle.hints.length).toBe(2);
      expect(puzzle.hints[0]).toBeDefined();
      expect(puzzle.hints[1]).toBeDefined();
    });

    test('Puzzle with 3 hints satisfies [string, ...string[]] tuple', () => {
      const puzzle: Puzzle = {
        id: 'test-003',
        category: 'devops',
        question: 'What command?',
        correctAnswer: 'kubectl apply',
        hints: ['hint one', 'hint two', 'hint three'],
        difficulty: 3,
      };
      expect(puzzle.hints.length).toBe(3);
      puzzle.hints.forEach((hint) => {
        expect(typeof hint).toBe('string');
        expect(hint.length).toBeGreaterThan(0);
      });
    });
  });

  describe('RunState defaults and shape completeness', () => {
    test('RunState mock object has all required fields', () => {
      const mockRunState: RunState = {
        sessionId: 'session-123',
        username: 'testPlayer',
        currentScore: 0,
        currentLevel: 1,
        highestLevelReached: 1,
        heroHP: 100,
        activeItems: [],
        levelSequence: { levels: [], seed: 12345 },
        currentRoom: null,
        currentPuzzle: null,
        timerSeconds: 60,
        hintsShown: 0,
        totalPuzzlesSolved: 0,
        totalBugsDefeated: 0,
        scoreMultiplierRoomsRemaining: 0,
      };

      expect(mockRunState.sessionId).toBe('session-123');
      expect(mockRunState.username).toBe('testPlayer');
      expect(mockRunState.currentScore).toBe(0);
      expect(mockRunState.currentLevel).toBe(1);
      expect(mockRunState.highestLevelReached).toBe(1);
      expect(mockRunState.heroHP).toBe(100);
      expect(mockRunState.activeItems).toEqual([]);
      expect(mockRunState.levelSequence).toBeDefined();
      expect(mockRunState.currentRoom).toBeNull();
      expect(mockRunState.currentPuzzle).toBeNull();
      expect(mockRunState.timerSeconds).toBe(60);
      expect(mockRunState.hintsShown).toBe(0);
      expect(mockRunState.totalPuzzlesSolved).toBe(0);
      expect(mockRunState.totalBugsDefeated).toBe(0);
      expect(mockRunState.scoreMultiplierRoomsRemaining).toBe(0);
    });

    test('RunState has exactly 15 top-level fields', () => {
      const mockRunState: RunState = {
        sessionId: 'sess',
        username: 'user',
        currentScore: 0,
        currentLevel: 1,
        highestLevelReached: 1,
        heroHP: 100,
        activeItems: [],
        levelSequence: { levels: [], seed: 0 },
        currentRoom: null,
        currentPuzzle: null,
        timerSeconds: 60,
        hintsShown: 0,
        totalPuzzlesSolved: 0,
        totalBugsDefeated: 0,
        scoreMultiplierRoomsRemaining: 0,
      };

      const keys = Object.keys(mockRunState);
      expect(keys.length).toBe(15);
    });
  });
});
