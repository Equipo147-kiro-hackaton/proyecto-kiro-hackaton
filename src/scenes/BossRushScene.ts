import Phaser from 'phaser';
import { createBossFightState, type BossFightState } from '@/systems/BossFightSystem';
import { PuzzleEngine } from '@/systems/PuzzleEngine';
import { getDifficultyConfig } from '@/systems/DifficultySystem';
import { getTotalLevels } from '@/systems/MapLoader';
import { getLevelDefinition } from '@/data/levels';
import { playSFX } from '@/lib/AudioManager';
import { screenShake, screenFlash, floatingText } from '@/systems/FeedbackSystem';
import { generateBossSprite } from '@/lib/SpriteGenerator';
import { t } from '@/lib/i18n';
import type { DifficultyMode, Puzzle } from '@/types';

interface BossRushData {
  levelId: string;
  difficulty: DifficultyMode;
  currentLevel: number;
  score: number;
  heroHP: number;
  bossName: string;
  pipelineOrder: string[];
}

/**
 * BossRushScene — Type C (Rush Mode).
 * 90-second countdown. Player answers rapid-fire puzzles.
 * Correct = deal damage to boss + gain +5s.
 * Wrong = boss attacks (lose 1 heart) + lose -5s.
 * Boss auto-attacks every N seconds.
 * Victory when boss HP reaches 0. Defeat when timer or hearts run out.
 */
export class BossRushScene extends Phaser.Scene {
  private sceneData!: BossRushData;
  private state!: BossFightState;
  private puzzleEngine!: PuzzleEngine;
  private currentPuzzle: Puzzle | null = null;

  // UI
  private bossSprite!: Phaser.GameObjects.Sprite;
  private bossHPBar!: Phaser.GameObjects.Rectangle;
  private heartsText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private questionText!: Phaser.GameObjects.Text;
  private optionButtons: Phaser.GameObjects.Text[] = [];
  private comboText!: Phaser.GameObjects.Text;

  // State
  private remainingMs = 90000;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private bossAttackEvent: Phaser.Time.TimerEvent | null = null;
  private combo = 0;
  private puzzlesSolved = 0;
  private isComplete = false;

  constructor() { super('BossRushScene'); }

  init(data: BossRushData): void { this.sceneData = data; }

  create(): void {
    generateBossSprite(this);
    this.state = createBossFightState();
    this.puzzleEngine = new PuzzleEngine();
    this.combo = 0;
    this.puzzlesSolved = 0;
    this.isComplete = false;
    this.remainingMs = 90000;

    this.buildUI();
    this.startTimer();
    this.startBossAutoAttack();
    this.nextPuzzle();
  }

  // ─── UI ─────────────────────────────────────────────────────────────────

  private buildUI(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);

    // Timer (large, top-center)
    this.timerText = this.add.text(w / 2, 16, '90s', {
      fontSize: '16px', fontFamily: 'Press Start 2P, monospace', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Boss sprite (smaller, top-right area)
    this.bossSprite = this.add.sprite(w - 80, 80, 'boss-sprite', 0).setScale(2);
    this.tweens.add({
      targets: this.bossSprite,
      scaleX: 2.05, scaleY: 1.95,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Boss name
    this.add.text(w - 80, 30, this.sceneData.bossName, {
      fontSize: '7px', fontFamily: 'Press Start 2P, monospace', color: '#ff4444',
    }).setOrigin(0.5);

    // Boss HP bar
    this.add.rectangle(w - 80, 115, 122, 10, 0x222222).setStrokeStyle(1, 0x444444);
    this.bossHPBar = this.add.rectangle(w - 140, 115, 120, 8, 0xff3333).setOrigin(0, 0.5);

    // Hero hearts (top-left)
    this.heartsText = this.add.text(20, 16, this.getHeartsDisplay(), {
      fontSize: '12px', fontFamily: 'Press Start 2P, monospace', color: '#ff3366',
    });

    // Combo counter
    this.comboText = this.add.text(20, 40, '', {
      fontSize: '8px', fontFamily: 'Press Start 2P, monospace', color: '#ffcc00',
    });

    // Question area
    this.add.rectangle(w / 2, h * 0.4, w - 40, 80, 0x111122).setStrokeStyle(1, 0x334466);
    this.questionText = this.add.text(w / 2, h * 0.4, '', {
      fontSize: '9px', fontFamily: 'Press Start 2P, monospace', color: '#ffffff',
      wordWrap: { width: w - 80 }, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5);

    // 4 option buttons (bottom area, 2x2 grid)
    this.buildOptionButtons();

    // RUSH MODE label
    this.add.text(w / 2, h - 16, 'RUSH MODE | ESC to forfeit', {
      fontSize: '6px', fontFamily: 'Press Start 2P, monospace', color: '#666666',
    }).setOrigin(0.5);

    this.input.keyboard?.on('keydown-ESC', () => this.onDefeat());
  }

  private buildOptionButtons(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const gridStartY = h * 0.58;
    const colSpacing = (w - 60) / 2;
    const rowSpacing = 50;

    this.optionButtons = [];
    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 40 + col * colSpacing + colSpacing / 2;
      const y = gridStartY + row * rowSpacing;

      const btn = this.add.text(x, y, '', {
        fontSize: '8px', fontFamily: 'Press Start 2P, monospace', color: '#dddddd',
        backgroundColor: '#2a2a4a', padding: { x: 10, y: 8 },
        fixedWidth: colSpacing - 20, align: 'center',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setBackgroundColor('#3a3a6a'));
      btn.on('pointerout', () => btn.setBackgroundColor('#2a2a4a'));
      btn.on('pointerdown', () => this.onAnswer(i));

      this.optionButtons.push(btn);
    }

    // Keyboard shortcuts 1-4
    this.input.keyboard?.on('keydown-ONE', () => this.onAnswer(0));
    this.input.keyboard?.on('keydown-TWO', () => this.onAnswer(1));
    this.input.keyboard?.on('keydown-THREE', () => this.onAnswer(2));
    this.input.keyboard?.on('keydown-FOUR', () => this.onAnswer(3));
  }

  // ─── Puzzle Flow ────────────────────────────────────────────────────────

  private nextPuzzle(): void {
    if (this.isComplete) return;

    const ld = getLevelDefinition(this.sceneData.currentLevel);
    const cats = ld?.puzzleCategories ?? ['devops'];
    this.currentPuzzle = this.puzzleEngine.draw(cats[Math.floor(Math.random() * cats.length)]);

    if (!this.currentPuzzle) {
      // Out of puzzles — auto-win
      this.state.bossHP = 0;
      this.onVictory();
      return;
    }

    this.questionText.setText(this.currentPuzzle.question);
    const options = this.generateOptions(this.currentPuzzle);
    for (let i = 0; i < 4; i++) {
      const label = options[i].length > 20 ? options[i].substring(0, 18) + '..' : options[i];
      this.optionButtons[i].setText(`${i + 1}) ${label}`);
      this.optionButtons[i].setData('answer', options[i]);
      this.optionButtons[i].setBackgroundColor('#2a2a4a');
      this.optionButtons[i].setColor('#dddddd');
      this.optionButtons[i].setInteractive();
    }
  }

  private onAnswer(idx: number): void {
    if (this.isComplete || !this.currentPuzzle) return;

    const selected = this.optionButtons[idx].getData('answer') as string;
    const isCorrect = this.puzzleEngine.evaluate(this.currentPuzzle, selected);

    // Disable buttons briefly
    for (const btn of this.optionButtons) btn.disableInteractive();

    if (isCorrect) {
      this.handleCorrect(idx);
    } else {
      this.handleWrong(idx);
    }

    // Next puzzle after brief delay
    this.time.delayedCall(400, () => {
      if (!this.isComplete) {
        for (const btn of this.optionButtons) btn.setInteractive();
        this.nextPuzzle();
      }
    });
  }

  private handleCorrect(idx: number): void {
    this.combo++;
    this.puzzlesSolved++;
    this.optionButtons[idx].setBackgroundColor('#224422');
    this.optionButtons[idx].setColor('#44ff44');

    // Damage boss: 10% + 2% per combo (max 20%)
    const damage = Math.min(20, 10 + this.combo * 2);
    this.state.bossHP = Math.max(0, this.state.bossHP - damage);

    playSFX(this, 'sfx-boss-hit');
    this.bossSprite.setFrame(1);
    this.time.delayedCall(200, () => this.bossSprite.setFrame(0));
    floatingText(this, this.cameras.main.width - 80, 80, `-${damage}%`, '#44ff44');
    this.bossHPBar.setDisplaySize(120 * (this.state.bossHP / 100), 8);

    // +5s bonus
    this.remainingMs += 5000;
    floatingText(this, this.cameras.main.width / 2, 30, '+5s', '#44ffcc');

    // Combo display
    this.comboText.setText(this.combo >= 2 ? `\u26A1 x${this.combo} COMBO` : '');

    if (this.state.bossHP <= 0) {
      this.isComplete = true;
      this.onVictory();
    }
  }

  private handleWrong(idx: number): void {
    this.combo = 0;
    this.comboText.setText('');
    this.optionButtons[idx].setBackgroundColor('#442222');
    this.optionButtons[idx].setColor('#ff4444');

    // Lose 1 heart
    this.state.heroHearts = Math.max(0, this.state.heroHearts - 1);
    this.heartsText.setText(this.getHeartsDisplay());

    // -5s penalty
    this.remainingMs = Math.max(0, this.remainingMs - 5000);
    floatingText(this, this.cameras.main.width / 2, 30, '-5s', '#ff4444');

    playSFX(this, 'sfx-boss-attack');
    screenShake(this, 4);
    screenFlash(this, 0xff0000, 150);

    if (this.state.heroHearts <= 0 || this.remainingMs <= 0) {
      this.isComplete = true;
      this.onDefeat();
    }
  }

  // ─── Timer ──────────────────────────────────────────────────────────────

  private startTimer(): void {
    this.timerEvent = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (this.isComplete) return;
        this.remainingMs -= 100;
        const seconds = Math.max(0, Math.ceil(this.remainingMs / 1000));
        this.timerText.setText(`${seconds}s`);

        // Color changes
        if (seconds <= 10) {
          this.timerText.setColor('#ff4444');
        } else if (seconds <= 30) {
          this.timerText.setColor('#ffaa44');
        } else {
          this.timerText.setColor('#ffcc00');
        }

        if (this.remainingMs <= 0) {
          this.isComplete = true;
          this.onDefeat();
        }
      },
    });
  }

  // ─── Boss Auto-Attack ───────────────────────────────────────────────────

  private startBossAutoAttack(): void {
    const cfg = getDifficultyConfig(this.sceneData.difficulty);
    const intervalMs = cfg.bossTimerSeconds * 1000;

    this.bossAttackEvent = this.time.addEvent({
      delay: intervalMs,
      loop: true,
      callback: () => {
        if (this.isComplete) return;

        this.state.heroHearts = Math.max(0, this.state.heroHearts - 1);
        this.heartsText.setText(this.getHeartsDisplay());
        playSFX(this, 'sfx-boss-attack');
        screenShake(this, 5);
        floatingText(this, 60, 16, t('boss.attack'), '#ff4444');

        // Boss lunge
        this.tweens.add({
          targets: this.bossSprite, x: this.bossSprite.x - 15,
          duration: 100, yoyo: true, ease: 'Power2',
        });

        if (this.state.heroHearts <= 0) {
          this.isComplete = true;
          this.onDefeat();
        }
      },
    });
  }

  // ─── Options Generator ──────────────────────────────────────────────────

  private generateOptions(puzzle: Puzzle): string[] {
    const correct = puzzle.correctAnswer;
    const distractors: string[] = [];

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
    let seed = this.puzzlesSolved * 13 + this.sceneData.currentLevel * 47;
    for (let i = options.length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
      const j = seed % (i + 1);
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
  }

  // ─── End States ─────────────────────────────────────────────────────────

  private onVictory(): void {
    this.stopTimers();
    playSFX(this, 'sfx-victory');

    this.tweens.add({
      targets: this.bossSprite, alpha: 0, scaleX: 3, scaleY: 0.2,
      duration: 600, ease: 'Power2',
    });

    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, t('boss.defeated'), {
      fontSize: '14px', fontFamily: 'Press Start 2P, monospace', color: '#44ff44', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      if (this.sceneData.currentLevel >= getTotalLevels()) {
        this.scene.start('VictoryScene', {
          score: this.sceneData.score,
          levelReached: this.sceneData.currentLevel,
          bugsDefeated: this.sceneData.currentLevel,
          puzzlesSolved: this.puzzlesSolved,
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
    this.stopTimers();
    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, t('boss.player_defeated'), {
      fontSize: '14px', fontFamily: 'Press Start 2P, monospace', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      this.scene.start('GameOverScene', {
        score: this.sceneData.score,
        levelReached: this.sceneData.currentLevel,
        bugsDefeated: 0,
        puzzlesSolved: this.puzzlesSolved,
      });
    });
  }

  private stopTimers(): void {
    if (this.timerEvent) { this.timerEvent.destroy(); this.timerEvent = null; }
    if (this.bossAttackEvent) { this.bossAttackEvent.destroy(); this.bossAttackEvent = null; }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private getHeartsDisplay(): string {
    return '\u2665'.repeat(this.state.heroHearts) + '\u2661'.repeat(4 - this.state.heroHearts);
  }
}
