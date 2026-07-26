import { describe, test, expect } from 'vitest';
import type {
  Puzzle,
  Locale,
  HeroVariant,
  DifficultyMode,
  Story,
  VictoryData,
  GameOverData,
} from '@/types';
import { HERO_VARIANT_BY_DIFFICULTY } from '@/types';

describe('Type shape validation (v2)', () => {
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

    test('Puzzle with 2 hints satisfies tuple', () => {
      const puzzle: Puzzle = {
        id: 'test-002',
        category: 'logic',
        question: 'Trace the output',
        correctAnswer: '42',
        hints: ['hint one', 'hint two'],
        difficulty: 2,
      };
      expect(puzzle.hints.length).toBe(2);
    });

    test('Puzzle with 3 hints satisfies tuple', () => {
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

  describe('Hero variant mapping (v2)', () => {
    test('every DifficultyMode maps to a HeroVariant', () => {
      const modes: DifficultyMode[] = ['beginner', 'normal', 'hard'];
      modes.forEach((mode) => {
        const variant = HERO_VARIANT_BY_DIFFICULTY[mode];
        expect(variant).toBeDefined();
        expect(['classic', 'devops', 'cyberpunk']).toContain(variant);
      });
    });

    test('beginner maps to classic hero', () => {
      expect(HERO_VARIANT_BY_DIFFICULTY.beginner).toBe('classic');
    });

    test('normal maps to devops hero', () => {
      expect(HERO_VARIANT_BY_DIFFICULTY.normal).toBe('devops');
    });

    test('hard maps to cyberpunk hero', () => {
      expect(HERO_VARIANT_BY_DIFFICULTY.hard).toBe('cyberpunk');
    });

    test('HeroVariant type accepts only 3 values', () => {
      const variants: HeroVariant[] = ['classic', 'devops', 'cyberpunk'];
      expect(variants.length).toBe(3);
    });
  });

  describe('Locale (v2)', () => {
    test('Locale accepts en and es', () => {
      const locales: Locale[] = ['en', 'es'];
      expect(locales.length).toBe(2);
    });
  });

  describe('Story shape (v2)', () => {
    test('intro story shape', () => {
      const intro: Story = {
        id: 'story-l1-intro-en-01',
        levelId: 'level-1',
        type: 'intro',
        locale: 'en',
        text: 'A merge conflict monster threatens production...',
      };
      expect(intro.type).toBe('intro');
      expect(intro.learnedConcepts).toBeUndefined();
    });

    test('outro story with concepts and real-world example', () => {
      const outro: Story = {
        id: 'story-l1-outro-es-01',
        levelId: 'level-1',
        type: 'outro',
        locale: 'es',
        text: 'Has aprendido el flujo de Git.',
        learnedConcepts: ['git checkout', 'git commit', 'git push'],
        realWorldExample: 'GitHub uses this workflow for every PR.',
      };
      expect(outro.type).toBe('outro');
      expect(outro.learnedConcepts).toHaveLength(3);
      expect(outro.realWorldExample).toBeDefined();
    });
  });

  describe('Scene data types include levelReached', () => {
    test('GameOverData has levelReached', () => {
      const data: GameOverData = {
        score: 100,
        levelReached: 3,
        bugsDefeated: 2,
        puzzlesSolved: 15,
      };
      expect(data.levelReached).toBe(3);
    });

    test('VictoryData has levelReached (v2 fix)', () => {
      const data: VictoryData = {
        score: 1500,
        levelReached: 5,
        bugsDefeated: 5,
        puzzlesSolved: 25,
      };
      expect(data.levelReached).toBe(5);
    });
  });
});
