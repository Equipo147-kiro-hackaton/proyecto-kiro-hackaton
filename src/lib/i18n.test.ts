import { describe, test, expect, beforeEach } from 'vitest';
import { t, setLocale, getLocale, toggleLocale, onLocaleChange, _resetForTesting } from '@/lib/i18n';
import { TRANSLATIONS, type TranslationKey } from '@/data/translations';

describe('i18n', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  describe('getLocale / setLocale', () => {
    test('default locale is en', () => {
      expect(getLocale()).toBe('en');
    });

    test('setLocale changes current locale', () => {
      setLocale('es');
      expect(getLocale()).toBe('es');
    });

    test('setLocale persists to localStorage', () => {
      setLocale('es');
      expect(localStorage.getItem('cq-locale')).toBe('es');
    });
  });

  describe('toggleLocale', () => {
    test('toggles from en to es', () => {
      setLocale('en');
      const result = toggleLocale();
      expect(result).toBe('es');
      expect(getLocale()).toBe('es');
    });

    test('toggles from es to en', () => {
      setLocale('es');
      const result = toggleLocale();
      expect(result).toBe('en');
      expect(getLocale()).toBe('en');
    });
  });

  describe('t() translation lookup', () => {
    test('returns English translation by default', () => {
      const key: TranslationKey = 'login.title';
      expect(t(key)).toBe('Cloud Quest: DevOps Dungeon');
    });

    test('returns Spanish translation when locale is es', () => {
      setLocale('es');
      const key: TranslationKey = 'login.button';
      expect(t(key)).toBe('[ INGRESAR ]');
    });

    test('parameter substitution works with {name} template', () => {
      const key: TranslationKey = 'login.personal_best';
      expect(t(key, { score: 1500 })).toBe('Personal Best: 1500');
    });

    test('parameter substitution with multiple params', () => {
      const key: TranslationKey = 'menu.welcome';
      expect(t(key, { username: 'alice', best: 999 })).toBe(
        'Welcome, alice!  |  Best: 999',
      );
    });

    test('missing param leaves placeholder in output', () => {
      const key: TranslationKey = 'login.personal_best';
      expect(t(key, {})).toBe('Personal Best: {score}');
    });

    test('parameters work in Spanish', () => {
      setLocale('es');
      const key: TranslationKey = 'login.personal_best';
      expect(t(key, { score: 42 })).toBe('Mejor puntaje: 42');
    });
  });

  describe('onLocaleChange', () => {
    test('listener is called when locale changes', () => {
      let capturedLocale: string | null = null;
      const unsubscribe = onLocaleChange((locale) => {
        capturedLocale = locale;
      });

      setLocale('es');
      expect(capturedLocale).toBe('es');

      unsubscribe();
    });

    test('unsubscribe stops receiving updates', () => {
      let count = 0;
      const unsubscribe = onLocaleChange(() => {
        count++;
      });

      setLocale('es');
      expect(count).toBe(1);

      unsubscribe();
      setLocale('en');
      expect(count).toBe(1);
    });

    test('multiple listeners all get notified', () => {
      let a = 0;
      let b = 0;
      onLocaleChange(() => a++);
      onLocaleChange(() => b++);

      setLocale('es');
      expect(a).toBe(1);
      expect(b).toBe(1);
    });

    test('listener throwing does not break other listeners', () => {
      let bCalled = false;
      onLocaleChange(() => {
        throw new Error('boom');
      });
      onLocaleChange(() => {
        bCalled = true;
      });

      setLocale('es');
      expect(bCalled).toBe(true);
    });
  });

  describe('EN/ES parity', () => {
    test('all English keys exist in Spanish', () => {
      const enKeys = Object.keys(TRANSLATIONS.en);
      const esKeys = Object.keys(TRANSLATIONS.es);
      const missing = enKeys.filter((k) => !esKeys.includes(k));
      expect(missing).toEqual([]);
    });

    test('all Spanish keys exist in English', () => {
      const enKeys = Object.keys(TRANSLATIONS.en);
      const esKeys = Object.keys(TRANSLATIONS.es);
      const extras = esKeys.filter((k) => !enKeys.includes(k));
      expect(extras).toEqual([]);
    });

    test('EN and ES have the same number of keys', () => {
      expect(Object.keys(TRANSLATIONS.en).length).toBe(Object.keys(TRANSLATIONS.es).length);
    });
  });
});
