# Requirements — Cloud Quest v2 RPG

Spec-Driven requirements for the v2 RPG overhaul. Each requirement has acceptance criteria and traces to a phase (0-5).

---

## R0 — Governance & Cleanup (Phase 0)

**R0.1 Clean codebase**
- Zero orphaned scenes (GameScene, TileTestScene removed)
- Zero orphaned systems (LevelGenerator, ItemSystem removed)
- Zero orphaned data (items.ts removed)
- Zero orphaned UI (PuzzleOverlay.ts removed, replaced by PuzzleScene)
- Zero orphaned tests
- main.ts scene array only registers active scenes
- types/index.ts contains no legacy types (Room, Level, LevelSequence, Item, HeroItemSlots, ItemType)

**R0.2 i18n system**
- src/lib/i18n.ts exports `t(key, params?)`, `setLocale`, `getLocale`, `onLocaleChange`
- src/data/translations.ts contains all UI strings in `en` and `es`
- Locale persists in `localStorage.cq-locale`, default `en`
- Missing key returns the key itself (never crashes)
- Player selects locale in LoginScene via 🌐 EN/ES toggle
- Every scene reads text via `t()` — zero hardcoded UI strings

**R0.3 Tutorial wiring**
- MainMenuScene checks `localStorage.cq-tutorial-done`
- First run: Start Game → TutorialScene → ExplorationScene
- Returning player: Start Game → ExplorationScene directly
- Tutorial completion sets `cq-tutorial-done = true`
- Skip Tutorial button available

**R0.4 Quality tooling**
- ESLint with `@typescript-eslint/recommended` + unused-imports plugin
- Prettier (100 chars, 2 spaces, single quotes, LF)
- .editorconfig present
- .kiroignore excludes `dist/`, `coverage/`, `node_modules/`
- `npm run lint` and `npm run format:check` succeed on current codebase
- lint-on-save hook runs both TSC and ESLint

**Acceptance for Phase 0:**
- `npx tsc --noEmit` passes
- `npx eslint src` passes
- `npx vitest --run` passes without test regressions
- `npm run build` succeeds
- Manual: launch game, toggle EN/ES, all text switches
- Manual: first run shows tutorial, second run goes straight to game

---

## R1 — Visual Foundation (Phase 1)

**R1.1 Hero variants by difficulty**
- SpriteGenerator produces 3 hero variants: `classic`, `devops`, `cyberpunk`
- Classic = beginner (RPG adventurer: brown, green, gold palette)
- DevOps = normal (blue/gray palette, laptop accent)
- Cyberpunk = hard (neon purple/cyan palette)
- Each variant has 4 directions × 4 walk frames
- ExplorationScene loads the variant matching current difficulty

**R1.2 Object sprites on interactables**
- Terminals, servers, plants, desks, doors rendered as sprites, not colored dots
- Sprites placed at the interactable's tile position
- Pulsing glow marker remains as visual affordance

**R1.3 Enemies in world**
- 2-4 bug sprites patrolling zones of the map
- Contact = -15 HP + screen shake + audio feedback (new formula, added to tech.md)
- Bugs do not follow or attack the hero
- Bugs cannot be killed by the hero (they are hazards)

**R1.4 Ambient lighting**
- Vignette effect on viewport edges
- Warm glow near terminals, cool glow near servers/doors
- Depth-based color grading per scenario

**R1.5 Minimap**
- 100×100 px minimap in bottom-left of exploration viewport
- Shows: walls, floor, hero position, active/collected interactables, door
- Updates in real-time

**R1.6 Pixel-art font**
- Embed one open-source pixel-art font
- Replace default `monospace` in all fontFamily declarations
- Fallback to `monospace` if font fails to load

**Acceptance for Phase 1:**
- Hero visually changes when difficulty changes at menu
- Interactables clearly identifiable as sprites
- Enemy bugs visibly move on patrol paths
- Minimap accurately reflects the map state
- Text is legible with new pixel-art font

---

## R2 — Boss Variations (Phase 2)

**R2.1 Boss dispatcher**
- BossFightScene reads level and dispatches to correct boss type
- L1, L4 → Type A (Pipeline Assembly, current mechanic improved)
- L2, L5 → Type B (JRPG Action Menu, new)
- L3 → Type C (Rush Mode, new)

**R2.2 Type A: Pipeline Assembly (refactored)**
- Boss sprite (large, animated: idle + damage)
- Fragments displayed with object icons
- Slot animations on correct placement
- Named HP bar at top (Pokémon-style)

**R2.3 Type B: JRPG Action Menu (NEW)**
- 4 action cards at bottom
  - [A] Revisar Logs → puzzle category devops
  - [B] Aislar Servidor → puzzle category syntax
  - [C] Patchear Código → puzzle category logic
  - [D] Usar Backup (special: 1 use per fight, restores HP + big damage)
- Turn-based: action → puzzle → damage → boss counter-attack → repeat
- Dialogue box at bottom (typewriter effect)
- Big boss sprite centered

**R2.4 Type C: Rush Mode (NEW)**
- 90-second global timer
- Boss deals 1 heart every 10s (Normal) — scales with difficulty
- Player answers as many puzzles as possible
- Each correct answer damages boss + adds +5s to timer
- Boss dies when HP reaches 0, or player dies at 0 HP or timer expires

**Acceptance for Phase 2:**
- Play all 5 levels: each boss feels distinct
- Type B: complete a full JRPG combat cycle
- Type C: complete a Rush Mode run with timer pressure

---

## R3 — Narrative + AI (Phase 3)

**R3.1 Story data**
- src/data/stories.ts exports STORY_POOL: Story[]
- Minimum 30 stories total (intros + outros × 2 locales × 5 levels)
- Each story tagged with levelId, type (intro/outro), locale (en/es)
- Content: real-case DevOps incidents in gamified narrative

**R3.2 StorySystem**
- src/systems/StorySystem.ts exports getIntroStory and getOutroStory
- Picks a random story matching criteria
- If VITE_BEDROCK_ENABLED=true, calls ApiClient.generateStory() first, falls back to static

**R3.3 Bedrock Lambda**
- lambda/generateStory.ts accepts `{ levelId, locale, situation }`
- Calls Amazon Nova Micro with prompt template
- Returns `{ text }` in requested locale
- IAM permission: bedrock:InvokeModel on amazon.nova-micro-*
- Env var BEDROCK_ENABLED gates the invocation

**R3.4 UI integration**
- Pre-level intro cutscene (5-10s typewriter text)
- Skippable with Space or click
- Post-boss learning summary: title, concepts, real-world example, Continue button
- Both intro and outro rendered in current locale

**Acceptance for Phase 3:**
- Each level starts with narrative intro
- Each boss defeat shows learning summary
- With BEDROCK_ENABLED=false: static stories
- With BEDROCK_ENABLED=true + AWS creds: fresh stories generated

---

## R4 — Audio (Phase 4)

**R4.1 Real audio files**
- Download CC0 SFX: interact, correct, incorrect, boss-hit, boss-attack, fragment, victory, damage, door, step
- Download CC0 music: menu, exploration, boss
- Place in public/assets/sounds/, preload in scenes

**R4.2 MusicManager**
- AudioManager extended with playMusic and stopMusic (with fade)
- Crossfade on scene transitions
- Respects mute/volume settings

**R4.3 Volume controls**
- MainMenu → Options → Volume slider (0-100)
- Master mute toggle (M key)
- Persist in localStorage.cq-audio-settings

**Acceptance for Phase 4:**
- Every scene has background music
- Every event has a real SFX (not synth)
- Volume slider changes volume in real time

---

## R5 — Polish (Phase 5)

**R5.1 Enhanced particles**
- Sparkle effects with additive blend mode
- Damage numbers with juicy tween
- Correct-answer confetti burst

**R5.2 Cinematic transitions**
- Level transitions: fade → text reveal → fade
- Boss intro: camera zoom + shake + slam-in
- Victory: slow-motion final hit

**R5.3 Final polish**
- Loading screen between levels with DevOps tip
- Screenshot mode (F12 downloads PNG)
- Consistent easing curves across tweens

**Acceptance for Phase 5:**
- 3-minute demo recording shows polished, cohesive experience
- No abrupt transitions
- No visible programmer-art placeholders

---

## Cross-Phase Requirements

**CR1 TypeScript strict** — Zero `any` in src/ (test files exempt)
**CR2 Test coverage** — Pure systems ≥90%, overall ≥70%
**CR3 Business formulas locked** — Changes require spec update first
**CR4 Localization completeness** — Every string in both locales, enforced by `npm run i18n:check`
**CR5 Offline-first** — Game fully playable with no network
