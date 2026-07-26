# Tasks — Cloud Quest v2 RPG

Granular execution checklist across 6 phases. Each task traces to requirements in `requirements.md`.

Legend: `[ ]` pending, `[~]` in progress, `[x]` done, `[*]` optional.

---

## Phase 0 — Governance & Cleanup

### 0.A Governance setup
- [x] 0.A.1 Archive v1 spec to `.kiro/specs/_archive/cloud-quest-devops-dungeon/` — R0.1
- [x] 0.A.2 Rewrite `.kiro/steering/product.md` for v2 — R0.1
- [x] 0.A.3 Rewrite `.kiro/steering/tech.md` for v2 architecture — R0.1
- [x] 0.A.4 Rewrite `.kiro/steering/structure.md` for v2 file tree — R0.1
- [x] 0.A.5 Create `.kiro/specs/cloud-quest-v2-rpg/` (requirements, design, tasks) — R0.1
- [ ] 0.A.6 Install ESLint + Prettier + plugins as dev dependencies — R0.4
- [ ] 0.A.7 Write `.eslintrc.json` with `@typescript-eslint/recommended` — R0.4
- [ ] 0.A.8 Write `.prettierrc`, `.editorconfig`, `.kiroignore` — R0.4
- [ ] 0.A.9 Update `package.json` scripts (`lint`, `lint:fix`, `format`, `format:check`, `typecheck`) — R0.4
- [ ] 0.A.10 Verify `lambda/tsconfig.json` exists — R0.4
- [ ] 0.A.11 Update `.kiro/hooks/lint-on-save.json` to run ESLint too — R0.4
- [ ] 0.A.12 Governance smoke test: TSC + tests + ESLint + build all pass

### 0.B Cleanup
- [ ] 0.B.1 Delete `src/scenes/GameScene.ts` (+ test if exists) — R0.1
- [ ] 0.B.2 Delete `src/scenes/TileTestScene.ts` — R0.1
- [ ] 0.B.3 Delete `src/systems/LevelGenerator.ts` + test — R0.1
- [ ] 0.B.4 Delete `src/systems/ItemSystem.ts` + test — R0.1
- [ ] 0.B.5 Delete `src/data/items.ts` — R0.1
- [ ] 0.B.6 Delete `src/ui/PuzzleOverlay.ts` + test + `src/ui/` dir — R0.1
- [ ] 0.B.7 Delete unused tilemaps in `public/assets/tilemaps/` — R0.1
- [ ] 0.B.8 Delete unused tilesets in `public/assets/tilesets/` — R0.1
- [ ] 0.B.9 Update `src/main.ts` (remove GameScene, TileTestScene imports/registrations) — R0.1
- [ ] 0.B.10 Clean `src/types/index.ts` (remove Room, Level, LevelSequence, Item, HeroItemSlots, ItemType, orphaned RunState fields) — R0.1
- [ ] 0.B.11 Fix references broken by cleanup (VictoryScene runState reads, etc.) — R0.1
- [ ] 0.B.12 Cleanup smoke test: TSC + tests + ESLint + build pass

### 0.C i18n foundation
- [ ] 0.C.1 Create `src/lib/i18n.ts` with `t`, `setLocale`, `getLocale`, `onLocaleChange` — R0.2
- [ ] 0.C.2 Create `src/data/translations.ts` with EN + ES keys for current UI strings — R0.2
- [ ] 0.C.3 Write `src/lib/i18n.test.ts` (param substitution, missing key fallback, persistence) — R0.2

### 0.D i18n refactor of scenes
- [ ] 0.D.1 Refactor HUDScene to use `t()` — R0.2
- [ ] 0.D.2 Refactor PuzzleScene to use `t()` — R0.2
- [ ] 0.D.3 Refactor LoginScene + add 🌐 EN/ES toggle — R0.2
- [ ] 0.D.4 Refactor MainMenuScene + language toggle — R0.2
- [ ] 0.D.5 Refactor TutorialScene — R0.2
- [ ] 0.D.6 Refactor LeaderboardScene — R0.2
- [ ] 0.D.7 Refactor GameOverScene, VictoryScene — R0.2
- [ ] 0.D.8 Refactor ExplorationScene status messages — R0.2
- [ ] 0.D.9 Refactor BossFightScene — R0.2

### 0.E Tutorial wiring
- [ ] 0.E.1 MainMenuScene.startNewRun routes via TutorialScene on first run — R0.3
- [ ] 0.E.2 TutorialScene.onComplete sets `cq-tutorial-done` + goes to ExplorationScene — R0.3
- [ ] 0.E.3 Add Skip Tutorial button — R0.3
- [ ] 0.E.4 Manual QA: first run tutorial, second run skips

### 0.F Phase 0 acceptance
- [ ] 0.F.1 `npx tsc --noEmit` clean
- [ ] 0.F.2 `npx eslint src lambda` clean
- [ ] 0.F.3 `npx vitest --run` no regressions
- [ ] 0.F.4 `npm run build` succeeds
- [ ] 0.F.5 Manual: 🌐 EN/ES toggle works
- [ ] 0.F.6 Manual: tutorial first-run behavior
- [ ] 0.F.7 Commit + tag `phase-0-complete`

---

## Phase 1 — Visual Foundation

### 1.A Hero variants
- [ ] 1.A.1 SpriteGenerator produces 3 palette-driven variants — R1.1
- [ ] 1.A.2 Textures `hero-classic`, `hero-devops`, `hero-cyberpunk` — R1.1
- [ ] 1.A.3 Hero entity accepts textureKey parameter — R1.1
- [ ] 1.A.4 ExplorationScene selects variant from difficulty — R1.1

### 1.B Object sprites
- [ ] 1.B.1 Place obj-* sprites at interactable positions — R1.2
- [ ] 1.B.2 Correct depth ordering — R1.2

### 1.C Enemies
- [ ] 1.C.1 Generate 4 bug sprite variants — R1.3
- [ ] 1.C.2 Enemy entity with patrol — R1.3
- [ ] 1.C.3 Contact -15 HP + shake + audio — R1.3
- [ ] 1.C.4 Update tech.md with enemy contact formula — CR3

### 1.D Lighting
- [ ] 1.D.1 Vignette overlay — R1.4
- [ ] 1.D.2 Warm/cool glows per object type — R1.4
- [ ] 1.D.3 Per-scenario tint — R1.4

### 1.E Minimap
- [ ] 1.E.1 100x100 minimap overlay — R1.5

### 1.F Pixel-art font
- [ ] 1.F.1 Add CC0 pixel font + @font-face — R1.6
- [ ] 1.F.2 Replace monospace globally — R1.6

### 1.G Phase 1 acceptance
- [ ] 1.G.1 Screenshot comparison to reference
- [ ] 1.G.2 Commit + tag `phase-1-complete`

---

## Phase 2 — Boss Variations

### 2.A Type A (Pipeline, refactor)
- [ ] 2.A.1 Boss sprite with idle + damage anims — R2.2
- [ ] 2.A.2 Fragment icons — R2.2
- [ ] 2.A.3 Slot placement animation — R2.2

### 2.B Type B (JRPG Action Menu)
- [ ] 2.B.1 Create BossActionMenuScene — R2.3
- [ ] 2.B.2 4 action cards (A/B/C/D) — R2.3
- [ ] 2.B.3 Turn-based state machine — R2.3
- [ ] 2.B.4 Typewriter dialogue box — R2.3
- [ ] 2.B.5 Backup action (1 use) — R2.3
- [ ] 2.B.6 Update tech.md with JRPG formulas

### 2.C Type C (Rush Mode)
- [ ] 2.C.1 Create BossRushScene — R2.4
- [ ] 2.C.2 90s timer + boss auto-attack — R2.4
- [ ] 2.C.3 +5s bonus per correct — R2.4
- [ ] 2.C.4 Update tech.md with Rush formulas

### 2.D Dispatcher
- [ ] 2.D.1 BOSS_TYPE_BY_LEVEL constant — R2.1
- [ ] 2.D.2 BossFightScene dispatches — R2.1
- [ ] 2.D.3 Register new scenes in main.ts — R2.1

### 2.E Phase 2 acceptance
- [ ] 2.E.1 All 5 levels playable, 3 boss types work
- [ ] 2.E.2 Commit + tag `phase-2-complete`

---

## Phase 3 — Narrative + AI

### 3.A Story data
- [ ] 3.A.1 src/data/stories.ts with 30+ stories — R3.1
- [ ] 3.A.2 Include learnedConcepts + realWorldExample — R3.1

### 3.B StorySystem
- [ ] 3.B.1 getIntroStory / getOutroStory — R3.2
- [ ] 3.B.2 Random selection + locale fallback — R3.2

### 3.C Bedrock Lambda
- [ ] 3.C.1 lambda/generateStory.ts — R3.3
- [ ] 3.C.2 backend.yml Bedrock IAM permission — R3.3
- [ ] 3.C.3 ApiClient.generateStory with fallback — R3.3
- [ ] 3.C.4 StorySystem tries Bedrock if enabled — R3.2

### 3.D UI
- [ ] 3.D.1 IntroCutsceneScene (typewriter) — R3.4
- [ ] 3.D.2 LearningSummaryScene — R3.4
- [ ] 3.D.3 Wire intro before gameplay — R3.4
- [ ] 3.D.4 Wire summary after boss — R3.4

### 3.E Phase 3 acceptance
- [ ] 3.E.1 Each level has intro + outro
- [ ] 3.E.2 QA BEDROCK_ENABLED=false works
- [ ] 3.E.3 QA BEDROCK_ENABLED=true works
- [ ] 3.E.4 Commit + tag `phase-3-complete`

---

## Phase 4 — Audio

### 4.A Assets
- [ ] 4.A.1 Download CC0 SFX pack — R4.1
- [ ] 4.A.2 Download CC0 music — R4.1
- [ ] 4.A.3 Place in public/assets/sounds — R4.1

### 4.B MusicManager
- [ ] 4.B.1 playMusic + stopMusic + crossfade — R4.2
- [ ] 4.B.2 Scene transitions crossfade — R4.2

### 4.C Volume
- [ ] 4.C.1 Options slider — R4.3
- [ ] 4.C.2 M key mute — R4.3
- [ ] 4.C.3 Persistence — R4.3

### 4.D Phase 4 acceptance
- [ ] 4.D.1 QA: every scene has audio
- [ ] 4.D.2 Commit + tag `phase-4-complete`

---

## Phase 5 — Polish

### 5.A Particles
- [ ] 5.A.1 Additive-blend sparkles — R5.1
- [ ] 5.A.2 Juicy damage numbers — R5.1
- [ ] 5.A.3 Confetti burst — R5.1

### 5.B Cinematic transitions
- [ ] 5.B.1 Level fade + text reveal — R5.2
- [ ] 5.B.2 Boss intro zoom + shake — R5.2
- [ ] 5.B.3 Victory slow-motion — R5.2

### 5.C Final polish
- [ ] 5.C.1 Loading screen with tip — R5.3
- [ ] 5.C.2 F12 screenshot — R5.3
- [ ] 5.C.3 Consistent easing — R5.3

### 5.D Phase 5 acceptance
- [ ] 5.D.1 3-min demo review
- [ ] 5.D.2 Commit + tag `phase-5-complete`
- [ ] 5.D.3 PR to main for hackathon

---

## Rules

1. Update this file at end of each task (`[ ]` → `[~]` → `[x]`)
2. Never move to next phase with any `[~]` still in current phase
3. Never modify a formula in tech.md without adding a matching task here first
4. Each phase ends with a commit tagged `phase-N-complete`
