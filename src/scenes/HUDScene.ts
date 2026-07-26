import Phaser from 'phaser';
import { EventBus } from '@/lib/EventBus';
import { COLORS, COLORS_HEX } from '@/lib/Colors';
import type { DifficultyMode } from '@/types';

/**
 * HUDScene — Right-side status panel overlay (180px wide).
 * Fixed panel showing all game state: HP, score, fragments, status, controls.
 */

const PANEL_WIDTH = 180;
const PANEL_X = 960 - PANEL_WIDTH;

export class HUDScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Text[] = [];
  private maxHearts = 4;

  private fragmentBar!: Phaser.GameObjects.Graphics;
  private fragmentCountText!: Phaser.GameObjects.Text;

  private levelText!: Phaser.GameObjects.Text;
  private modeBadge!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private saveIndicator!: Phaser.GameObjects.Text;
  private saveTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super('HUDScene');
  }

  create(): void {
    this.createPanelBackground();
    this.createLevelSection();
    this.createHeartsSection();
    this.createScoreSection();
    this.createFragmentSection();
    this.createStatusSection();
    this.createControlsSection();
    this.createSaveIndicator();
    this.setupEventListeners();
  }

  // ─── Panel Background ───────────────────────────────────────────────────

  private createPanelBackground(): void {
    this.add.rectangle(
      PANEL_X + PANEL_WIDTH / 2, 270,
      PANEL_WIDTH, 540,
      COLORS_HEX.BG_DARK, 0.92
    ).setStrokeStyle(2, COLORS_HEX.PRIMARY_BLUE, 0.5);

    const sep = this.add.graphics();
    sep.lineStyle(1, COLORS_HEX.PRIMARY_BLUE, 0.3);
    sep.lineBetween(PANEL_X, 0, PANEL_X, 540);
  }

  // ─── Level & Difficulty ─────────────────────────────────────────────────

  private createLevelSection(): void {
    const x = PANEL_X + PANEL_WIDTH / 2;

    this.levelText = this.add.text(x, 16, 'Level 1', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: COLORS.TEXT_WHITE,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: PANEL_WIDTH - 16 },
    }).setOrigin(0.5, 0);

    this.modeBadge = this.add.text(x, 44, 'NORMAL', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: COLORS.DIFFICULTY_NORMAL,
      backgroundColor: '#1a1a2e',
      padding: { x: 6, y: 2 },
    }).setOrigin(0.5, 0);

    this.addSeparator(62);
  }

  // ─── Hearts ─────────────────────────────────────────────────────────────

  private createHeartsSection(): void {
    const x = PANEL_X + 12;
    const y = 72;

    this.add.text(x, y, 'HP', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: COLORS.TEXT_DIM,
    });

    this.hearts = [];
    for (let i = 0; i < this.maxHearts; i++) {
      const heart = this.add.text(x + 22 + i * 18, y - 2, '\u2665', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: COLORS.HUD_HEARTS,
      });
      this.hearts.push(heart);
    }
  }

  updateHearts(current: number, max?: number): void {
    if (max !== undefined) this.maxHearts = max;

    for (let i = 0; i < this.hearts.length; i++) {
      if (i < current) {
        this.hearts[i].setText('\u2665');
        this.hearts[i].setColor(COLORS.HUD_HEARTS);
        this.hearts[i].setAlpha(1);
      } else {
        this.hearts[i].setText('\u2661');
        this.hearts[i].setColor(COLORS.HUD_HEARTS_EMPTY);
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

  // ─── Score ──────────────────────────────────────────────────────────────

  private createScoreSection(): void {
    const x = PANEL_X + 12;
    const y = 96;

    this.add.text(x, y, 'SCORE', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: COLORS.TEXT_DIM,
    });

    this.scoreText = this.add.text(PANEL_X + PANEL_WIDTH - 12, y, '0', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: COLORS.HUD_SCORE,
      fontStyle: 'bold',
    }).setOrigin(1, 0);

    this.addSeparator(116);
  }

  updateScore(score: number): void {
    this.scoreText.setText(`${score}`);
    this.tweens.add({
      targets: this.scoreText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Power2',
    });
  }

  // ─── Fragment Progress ──────────────────────────────────────────────────

  private createFragmentSection(): void {
    const x = PANEL_X + 12;
    const y = 126;

    this.add.text(x, y, 'FRAGMENTS', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: COLORS.TEXT_DIM,
    });

    this.fragmentCountText = this.add.text(PANEL_X + PANEL_WIDTH - 12, y, '0/0', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: COLORS.HUD_FRAGMENTS,
    }).setOrigin(1, 0);

    this.fragmentBar = this.add.graphics();
    this.drawFragmentBar(0, 0);

    this.addSeparator(156);
  }

  private drawFragmentBar(collected: number, total: number): void {
    const x = PANEL_X + 12;
    const y = 142;
    const barWidth = PANEL_WIDTH - 24;
    const barHeight = 8;

    this.fragmentBar.clear();
    this.fragmentBar.fillStyle(0x222233, 1);
    this.fragmentBar.fillRect(x, y, barWidth, barHeight);
    this.fragmentBar.lineStyle(1, COLORS_HEX.HUD_FRAGMENTS, 0.5);
    this.fragmentBar.strokeRect(x, y, barWidth, barHeight);

    if (total > 0) {
      const fillWidth = Math.floor((collected / total) * barWidth);
      this.fragmentBar.fillStyle(COLORS_HEX.HUD_FRAGMENTS, 0.8);
      this.fragmentBar.fillRect(x, y, fillWidth, barHeight);
    }
  }

  updateFragments(collected: number, total: number): void {
    this.fragmentCountText.setText(`${collected}/${total}`);
    this.drawFragmentBar(collected, total);

    if (collected >= total && total > 0) {
      this.statusText.setText('\u00bb DOOR UNLOCKED\n  Find the exit!');
      this.statusText.setColor(COLORS.SUCCESS_GREEN);
    } else if (total > 0) {
      this.statusText.setText(`Find ${total - collected} more\nfragments to\nunlock the door.`);
      this.statusText.setColor(COLORS.TEXT_DIM);
    }
  }

  // ─── Status Section ─────────────────────────────────────────────────────

  private createStatusSection(): void {
    const x = PANEL_X + 12;
    const y = 166;

    this.add.text(x, y, 'STATUS', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: COLORS.TEXT_DIM,
    });

    this.statusText = this.add.text(x, y + 14, 'Explore the map.\nFind fragments.', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: COLORS.TEXT_DIM,
      lineSpacing: 2,
      wordWrap: { width: PANEL_WIDTH - 24 },
    });
  }

  // ─── Controls ───────────────────────────────────────────────────────────

  private createControlsSection(): void {
    const x = PANEL_X + 12;
    const y = 440;

    this.addSeparator(y - 8);

    this.add.text(x, y, 'CONTROLS', {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: COLORS.TEXT_MUTED,
    });

    const controls = 'WASD  Move\nE     Interact\nESC   Menu\nM     Mute';
    this.add.text(x, y + 12, controls, {
      fontSize: '7px',
      fontFamily: 'monospace',
      color: COLORS.TEXT_MUTED,
      lineSpacing: 3,
    });
  }

  // ─── Save Indicator ─────────────────────────────────────────────────────

  private createSaveIndicator(): void {
    this.saveIndicator = this.add.text(
      PANEL_X + PANEL_WIDTH / 2, 520, '',
      { fontSize: '8px', fontFamily: 'monospace', color: COLORS.SUCCESS_GREEN }
    ).setOrigin(0.5).setAlpha(0);
  }

  showSaveIndicator(): void {
    this.saveIndicator.setText('SAVED \u2713');
    this.saveIndicator.setAlpha(1);

    if (this.saveTween) this.saveTween.stop();
    this.saveTween = this.tweens.add({
      targets: this.saveIndicator,
      alpha: 0,
      delay: 1500,
      duration: 500,
      ease: 'Power2',
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private addSeparator(y: number): void {
    const sep = this.add.graphics();
    sep.lineStyle(1, COLORS_HEX.BG_PANEL_BORDER, 0.5);
    sep.lineBetween(PANEL_X + 10, y, PANEL_X + PANEL_WIDTH - 10, y);
  }

  // ─── Public Updaters ────────────────────────────────────────────────────

  updateLevel(levelNumber: number, scenarioName: string): void {
    this.levelText.setText(`Level ${levelNumber}\n${scenarioName}`);
  }

  updateMode(mode: DifficultyMode): void {
    const colors: Record<DifficultyMode, string> = {
      beginner: COLORS.DIFFICULTY_BEGINNER,
      normal: COLORS.DIFFICULTY_NORMAL,
      hard: COLORS.DIFFICULTY_HARD,
    };
    this.modeBadge.setText(mode.toUpperCase());
    this.modeBadge.setColor(colors[mode]);
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
