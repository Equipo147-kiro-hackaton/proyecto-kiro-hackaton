import Phaser from 'phaser';
import { getIntroStory } from '@/systems/StorySystem';
import { generateStory } from '@/lib/ApiClient';
import { getLocale } from '@/lib/i18n';
import { getLevelDefinition } from '@/data/levels';
import { fadeIn, fadeToScene } from '@/lib/SceneTransition';
import { COLORS_HEX } from '@/lib/Colors';
import { t } from '@/lib/i18n';
import type { DifficultyMode } from '@/types';

interface IntroCutsceneData {
  level: number;
  difficulty: DifficultyMode;
  hp: number;
  score: number;
}

/**
 * IntroCutsceneScene — Shows a typewriter-style intro story before each level.
 * Tries Bedrock AI first (if enabled), then falls back to static stories.
 * Player can skip with Enter/Space/ESC.
 */
export class IntroCutsceneScene extends Phaser.Scene {
  private sceneData!: IntroCutsceneData;
  private storyText!: Phaser.GameObjects.Text;
  private skipHint!: Phaser.GameObjects.Text;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private isComplete = false;

  constructor() { super('IntroCutsceneScene'); }

  init(data: IntroCutsceneData): void { this.sceneData = data; }

  create(): void {
    fadeIn(this);
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Dark background
    this.add.rectangle(w / 2, h / 2, w, h, COLORS_HEX.BG_DARK);

    // Level title
    const ld = getLevelDefinition(this.sceneData.level);
    const levelName = ld?.name ?? `Level ${this.sceneData.level}`;
    this.add.text(w / 2, 40, levelName, {
      fontSize: '12px', fontFamily: 'Press Start 2P, monospace', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Separator
    const sep = this.add.graphics();
    sep.lineStyle(1, COLORS_HEX.PRIMARY_BLUE, 0.4);
    sep.lineBetween(100, 65, w - 100, 65);

    // Story text area (typewriter target)
    this.storyText = this.add.text(w / 2, h * 0.45, '', {
      fontSize: '10px', fontFamily: 'Press Start 2P, monospace', color: '#cccccc',
      wordWrap: { width: w - 120 }, align: 'center', lineSpacing: 8,
    }).setOrigin(0.5);

    // Skip hint
    this.skipHint = this.add.text(w / 2, h - 30, t('common.continue') + ' [Enter/Space]', {
      fontSize: '7px', fontFamily: 'Press Start 2P, monospace', color: '#666666',
    }).setOrigin(0.5).setAlpha(0);

    // Load story
    this.loadStory();

    // Skip handlers
    this.input.keyboard?.on('keydown-ENTER', () => this.skipOrProceed());
    this.input.keyboard?.on('keydown-SPACE', () => this.skipOrProceed());
    this.input.keyboard?.on('keydown-ESC', () => this.proceed());
  }

  private async loadStory(): Promise<void> {
    const ld = getLevelDefinition(this.sceneData.level);
    const levelId = ld?.id ?? `level-${this.sceneData.level}`;

    // Try Bedrock first
    const aiStory = await generateStory(
      levelId,
      'intro',
      getLocale(),
      ld?.bossDescription ?? `Level ${this.sceneData.level} intro`,
    );

    if (aiStory?.text) {
      this.typewrite(aiStory.text);
      return;
    }

    // Fall back to static
    const staticStory = getIntroStory(levelId);
    if (staticStory) {
      this.typewrite(staticStory.text);
    } else {
      this.typewrite(`Entering ${ld?.name ?? 'the dungeon'}...`);
    }
  }

  private typewrite(text: string): void {
    let idx = 0;
    this.typewriterTimer = this.time.addEvent({
      delay: 30,
      repeat: text.length - 1,
      callback: () => {
        idx++;
        this.storyText.setText(text.substring(0, idx));
        if (idx >= text.length) {
          this.onTypewriterDone();
        }
      },
    });
  }

  private onTypewriterDone(): void {
    this.isComplete = true;
    this.skipHint.setAlpha(1);
    this.tweens.add({
      targets: this.skipHint, alpha: 0.5,
      duration: 800, yoyo: true, repeat: -1,
    });

    // Auto-proceed after 4 seconds
    this.time.delayedCall(4000, () => this.proceed());
  }

  private skipOrProceed(): void {
    if (this.isComplete) {
      this.proceed();
    } else {
      // Skip typewriter — show full text immediately
      if (this.typewriterTimer) {
        this.typewriterTimer.destroy();
        this.typewriterTimer = null;
      }
      const ld = getLevelDefinition(this.sceneData.level);
      const levelId = ld?.id ?? `level-${this.sceneData.level}`;
      const staticStory = getIntroStory(levelId);
      if (staticStory) this.storyText.setText(staticStory.text);
      this.onTypewriterDone();
    }
  }

  private proceed(): void {
    if (this.typewriterTimer) { this.typewriterTimer.destroy(); this.typewriterTimer = null; }
    fadeToScene(this, 'ExplorationScene', {
      level: this.sceneData.level,
      difficulty: this.sceneData.difficulty,
      hp: this.sceneData.hp,
      score: this.sceneData.score,
    });
  }
}
