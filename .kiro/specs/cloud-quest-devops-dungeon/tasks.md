# Implementation Plan: Cloud Quest: DevOps Dungeon

## Overview

This plan converts the design document into incremental coding steps for a Phaser.js 3 + Vite + TypeScript roguelike web game with AWS backend. Tasks build progressively from project scaffolding through core game logic, scenes, backend integration, and finally deployment. Each task references specific requirements for traceability.

## Tasks

- [ ] 1. Project scaffolding and configuration
  - [ ] 1.1 Bootstrap Vite + Phaser.js 3 TypeScript project
    - Initialize project using the official `phaser/template-vite-ts` template
    - Configure `tsconfig.json` with `strict: true` and path aliases (`@/` → `src/`)
    - Set up `vitest.config.ts` with `jsdom` environment, `globals: true`, and `include: ['src/**/*.test.ts']`
    - Install `fast-check` as a dev dependency
    - Create folder structure: `src/scenes/`, `src/lib/`, `src/systems/`, `src/data/`, `src/types/`, `lambda/`
    - _Requirements: 7.1, 7.2_

  - [ ] 1.2 Configure Phaser game entry point and canvas scaling
    - Create `src/main.ts` with `Phaser.Game` configuration: resolution 960×540, `ScaleManager` mode `FIT`, transparent background
    - Register all scene classes in the scene array (stubbed initially)
    - Add `src/lib/EventBus.ts` exporting `EventBus` singleton and `EVENTS` constants
    - _Requirements: 6.1, 6.7_

  - [ ]* 1.3 Verify project builds and tests run
    - Run `vite build` and confirm `dist/` output with no TypeScript errors
    - Run `vitest --run` and confirm test runner initializes with zero failures
    - _Requirements: 7.1_

- [ ] 2. TypeScript types and shared data models
  - [ ] 2.1 Define all shared TypeScript interfaces and types
    - Create `src/types/index.ts` with `Puzzle`, `PuzzleCategory`, `Room`, `Level`, `LevelSequence`, `Item`, `ItemType`, `HeroItemSlots`, `RunState`, `PlayerProfile`, `ScorePayload`, `LeaderboardEntry`, `ScoreEvent`, `RunResult`, `GameOverData`, `VictoryData` interfaces
    - Ensure `RunState.activeItems` has `max 3` enforced via type comment and `HeroItemSlots.active` typed as `Item[]`
    - _Requirements: 3.1–3.10, 4.1–4.7, 5.1–5.8_

  - [ ]* 2.2 Write unit tests for type shape validation
    - Test that `Puzzle` objects with 1–3 hints satisfy the `[string, ...string[]]` tuple constraint
    - Test `RunState` defaults and shape completeness
    - _Requirements: 3.2, 3.8_

- [ ] 3. Static data — puzzle pool and item definitions
  - [ ] 3.1 Create puzzle pool JSON/TypeScript with 4 categories × ≥5 puzzles each
    - Create `src/data/puzzles.ts` exporting `PUZZLE_POOL: Record<PuzzleCategory, Puzzle[]>`
    - Populate `syntax` category with ≥5 puzzles (fix-the-syntax-error style questions)
    - Populate `logic` category with ≥5 puzzles (trace-the-output or find-the-bug style)
    - Populate `devops` category with ≥5 puzzles (CI/CD pipeline config, Docker, Kubernetes questions)
    - Populate `memory` category with ≥5 puzzles (memory leaks, resource management questions)
    - Each puzzle must have exactly 1 correct answer and 1–3 distinct hint strings
    - _Requirements: 3.2, 3.8_

  - [ ]* 3.2 Write property test for puzzle pool integrity
    - **Property 9: Puzzle pool integrity**
    - **Validates: Requirements 3.2, 3.8**
    - Assert every puzzle has exactly one `correctAnswer` (non-empty string) and `hints.length` in [1, 3] with all hints distinct

  - [ ] 3.3 Create item definitions
    - Create `src/data/items.ts` exporting `ITEM_DEFINITIONS: Item[]` with all 6 item types
    - Include `Timer_Extension`, `HP_Recovery`, `Hint_Revealer`, `Score_Multiplier`, `Bug_Weakener`, `Second_Chance`
    - _Requirements: 4.2_

- [ ] 4. Username validation utility
  - [ ] 4.1 Implement `validateUsername` function
    - Create `src/lib/validateUsername.ts` with regex `/^[a-zA-Z0-9_]{3,20}$/`
    - Export `validateUsername(s: string): boolean`
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ]* 4.2 Write property test for username validation
    - **Property 1: Username validation is exactly the accepted character set**
    - **Validates: Requirements 1.2, 1.3, 1.4**
    - Use `fc.string()` over lengths 0–25; assert `validateUsername(s) === /^[a-zA-Z0-9_]{3,20}$/.test(s)`

  - [ ]* 4.3 Write unit tests for username validation edge cases
    - Test boundary lengths (2, 3, 20, 21 characters)
    - Test special characters, spaces, unicode
    - _Requirements: 1.3, 1.4_

- [ ] 5. PuzzleEngine implementation
  - [ ] 5.1 Implement `PuzzleEngine` class
    - Create `src/systems/PuzzleEngine.ts` implementing `draw()`, `evaluate()`, `getHint()`, `getTimerDuration()`, `computeDamage()`, and `reset()`
    - `computeDamage(t)` must return `Math.max(10, Math.min(120, t * 2))`
    - `draw()` must track used IDs via `usedIds: Set<string>` and return `null` when pool is exhausted
    - `getTimerDuration(isBoss)` returns `90` if boss, `60` otherwise
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.8_

  - [ ]* 5.2 Write property test for damage formula clamp
    - **Property 7: Damage formula clamp**
    - **Validates: Requirements 3.4**
    - Use `fc.integer({ min: 1, max: 90 })`; assert `computeDamage(t) === Math.max(10, Math.min(120, t * 2))`

  - [ ]* 5.3 Write unit tests for PuzzleEngine
    - Test `draw()` returns correct category, marks as used, returns `null` when exhausted
    - Test `evaluate()` is case-sensitive/insensitive per spec
    - Test `getHint()` returns `undefined` for out-of-range index
    - Test `reset()` clears `usedIds`
    - _Requirements: 3.1, 3.2, 3.8_

- [ ] 6. LevelGenerator implementation
  - [ ] 6.1 Implement `LevelGenerator` class
    - Create `src/systems/LevelGenerator.ts` implementing `generate()`, `generateLevel()`, `hasNavigablePath()`, and `getFallbackLevel()`
    - `generate()` produces sequences of 5–10 levels with unique layout configurations
    - `generateLevel(n)` ensures 3–7 rooms per level, ≥1 combat room, ≥1 rest room
    - Bug HP formula: `BASE_HP * (1 + 0.10 * (n - 1))`; puzzle step count: `BASE_STEPS + Math.floor((n - 1) / 2)`
    - `hasNavigablePath()` uses BFS from entrance to exit
    - After 3 failed generation attempts, call `getFallbackLevel(n)` and log failure
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

  - [ ]* 6.2 Write property test for level sequence validity invariants
    - **Property 3: Level sequence validity invariants**
    - **Validates: Requirements 2.1, 2.2**
    - Use `fc.integer({ min: 0, max: 999999 })` as seed; assert sequence length in [5,10], each level has rooms in [3,7] with ≥1 combat and ≥1 rest, all layouts pairwise distinct

  - [ ]* 6.3 Write property test for difficulty scaling formula
    - **Property 4: Difficulty scaling formula**
    - **Validates: Requirements 2.3**
    - Use `fc.integer({ min: 1, max: 10 })` as N; assert `bugBaseHP === BASE_HP * (1 + 0.10 * (N - 1))` and `puzzleStepCount === BASE_STEPS + Math.floor((N - 1) / 2)`

  - [ ]* 6.4 Write property test for navigable path guarantee
    - **Property 6: All levels have a navigable path**
    - **Validates: Requirements 2.5**
    - For each generated level, assert `hasNavigablePath(level.rooms) === true`

  - [ ]* 6.5 Write property test for run-to-run level diversity
    - **Property 5: Run-to-run level diversity**
    - **Validates: Requirements 2.4**
    - Generate two consecutive run sequences for same username; assert ≥50% of corresponding level indices differ in room count or bug placement

  - [ ]* 6.6 Write unit tests for LevelGenerator
    - Test fallback path triggers after 3 failed attempts
    - Test entrance-to-exit path exists in fallback levels
    - _Requirements: 2.5, 2.6_

- [ ] 7. ItemSystem implementation
  - [ ] 7.1 Implement `ItemSystem` class
    - Create `src/systems/ItemSystem.ts` implementing `drawSelection()`, `applyItem()`, `canAccept()`, and `reset()`
    - `drawSelection()` draws 2 distinct items without replacement from un-awarded items
    - `applyItem()` applies item effect to `RunState` and marks item as awarded
    - `canAccept()` returns `true` if `activeItems.length < 3`
    - Implement all 6 item effects: `Timer_Extension` (cap at initial max), `HP_Recovery` (cap at 100), `Hint_Revealer`, `Score_Multiplier` (set `scoreMultiplierRoomsRemaining = 3`, non-stackable), `Bug_Weakener` (reduce next bug HP by 30% rounded down), `Second_Chance` (flag in run state)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 7.2 Write property test for item selection without replacement
    - **Property 10: Item selection without replacement**
    - **Validates: Requirements 4.1**
    - After each `drawSelection()`, assert exactly 2 distinct items returned, both from not-yet-awarded pool

  - [ ]* 7.3 Write property test for item effect application and pool removal
    - **Property 11: Item effect application and pool removal**
    - **Validates: Requirements 4.3**
    - For each item type, call `applyItem()` and assert effect applied to `RunState` and item not in pool afterward

  - [ ]* 7.4 Write property test for active item cap
    - **Property 12: Active item cap**
    - **Validates: Requirements 4.4**
    - Simulate sequences of item acquisitions; assert `activeItems.length` never exceeds 3

  - [ ]* 7.5 Write unit tests for ItemSystem edge cases
    - Test discard prompt trigger when hero has 3 active items
    - Test 60-second timeout cancellation preserves existing items
    - Test `Score_Multiplier` + `Bug_Weakener` interaction order (weakener applied first, then multiplier)
    - _Requirements: 4.4, 4.5, 4.7_

- [ ] 8. ScoreSystem implementation
  - [ ] 8.1 Implement `ScoreSystem` class
    - Create `src/systems/ScoreSystem.ts` implementing `calculateIncrement()`, `submitScore()`, and `scheduleRetry()`
    - `calculateIncrement({ levelNumber, remainingSeconds, bugDifficulty, hasScoreMultiplier })`: base = `100 * levelNumber`, add `50` if `remainingSeconds > 30`, multiply by 2 if `hasScoreMultiplier`
    - `submitScore()` calls `ApiClient.submitScore()` and returns `true` on success
    - `scheduleRetry()` sets a 30-second timeout for one retry attempt; on retry failure, emits `EVENTS.SCORE_NOT_SAVED`
    - Bug defeat bonus: `100 * bugDifficulty` added to score via `EventBus`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 8.2 Write property test for score increment formula
    - **Property 14: Score increment formula**
    - **Validates: Requirements 5.1, 5.2**
    - Use `fc.integer({ min: 1, max: 10 })` for L and `fc.integer({ min: 0, max: 90 })` for T; assert formula `(100 * L) + (T > 30 ? 50 : 0)` with optional `× 2` multiplier

  - [ ]* 8.3 Write property test for score bonus on bug defeat
    - **Property 8: Score bonus on bug defeat**
    - **Validates: Requirements 3.7**
    - Use `fc.integer({ min: 1, max: 3 })` for D; assert bonus equals `100 * D`

  - [ ]* 8.4 Write property test for personal best update rule
    - **Property 16: Personal best update rule**
    - **Validates: Requirements 5.8**
    - Use `fc.nat()` for both `currentBest` and `newScore`; assert stored best equals `Math.max(currentBest, newScore)`

  - [ ]* 8.5 Write unit tests for ScoreSystem
    - Test retry queue triggered on first DynamoDB failure
    - Test "Score not saved" notification on retry failure
    - _Requirements: 5.4_

- [ ] 9. ApiClient implementation
  - [ ] 9.1 Implement `ApiClient` module
    - Create `src/lib/ApiClient.ts` implementing `submitScore()`, `getLeaderboard()`, and `getOrCreatePlayer()`
    - All requests use `AbortController` with 5-second timeout
    - `submitScore()` sends `POST /scores` with `ScorePayload`
    - `getLeaderboard()` sends `GET /scores` and returns `LeaderboardEntry[]`
    - `getOrCreatePlayer()` sends `POST /players` and returns `PlayerProfile`
    - Propagate errors as rejected Promises; caller is responsible for handling
    - Store API base URL in environment variable `VITE_API_BASE_URL`
    - _Requirements: 1.5, 1.6, 5.3, 5.4, 5.5, 7.3_

  - [ ]* 9.2 Write unit tests for ApiClient
    - Mock `fetch` with `vi.fn()`; test success paths for all three methods
    - Test 5-second timeout abort behavior
    - Test HTTP 500 response propagates as rejected Promise
    - _Requirements: 5.4, 7.5_

- [ ] 10. Checkpoint — Core systems complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Phaser scenes — LoginScene and MainMenuScene
  - [ ] 11.1 Implement `LoginScene`
    - Create `src/scenes/LoginScene.ts` extending `Phaser.Scene`
    - Render username input field (Phaser DOM element), "Login" button, and personal best score display
    - Call `validateUsername()` on submit; show inline error for invalid input
    - Call `ApiClient.getOrCreatePlayer()` on valid input; show spinner during request
    - On success, store `PlayerProfile` in `game.registry` and transition to `MainMenuScene`
    - On DynamoDB timeout (>3s) or error, show retry error message without clearing input field
    - Auto-focus input field on scene create
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ]* 11.2 Write property test for personal best display
    - **Property 2: Personal best display matches stored score**
    - **Validates: Requirements 1.7, 1.8**
    - Use `fc.nat()` for stored score (including 0); assert displayed value equals stored value exactly

  - [ ] 11.3 Implement `MainMenuScene`
    - Create `src/scenes/MainMenuScene.ts` extending `Phaser.Scene`
    - Display "Start Run" button, "View Leaderboard" button, and player username
    - On "Start Run": check `game.registry` for prior completed rooms; navigate to `TutorialScene` if none, else `GameScene`
    - _Requirements: 8.6, 9.5_

- [ ] 12. Phaser scenes — TutorialScene
  - [ ] 12.1 Implement `TutorialScene`
    - Create `src/scenes/TutorialScene.ts` extending `Phaser.Scene`
    - Display step-by-step interactive tutorial covering: room navigation, puzzle combat, item selection, timer mechanics
    - Mark tutorial as complete in `game.registry` on `onComplete()`
    - Transition to `GameScene` on completion
    - Tutorial only shown when `game.registry` has no prior completed rooms
    - _Requirements: 9.5_

- [ ] 13. Phaser scenes — GameScene (core combat loop)
  - [ ] 13.1 Implement `GameScene` — room navigation and run state
    - Create `src/scenes/GameScene.ts` extending `Phaser.Scene`
    - Initialize `RunState` from `LevelGenerator.generate()` and store in `game.registry`
    - Implement `enterRoom(room)`: handle `combat`, `rest`, and `item` room types
    - Rest room: call `ItemSystem` rest logic (restore 25 HP capped at 100), display updated HP
    - Implement room navigation via arrow/WASD keys and mouse click; apply fade transition (100–500ms)
    - Keyboard: arrow/WASD navigate exits, Enter/Space select items
    - _Requirements: 2.2, 4.6, 6.5, 9.1_

  - [ ]* 13.2 Write property test for rest room HP restoration clamp
    - **Property 13: Rest room HP restoration clamp**
    - **Validates: Requirements 4.6**
    - Use `fc.integer({ min: 0, max: 100 })` for current HP; assert `Math.min(currentHP + 25, 100)`

  - [ ] 13.3 Implement `GameScene` — puzzle presentation and timer
    - When entering combat room, call `PuzzleEngine.draw()` within 2 seconds and render puzzle text, HP, timer, and answer input
    - Timer: count down every 1 second; change display to red when ≤10s and play ≤1s alert sound (once)
    - Auto-focus answer input within 100ms of puzzle presentation
    - On timer expiry: deduct 15 HP from hero, mark puzzle failed, room becomes non-combat (bug remains, blocks exit)
    - _Requirements: 3.1, 3.3, 3.6, 6.2, 6.3, 9.2_

  - [ ]* 13.4 Write property test for timer color threshold
    - **Property 17: Timer color threshold**
    - **Validates: Requirements 6.3**
    - Use `fc.integer({ min: 0, max: 90 })` for T; assert timer color is red if and only if `T <= 10`

  - [ ] 13.5 Implement `GameScene` — answer submission and combat resolution
    - On correct answer: compute damage via `PuzzleEngine.computeDamage()`, reduce bug HP, apply `Bug_Weakener` first if active, then apply `Score_Multiplier` to score
    - When bug HP reaches 0: remove bug, mark room cleared, award `100 * bugDifficulty` score bonus, present item selection (2 items)
    - On incorrect answer: deduct 10 HP from hero, display next hint; if no hints remain show "no further hints" message without revealing answer
    - Implement `Hint_Revealer` item trigger on first incorrect answer
    - Implement `Second_Chance` item trigger when HP would reach 0
    - _Requirements: 3.4, 3.5, 3.7, 3.9, 3.10, 4.2, 4.7_

  - [ ] 13.6 Implement `GameScene` — item selection and discard prompt
    - After room cleared, show 2-item selection UI with descriptions
    - If hero has <3 active items: apply selected item immediately, remove from pool
    - If hero has 3 active items: show discard prompt with all 4 items; start 60-second `Phaser.TimerEvent`
    - On 60-second timeout without response: cancel selection, preserve existing 3 items
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [ ] 13.7 Implement `GameScene` — hero death and level progression
    - When hero HP reaches 0: call `onHeroDeath()` — stop timer, transition to `GameOverScene` within 1 second
    - Track `scoreMultiplierRoomsRemaining`; decrement on each room scored
    - When final level cleared: transition to `VictoryScene` within 1 second
    - Emit `EVENTS.HERO_HP_CHANGED` on every HP change; show low-health indicator when HP < 25
    - _Requirements: 3.9, 6.4, 8.1, 8.2_

  - [ ]* 13.8 Write property test for low-health indicator threshold
    - **Property 18: Low-health indicator threshold**
    - **Validates: Requirements 6.4**
    - Use `fc.integer({ min: 0, max: 100 })` for HP; assert indicator visible if and only if `HP < 25`

  - [ ] 13.9 Implement pause menu via Escape key
    - On `Escape` key: display pause menu within 200ms with "Resume", "View Controls", "Return to Main Menu"
    - _Requirements: 9.4_

- [ ] 14. Phaser scenes — GameOverScene, VictoryScene, and LeaderboardScene
  - [ ] 14.1 Implement `GameOverScene`
    - Create `src/scenes/GameOverScene.ts` with `init(data: GameOverData)` receiving final score, level, bugs defeated
    - Display: final score (numeric), level reached, total bugs defeated, and exactly two buttons: "New Run" and "View Leaderboard"
    - "New Run": reset `RunState` (HP=100, items=[], score=0, level=1), preserve username, call `LevelGenerator.generate()`
    - "View Leaderboard": navigate to `LeaderboardScene`
    - _Requirements: 8.1, 8.3, 8.5, 8.6_

  - [ ]* 14.2 Write property test for end-screen content completeness
    - **Property 19: End-screen content completeness**
    - **Validates: Requirements 8.3, 8.4**
    - Use `fc.record({ score: fc.nat(), level: fc.nat(), bugs: fc.nat() })` for game-over/victory state; assert all 4 fields rendered and exactly 2 buttons present

  - [ ] 14.3 Implement `VictoryScene`
    - Create `src/scenes/VictoryScene.ts` with `init(data: VictoryData)` receiving final score and bugs defeated
    - Display: final score, total bugs defeated, congratulatory message, and exactly two buttons: "New Run" and "View Leaderboard"
    - "New Run": same reset logic as `GameOverScene`
    - _Requirements: 8.2, 8.4, 8.5, 8.6_

  - [ ]* 14.4 Write property test for new run state reset
    - **Property 20: New Run resets run state**
    - **Validates: Requirements 8.5, 8.6**
    - For any game state, assert after "New Run": `heroHP === 100`, `activeItems.length === 0`, `score === 0`, `currentLevel === 1`, `username` unchanged, `LevelGenerator.generate()` called

  - [ ] 14.5 Implement `LeaderboardScene`
    - Create `src/scenes/LeaderboardScene.ts` with `loadLeaderboard()` and `renderEntries()`
    - Load leaderboard data within 3 seconds; show entries sorted highest to lowest
    - Truncate username to 20 chars; display score as numeric; format date as YYYY-MM-DD
    - If <10 records: show only available records (no empty placeholder rows)
    - On fetch failure: show "Could not load leaderboard" with Retry button
    - _Requirements: 5.5, 5.6, 5.7_

  - [ ]* 14.6 Write property test for leaderboard entry rendering
    - **Property 15: Leaderboard entry rendering**
    - **Validates: Requirements 5.7**
    - Use `fc.record({ username: fc.string(), score: fc.nat(), timestamp: fc.date() })`; assert username truncated to ≤20 chars, score numeric, date formatted as YYYY-MM-DD

- [ ] 15. Accessibility and UI polish
  - [ ] 15.1 Implement keyboard navigation and focus indicators
    - Add visible 2px focus outline on all interactive elements (buttons, inputs, item selections, room exits) via Phaser DOM element CSS
    - Ensure arrow/WASD keys navigate room exits; Enter/Space confirm item selection
    - Auto-focus puzzle input within 100ms via `Phaser.Time.delayedCall`
    - _Requirements: 9.1, 9.2, 9.6_

  - [ ] 15.2 Implement font sizing and contrast compliance
    - Set all puzzle instructions and answer options to minimum 14px font size
    - Verify contrast ratio ≥4.5:1 for normal text and ≥3:1 for large text (≥18px) in Phaser text styles
    - _Requirements: 9.3_

  - [ ] 16. Run end summary screen
    - Update `GameOverScene` and `VictoryScene` to show the full run summary: final score, highest level reached, total puzzles solved, and a "New Run" button
    - _Requirements: 6.6_

- [ ] 17. Checkpoint — Full client complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. AWS backend — DynamoDB table and Lambda functions
  - [ ] 18.1 Create DynamoDB table infrastructure definition
    - Create `lambda/infrastructure.md` or `lambda/cdk/` (or JSON CloudFormation / Amplify backend config) defining `cloud-quest-scores` table
    - Table: PK=`username` (String), SK=`runId` (String)
    - GSI `ScoreIndex`: PK=`gameId` (String), SK=`score` (Number), projection=ALL
    - Write capacity: on-demand; enable atomic conditional writes
    - _Requirements: 7.3, 7.4, 7.5_

  - [ ] 18.2 Implement Lambda function — score submission (`POST /scores`)
    - Create `lambda/submitScore.ts` (Node.js/TypeScript)
    - Receive `ScorePayload`; validate fields; call `DynamoDB.putItem` with `runId = uuid()`
    - Set `gameId = "CLOUD_QUEST"` for GSI partition key
    - Update player's `personalBest` if new score exceeds stored value (conditional write)
    - Return HTTP 200 on success, HTTP 500 with JSON error body on failure
    - _Requirements: 5.3, 5.8, 7.3, 7.4, 7.5_

  - [ ] 18.3 Implement Lambda function — leaderboard retrieval (`GET /scores`)
    - Create `lambda/getLeaderboard.ts` (Node.js/TypeScript)
    - Query `ScoreIndex` GSI with `gameId = "CLOUD_QUEST"`, `ScanIndexForward=false`, `Limit=10`
    - Map DynamoDB items to `LeaderboardEntry[]` format (username, score, runDate as YYYY-MM-DD)
    - Return HTTP 200 with JSON array; return HTTP 500 on DynamoDB error
    - _Requirements: 5.5, 5.6, 5.7, 7.3_

  - [ ] 18.4 Implement Lambda function — player profile (`POST /players`)
    - Create `lambda/getOrCreatePlayer.ts` (Node.js/TypeScript)
    - Upsert player profile in DynamoDB (conditional put: create if not exists, return existing if present)
    - Return `PlayerProfile` with `personalBest` (default 0 for new players)
    - Respond within 3 seconds; HTTP 200 on success, HTTP 500 on error
    - _Requirements: 1.5, 1.6, 1.7, 1.8_

  - [ ]* 18.5 Write unit tests for Lambda functions
    - Mock AWS SDK (`@aws-sdk/client-dynamodb`) with `vi.mock`
    - Test `submitScore`: success path, DynamoDB failure returns HTTP 500, atomic failure guarantee
    - Test `getLeaderboard`: returns entries sorted by score desc, handles <10 records, DynamoDB error returns HTTP 500
    - Test `getOrCreatePlayer`: creates new profile with personalBest=0, returns existing profile
    - _Requirements: 1.5, 1.6, 5.3, 5.5, 7.3, 7.4, 7.5_

- [ ] 19. AWS Amplify hosting and CI/CD configuration
  - [ ] 19.1 Configure Amplify hosting and API Gateway
    - Create `amplify.yml` (Amplify build spec) with build command `vite build` and base directory `dist/`
    - Configure API Gateway REST API with routes: `POST /scores`, `GET /scores`, `POST /players`, each connected to corresponding Lambda
    - Set `VITE_API_BASE_URL` as Amplify environment variable pointing to API Gateway URL
    - Configure HTTPS enforcement: 301 redirect for HTTP → HTTPS in Amplify console / `customHttp.yml`
    - _Requirements: 7.1, 7.2, 7.3, 7.6_

  - [ ]* 19.2 Verify Amplify build and deployment
    - Commit and push to trigger Amplify CI/CD pipeline
    - Confirm public HTTPS URL serves HTTP 200 with all assets (HTML, JS, CSS, sprites)
    - Verify HTTP → HTTPS 301 redirect is enforced
    - _Requirements: 7.1, 7.2, 7.6_

- [ ] 20. Integration tests — full run simulation and API flows
  - [ ] 20.1 Write integration tests for full run simulation
    - Test complete flow: `LoginScene` login → `GameScene` combat → `GameOverScene` / `VictoryScene` → `LeaderboardScene`
    - Mock `ApiClient` with `vi.mock`; assert `submitScore()` called on run end, `getLeaderboard()` called on leaderboard open
    - Verify `RunState` is reset correctly after "New Run" from both `GameOverScene` and `VictoryScene`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 20.2 Write integration tests for DynamoDB write failure and retry
    - Mock `ApiClient.submitScore()` to reject on first call, succeed on retry
    - Assert `ScoreSystem.scheduleRetry()` is called with 30-second delay
    - Assert "Score not saved" notification emitted when retry also fails
    - _Requirements: 5.4_

  - [ ]* 20.3 Write integration tests for leaderboard edge cases
    - Test leaderboard display with 0, 1, and 9 records (all <10); assert no empty placeholder rows
    - Test leaderboard fetch failure shows "Could not load leaderboard" + Retry button
    - _Requirements: 5.5, 5.6_

- [ ] 21. Final checkpoint — All tests pass and game is complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints at tasks 10, 17, and 21 ensure incremental validation
- The design uses TypeScript throughout — all code examples must be in TypeScript
- Property tests validate all 20 correctness properties from the design document
- Unit tests validate specific scenarios, edge cases, and integration points
- Lambda functions use Node.js TypeScript; compile with `tsc` before Amplify deployment
- Use `VITE_API_BASE_URL` environment variable for all API calls; never hardcode URLs
- The `ScoreIndex` GSI uses a constant `gameId = "CLOUD_QUEST"` partition key to enable efficient leaderboard queries
- `Second_Chance` item state must be tracked in `RunState` as a boolean flag; remove from `activeItems` after triggering

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "3.1", "4.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "4.2", "4.3"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3", "6.4", "6.5", "6.6", "7.1"] },
    { "id": 8, "tasks": ["7.2", "7.3", "7.4", "7.5", "8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3", "8.4", "8.5", "9.1"] },
    { "id": 10, "tasks": ["9.2", "11.1"] },
    { "id": 11, "tasks": ["11.2", "11.3"] },
    { "id": 12, "tasks": ["12.1"] },
    { "id": 13, "tasks": ["13.1"] },
    { "id": 14, "tasks": ["13.2", "13.3"] },
    { "id": 15, "tasks": ["13.4", "13.5"] },
    { "id": 16, "tasks": ["13.6", "13.7"] },
    { "id": 17, "tasks": ["13.8", "13.9", "14.1"] },
    { "id": 18, "tasks": ["14.2", "14.3"] },
    { "id": 19, "tasks": ["14.4", "14.5"] },
    { "id": 20, "tasks": ["14.6", "15.1"] },
    { "id": 21, "tasks": ["15.2", "16"] },
    { "id": 22, "tasks": ["18.1"] },
    { "id": 23, "tasks": ["18.2", "18.3", "18.4"] },
    { "id": 24, "tasks": ["18.5", "19.1"] },
    { "id": 25, "tasks": ["19.2", "20.1"] },
    { "id": 26, "tasks": ["20.2", "20.3"] }
  ]
}
```
