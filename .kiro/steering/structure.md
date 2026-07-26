# Structure — Cloud Quest: DevOps Dungeon (v2 RPG)

## Complete Directory Tree

```
proyecto-kiro-hackaton/
│
├── .kiro/
│   ├── specs/
│   │   ├── cloud-quest-v2-rpg/         ← ACTIVE spec (v2)
│   │   │   ├── .config.kiro
│   │   │   ├── requirements.md
│   │   │   ├── design.md
│   │   │   └── tasks.md
│   │   └── _archive/
│   │       └── cloud-quest-devops-dungeon/  ← v1 spec (historical evidence)
│   ├── steering/
│   │   ├── product.md
│   │   ├── tech.md
│   │   └── structure.md                ← this file
│   ├── agents/                         ← 6 specialized sub-agents
│   ├── skills/                         ← 5 domain-knowledge skills
│   ├── hooks/                          ← 6 quality-gate hooks
│   └── settings/
│       └── mcp.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── cd.yml
│       └── quality-gates.yml
│
├── src/
│   ├── main.ts
│   ├── scenes/                         ← 10 scenes, extend Phaser.Scene
│   │   ├── LoginScene.ts
│   │   ├── MainMenuScene.ts
│   │   ├── TutorialScene.ts
│   │   ├── ExplorationScene.ts
│   │   ├── HUDScene.ts
│   │   ├── PuzzleScene.ts
│   │   ├── BossFightScene.ts
│   │   ├── VictoryScene.ts
│   │   ├── GameOverScene.ts
│   │   └── LeaderboardScene.ts
│   ├── systems/                        ← Pure logic, Phaser-independent
│   │   ├── PuzzleEngine.ts
│   │   ├── ScoreSystem.ts
│   │   ├── FragmentSystem.ts
│   │   ├── BossFightSystem.ts
│   │   ├── InteractableSystem.ts
│   │   ├── DifficultySystem.ts
│   │   ├── SaveSystem.ts
│   │   ├── FeedbackSystem.ts
│   │   ├── MovementSystem.ts
│   │   ├── MapLoader.ts
│   │   └── StorySystem.ts              ← v2 new
│   ├── lib/                            ← Utilities and services
│   │   ├── EventBus.ts
│   │   ├── ApiClient.ts
│   │   ├── LocalStorageService.ts
│   │   ├── Colors.ts
│   │   ├── SceneTransition.ts
│   │   ├── AudioManager.ts
│   │   ├── SynthAudio.ts
│   │   ├── SpriteGenerator.ts
│   │   ├── ProceduralMap.ts
│   │   ├── TilemapHelper.ts
│   │   ├── validateUsername.ts
│   │   └── i18n.ts                     ← v2 new
│   ├── entities/
│   │   ├── Hero.ts
│   │   └── InteractionIndicator.ts
│   ├── data/
│   │   ├── puzzles.ts
│   │   ├── fragments.ts
│   │   ├── levels.ts
│   │   ├── stories.ts                  ← v2 new
│   │   └── translations.ts             ← v2 new
│   └── types/
│       └── index.ts
│
├── lambda/
│   ├── submitScore.ts
│   ├── getLeaderboard.ts
│   ├── getOrCreatePlayer.ts
│   └── generateStory.ts                ← v2 new (Bedrock)
│
├── infra/
│   ├── DEPLOY-GUIDE.md
│   ├── cloudformation/backend.yml
│   └── scripts/
│       ├── deploy.ps1
│       └── destroy.ps1
│
├── public/
│   ├── index.html
│   └── assets/
│       ├── sprites/
│       ├── tilesets/puny-dungeon.png   ← CC0
│       ├── sounds/
│       └── fonts/
│
├── docs/
│   └── VIDEO-SCRIPT.md
│
├── .eslintrc.json                      ← v2 new
├── .prettierrc                         ← v2 new
├── .editorconfig                       ← v2 new
├── .kiroignore                         ← v2 new
├── .env.example
├── .gitignore
├── amplify.yml
├── customHttp.yml
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Directory Responsibilities

### `src/scenes/`
- 10 game scenes (v2)
- Each file is one class extending `Phaser.Scene`
- Only presentation logic and input handling
- Delegates domain logic to `src/systems/` and cross-scene communication to `EventBus`
- No business logic in scenes — all rules live in `systems/`
- All user-facing text uses `t()` from `lib/i18n.ts`

### `src/systems/`
- Pure logic systems, Phaser-independent
- Take and return types defined in `src/types/index.ts`
- Instantiated by scenes or accessed as function modules

### `src/lib/`
- Stateless or minimal-state utilities
- `EventBus.ts`: singleton exported as instance
- `ApiClient.ts`: module with exported functions
- `i18n.ts`: `t(key, params?)` + `setLocale(locale)` + `getLocale()`

### `src/data/`
- Static data only, no logic
- `puzzles.ts`: minimum 5 puzzles per category
- `fragments.ts`: 5-6 pipeline fragments per level
- `levels.ts`: exactly 5 level definitions
- `stories.ts`: minimum 30 pre-generated narratives (intro + post-boss)
- `translations.ts`: all UI strings for EN + ES

### `src/entities/`
- Phaser-specific game objects with visual state

### `src/types/`
- Single `index.ts` with all shared types
- Interfaces and type aliases only

### `lambda/`
- Independent handlers, compiled with `tsc` before deploy
- Use `@aws-sdk/*` from Node.js 20.x runtime — no bundling needed

### `public/assets/`
- Sprites (PNG), sounds (MP3), fonts (WOFF2)

### `.kiro/`
- Spec-Driven Development artifacts
- Never delete `_archive/` — preserves historical evidence
- Steering files are the source of truth

---

## File Naming Conventions

| Pattern | Usage |
|---|---|
| `PascalCase.ts` | Classes (scenes, systems that are classes, entities) |
| `camelCase.ts` | Function modules, utilities |
| `*.test.ts` | Unit and property-based tests |
| `index.ts` | Barrel exports (only in `types/`) |
| `SCREAMING_SNAKE_CASE` | Exported constants (EVENTS, PUZZLE_POOL, FRAGMENT_POOL, LEVEL_DEFINITIONS, STORY_POOL, TRANSLATIONS, COLORS, COLORS_HEX, TEXT_STYLES) |

---

## Game State Flow

```
game.registry
  ├── 'playerProfile'   → PlayerProfile (username, personalBest, updatedAt)
  ├── 'locale'          → 'en' | 'es'  (also persisted in localStorage)
  └── 'tutorialDone'    → boolean

localStorage
  ├── cq-profile-{username}       → PlayerProfile
  ├── cq-leaderboard              → LeaderboardEntry[] (max 10, one per username)
  ├── cq-audio-settings           → { muted, volume }
  ├── cq-locale                   → 'en' | 'es'
  ├── cq-tutorial-done            → boolean
  └── cq-save-{mode}-{slot}       → SaveData
```

Run state (score, HP, level) is passed via `scene.start('SceneName', { level, difficulty, hp, score })` between scenes. Only score gets written to DynamoDB at end of run.

---

## Scene Flow (v2)

```
LoginScene
  └── (valid username)
        └── MainMenuScene
              ├── (first run, tutorialDone=false) → TutorialScene → ExplorationScene
              ├── (returning player)               → ExplorationScene
              ├── (continue save)                  → ExplorationScene (from save)
              └── (Leaderboard)                    → LeaderboardScene → MainMenuScene

  ExplorationScene (level N)
    ├── (parallel) HUDScene
    ├── (E key on terminal, parallel) PuzzleScene
    │     └── back to ExplorationScene
    ├── (all fragments + door)
    │     └── BossFightScene (dispatcher: Type A/B/C)
    │           ├── L1, L4: Type A (Pipeline Assembly)
    │           ├── L2, L5: Type B (JRPG Action Menu)
    │           ├── L3:     Type C (Rush Mode)
    │           ├── (victory) → next level OR VictoryScene (if L5)
    │           └── (defeat)  → GameOverScene
    ├── (HP = 0) → GameOverScene
    └── (ESC) → confirm → MainMenuScene
```

---

## API Endpoints

| Method | Path | Description | Lambda |
|---|---|---|---|
| `POST` | `/players` | Create or retrieve player profile | `getOrCreatePlayer.ts` |
| `POST` | `/scores` | Submit run score | `submitScore.ts` |
| `GET` | `/scores` | Fetch top-10 leaderboard | `getLeaderboard.ts` |
| `POST` | `/stories` | (v2, optional) Generate story via Bedrock | `generateStory.ts` |

Base URL: `VITE_API_BASE_URL` (Amplify environment variable).
