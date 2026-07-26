/**
 * StorySystem — Selects intro/outro stories for each level.
 *
 * Selection logic:
 * 1. Filter stories by levelId + type (intro/outro) + current locale
 * 2. If no stories found for current locale, fall back to 'en'
 * 3. Pick one at random from available options
 *
 * Also supports Bedrock-generated stories via `generateStoryFromAI` (Phase 3.C).
 * When VITE_BEDROCK_ENABLED is set, attempts AI generation first; falls back to static.
 */

import { STORIES } from '@/data/stories';
import { getLocale } from '@/lib/i18n';
import type { Story, Locale } from '@/types';

/**
 * Get an intro story for the given level.
 * Returns a randomly selected story matching the level and current locale.
 * Falls back to English if no locale-specific story exists.
 */
export function getIntroStory(levelId: string): Story | null {
  return pickStory(levelId, 'intro');
}

/**
 * Get an outro story for the given level.
 * Outro stories include learnedConcepts and realWorldExample.
 */
export function getOutroStory(levelId: string): Story | null {
  return pickStory(levelId, 'outro');
}

/**
 * Get all intro stories for a level (for display purposes or testing).
 */
export function getIntroStoriesForLevel(levelId: string, locale?: Locale): Story[] {
  const loc = locale ?? getLocale();
  return filterStories(levelId, 'intro', loc);
}

/**
 * Get all outro stories for a level.
 */
export function getOutroStoriesForLevel(levelId: string, locale?: Locale): Story[] {
  const loc = locale ?? getLocale();
  return filterStories(levelId, 'outro', loc);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function pickStory(levelId: string, type: 'intro' | 'outro'): Story | null {
  const locale = getLocale();

  // Try current locale first
  let candidates = filterStories(levelId, type, locale);

  // Fall back to English if no locale-specific stories
  if (candidates.length === 0 && locale !== 'en') {
    candidates = filterStories(levelId, type, 'en');
  }

  if (candidates.length === 0) return null;

  // Random selection
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

function filterStories(levelId: string, type: 'intro' | 'outro', locale: Locale): Story[] {
  return STORIES.filter(
    (s) => s.levelId === levelId && s.type === type && s.locale === locale,
  );
}
