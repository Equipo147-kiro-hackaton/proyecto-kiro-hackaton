import Phaser from 'phaser';
import { LevelGenerator } from '@/systems/LevelGenerator';
import { PuzzleEngine } from '@/systems/PuzzleEngine';
import { ScoreSystem } from '@/systems/ScoreSystem';
import { ItemSystem } from '@/systems/ItemSystem';
import { EventBus, EVENTS } from '@/lib/EventBus';
import type { RunState, Room, PlayerProfile, PuzzleCategory, Item, GameOverData, VictoryData } from '@/types';

/**
 * GameScene — Main gameplay scene handling room navigation, HUD, and run state.
 * Scene key: 'GameScene'
 */
export class GameScene extends Phaser.Scene {
  private runState!: RunState;

  // Systems
  private puzzleEngine!: PuzzleEngine;
  private scoreSystem!: ScoreSystem;
  private itemSystem!: ItemSystem;

  // Combat state
  private bugHP = 0;
  private hintsShownCount = 0;
  private hintsText: Phaser.GameObjects.Text | null = null;

  // HUD elements
  private hpText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;

  // Room display elements
  private roomContainer!: Phaser.GameObjects.Container;
  private exitButtons: Phaser.GameObjects.Text[] = [];
  private selectedExitIndex = 0;

  // Puzzle UI elements
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private timerText!: Phaser.GameObjects.Text;
  private answerInput: HTMLInputElement | null = null;
  private answerDOM: Phaser.GameObjects.DOMElement | null = null;
  private puzzleContainer!: Phaser.GameObjects.Container;

  // Input keys
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private enterKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  private navigating = false;

  // Pause menu state
  private paused = false;
  private pauseOverlay: Phaser.GameObjects.Rectangle | null = null;
  private pauseContainer: Phaser.GameObjects.Container | null = null;
  private controlsPanel: Phaser.GameObjects.Container | null = null;

  // Item selection state
  private discardTimerEvent: Phaser.Time.TimerEvent | null = null;
  private itemSelectionContainer: Phaser.GameObjects.Container | null = null;

  // Low-health indicator
  private lowHealthOverlay: Phaser.GameObjects.Rectangle | null = null;
  private lowHealthTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.puzzleEngine = new PuzzleEngine();
    this.scoreSystem = new ScoreSystem();
    this.itemSystem = new ItemSystem();
    this.initRunState();
    this.createHUD();
    this.setupInput();
    this.enterRoom(this.runState.currentRoom!);
  }

  // ─── Run State Initialization ──────────────────────────────────────────────

  private initRunState(): void {
    const profile = this.game.registry.get('playerProfile') as PlayerProfile;
    const generator = new LevelGenerator();
    const levelSequence = generator.generate();

    const runState: RunState = {
      sessionId: crypto.randomUUID(),
      username: profile.username,
      currentScore: 0,
      currentLevel: 1,
      highestLevelReached: 1,
      heroHP: 100,
      activeItems: [],
      levelSequence,
      currentRoom: levelSequence.levels[0].rooms.find(r => r.isEntrance) ?? null,
      currentPuzzle: null,
      timerSeconds: 60,
      hintsShown: 0,
      totalPuzzlesSolved: 0,
      totalBugsDefeated: 0,
      scoreMultiplierRoomsRemaining: 0,
    };

    this.runState = runState;
    this.game.registry.set('runState', runState);
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  private createHUD(): void {
    // HP — top-left
    this.hpText = this.add.text(16, 16, '', {
      fontSize: '18px',
      fontFamily: 'monospace',
    }).setDepth(100);

    // Score — top-right
    this.scoreText = this.add.text(944, 16, '', {
      fontSize: '18px',
      fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(100);

    // Level/Room — top-center
    this.levelText = this.add.text(480, 16, '', {
      fontSize: '18px',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(100);

    this.updateHUD();
  }

  private updateHUD(): void {
    const { heroHP, currentScore, currentLevel, levelSequence, currentRoom } = this.runState;
    const totalRooms = levelSequence.levels[currentLevel - 1]?.rooms.length ?? 0;
    const roomIndex = currentRoom
      ? levelSequence.levels[currentLevel - 1]?.rooms.findIndex(r => r.id === currentRoom.id) + 1
      : 0;

    // HP color: green when > 25, red when <= 25
    const hpColor = heroHP > 25 ? '#00ff00' : '#ff4444';
    this.hpText.setText(`HP: ${heroHP}/100`).setColor(hpColor);

    this.scoreText.setText(`Score: ${currentScore}`);
    this.levelText.setText(`Level ${currentLevel} — Room ${roomIndex}/${totalRooms}`);

    // Low-health pulsing overlay
    this.updateLowHealthIndicator(heroHP);
  }

  // ─── Input Setup ──────────────────────────────────────────────────────────

  private setupInput(): void {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Navigation: up/down or W/S to change selected exit
    this.input.keyboard.on('keydown-UP', () => this.moveExitSelection(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.moveExitSelection(1));
    this.input.keyboard.on('keydown-W', () => this.moveExitSelection(-1));
    this.input.keyboard.on('keydown-S', () => this.moveExitSelection(1));

    // Confirm: Enter or Space
    this.input.keyboard.on('keydown-ENTER', () => this.confirmExitSelection());
    this.input.keyboard.on('keydown-SPACE', () => this.confirmExitSelection());

    // Pause menu: Escape key
    this.input.keyboard.on('keydown-ESC', () => this.togglePauseMenu());
  }

  // ─── Room Navigation ──────────────────────────────────────────────────────

  /**
   * Enter a room: display room content based on type.
   */
  enterRoom(room: Room): void {
    this.runState.currentRoom = room;
    this.game.registry.set('runState', this.runState);
    this.updateHUD();

    // Clear previous room display
    if (this.roomContainer) {
      this.roomContainer.destroy(true);
    }
    this.roomContainer = this.add.container(0, 0);
    this.exitButtons = [];
    this.selectedExitIndex = 0;

    switch (room.type) {
      case 'combat':
        this.showCombatRoom(room);
        break;
      case 'rest':
        this.showRestRoom(room);
        break;
      case 'item':
        this.showItemRoom(room);
        break;
    }
  }

  // ─── Combat Room — Puzzle Presentation & Timer ─────────────────────────────

  private showCombatRoom(room: Room): void {
    // Determine if this is a boss (exit room)
    const isBoss = room.isExit;

    // Initialize bug HP from level data
    const currentLevel = this.runState.levelSequence.levels[this.runState.currentLevel - 1];
    this.bugHP = currentLevel.bugBaseHP;
    this.hintsShownCount = 0;

    // Pick a random puzzle category from the 4 available
    const categories: PuzzleCategory[] = ['syntax', 'logic', 'devops', 'memory'];
    const category = categories[Math.floor(Math.random() * categories.length)];

    // Draw a puzzle within 2 seconds of entering the combat room
    this.time.delayedCall(500, () => {
      const puzzle = this.puzzleEngine.draw(category);
      if (!puzzle) {
        // Pool exhausted — show message and exits
        const exhaustedMsg = this.add.text(480, 200, 'No puzzles available — bug retreats!', {
          fontSize: '18px',
          fontFamily: 'monospace',
          color: '#ffcc00',
        }).setOrigin(0.5);
        this.roomContainer.add(exhaustedMsg);
        this.showExitOptions(room);
        return;
      }

      // Store the puzzle in run state
      this.runState.currentPuzzle = puzzle;
      this.game.registry.set('runState', this.runState);

      this.presentPuzzleUI(puzzle, isBoss, room);
    });

    // Show "A bug appears!" intro while waiting
    const title = this.add.text(480, 80, isBoss ? 'BOSS BUG!' : 'Combat Room', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: isBoss ? '#ff3333' : '#ff6666',
    }).setOrigin(0.5);

    const subtitle = this.add.text(480, 120, 'A bug appears! Prepare to solve...', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5);

    this.roomContainer.add([title, subtitle]);
  }

  /**
   * Present the puzzle UI: question text, timer, answer input, submit button.
   */
  private presentPuzzleUI(puzzle: import('@/types').Puzzle, isBoss: boolean, room: Room): void {
    // Create a container for puzzle UI elements
    this.puzzleContainer = this.add.container(0, 0);
    this.roomContainer.add(this.puzzleContainer);

    // Timer duration
    const timerDuration = this.puzzleEngine.getTimerDuration(isBoss);
    this.runState.timerSeconds = timerDuration;

    // Timer display (top area, large font)
    this.timerText = this.add.text(480, 50, `${timerDuration}s`, {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.puzzleContainer.add(this.timerText);

    // Puzzle question text (centered, wrapped at 700px)
    const questionText = this.add.text(480, 200, puzzle.question, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
      wordWrap: { width: 700 },
      align: 'center',
    }).setOrigin(0.5);
    this.puzzleContainer.add(questionText);

    // HP display next to timer
    const hpDisplay = this.add.text(800, 50, `HP: ${this.runState.heroHP}/100`, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: this.runState.heroHP > 25 ? '#00ff00' : '#ff4444',
    }).setOrigin(0.5);
    this.puzzleContainer.add(hpDisplay);

    // Answer input (DOM element)
    this.answerInput = document.createElement('input');
    this.answerInput.type = 'text';
    this.answerInput.placeholder = 'Type your answer...';
    this.answerInput.style.cssText = [
      'padding: 10px 14px',
      'font-size: 16px',
      'font-family: monospace',
      'width: 400px',
      'border: 2px solid #555555',
      'border-radius: 4px',
      'background-color: #1a1a2e',
      'color: #ffffff',
      'outline: none',
      'transition: border-color 0.2s',
    ].join('; ');

    this.answerInput.addEventListener('focus', () => {
      if (this.answerInput) {
        this.answerInput.style.borderColor = '#4488ff';
      }
    });

    this.answerInput.addEventListener('blur', () => {
      if (this.answerInput) {
        this.answerInput.style.borderColor = '#555555';
      }
    });

    // Submit on Enter key
    this.answerInput.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' && this.answerInput) {
        const answer = this.answerInput.value.trim();
        if (answer.length > 0) {
          this.onPuzzleSubmit(answer, room);
        }
      }
    });

    this.answerDOM = this.add.dom(480, 320, this.answerInput);
    this.puzzleContainer.add(this.answerDOM);

    // Submit button
    const submitBtn = this.add.text(480, 375, '[ SUBMIT ]', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    submitBtn.on('pointerover', () => submitBtn.setColor('#88ff88'));
    submitBtn.on('pointerout', () => submitBtn.setColor('#44ff44'));
    submitBtn.on('pointerdown', () => {
      if (this.answerInput) {
        const answer = this.answerInput.value.trim();
        if (answer.length > 0) {
          this.onPuzzleSubmit(answer, room);
        }
      }
    });
    this.puzzleContainer.add(submitBtn);

    // Hints area placeholder (populated on wrong answers in task 13.5)
    const hintsArea = this.add.text(480, 420, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
      wordWrap: { width: 600 },
      align: 'center',
    }).setOrigin(0.5);
    this.puzzleContainer.add(hintsArea);

    // Auto-focus answer input within 100ms
    this.time.delayedCall(100, () => {
      if (this.answerInput) {
        this.answerInput.focus();
      }
    });

    // Start timer countdown
    this.startPuzzleTimer(timerDuration, room);
  }

  /**
   * Start the countdown timer for the active puzzle.
   */
  private startPuzzleTimer(duration: number, room: Room): void {
    let remaining = duration;
    let alertPlayed = false;

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: duration - 1,
      callback: () => {
        remaining--;
        this.runState.timerSeconds = remaining;

        // Update timer display
        if (this.timerText) {
          this.timerText.setText(`${remaining}s`);

          // Change color to red when ≤ 10 seconds
          if (remaining <= 10) {
            this.timerText.setColor('#ff4444');

            // Play alert sound once when timer first reaches ≤ 10s
            // TODO: Play timer alert sound here (asset not yet available)
            if (!alertPlayed) {
              alertPlayed = true;
              // Placeholder: this.sound.play('timer-alert');
            }
          }
        }

        // Timer expired
        if (remaining <= 0) {
          this.onTimerExpire(room);
        }
      },
    });
  }

  /**
   * Handle timer expiry: deduct HP, mark puzzle failed, show message.
   */
  private onTimerExpire(room: Room): void {
    // Stop the timer event
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }

    // Deduct 15 HP
    this.runState.heroHP = Math.max(0, this.runState.heroHP - 15);
    this.runState.currentPuzzle = null;
    this.game.registry.set('runState', this.runState);

    EventBus.emit(EVENTS.HERO_HP_CHANGED, this.runState.heroHP);
    EventBus.emit(EVENTS.TIMER_EXPIRED);
    this.updateHUD();

    // Clear puzzle UI
    this.clearPuzzleUI();

    // Show expiry message
    const expiryMsg = this.add.text(480, 250, "Time's up! -15 HP", {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.roomContainer.add(expiryMsg);

    // Animate the message
    this.tweens.add({
      targets: expiryMsg,
      alpha: { from: 1, to: 0.6 },
      yoyo: true,
      duration: 500,
      repeat: 2,
    });

    // Check if hero died
    if (this.runState.heroHP <= 0) {
      this.runState.heroHP = 0;
      this.game.registry.set('runState', this.runState);
      this.updateHUD();
      this.onHeroDeath();
      return;
    }

    // Show exits after a delay (bug remains, blocks exit — for now show exits normally)
    this.time.delayedCall(2000, () => {
      this.showExitOptions(room);
    });
  }

  /**
   * Handle puzzle answer submission — full combat resolution logic.
   * Requirements: 3.4, 3.5, 3.7, 3.9, 3.10, 4.2, 4.7
   */
  private onPuzzleSubmit(answer: string, room: Room): void {
    const puzzle = this.runState.currentPuzzle;
    if (!puzzle) return;

    const isCorrect = this.puzzleEngine.evaluate(puzzle, answer);

    EventBus.emit(EVENTS.PUZZLE_SUBMITTED, {
      puzzle,
      answer,
      remainingSeconds: this.runState.timerSeconds,
    });

    if (isCorrect) {
      this.handleCorrectAnswer(room);
    } else {
      this.handleIncorrectAnswer(room);
    }
  }

  /**
   * Handle a correct puzzle answer: compute damage, reduce bug HP, check defeat.
   */
  private handleCorrectAnswer(room: Room): void {
    // Stop the timer
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }

    const remainingSeconds = this.runState.timerSeconds;

    // Compute damage
    const damage = this.puzzleEngine.computeDamage(remainingSeconds);

    // Apply Bug_Weakener if active (reduce bugHP by 30% FIRST)
    const weakenerIndex = this.runState.activeItems.findIndex(item => item.type === 'Bug_Weakener');
    if (weakenerIndex !== -1) {
      const reduction = Math.floor(this.bugHP * 0.30);
      this.bugHP -= reduction;
      this.runState.activeItems.splice(weakenerIndex, 1);
    }

    // Reduce bugHP by damage
    this.bugHP -= damage;

    if (this.bugHP <= 0) {
      // Bug defeated
      this.onBugDefeated(room, remainingSeconds);
    } else {
      // Bug still alive — multi-hit case
      this.onBugHit(room);
    }
  }

  /**
   * Handle bug defeated: award score, emit events, show message.
   */
  private onBugDefeated(room: Room, remainingSeconds: number): void {
    const currentLevel = this.runState.levelSequence.levels[this.runState.currentLevel - 1];
    const bugDifficulty = currentLevel.levelNumber; // use level number as difficulty

    // Mark room as cleared (remove bugId)
    room.bugId = undefined;

    // Check if Score_Multiplier is active
    const hasScoreMultiplier = this.runState.scoreMultiplierRoomsRemaining > 0;

    // Calculate score increment
    const scoreIncrement = this.scoreSystem.calculateIncrement({
      levelNumber: this.runState.currentLevel,
      remainingSeconds,
      bugDifficulty,
      hasScoreMultiplier,
    });

    // Bug defeat bonus
    const bugBonus = this.scoreSystem.calculateBugDefeatBonus(bugDifficulty);

    // If Score_Multiplier active, decrement rooms remaining
    if (hasScoreMultiplier) {
      this.runState.scoreMultiplierRoomsRemaining--;
    }

    // Update run state
    const totalEarned = scoreIncrement + bugBonus;
    this.runState.currentScore += totalEarned;
    this.runState.totalPuzzlesSolved++;
    this.runState.totalBugsDefeated++;
    this.runState.currentPuzzle = null;
    this.game.registry.set('runState', this.runState);

    EventBus.emit(EVENTS.BUG_DEFEATED);
    this.updateHUD();

    // Clear puzzle UI
    this.clearPuzzleUI();

    // Show "Bug Defeated!" message with score earned
    const defeatMsg = this.add.text(480, 200, 'Bug Defeated!', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const scoreMsg = this.add.text(480, 250, `+${totalEarned} Score`, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5);

    this.roomContainer.add([defeatMsg, scoreMsg]);

    // Animate
    this.tweens.add({
      targets: defeatMsg,
      scaleX: { from: 0.5, to: 1 },
      scaleY: { from: 0.5, to: 1 },
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Show item selection after short delay
    this.time.delayedCall(1500, () => {
      this.showItemSelection(room);
    });
  }

  /**
   * Handle bug still alive after a correct answer (multi-hit case).
   * Re-present puzzle input for another answer.
   */
  private onBugHit(room: Room): void {
    // Clear puzzle UI
    this.clearPuzzleUI();

    // Show "Hit!" message
    const hitMsg = this.add.text(480, 160, `Hit! Bug HP: ${this.bugHP} remaining`, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.roomContainer.add(hitMsg);

    // Draw a new puzzle from the same pool (random category)
    const categories: PuzzleCategory[] = ['syntax', 'logic', 'devops', 'memory'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const nextPuzzle = this.puzzleEngine.draw(category);

    if (!nextPuzzle) {
      // Pool exhausted — bug retreats
      const exhaustedMsg = this.add.text(480, 220, 'No puzzles left — bug retreats!', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffcc00',
      }).setOrigin(0.5);
      this.roomContainer.add(exhaustedMsg);
      this.time.delayedCall(1500, () => this.showExitOptions(room));
      return;
    }

    // Store new puzzle and reset hints for new puzzle
    this.runState.currentPuzzle = nextPuzzle;
    this.hintsShownCount = 0;
    this.game.registry.set('runState', this.runState);

    // Present next puzzle after short delay (timer continues from current remaining)
    this.time.delayedCall(1000, () => {
      if (hitMsg && hitMsg.active) hitMsg.destroy();
      this.presentPuzzleUI(nextPuzzle, room.isExit, room);
    });
  }

  /**
   * Handle an incorrect puzzle answer: deduct HP, check items, show hints.
   */
  private handleIncorrectAnswer(room: Room): void {
    // Deduct 10 HP from hero
    this.runState.heroHP -= 10;

    // Check Second_Chance: if heroHP would reach 0
    if (this.runState.heroHP <= 0) {
      const secondChanceIndex = this.runState.activeItems.findIndex(item => item.type === 'Second_Chance');
      if (secondChanceIndex !== -1) {
        // Activate Second Chance
        this.runState.heroHP = 1;
        this.runState.activeItems.splice(secondChanceIndex, 1);
        this.game.registry.set('runState', this.runState);
        EventBus.emit(EVENTS.HERO_HP_CHANGED, this.runState.heroHP);
        this.updateHUD();

        this.showFeedbackMessage('Second Chance activated! HP set to 1', '#ff88ff');
      } else {
        // Hero dies — transition to GameOverScene
        this.runState.heroHP = 0;
        this.game.registry.set('runState', this.runState);
        EventBus.emit(EVENTS.HERO_HP_CHANGED, this.runState.heroHP);
        this.updateHUD();
        this.onHeroDeath();
        return;
      }
    } else {
      this.game.registry.set('runState', this.runState);
      EventBus.emit(EVENTS.HERO_HP_CHANGED, this.runState.heroHP);
      this.updateHUD();
    }

    // Show "-10 HP" feedback
    this.showFeedbackMessage('-10 HP', '#ff4444');

    // Check Hint_Revealer item: auto-show next hint
    const hintRevealerIndex = this.runState.activeItems.findIndex(item => item.type === 'Hint_Revealer');
    if (hintRevealerIndex !== -1) {
      this.runState.activeItems.splice(hintRevealerIndex, 1);
      this.game.registry.set('runState', this.runState);
      this.showNextHint();
    } else {
      // Show next hint if available
      this.showNextHint();
    }

    // Clear the answer input for retry
    if (this.answerInput) {
      this.answerInput.value = '';
      this.answerInput.focus();
    }
  }

  /**
   * Show the next available hint or "no further hints" message.
   */
  private showNextHint(): void {
    const puzzle = this.runState.currentPuzzle;
    if (!puzzle) return;

    if (this.hintsShownCount < puzzle.hints.length) {
      const hint = this.puzzleEngine.getHint(puzzle, this.hintsShownCount);
      this.hintsShownCount++;

      if (hint) {
        this.displayHint(`Hint ${this.hintsShownCount}: ${hint}`);
      }
    } else {
      this.displayHint('No further hints available');
    }
  }

  /**
   * Display hint text in the puzzle area.
   */
  private displayHint(text: string): void {
    if (this.hintsText) {
      this.hintsText.setText(text);
    } else {
      this.hintsText = this.add.text(480, 430, text, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffcc88',
        wordWrap: { width: 600 },
        align: 'center',
      }).setOrigin(0.5);

      if (this.puzzleContainer) {
        this.puzzleContainer.add(this.hintsText);
      }
    }
  }

  /**
   * Show a temporary feedback message on screen.
   */
  private showFeedbackMessage(text: string, color: string): void {
    const feedback = this.add.text(480, 140, text, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.roomContainer.add(feedback);

    this.tweens.add({
      targets: feedback,
      alpha: 0,
      y: 120,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => feedback.destroy(),
    });
  }

  /**
   * Clear all puzzle UI elements (timer, input, container).
   */
  private clearPuzzleUI(): void {
    // Remove DOM input
    if (this.answerDOM) {
      this.answerDOM.destroy();
      this.answerDOM = null;
    }
    this.answerInput = null;

    // Clear hints text reference (will be destroyed with container)
    this.hintsText = null;

    // Destroy puzzle container
    if (this.puzzleContainer) {
      this.puzzleContainer.destroy(true);
    }
  }

  // ─── Rest Room ────────────────────────────────────────────────────────────

  private showRestRoom(room: Room): void {
    const title = this.add.text(480, 120, 'Rest Room', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#66ff66',
    }).setOrigin(0.5);

    const message = this.add.text(480, 180, 'You feel refreshed!', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#88ffaa',
    }).setOrigin(0.5);

    this.roomContainer.add([title, message]);

    // Apply HP restoration: +25 capped at 100
    this.runState.heroHP = Math.min(this.runState.heroHP + 25, 100);
    this.game.registry.set('runState', this.runState);
    EventBus.emit(EVENTS.HERO_HP_CHANGED, this.runState.heroHP);
    this.updateHUD();

    const healText = this.add.text(480, 230, '+25 HP', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#00ff00',
    }).setOrigin(0.5).setAlpha(0);

    this.roomContainer.add(healText);

    // Animate heal text
    this.tweens.add({
      targets: healText,
      alpha: 1,
      y: 210,
      duration: 600,
      ease: 'Power2',
    });

    // Show exits after 1.5s
    this.time.delayedCall(1500, () => {
      this.showExitOptions(room);
    });
  }

  // ─── Item Room (placeholder) ──────────────────────────────────────────────

  private showItemRoom(room: Room): void {
    const title = this.add.text(480, 120, 'Item Room', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#66ccff',
    }).setOrigin(0.5);

    const placeholder = this.add.text(480, 180, 'Item room — selection coming soon', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.roomContainer.add([title, placeholder]);

    // Show exits after short delay
    this.time.delayedCall(1000, () => {
      this.showExitOptions(room);
    });
  }

  // ─── Exit Options ─────────────────────────────────────────────────────────

  private showExitOptions(room: Room): void {
    this.exitButtons = [];
    this.selectedExitIndex = 0;

    const currentLevel = this.runState.levelSequence.levels[this.runState.currentLevel - 1];
    const connections = room.connections;

    const startY = 320;
    const spacing = 45;

    const exitLabel = this.add.text(480, startY - 40, 'Exits:', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.roomContainer.add(exitLabel);

    connections.forEach((connId, index) => {
      const targetRoom = currentLevel.rooms.find(r => r.id === connId);
      if (!targetRoom) return;

      const roomNum = currentLevel.rooms.indexOf(targetRoom) + 1;
      const label = `Exit → Room ${roomNum} (${targetRoom.type})`;

      const btn = this.add.text(480, startY + index * spacing, label, {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#cccccc',
        backgroundColor: '#333333',
        padding: { x: 12, y: 6 },
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => {
        this.selectedExitIndex = index;
        this.highlightSelectedExit();
      });

      btn.on('pointerdown', () => {
        this.selectedExitIndex = index;
        this.navigateToExit();
      });

      this.exitButtons.push(btn);
      this.roomContainer.add(btn);
    });

    this.highlightSelectedExit();
  }

  private moveExitSelection(direction: number): void {
    if (this.exitButtons.length === 0 || this.navigating) return;

    this.selectedExitIndex = (this.selectedExitIndex + direction + this.exitButtons.length) % this.exitButtons.length;
    this.highlightSelectedExit();
  }

  private confirmExitSelection(): void {
    if (this.exitButtons.length === 0 || this.navigating) return;
    this.navigateToExit();
  }

  private highlightSelectedExit(): void {
    this.exitButtons.forEach((btn, i) => {
      if (i === this.selectedExitIndex) {
        btn.setColor('#ffffff');
        btn.setBackgroundColor('#555555');
      } else {
        btn.setColor('#cccccc');
        btn.setBackgroundColor('#333333');
      }
    });
  }

  private navigateToExit(): void {
    if (this.navigating) return;
    this.navigating = true;

    const currentLevel = this.runState.levelSequence.levels[this.runState.currentLevel - 1];
    const currentRoom = this.runState.currentRoom;
    if (!currentRoom) return;

    const targetRoomId = currentRoom.connections[this.selectedExitIndex];
    const targetRoom = currentLevel.rooms.find(r => r.id === targetRoomId);
    if (!targetRoom) {
      this.navigating = false;
      return;
    }

    // Check if we are navigating TO the exit room and it's cleared (no bugId)
    if (targetRoom.isExit && !targetRoom.bugId) {
      this.handleLevelProgression();
      return;
    }

    // Fade transition (300ms)
    this.cameras.main.fade(300, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.enterRoom(targetRoom);
      this.cameras.main.fadeIn(300, 0, 0, 0);
      this.navigating = false;
    });
  }

  // ─── Item Selection (Task 13.6) ───────────────────────────────────────────

  /**
   * Show a 2-item selection UI after a bug is defeated.
   * Requirements: 4.1, 4.3, 4.4, 4.5
   */
  private showItemSelection(room: Room): void {
    const selection = this.itemSystem.drawSelection();

    if (!selection || selection.length === 0) {
      // No items left in pool — skip to exits
      this.showExitOptions(room);
      return;
    }

    // Create item selection container
    this.itemSelectionContainer = this.add.container(0, 0);
    this.roomContainer.add(this.itemSelectionContainer);

    const title = this.add.text(480, 290, 'Choose an Item:', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#66ccff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.itemSelectionContainer.add(title);

    const startY = 340;
    const spacing = 60;

    selection.forEach((item, index) => {
      const btnBg = this.add.rectangle(480, startY + index * spacing, 500, 48, 0x2a2a4a)
        .setInteractive({ useHandCursor: true });
      const btnText = this.add.text(480, startY + index * spacing - 8, item.type.replace(/_/g, ' '), {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const descText = this.add.text(480, startY + index * spacing + 12, item.description, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#aaaaaa',
      }).setOrigin(0.5);

      btnBg.on('pointerover', () => btnBg.setFillStyle(0x3a3a6a));
      btnBg.on('pointerout', () => btnBg.setFillStyle(0x2a2a4a));
      btnBg.on('pointerdown', () => this.onItemSelected(item, room));

      this.itemSelectionContainer!.add([btnBg, btnText, descText]);
    });
  }

  /**
   * Handle an item being selected from the 2-item pick UI.
   */
  private onItemSelected(item: Item, room: Room): void {
    if (this.runState.activeItems.length < 3) {
      // Directly apply the item
      this.itemSystem.applyItem(item, this.runState);
      this.game.registry.set('runState', this.runState);
      EventBus.emit(EVENTS.HERO_HP_CHANGED, this.runState.heroHP);
      this.updateHUD();

      // Clear item selection UI
      if (this.itemSelectionContainer) {
        this.itemSelectionContainer.destroy(true);
        this.itemSelectionContainer = null;
      }

      this.showFeedbackMessage(`Acquired: ${item.type.replace(/_/g, ' ')}`, '#66ccff');

      // Show exits after short delay
      this.time.delayedCall(1000, () => {
        this.showExitOptions(room);
      });
    } else {
      // Hero already has 3 active items — show discard prompt
      this.showDiscardPrompt(item, room);
    }
  }

  /**
   * Show discard prompt: display all 4 items (3 existing + 1 new).
   * Player can choose which item to discard (or let 60s timer expire to cancel).
   * Requirements: 4.4, 4.5
   */
  private showDiscardPrompt(newItem: Item, room: Room): void {
    // Clear previous selection UI
    if (this.itemSelectionContainer) {
      this.itemSelectionContainer.destroy(true);
      this.itemSelectionContainer = null;
    }

    this.itemSelectionContainer = this.add.container(0, 0);
    this.roomContainer.add(this.itemSelectionContainer);

    const title = this.add.text(480, 270, 'Inventory Full! Choose an item to DISCARD:', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ff8844',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.itemSelectionContainer.add(title);

    // Timer display for discard
    const discardTimerText = this.add.text(480, 295, '60s', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5);
    this.itemSelectionContainer.add(discardTimerText);

    // Show all 4 items: 3 existing + 1 new (new item labeled)
    const allItems = [...this.runState.activeItems, newItem];
    const startY = 325;
    const spacing = 50;

    allItems.forEach((item, index) => {
      const isNew = index === allItems.length - 1;
      const label = isNew
        ? `[NEW] ${item.type.replace(/_/g, ' ')}`
        : `[${index + 1}] ${item.type.replace(/_/g, ' ')}`;

      const btnBg = this.add.rectangle(480, startY + index * spacing, 500, 42, isNew ? 0x2a4a2a : 0x2a2a4a)
        .setInteractive({ useHandCursor: true });
      const btnText = this.add.text(480, startY + index * spacing - 6, label, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: isNew ? '#88ff88' : '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      const descText = this.add.text(480, startY + index * spacing + 10, item.description, {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#aaaaaa',
      }).setOrigin(0.5);

      btnBg.on('pointerover', () => btnBg.setFillStyle(isNew ? 0x3a6a3a : 0x3a3a6a));
      btnBg.on('pointerout', () => btnBg.setFillStyle(isNew ? 0x2a4a2a : 0x2a2a4a));
      btnBg.on('pointerdown', () => {
        this.onDiscardChoice(index, newItem, room);
      });

      this.itemSelectionContainer!.add([btnBg, btnText, descText]);
    });

    // Start 60-second discard timer
    let discardRemaining = 60;
    this.discardTimerEvent = this.time.addEvent({
      delay: 1000,
      repeat: 59,
      callback: () => {
        discardRemaining--;
        if (discardTimerText && discardTimerText.active) {
          discardTimerText.setText(`${discardRemaining}s`);
          if (discardRemaining <= 10) {
            discardTimerText.setColor('#ff4444');
          }
        }
        if (discardRemaining <= 0) {
          this.onDiscardTimeout(room);
        }
      },
    });
  }

  /**
   * Handle a discard choice. If an existing item is selected (index 0–2),
   * replace it with the new item. If the new item is selected (index 3),
   * discard the new item (keep existing 3).
   */
  private onDiscardChoice(discardIndex: number, newItem: Item, room: Room): void {
    // Stop discard timer
    if (this.discardTimerEvent) {
      this.discardTimerEvent.destroy();
      this.discardTimerEvent = null;
    }

    if (discardIndex < this.runState.activeItems.length) {
      // Discard an existing item and replace with new one
      this.runState.activeItems.splice(discardIndex, 1);
      this.itemSystem.applyItem(newItem, this.runState);
    }
    // If discardIndex === 3 (new item selected), we keep existing items, discard new

    this.game.registry.set('runState', this.runState);
    EventBus.emit(EVENTS.HERO_HP_CHANGED, this.runState.heroHP);
    this.updateHUD();

    // Clear discard UI
    if (this.itemSelectionContainer) {
      this.itemSelectionContainer.destroy(true);
      this.itemSelectionContainer = null;
    }

    this.showFeedbackMessage('Item choice made!', '#66ccff');

    this.time.delayedCall(800, () => {
      this.showExitOptions(room);
    });
  }

  /**
   * Handle 60-second discard timeout: cancel selection, preserve existing 3 items.
   */
  private onDiscardTimeout(room: Room): void {
    if (this.discardTimerEvent) {
      this.discardTimerEvent.destroy();
      this.discardTimerEvent = null;
    }

    // Clear discard UI
    if (this.itemSelectionContainer) {
      this.itemSelectionContainer.destroy(true);
      this.itemSelectionContainer = null;
    }

    this.showFeedbackMessage('Time expired — keeping current items', '#ffcc00');

    this.time.delayedCall(800, () => {
      this.showExitOptions(room);
    });
  }

  // ─── Hero Death & Level Progression (Task 13.7) ───────────────────────────

  /**
   * Handle hero death: stop all timers, emit events, transition to GameOverScene.
   * Requirements: 3.9, 8.1
   */
  private onHeroDeath(): void {
    // Stop puzzle timer
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }

    // Stop discard timer if active
    if (this.discardTimerEvent) {
      this.discardTimerEvent.destroy();
      this.discardTimerEvent = null;
    }

    // Clear puzzle UI
    this.clearPuzzleUI();

    // Emit run ended
    EventBus.emit(EVENTS.RUN_ENDED);

    // Show "Game Over" message
    const deathMsg = this.add.text(480, 250, 'GAME OVER', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.roomContainer.add(deathMsg);

    this.tweens.add({
      targets: deathMsg,
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.5, to: 1 },
      scaleY: { from: 0.5, to: 1 },
      duration: 500,
      ease: 'Power2',
    });

    // Transition to GameOverScene after 1 second
    this.time.delayedCall(1000, () => {
      const data: GameOverData = {
        score: this.runState.currentScore,
        levelReached: this.runState.highestLevelReached,
        bugsDefeated: this.runState.totalBugsDefeated,
        puzzlesSolved: this.runState.totalPuzzlesSolved,
      };
      this.scene.start('GameOverScene', data);
    });
  }

  /**
   * Handle level progression when player reaches a cleared exit room.
   * If there's a next level: advance. If final level: VictoryScene.
   * Requirements: 6.4, 8.2
   */
  private handleLevelProgression(): void {
    const totalLevels = this.runState.levelSequence.levels.length;

    if (this.runState.currentLevel < totalLevels) {
      // Advance to next level
      this.runState.currentLevel++;
      this.runState.highestLevelReached = Math.max(
        this.runState.highestLevelReached,
        this.runState.currentLevel
      );
      this.game.registry.set('runState', this.runState);

      // Show level transition message
      const lvlMsg = this.add.text(480, 270, `Entering Level ${this.runState.currentLevel}...`, {
        fontSize: '24px',
        fontFamily: 'monospace',
        color: '#66ccff',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.roomContainer.add(lvlMsg);

      // Fade to next level's entrance room
      this.time.delayedCall(1000, () => {
        const nextLevel = this.runState.levelSequence.levels[this.runState.currentLevel - 1];
        const entranceRoom = nextLevel.rooms.find(r => r.isEntrance);
        if (entranceRoom) {
          this.cameras.main.fade(300, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.enterRoom(entranceRoom);
            this.cameras.main.fadeIn(300, 0, 0, 0);
            this.navigating = false;
          });
        } else {
          this.navigating = false;
        }
      });
    } else {
      // Final level cleared — Victory!
      this.onVictory();
    }
  }

  /**
   * Handle game victory: transition to VictoryScene.
   * Requirement: 8.2
   */
  private onVictory(): void {
    // Stop all timers
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
    if (this.discardTimerEvent) {
      this.discardTimerEvent.destroy();
      this.discardTimerEvent = null;
    }

    EventBus.emit(EVENTS.RUN_ENDED);

    // Show victory message
    const victoryMsg = this.add.text(480, 250, 'DUNGEON CLEARED!', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.roomContainer.add(victoryMsg);

    this.tweens.add({
      targets: victoryMsg,
      scaleX: { from: 0.5, to: 1 },
      scaleY: { from: 0.5, to: 1 },
      duration: 600,
      ease: 'Back.easeOut',
    });

    // Transition to VictoryScene after 1 second
    this.time.delayedCall(1000, () => {
      const data: VictoryData = {
        score: this.runState.currentScore,
        bugsDefeated: this.runState.totalBugsDefeated,
        puzzlesSolved: this.runState.totalPuzzlesSolved,
      };
      this.scene.start('VictoryScene', data);
    });
  }

  // ─── Pause Menu (Task 13.9) ─────────────────────────────────────────────

  /**
   * Toggle the pause menu on/off.
   * When paused: stop timers, show semi-transparent overlay with menu options.
   * When unpaused: destroy overlay, resume timers.
   * Requirement: 9.4
   */
  private togglePauseMenu(): void {
    if (this.paused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }

  /**
   * Pause the game: stop timers and show pause menu overlay.
   */
  private pauseGame(): void {
    this.paused = true;

    // Stop puzzle timer if active
    if (this.timerEvent) {
      this.timerEvent.paused = true;
    }

    // Stop discard timer if active
    if (this.discardTimerEvent) {
      this.discardTimerEvent.paused = true;
    }

    // Semi-transparent black overlay (depth 200 to be above everything)
    this.pauseOverlay = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.7)
      .setDepth(200)
      .setInteractive(); // block input to elements below

    // Create pause menu container
    this.pauseContainer = this.add.container(0, 0).setDepth(201);

    const title = this.add.text(480, 150, 'PAUSED', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Resume button
    const resumeBtn = this.add.text(480, 250, '[ Resume ]', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resumeBtn.on('pointerover', () => resumeBtn.setColor('#88ff88'));
    resumeBtn.on('pointerout', () => resumeBtn.setColor('#44ff44'));
    resumeBtn.on('pointerdown', () => this.resumeGame());

    // View Controls button
    const controlsBtn = this.add.text(480, 310, '[ View Controls ]', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#66ccff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    controlsBtn.on('pointerover', () => controlsBtn.setColor('#99ddff'));
    controlsBtn.on('pointerout', () => controlsBtn.setColor('#66ccff'));
    controlsBtn.on('pointerdown', () => this.showControlsPanel());

    // Return to Main Menu button
    const mainMenuBtn = this.add.text(480, 370, '[ Return to Main Menu ]', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#ff8844',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    mainMenuBtn.on('pointerover', () => mainMenuBtn.setColor('#ffaa66'));
    mainMenuBtn.on('pointerout', () => mainMenuBtn.setColor('#ff8844'));
    mainMenuBtn.on('pointerdown', () => this.returnToMainMenu());

    this.pauseContainer.add([title, resumeBtn, controlsBtn, mainMenuBtn]);
  }

  /**
   * Resume the game: destroy pause overlay and resume timers.
   */
  private resumeGame(): void {
    this.paused = false;

    // Destroy controls panel if open
    if (this.controlsPanel) {
      this.controlsPanel.destroy(true);
      this.controlsPanel = null;
    }

    // Destroy pause overlay and menu
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
    if (this.pauseContainer) {
      this.pauseContainer.destroy(true);
      this.pauseContainer = null;
    }

    // Resume timers
    if (this.timerEvent) {
      this.timerEvent.paused = false;
    }
    if (this.discardTimerEvent) {
      this.discardTimerEvent.paused = false;
    }
  }

  /**
   * Show the controls sub-panel within the pause menu.
   */
  private showControlsPanel(): void {
    // Remove existing controls panel if any
    if (this.controlsPanel) {
      this.controlsPanel.destroy(true);
      this.controlsPanel = null;
    }

    this.controlsPanel = this.add.container(0, 0).setDepth(202);

    const panelBg = this.add.rectangle(480, 270, 500, 300, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, 0x4488ff);

    const panelTitle = this.add.text(480, 145, 'Controls', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const controls = [
      'W / Up Arrow    — Navigate up',
      'S / Down Arrow  — Navigate down',
      'A / Left Arrow  — Navigate left',
      'D / Right Arrow — Navigate right',
      'Enter / Space   — Confirm selection',
      'Escape          — Pause / Resume',
    ];

    const controlsText = this.add.text(480, 270, controls.join('\n'), {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#cccccc',
      lineSpacing: 10,
      align: 'left',
    }).setOrigin(0.5);

    const backBtn = this.add.text(480, 385, '[ Back ]', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#88ff88'));
    backBtn.on('pointerout', () => backBtn.setColor('#44ff44'));
    backBtn.on('pointerdown', () => {
      if (this.controlsPanel) {
        this.controlsPanel.destroy(true);
        this.controlsPanel = null;
      }
    });

    this.controlsPanel.add([panelBg, panelTitle, controlsText, backBtn]);
  }

  /**
   * Return to the Main Menu from pause menu: clean up and transition.
   */
  private returnToMainMenu(): void {
    // Stop all timers
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
    if (this.discardTimerEvent) {
      this.discardTimerEvent.destroy();
      this.discardTimerEvent = null;
    }

    // Clean up pause UI
    if (this.controlsPanel) {
      this.controlsPanel.destroy(true);
      this.controlsPanel = null;
    }
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
    if (this.pauseContainer) {
      this.pauseContainer.destroy(true);
      this.pauseContainer = null;
    }

    // Clear puzzle UI (DOM elements)
    this.clearPuzzleUI();

    // Emit run ended event
    EventBus.emit(EVENTS.RUN_ENDED);

    // Transition to MainMenuScene
    this.scene.start('MainMenuScene');
  }

  // ─── Low-Health Indicator ─────────────────────────────────────────────────

  /**
   * Show/hide a pulsing red overlay when hero HP < 25.
   * Requirement: 8.1
   */
  private updateLowHealthIndicator(hp: number): void {
    if (hp < 25 && hp > 0) {
      // Show low-health overlay if not already showing
      if (!this.lowHealthOverlay) {
        this.lowHealthOverlay = this.add.rectangle(480, 270, 960, 540, 0xff0000, 0.08)
          .setDepth(99);

        this.lowHealthTween = this.tweens.add({
          targets: this.lowHealthOverlay,
          alpha: { from: 0.08, to: 0.2 },
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else {
      // Remove low-health overlay
      if (this.lowHealthTween) {
        this.lowHealthTween.destroy();
        this.lowHealthTween = null;
      }
      if (this.lowHealthOverlay) {
        this.lowHealthOverlay.destroy();
        this.lowHealthOverlay = null;
      }
    }
  }
}
