import Phaser from 'phaser';
import { createBossFightState, bossAutoAttack, type BossFightState } from '@/systems/BossFightSystem';
import { PuzzleEngine } from '@/systems/PuzzleEngine';
import { getDifficultyConfig } from '@/systems/DifficultySystem';
import { getTotalLevels } from '@/systems/MapLoader';
import { getLevelDefinition } from '@/data/levels';
import { playSFX } from '@/lib/AudioManager';
import { screenShake, screenFlash, floatingText } from '@/systems/FeedbackSystem';
import { generateBossSprite } from '@/lib/SpriteGenerator';
import { t } from '@/lib/i18n';
import type { DifficultyMode, Puzzle } from '@/types';

interface BossActionData {
  levelId: string;
  difficulty: DifficultyMode;
  currentLevel: number;
  score: number;
  heroHP: number;
  bossName: string;
  pipelineOrder: string[];
}

type TurnPhase = 'player' | 'boss' | 'dialogue' | 'victory' | 'defeat';

/**
 * BossActionMenuScene — Type B (JRPG Action Menu).
 * Turn-based boss fight with 4 action cards (A/B/C/D) representing puzzle answers.
 * Each turn: player picks an action → correct = deal damage, wrong = take damage.
 * Includes typewriter dialogue box and a one-time backup action.
 */
export class BossActionMenuScene extends Phaser.Scene {
  private sceneData!: BossActionData;
  private state!: BossFightState;
  private puzzleEngine!: PuzzleEngine;
  private currentPuzzle: Puzzle | null = null;

  // UI
  private bossSprite!: Phaser.GameObjects.Sprite;
  private bossHPBar!: Phaser.GameObjects.Rectangle;
  private heartsText!: Phaser.GameObjects.Text;
  private dialogueBox!: Phaser.GameObjects.Text;
  private actionCards: Phaser.GameObjects.Text[] = [];
  private backupBtn: Phaser.GameObjects.Text | null = null;
  private turnIndicator!: Phaser.GameObjects.Text;

  // State
  private turnPhase: TurnPhase = 'dialogue';
  private backupUsed = false;
  private turnCount = 0;
  private bossTimerEvent: Phaser.Time.TimerEvent | null = null;

  constructor() { super('BossActionMenuScene'); }

  init(data: BossActionData): void { this.sceneData = data; }

  create(): void {
    generateBossSprite(this);
    this.state = createBossFightState();
    this.puzzleEngine = new PuzzleEngine();
    this.turnCount = 0;
    this.backupUsed = false;

    this.buildUI();
    this.showDialogue(this.sceneData.bossName + ' appears!', () => {
      this.startPlayerTurn();
    });
  }

  // ─── UI ─────────────────────────────────────────────────────────────────

  private buildUI(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);

    // Boss area (top half)
    this.add.rectangle(w / 2, h * 0.3, w - 40, h * 0.45, 0x111122).setStrokeStyle(1, 0x334466);

    // Boss sprite
    this.bossSprite = this.add.sprite(w / 2, h * 0.25, 'boss-sprite', 0).setScale(3);
    this.tweens.add({
      targets: this.bossSprite,
      y: this.bossSprite.y - 4,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Boss name + HP
    this.add.text(w / 2, 20, this.sceneData.bossName, {
      fontSize: '10px', fontFamily: 'Press Start 2P, monospace', color: '#ff4444',
    }).setOrigin(0.5);

    this.add.rectangle(w / 2, 40, 252, 12, 0x222222).setStrokeStyle(1, 0x444444);
    this.bossHPBar = this.add.rectangle(w / 2 - 125, 40, 250, 10, 0xff3333).setOrigin(0, 0.5);

    // Hero hearts
    this.heartsText = this.add.text(20, h - 80, this.getHeartsDisplay(), {
      fontSize: '12px', fontFamily: 'Press Start 2P, monospace', color: '#ff3366',
    });

    // Turn indicator
    this.turnIndicator = this.add.text(w - 20, h - 80, '', {
      fontSize: '7px', fontFamily: 'Press Start 2P, monospace', color: '#888888',
    }).setOrigin(1, 0);

    // Dialogue box (bottom)
    this.add.rectangle(w / 2, h - 35, w - 20, 50, 0x1a1a2e).setStrokeStyle(1, 0x4488ff, 0.6);
    this.dialogueBox = this.add.text(30, h - 52, '', {
      fontSize: '7px', fontFamily: 'Press Start 2P, monospace', color: '#ffffff',
      wordWrap: { width: w - 60 }, lineSpacing: 4,
    });

    // Action cards (hidden initially)
    this.buildActionCards();

    // Backup button
    this.backupBtn = this.add.text(w - 30, h - 110, '\u2764 BACKUP', {
      fontSize: '7px', fontFamily: 'Press Start 2P, monospace', color: '#ffcc00',
      backgroundColor: '#2a2a1a', padding: { x: 6, y: 4 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setVisible(false);
    this.backupBtn.on('pointerdown', () => this.useBackup());

    // ESC forfeit
    this.input.keyboard?.on('keydown-ESC', () => this.onDefeat());
  }

  private buildActionCards(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const cardY = h - 110;
    const labels = ['A', 'B', 'C', 'D'];
    const colors = ['#44cc44', '#44aaff', '#ffaa44', '#cc44cc'];
    const spacing = (w - 80) / 4;

    this.actionCards = [];
    for (let i = 0; i < 4; i++) {
      const x = 50 + i * spacing;
      const card = this.add.text(x, cardY, `[${labels[i]}]`, {
        fontSize: '8px', fontFamily: 'Press Start 2P, monospace', color: colors[i],
        backgroundColor: '#1a1a2e', padding: { x: 8, y: 6 },
        fixedWidth: spacing - 10, align: 'center',
      }).setInteractive({ useHandCursor: true }).setVisible(false);

      card.on('pointerover', () => card.setBackgroundColor('#2a2a4a'));
      card.on('pointerout', () => card.setBackgroundColor('#1a1a2e'));
      card.on('pointerdown', () => this.onActionSelect(i));

      this.actionCards.push(card);
    }
  }

  // ─── Turn System ────────────────────────────────────────────────────────

  private startPlayerTurn(): void {
    this.turnPhase = 'player';
    this.turnCount++;
    this.turnIndicator.setText(`Turn ${this.turnCount}`);

    // Draw a puzzle
    const ld = getLevelDefinition(this.sceneData.currentLevel);
    const cats = ld?.puzzleCategories ?? ['devops'];
    this.currentPuzzle = this.puzzleEngine.draw(cats[Math.floor(Math.random() * cats.length)]);

    if (!this.currentPuzzle) {
      // No more puzzles — auto-win
      this.state.bossHP = 0;
      this.onVictory();
      return;
    }

    // Show puzzle question in dialogue
    this.dialogueBox.setText(this.currentPuzzle.question);

    // Generate 4 options and show action cards
    const options = this.generateActionOptions(this.currentPuzzle);
    for (let i = 0; i < 4; i++) {
      this.actionCards[i].setText(`[${String.fromCharCode(65 + i)}] ${options[i].substring(0, 18)}`);
      this.actionCards[i].setVisible(true);
      this.actionCards[i].setData('answer', options[i]);
    }

    // Show backup if available
    if (this.backupBtn && !this.backupUsed) {
      this.backupBtn.setVisible(true);
    }

    // Start boss timer for this turn
    this.startTurnTimer();
  }

  private onActionSelect(idx: number): void {
    if (this.turnPhase !== 'player' || !this.currentPuzzle) return;
    this.turnPhase = 'boss';
    this.stopTurnTimer();

    const selectedAnswer = this.actionCards[idx].getData('answer') as string;
    const isCorrect = this.puzzleEngine.evaluate(this.currentPuzzle, selectedAnswer);

    // Hide cards
    for (const card of this.actionCards) card.setVisible(false);
    if (this.backupBtn) this.backupBtn.setVisible(false);

    if (isCorrect) {
      this.handleCorrectAction();
    } else {
      this.handleWrongAction();
    }
  }

  private handleCorrectAction(): void {
    const damage = 20 + Math.floor(Math.random() * 10); // 20-29% damage
    this.state.bossHP = Math.max(0, this.state.bossHP - damage);

    playSFX(this, 'sfx-boss-hit');
    this.bossSprite.setFrame(1);
    this.time.delayedCall(300, () => this.bossSprite.setFrame(0));
    floatingText(this, this.cameras.main.width / 2, this.bossSprite.y - 20, `-${damage}%`, '#44ff44');
    this.bossHPBar.setDisplaySize(250 * (this.state.bossHP / 100), 10);

    if (this.state.bossHP <= 0) {
      this.state.isComplete = true;
      this.state.victory = true;
      this.showDialogue(t('boss.defeated'), () => this.onVictory());
    } else {
      this.showDialogue(t('boss.critical') + ' Direct hit!', () => this.bossTurn());
    }
  }

  private handleWrongAction(): void {
    playSFX(this, 'sfx-boss-attack');
    screenShake(this, 6);
    screenFlash(this, 0xff0000, 250);
    this.state.heroHearts = Math.max(0, this.state.heroHearts - 1);
    this.heartsText.setText(this.getHeartsDisplay());
    floatingText(this, 60, this.cameras.main.height - 90, t('boss.heart_lost'), '#ff4444');

    if (this.state.heroHearts <= 0) {
      this.state.isComplete = true;
      this.showDialogue(t('boss.player_defeated'), () => this.onDefeat());
    } else {
      // Show hint from puzzle
      const hint = this.currentPuzzle?.hints[0] ?? '';
      const truncHint = hint.length > 50 ? hint.substring(0, 48) + '..' : hint;
      this.showDialogue(`Wrong! ${truncHint}`, () => this.bossTurn());
    }
  }

  private bossTurn(): void {
    this.turnPhase = 'boss';
    this.turnIndicator.setText('Boss turn...');

    // Boss attacks after a delay
    this.time.delayedCall(800, () => {
      if (this.state.isComplete) return;

      // 40% chance boss attacks
      if (Math.random() < 0.4) {
        const r = bossAutoAttack(this.state);
        playSFX(this, 'sfx-boss-attack');
        screenShake(this, 4);
        this.heartsText.setText(this.getHeartsDisplay());
        floatingText(this, 60, this.cameras.main.height - 90, t('boss.attack'), '#ff4444');

        // Boss lunge
        this.tweens.add({
          targets: this.bossSprite, y: this.bossSprite.y + 15,
          duration: 150, yoyo: true, ease: 'Power2',
        });

        if (r.defeat) {
          this.showDialogue(t('boss.player_defeated'), () => this.onDefeat());
          return;
        }
        this.showDialogue(t('boss.attack') + ' The boss strikes!', () => this.startPlayerTurn());
      } else {
        this.showDialogue('The boss hesitates...', () => this.startPlayerTurn());
      }
    });
  }

  private useBackup(): void {
    if (this.backupUsed || this.turnPhase !== 'player') return;
    this.backupUsed = true;
    if (this.backupBtn) this.backupBtn.setVisible(false);

    // Restore 1 heart
    this.state.heroHearts = Math.min(4, this.state.heroHearts + 1);
    this.heartsText.setText(this.getHeartsDisplay());
    playSFX(this, 'sfx-fragment');
    floatingText(this, 60, this.cameras.main.height - 90, '+1 \u2665', '#44ff44');
  }

  // ─── Timer ──────────────────────────────────────────────────────────────

  private startTurnTimer(): void {
    const cfg = getDifficultyConfig(this.sceneData.difficulty);
    const turnTimeMs = cfg.bossTimerSeconds * 1000;

    this.bossTimerEvent = this.time.delayedCall(turnTimeMs, () => {
      if (this.turnPhase === 'player') {
        // Time's up — boss attacks
        for (const card of this.actionCards) card.setVisible(false);
        if (this.backupBtn) this.backupBtn.setVisible(false);
        this.handleWrongAction();
      }
    });
  }

  private stopTurnTimer(): void {
    if (this.bossTimerEvent) {
      this.bossTimerEvent.destroy();
      this.bossTimerEvent = null;
    }
  }

  // ─── Dialogue (typewriter effect) ──────────────────────────────────────

  private showDialogue(text: string, onComplete: () => void): void {
    this.turnPhase = 'dialogue';
    this.dialogueBox.setText('');

    let idx = 0;
    const timer = this.time.addEvent({
      delay: 25,
      repeat: text.length - 1,
      callback: () => {
        idx++;
        this.dialogueBox.setText(text.substring(0, idx));
        if (idx >= text.length) {
          timer.destroy();
          this.time.delayedCall(600, onComplete);
        }
      },
    });

    // Allow skip with Enter/Space
    const skipHandler = () => {
      if (idx < text.length) {
        timer.destroy();
        idx = text.length;
        this.dialogueBox.setText(text);
        this.time.delayedCall(200, onComplete);
      }
    };
    this.input.keyboard?.once('keydown-ENTER', skipHandler);
    this.input.keyboard?.once('keydown-SPACE', skipHandler);
  }

  // ─── Options Generator ──────────────────────────────────────────────────

  private generateActionOptions(puzzle: Puzzle): string[] {
    const correct = puzzle.correctAnswer;
    const distractors: string[] = [];

    // Generate 3 distractors
    if (correct.length <= 5 && /^\d+$/.test(correct)) {
      const num = parseInt(correct, 10);
      distractors.push(String(num + 1), String(num - 1), String(num * 2));
    } else {
      const hints = puzzle.hints;
      if (hints.length > 0) distractors.push(hints[0].split(' ').slice(0, 3).join(' '));
      if (hints.length > 1) distractors.push(hints[1].split(' ').slice(0, 3).join(' '));
      distractors.push(correct.length > 3 ? correct.substring(0, correct.length - 2) + '()' : correct + '.js');
    }

    const unique = [...new Set(distractors)]
      .filter(d => d.toLowerCase() !== correct.toLowerCase() && d.length > 0)
      .slice(0, 3);
    while (unique.length < 3) unique.push(`alt_${unique.length + 1}`);

    const options = [correct, ...unique];
    // Shuffle
    let seed = this.turnCount * 7 + this.sceneData.currentLevel * 31;
    for (let i = options.length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
      const j = seed % (i + 1);
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
  }

  // ─── End States ─────────────────────────────────────────────────────────

  private onVictory(): void {
    this.turnPhase = 'victory';
    this.stopTurnTimer();
    playSFX(this, 'sfx-victory');

    this.tweens.add({
      targets: this.bossSprite, alpha: 0, scaleX: 4, scaleY: 0.3,
      duration: 800, ease: 'Power2',
    });

    this.time.delayedCall(2000, () => {
      if (this.sceneData.currentLevel >= getTotalLevels()) {
        this.scene.start('VictoryScene', {
          score: this.sceneData.score,
          levelReached: this.sceneData.currentLevel,
          bugsDefeated: this.sceneData.currentLevel,
          puzzlesSolved: this.turnCount,
        });
      } else {
        this.scene.start('ExplorationScene', {
          level: this.sceneData.currentLevel + 1,
          difficulty: this.sceneData.difficulty,
          hp: this.state.heroHearts * 25,
          score: this.sceneData.score + 200,
        });
      }
    });
  }

  private onDefeat(): void {
    this.turnPhase = 'defeat';
    this.stopTurnTimer();
    this.time.delayedCall(1500, () => {
      this.scene.start('GameOverScene', {
        score: this.sceneData.score,
        levelReached: this.sceneData.currentLevel,
        bugsDefeated: 0,
        puzzlesSolved: this.turnCount,
      });
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private getHeartsDisplay(): string {
    return '\u2665'.repeat(this.state.heroHearts) + '\u2661'.repeat(4 - this.state.heroHearts);
  }
}
