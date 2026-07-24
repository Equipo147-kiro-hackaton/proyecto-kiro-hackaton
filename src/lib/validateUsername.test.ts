import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateUsername } from '@/lib/validateUsername';

// Feature: cloud-quest-devops-dungeon, Property 1: username validation character set
describe('validateUsername — Property-based tests', () => {
  test('Property 1: Username validation is exactly the accepted character set', () => {
    /**
     * Validates: Requirements 1.2, 1.3, 1.4
     * For any string, validateUsername returns true if and only if
     * the string matches /^[a-zA-Z0-9_]{3,20}$/
     */
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 25 }),
        (s) => {
          const result = validateUsername(s);
          const expected = /^[a-zA-Z0-9_]{3,20}$/.test(s);
          return result === expected;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('validateUsername — Edge case unit tests', () => {
  describe('Boundary lengths', () => {
    test('rejects username with 2 characters (below minimum)', () => {
      expect(validateUsername('ab')).toBe(false);
    });

    test('accepts username with exactly 3 characters (minimum)', () => {
      expect(validateUsername('abc')).toBe(true);
    });

    test('accepts username with exactly 20 characters (maximum)', () => {
      expect(validateUsername('a'.repeat(20))).toBe(true);
    });

    test('rejects username with 21 characters (above maximum)', () => {
      expect(validateUsername('a'.repeat(21))).toBe(false);
    });
  });

  describe('Special characters, spaces, unicode', () => {
    test('rejects username with spaces', () => {
      expect(validateUsername('hello world')).toBe(false);
    });

    test('rejects username with special characters (@, #, $)', () => {
      expect(validateUsername('user@name')).toBe(false);
      expect(validateUsername('user#123')).toBe(false);
      expect(validateUsername('$money')).toBe(false);
    });

    test('rejects username with unicode characters', () => {
      expect(validateUsername('usér')).toBe(false);
      expect(validateUsername('名前abc')).toBe(false);
      expect(validateUsername('user😀')).toBe(false);
    });

    test('rejects username with hyphens', () => {
      expect(validateUsername('my-user')).toBe(false);
    });

    test('rejects username with dots', () => {
      expect(validateUsername('my.user')).toBe(false);
    });
  });

  describe('Empty string and valid examples', () => {
    test('rejects empty string', () => {
      expect(validateUsername('')).toBe(false);
    });

    test('accepts valid username with underscores', () => {
      expect(validateUsername('user_name')).toBe(true);
      expect(validateUsername('_leading')).toBe(true);
      expect(validateUsername('trailing_')).toBe(true);
      expect(validateUsername('___')).toBe(true);
    });

    test('accepts valid alphanumeric usernames', () => {
      expect(validateUsername('Player1')).toBe(true);
      expect(validateUsername('abc123')).toBe(true);
      expect(validateUsername('ALLCAPS')).toBe(true);
    });
  });
});
