# Design — Cloud Quest v2 RPG

Technical design decisions for the v2 overhaul. Covers architecture, data flow, and key algorithms.

---

## 1. i18n Architecture

### Storage
```
localStorage['cq-locale']  → 'en' | 'es'
game.registry['locale']    → 'en' | 'es'  (mirror for fast Phaser access)
```

### API
```typescript
export type Locale = 'en' | 'es';
export type TranslationKey = keyof (typeof TRANSLATIONS)['en'];

export function t(key: TranslationKey, params?: Record<string, string | number>): string;
export function setLocale(locale: Locale): void;
export function getLocale(): Locale;
export function onLocaleChange(cb: (locale: Locale) => void): () => void;
```

### Translations shape
```typescript
export const TRANSLATIONS = {
  en: { 'login.title': 'Cloud Quest: DevOps Dungeon', /* ... */ },
  es: { 'login.title': 'Cloud Quest: DevOps Dungeon', /* ... */ },
} as const;
```

### Parameter substitution
```typescript
t('hud.fragments_remaining', { count: 3 });
// EN: 'Find 3 more fragments'  (template: 'Find {count} more fragments')
// ES: 'Encuentra 3 fragmentos más'
```

### Propagation
- setLocale writes to localStorage + registry + fires EventBus 'locale:changed'
- Scenes subscribe and re-render text

---

## 2. Hero Variants

### Difficulty → Variant
```
beginner → classic     (RPG adventurer)
normal   → devops      (modern engineer)
hard     → cyberpunk   (neon operative)
```

### SpriteGenerator API
```typescript
export type HeroVariant = 'classic' | 'devops' | 'cyberpunk';

export function generateAllSprites(scene: Phaser.Scene, heroVariant?: HeroVariant): void;
```

### Palette per variant

| Variant | Skin | Body | Accent |
|---|---|---|---|
| Classic | #f4c290 | #8b4513 (leather) | #daa520 (gold) |
| DevOps | #f4c290 | #3a5f7f (blue) | #e8a13a (gold belt) |
| Cyberpunk | #e8b088 | #2a0e3a (dark) | #00ffcc (neon cyan) |

### Registration
- Textures: `hero-classic`, `hero-devops`, `hero-cyberpunk`
- Hero entity takes textureKey parameter

---

## 3. Boss Fight Dispatcher

```typescript
// BossFightScene.create()
const bossType = getBossTypeForLevel(currentLevel);
switch (bossType) {
  case 'A': this.scene.start('BossPipelineScene', data); break;
  case 'B': this.scene.start('BossActionMenuScene', data); break;
  case 'C': this.scene.start('BossRushScene', data); break;
}
```

### Type mapping
```typescript
export const BOSS_TYPE_BY_LEVEL: Record<number, 'A' | 'B' | 'C'> = {
  1: 'A', 2: 'B', 3: 'C', 4: 'A', 5: 'B',
};
```

All three share `BossFightState` shape for uniform scoring.

---

## 4. Story System

### Data shape
```typescript
export interface Story {
  id: string;
  levelId: string;
  type: 'intro' | 'outro';
  locale: Locale;
  text: string;
  learnedConcepts?: string[];  // outros
  realWorldExample?: string;   // outros
}
```

### Selection
```typescript
export function getIntroStory(levelId: string, locale: Locale): Story {
  const candidates = STORY_POOL.filter(s =>
    s.levelId === levelId && s.type === 'intro' && s.locale === locale
  );
  return candidates[Math.floor(Math.random() * candidates.length)]
    ?? getFallbackStory(levelId, locale);
}
```

### Bedrock (optional)
```typescript
export async function getIntroStoryAsync(levelId: string, locale: Locale): Promise<Story> {
  if (import.meta.env.VITE_BEDROCK_ENABLED === 'true') {
    try {
      return await ApiClient.generateStory({ levelId, locale, type: 'intro' });
    } catch { /* fall through */ }
  }
  return getIntroStory(levelId, locale);
}
```

### Prompt template
```
System: You are a narrator for an educational DevOps game. Write short stories
about real production incidents. Under 60 words. Language: {locale}.

User: Write an intro for level {levelId}. Scenario: {scenario}. Boss: {bossName}.
Concept: {concept}.
```

---

## 5. i18n Refactoring Order

Refactor deepest scenes first:
1. HUDScene, PuzzleScene (leaves)
2. LoginScene (needs language selector)
3. MainMenuScene, TutorialScene
4. LeaderboardScene, GameOverScene, VictoryScene
5. ExplorationScene
6. BossFightScene + variants

TSC + tests after each scene.

---

## 6. Tutorial Wiring

```typescript
// MainMenuScene.startNewRun()
const tutorialDone = localStorage.getItem('cq-tutorial-done') === 'true';
const target = tutorialDone ? 'ExplorationScene' : 'TutorialScene';
fadeToScene(this, target, { level: 1, difficulty, hp: 100, score: 0 });

// TutorialScene.onComplete()
localStorage.setItem('cq-tutorial-done', 'true');
this.game.registry.set('tutorialDone', true);
fadeToScene(this, 'ExplorationScene', { level: 1, difficulty: 'beginner', hp: 100, score: 0 });
```

---

## 7. Quality Tooling

### ESLint (.eslintrc.json)
- Extends `eslint:recommended` + `plugin:@typescript-eslint/recommended`
- Plugins: `@typescript-eslint`, `unused-imports`
- Key rules:
  - `@typescript-eslint/no-explicit-any: error`
  - `unused-imports/no-unused-imports: error`
  - `no-console: warn` (allow warn, error)
  - `eqeqeq: smart`, `prefer-const: error`
- Ignores: dist/, coverage/, node_modules/, config files

### Prettier (.prettierrc)
- printWidth 100, tabWidth 2, semi true
- singleQuote true, trailingComma all
- arrowParens always, endOfLine lf

### EditorConfig
- UTF-8, LF, 2 spaces, trim whitespace, final newline
- Markdown files preserve trailing whitespace

### .kiroignore
- dist/, coverage/, node_modules/, lambda-build/, *.log

---

## 8. Package.json Scripts (v2)

```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "test": "vitest --run",
  "test:coverage": "vitest --run --coverage",
  "lint": "eslint src lambda --ext .ts",
  "lint:fix": "eslint src lambda --ext .ts --fix",
  "format": "prettier --write \"src/**/*.{ts,json,md}\" \"lambda/**/*.ts\"",
  "format:check": "prettier --check \"src/**/*.{ts,json,md}\" \"lambda/**/*.ts\"",
  "typecheck": "tsc --noEmit"
}
```

---

## 9. Legacy Cleanup Plan

Files removed in Phase 0:

| Path | Reason |
|---|---|
| src/scenes/GameScene.ts | v1 room-based scene, superseded |
| src/scenes/TileTestScene.ts | Dev-only, unreachable |
| src/systems/LevelGenerator.ts | Used only by GameScene |
| src/systems/ItemSystem.ts | Items removed in v2 |
| src/data/items.ts | Items removed in v2 |
| src/ui/PuzzleOverlay.ts | Superseded by PuzzleScene |
| src/ui/ (directory) | Empty after PuzzleOverlay removal |
| public/assets/tilemaps/level-office.json | Superseded by ProceduralMap |
| public/assets/tilemaps/level-server.json | Same |
| public/assets/tilemaps/level-cloud.json | Same |
| public/assets/tilesets/office-tileset.png | Only puny-dungeon.png used |
| public/assets/tilesets/server-tileset.png | Same |
| public/assets/tilesets/cloud-tileset.png | Same |
| Corresponding .test.ts files | Deleted with source |

Types removed from src/types/index.ts:
- Room, Level, LevelSequence (v1 procedural rooms)
- Item, HeroItemSlots, ItemType (v1 items)
- RunState fields: currentRoom, activeItems, levelSequence, currentPuzzle, hintsShown, scoreMultiplierRoomsRemaining, timerSeconds
