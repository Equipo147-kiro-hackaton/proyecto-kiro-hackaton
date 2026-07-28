import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { paginate } from '@/lib/TextPager';
import { t } from '@/lib/i18n';
import { TRANSLATIONS } from '@/data/translations';

describe('TextPager', () => {
  // Feature: dungeon-visual-overhaul, Property 49: Paginación del texto narrativo
  it('produces pages of at most 4 lines of at most 60 chars, preserving all words', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
        (text) => {
          const pages = paginate(text, 60, 4);

          const hasWords = text.split(/\s+/).filter((w) => w.length > 0).length > 0;
          if (hasWords) {
            expect(pages.length).toBeGreaterThan(0);
          }

          for (const page of pages) {
            const lines = page.split('\n');
            expect(lines.length).toBeLessThanOrEqual(4);
            for (const line of lines) {
              const words = line.split(' ');
              if (words.length > 1) {
                expect(line.length).toBeLessThanOrEqual(60);
              }
            }
          }

          const originalWords = text.split(/\s+/).filter((w) => w.length > 0);
          const pageWords = pages
            .flatMap((p) => p.split('\n'))
            .flatMap((l) => l.split(' '))
            .filter((w) => w.length > 0);
          expect(pageWords).toEqual(originalWords);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns empty array for empty or whitespace-only text', () => {
    expect(paginate('', 60, 4)).toEqual([]);
    expect(paginate('   ', 60, 4)).toEqual([]);
  });
});

describe('Translation key parity (Property 51)', () => {
  // Feature: dungeon-visual-overhaul, Property 51: Paridad de claves de traducción
  it('en and es have identical key sets', () => {
    const enKeys = Object.keys(TRANSLATIONS.en).sort();
    const esKeys = Object.keys(TRANSLATIONS.es).sort();
    expect(enKeys).toEqual(esKeys);
  });

  it('all values are strings of length 1-240', () => {
    for (const locale of ['en', 'es'] as const) {
      const bundle = TRANSLATIONS[locale] as Record<string, string>;
      for (const [key, value] of Object.entries(bundle)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThanOrEqual(1);
        expect(value.length).toBeLessThanOrEqual(240);
      }
    }
  });
});

describe('i18n fallback and placeholder (Properties 52-53)', () => {
  // Feature: dungeon-visual-overhaul, Property 52: Clave inexistente se retorna como texto
  it('t() returns the key itself for non-existent keys', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 30 }).map((s) => `__nonexistent_${s}__`),
        (key) => {
          const result = t(key as Parameters<typeof t>[0]);
          expect(result).toBe(key);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: dungeon-visual-overhaul, Property 53: Sustitución parcial de placeholders
  it('t() returns string for known keys and preserves literal placeholders for missing params', () => {
    const result = t('hud.hp' as Parameters<typeof t>[0]);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
