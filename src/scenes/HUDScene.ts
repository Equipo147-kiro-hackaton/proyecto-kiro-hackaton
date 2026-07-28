import Phaser from 'phaser';
import { EventBus } from '@/lib/EventBus';
import { COLORS, COLORS_HEX } from '@/lib/Colors';
import { t, onLocaleChange } from '@/lib/i18n';
import { HUD_BLOCKS, hpSegments, objectiveCounterText } from '@/systems/HudLayout';
import type { DifficultyMode } from '@/types';
import type { TranslationKey } from '@/data/translations';

/**
 * HUDScene — Overlay-block HUD system.
 * Renders status, score, controls, and top-band blocks as camera-fixed overlays.
 * All elements use setScrollFactor(0) so they stay fixed regardless of camera position.
 */

const BLOCK_ALPHA = 0.6;

const LEVEL_NAME_KEYS: Record<number, TranslationKey> = {
  1: 'level.1.name',
  2: 'level.2.name',
  3: 'level.3.name',
  4: 'level.4.name',
  5: 'level.5.name',
};

const MODE_KEYS: Record<DifficultyMode, TranslationKey> = {
  beginner: 'menu.difficulty.beginner',
  normal: 'menu.difficulty.normal',
  hard: 'menu.difficulty.hard',
};

export class HUDScene extends Phaser.Scene {
  // Status block elements
  private hpSegmentGraphics!: Phaser.GameObjects.Graphics;
  private hpLabel!: Phaser.GameObjects.Text;
  private objectivesText!: Phaser.GameObjects.Text;
  private fragmentsLabel!: Phaser.GameObjects.Text;

  // Score block elements
  private scoreLabel!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  // Controls block elements
  private controlsContainer!: Phaser.GameObjects.Container;
  private controlsLabel!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;

  // Top band elements
  private topBandContainer!: Phaser.GameObjects.Container;
  private levelText!: Phaser.GameObjects.Text;
  private modeBadge!: Phaser.GameObjects.Text;

  // Save indicator
  private saveIndicator!: Phaser.GameObjects.Text;
  private saveTween: Phaser.Tweens.Tween | null = null;

  // Block backgrounds
  private statusBg!: Phaser.GameObjects.Rectangle;
  private scoreBg!: Phaser.GameObjects.Rectangle;
  private controlsBg!: Phaser.GameObjects.Rectangle;
  private topBandBg!: Phaser.GameObjects.Rectangle;

  // Current state
  private currentHearts = 4;
  private maxHearts = 4;
  private currentCollected = 0;
  private currentTotal = 0;
  private currentLevel = 1;
  private currentScenarioName = '';
  private currentMode: DifficultyMode = 'normal';
  private currentScore = 0;

  private localeUnsubscribe: (() => void) | null = null;

  constructor() {
    super('HUDScene');
  }

  create(): void {
    // Lock HUD camera at origin — prevents scrolling with game world
    this.cameras.main.setViewport(0, 0, 960, 540);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBounds(0, 0, 960, 540);

    // Reset state on each session start
    this.currentHearts = 4;
    this.maxHearts = 4;
    this.currentCollected = 0;
    this.currentTotal = 0;
    this.currentScore = 0;

    this.createStatusBlock();
    this.createScoreBlock();
    this.createControlsBlock();
    this.createTopBand();
    this.createSaveIndicator();
    this.setupEventListeners();

    this.localeUnsubscribe = onLocaleChange(() => this.refreshTexts());
    this.events.on('shutdown', () => {
      if (this.localeUnsubscribe) {
        this.localeUnsubscribe();
        this.localeUnsubscribe = null;
      }
    });
  }

  // ─── Status Block (HP bar + objectives counter) ─────────────────────────

  private createStatusBlock(): void {
    const { x, y, width, height } = HUD_BLOCKS.status;

    this.statusBg = this.add.rectangle(
      x + width / 2, y + height / 2,
      width, height,
      COLORS_HEX.BG_DARK, BLOCK_ALPHA,
    ).setScrollFactor(0);

    // HP label
    this.hpLabel = this.add.text(x + 8, y + 8, t('hud.hp'), {
      fontSize: '8px',
      fontFamily: 'Press Start 2P, monospace',
      color: COLORS.TEXT_DIM,
    }).setScrollFactor(0);

    // HP segment bar (drawn as filled rectangles)
    this.hpSegmentGraphics = this.add.graphics().setScrollFactor(0);
    this.drawHpSegments(this.currentHearts);

    // Fragments / objectives label
    this.fragmentsLabel = this.add.text(x + 8, y + 40, t('hud.fragments'), {
      fontSize: '8px',
      fontFamily: 'Press Start 2P, monospace',
      color: COLORS.TEXT_DIM,
    }).setScrollFactor(0);

    // Objectives counter text (X/N format)
    this.objectivesText = this.add.text(x + width - 8, y + 40, objectiveCounterText(0, 0), {
      fontSize: '10px',
      fontFamily: 'Press Start 2P, monospace',
      color: COLORS.HUD_FRAGMENTS,
    }).setOrigin(1, 0).setScrollFactor(0);
  }

  private drawHpSegments(filledCount: number): void {
    const { x, y } = HUD_BLOCKS.status;
    const segX = x + 40;
    const segY = y + 8;
    const segWidth = 40;
    const segHeight = 14;
    const gap = 4;
    const totalSegments = 4;

    this.hpSegmentGraphics.clear();

    for (let i = 0; i < totalSegments; i++) {
      const sx = segX + i * (segWidth + gap);

      if (i < filledCount) {
        this.hpSegmentGraphics.fillStyle(COLORS_HEX.DANGER_RED, 1);
        this.hpSegmentGraphics.fillRect(sx, segY, segWidth, segHeight);
      } else {
        this.hpSegmentGraphics.fillStyle(COLORS_HEX.BG_PANEL, 0.8);
        this.hpSegmentGraphics.fillRect(sx, segY, segWidth, segHeight);
        this.hpSegmentGraphics.lineStyle(1, COLORS_HEX.DANGER_RED, 0.4);
        this.hpSegmentGraphics.strokeRect(sx, segY, segWidth, segHeight);
      }
    }
  }

  // ─── Score Block ────────────────────────────────────────────────────────

  private createScoreBlock(): void {
    const { x, y, width, height } = HUD_BLOCKS.score;

    this.scoreBg = this.add.rectangle(
      x + width / 2, y + height / 2,
      width, height,
      COLORS_HEX.BG_DARK, BLOCK_ALPHA,
    ).setScrollFactor(0);

    this.scoreLabel = this.add.text(x + 8, y + 8, t('hud.score'), {
      fontSize: '8px',
      fontFamily: 'Press Start 2P, monospace',
      color: COLORS.TEXT_DIM,
    }).setScrollFactor(0);

    this.scoreText = this.add.text(x + width - 8, y + 8, '0', {
      fontSize: '14px',
      fontFamily: 'Press Start 2P, monospace',
      color: COLORS.HUD_SCORE,
      fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(0);
  }

  // ─── Controls Block (hidden in hard mode) ───────────────────────────────

  private createControlsBlock(): void {
    const { x, y, width, height } = HUD_BLOCKS.controls;

    this.controlsBg = this.add.rectangle(
      x + width / 2, y + height / 2,
      width, height,
      COLORS_HEX.BG_DARK, BLOCK_ALPHA,
    ).setScrollFactor(0);

    this.controlsLabel = this.add.text(x + 8, y + 8, t('hud.controls'), {
      fontSize: '7px',
      fontFamily: 'Press Start 2P, monospace',
      color: COLORS.TEXT_MUTED,
    }).setScrollFactor(0);

    this.controlsText = this.add.text(x + 8, y + 22, t('hud.controls_list'), {
      fontSize: '7px',
      fontFamily: 'Press Start 2P, monospace',
      color: COLORS.TEXT_MUTED,
      lineSpacing: 3,
    }).setScrollFactor(0);

    // Container to manage visibility together
    this.controlsContainer = this.add.container(0, 0, [
      this.controlsBg,
      this.controlsLabel,
      this.controlsText,
    ]).setScrollFactor(0);
  }

  // ─── Top Band (difficulty name + objectives + score) ────────────────────

  private createTopBand(): void {
    const { x, y, width, height } = HUD_BLOCKS.topBand;

    this.topBandBg = this.add.rectangle(
      x + width / 2, y + height / 2,
      width, height,
      COLORS_HEX.BG_DARK, BLOCK_ALPHA,
    ).setScrollFactor(0);

    const levelKey = LEVEL_NAME_KEYS[this.currentLevel] ?? ('level.1.name' as TranslationKey);
    this.levelText = this.add.text(x + width / 2, y + 4, t(levelKey), {
      fontSize: '8px',
      fontFamily: 'Press Start 2P, monospace',
      color: COLORS.TEXT_WHITE,
      align: 'center',
    }).setOrigin(0.5, 0).setScrollFactor(0);

    const modeColors: Record<DifficultyMode, string> = {
      beginner: COLORS.DIFFICULTY_BEGINNER,
      normal: COLORS.DIFFICULTY_NORMAL,
      hard: COLORS.DIFFICULTY_HARD,
    };
    this.modeBadge = this.add.text(x + width / 2, y + 16, t(MODE_KEYS[this.currentMode]), {
      fontSize: '7px',
      fontFamily: 'Press Start 2P, monospace',
      color: modeColors[this.currentMode],
    }).setOrigin(0.5, 0).setScrollFactor(0);

    this.topBandContainer = this.add.container(0, 0, [
      this.topBandBg,
      this.levelText,
      this.modeBadge,
    ]).setScrollFactor(0);

    // Top band: always visible to show current difficulty
    this.topBandContainer.setVisible(true);
  }

  // ─── Save Indicator ─────────────────────────────────────────────────────

  private createSaveIndicator(): void {
    this.saveIndicator = this.add.text(
      480, 520, '',
      { fontSize: '8px', fontFamily: 'Press Start 2P, monospace', color: COLORS.SUCCESS_GREEN },
    ).setOrigin(0.5).setAlpha(0).setScrollFactor(0);
  }

  showSaveIndicator(): void {
    this.saveIndicator.setText(t('hud.saved'));
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

  // ─── Public Updaters ────────────────────────────────────────────────────

  updateHearts(current: number, max?: number): void {
    if (max !== undefined) this.maxHearts = max;
    this.currentHearts = current;

    const segments = hpSegments(current * 25); // convert hearts to HP scale
    this.drawHpSegments(segments);
  }

  updateScore(score: number): void {
    this.currentScore = score;
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

  updateFragments(collected: number, total: number): void {
    this.currentCollected = collected;
    this.currentTotal = total;
    this.objectivesText.setText(objectiveCounterText(collected, total));
  }

  updateLevel(levelNumber: number, scenarioName: string): void {
    this.currentLevel = levelNumber;
    this.currentScenarioName = scenarioName;
    const levelKey = LEVEL_NAME_KEYS[levelNumber] ?? ('level.1.name' as TranslationKey);
    this.levelText.setText(`${t(levelKey)}`);
  }

  updateMode(mode: DifficultyMode): void {
    this.currentMode = mode;
    const colors: Record<DifficultyMode, string> = {
      beginner: COLORS.DIFFICULTY_BEGINNER,
      normal: COLORS.DIFFICULTY_NORMAL,
      hard: COLORS.DIFFICULTY_HARD,
    };
    this.modeBadge.setText(t(MODE_KEYS[mode]));
    this.modeBadge.setColor(colors[mode]);

    // Controls block: hidden in hard mode
    this.controlsContainer.setVisible(mode !== 'hard');

    // Top band: always visible to show current difficulty
    this.topBandContainer.setVisible(true);
  }

  // ─── Locale Refresh ─────────────────────────────────────────────────────

  private refreshTexts(): void {
    this.hpLabel.setText(t('hud.hp'));
    this.scoreLabel.setText(t('hud.score'));
    this.fragmentsLabel.setText(t('hud.fragments'));
    this.controlsLabel.setText(t('hud.controls'));
    this.controlsText.setText(t('hud.controls_list'));

    const levelKey = LEVEL_NAME_KEYS[this.currentLevel] ?? ('level.1.name' as TranslationKey);
    this.levelText.setText(`${t(levelKey)}`);
    this.modeBadge.setText(t(MODE_KEYS[this.currentMode]));
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
