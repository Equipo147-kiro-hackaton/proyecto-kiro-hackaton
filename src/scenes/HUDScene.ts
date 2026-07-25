import Phaser from 'phaser';
import { EventBus } from '@/lib/EventBus';
import type { DifficultyMode } from '@/types';

/**
 * HUDScene — Overlay scene that displays game state above the exploration scene.
 *
 * Rendered as a parallel scene on top of ExplorationScene.
 * Communicates via EventBus to stay in sync with game state.
 *
 * Components:
 * - Hearts (4 text-based, visual HP)
 * - Fragment progress bar
 * - Level/scenario indicator
 * - Difficulty mode badge
 * - Save indicator (flash on save)
 * - Score display
 */
export class HUDScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Text[] = [];
  private maxHearts = 4;

  private fragmentIcons: Phaser.GameObjects.Text[] = [];
  private fragmentCountText!: Phaser.GameObjects.Text;

  private levelText!: Phaser.GameObjects.Text;
  private modeBadge!: Phaser.GameObjects.Text;
  private saveIndicator!: Phaser.GameObjects.Text;
  private saveTween: Phaser.Tweens.Tween | null = null;
  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super('HUDScene');
  }

  create(): void {
    this.createHearts();
    this.createFragmentProgress();
    this.createLevelIndicator();
    this.createModeBadge();
    this.createSaveIndicator();
    this.createScoreDisplay();
    this.setupEventListeners();
  }

  // ─── Hearts ─────────────────────────────────────────────────────────────

  private createHearts(): void {
    this.hearts = [];
    const startX = 16;
    const startY = 12;
    const spacing = 20;

    for (let i = 0; i < this.maxHearts; i++) {
      const heart = this.add.text(startX + i * spacing, startY, '\u2665', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ff3366',
      });
      this.hearts.push(heart);
    }
  }

  updateHearts(current: number, max?: number): void {
    if (max !== undefined) this.maxHearts = max;

    for (let i = 0; i < this.hearts.length; i++) {
      if (i < current) {
        this.hearts[i].setText('\u2665');
        this.hearts[i].setColor('#ff3366');
        this.hearts[i].setAlpha(1);
      } else {
        this.hearts[i].setText('\u2661');
        this.hearts[i].setColor('#333333');
        this.hearts[i].setAlpha(0.5);
      }
    }

    if (current < this.maxHearts && current >= 0) {
      const lostHeart = this.hearts[current];
      if (lostHeart) {
        this.tweens.add({
          targets: lostHeart,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 150,
          yoyo: true,
          ease: 'Power2',
        });
      }
    }
  }

  // ─── Fragment Progress ──────────────────────────────────────────────────

  private createFragmentProgress(): void {
    const startX = 16;
    const startY = 34;

    this.add.text(startX, startY, '\u25C6', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#66ccff',
    });

    this.fragmentCountText = this.add.text(startX + 14, startY, '0/0', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#66ccff',
    });

    this.fragmentIcons = [];
    for (let i = 0; i < 6; i++) {
      const dot = this.add.text(startX + 50 + i * 12, startY, '\u25CB', {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#333333',
      });
      this.fragmentIcons.push(dot);
    }
  }

  updateFragments(collected: number, total: number): void {
    this.fragmentCountText.setText(`${collected}/${total}`);

    for (let i = 0; i < this.fragmentIcons.length; i++) {
      if (i < total) {
        this.fragmentIcons[i].setVisible(true);
        if (i < collected) {
          this.fragmentIcons[i].setText('\u25CF');
          this.fragmentIcons[i].setColor('#66ccff');
        } else {
          this.fragmentIcons[i].setText('\u25CB');
          this.fragmentIcons[i].setColor('#444444');
        }
      } else {
        this.fragmentIcons[i].setVisible(false);
      }
    }

    if (collected > 0) {
      const lastFilled = this.fragmentIcons[collected - 1];
      if (lastFilled) {
        this.tweens.add({
          targets: lastFilled,
          scaleX: 1.8,
          scaleY: 1.8,
          duration: 200,
          yoyo: true,
          ease: 'Back.easeOut',
        });
      }
    }
  }

  // ─── Level Indicator ────────────────────────────────────────────────────

  private createLevelIndicator(): void {
    this.levelText = this.add.text(
      this.cameras.main.width / 2, 10, 'Level 1',
      { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold' }
    ).setOrigin(0.5, 0);
  }

  updateLevel(levelNumber: number, scenarioName: string): void {
    this.levelText.setText(`Level ${levelNumber} \u2014 ${scenarioName}`);
  }

  // ─── Mode Badge ─────────────────────────────────────────────────────────

  private createModeBadge(): void {
    this.modeBadge = this.add.text(
      this.cameras.main.width - 16, 10, 'NORMAL',
      { fontSize: '8px', fontFamily: 'monospace', color: '#888888', backgroundColor: '#222222', padding: { x: 4, y: 2 } }
    ).setOrigin(1, 0);
  }

  updateMode(mode: DifficultyMode): void {
    const colors: Record<DifficultyMode, string> = {
      beginner: '#44cc44',
      normal: '#cccc44',
      hard: '#cc4444',
    };
    this.modeBadge.setText(mode.toUpperCase());
    this.modeBadge.setColor(colors[mode]);
  }

  // ─── Save Indicator ─────────────────────────────────────────────────────

  private createSaveIndicator(): void {
    this.saveIndicator = this.add.text(
      this.cameras.main.width - 16, 26, '',
      { fontSize: '8px', fontFamily: 'monospace', color: '#44ff44' }
    ).setOrigin(1, 0).setAlpha(0);
  }

  showSaveIndicator(): void {
    this.saveIndicator.setText('SAVED \u2713');
    this.saveIndicator.setAlpha(1);

    if (this.saveTween) {
      this.saveTween.stop();
    }

    this.saveTween = this.tweens.add({
      targets: this.saveIndicator,
      alpha: 0,
      delay: 1500,
      duration: 500,
      ease: 'Power2',
    });
  }

  // ─── Score Display ──────────────────────────────────────────────────────

  private createScoreDisplay(): void {
    this.scoreText = this.add.text(
      this.cameras.main.width - 16, this.cameras.main.height - 16, 'Score: 0',
      { fontSize: '10px', fontFamily: 'monospace', color: '#ffdd44' }
    ).setOrigin(1, 1);
  }

  updateScore(score: number): void {
    this.scoreText.setText(`Score: ${score}`);
  }

  // ─── Event Listeners ────────────────────────────────────────────────────

  private setupEventListeners(): void {
    EventBus.on('hud:updateHearts', (data: { current: number; max: number }) => {
      this.updateHearts(data.current, data.max);
    });

    EventBus.on('hud:updateFragments', (data: { collected: number; total: number }) => {
      this.updateFragments(data.collected, data.total);
    });

    EventBus.on('hud:updateLevel', (data: { level: number; name: string }) => {
      this.updateLevel(data.level, data.name);
    });

    EventBus.on('hud:updateMode', (data: { mode: DifficultyMode }) => {
      this.updateMode(data.mode);
    });

    EventBus.on('hud:updateScore', (data: { score: number }) => {
      this.updateScore(data.score);
    });

    EventBus.on('hud:saved', () => {
      this.showSaveIndicator();
    });

    this.events.on('shutdown', () => {
      EventBus.off('hud:updateHearts');
      EventBus.off('hud:updateFragments');
      EventBus.off('hud:updateLevel');
      EventBus.off('hud:updateMode');
      EventBus.off('hud:updateScore');
      EventBus.off('hud:saved');
    });
  }
}
