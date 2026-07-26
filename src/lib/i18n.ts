/**
 * i18n — Internationalization system for Cloud Quest v2.
 *
 * Provides `t(key, params?)` for translation lookup with parameter substitution,
 * plus `setLocale`, `getLocale`, and `onLocaleChange` for locale management.
 *
 * Locale persists in localStorage under `cq-locale`. Default: `en`.
 * Missing keys return the key itself (no crash).
 *
 * Design: see `.kiro/specs/cloud-quest-v2-rpg/design.md` §1.
 */

import type { Locale } from '@/types';
import { TRANSLATIONS, type TranslationKey } from '@/data/translations';

const STORAGE_KEY = 'cq-locale';
const DEFAULT_LOCALE: Locale = 'en';

type LocaleListener = (locale: Locale) => void;

let currentLocale: Locale = loadLocale();
const listeners: Set<LocaleListener> = new Set();

/**
 * Get the current active locale.
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Set the active locale. Persists to localStorage and notifies listeners.
 */
export function setLocale(locale: Locale): void {
  if (locale !== 'en' && locale !== 'es') return;
  if (locale === currentLocale) return;

  currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // localStorage unavailable — ignore
  }

  for (const listener of listeners) {
    try {
      listener(locale);
    } catch {
      // one listener failing shouldn't break others
    }
  }
}

/**
 * Subscribe to locale changes. Returns an unsubscribe function.
 */
export function onLocaleChange(callback: LocaleListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Translate a key to the current locale, with optional parameter substitution.
 * Templates use `{name}` placeholders replaced by matching keys in params.
 * Missing keys fall back to English, then to the key itself.
 */
export function t(
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const bundle = TRANSLATIONS[currentLocale] as Record<string, string>;
  const enBundle = TRANSLATIONS.en as Record<string, string>;
  const raw = bundle[key] ?? enBundle[key] ?? key;

  if (!params) return raw;

  return raw.replace(/\{(\w+)\}/g, (_match: string, paramName: string): string => {
    const value = params[paramName];
    return value !== undefined ? String(value) : `{${paramName}}`;
  });
}

/**
 * Toggle between English and Spanish.
 */
export function toggleLocale(): Locale {
  const next: Locale = currentLocale === 'en' ? 'es' : 'en';
  setLocale(next);
  return next;
}

function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'es') return stored;
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_LOCALE;
}

/** Reset internal state (for testing purposes only). */
export function _resetForTesting(): void {
  currentLocale = DEFAULT_LOCALE;
  listeners.clear();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
