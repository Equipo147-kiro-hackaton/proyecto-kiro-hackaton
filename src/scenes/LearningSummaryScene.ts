import Phaser from 'phaser';
import { getOutroStory } from '@/systems/StorySystem';
import { generateStory } from '@/lib/ApiClient';
import { getLocale } from '@/lib/i18n';
import { getLevelDefinition } from '@/data/levels';
import { fadeIn, fadeToScene } from '@/lib/SceneTransition';
import { COLORS_HEX } from '@/lib/Colors';
import { t } from '@/lib/i18n';
import type { DifficultyMode } from '@/types';

interface LearningSummaryData {
  level: number;
  difficulty: DifficultyMode;
  hp: number;
  score: number;
  puzzlesSolved: number;
  nextScene: 'ExplorationScene' | 'VictoryScene';
  nextSceneData: Record<string, unknown>;
}

/**
 * LearningSummaryScene — Shows what the player learned after defeating a boss.
 * Displays: outro story text, learned concepts as pills, real-world example.
 * Auto-proceeds or player can skip with Enter/Space.
 */
export class LearningSummaryScene extends Phaser.Scene {
  private sceneData!: LearningSummaryData;

  constructor() { super('LearningSummaryScene'); }

  init(data: LearningSummaryData): void { this.sceneData = data; }

  create(): void {
    fadeIn(this);
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.rectangle(w / 2, h / 2, w, h, COLORS_HEX.BG_DARK);

    // Title
    this.add.text(w / 2, 30, t('boss.defeated'), {
      fontSize: '14px', fontFamily: 'Press Start 2P, monospace', color: '#44ff44', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Level subtitle
    const ld = getLevelDefinition(this.sceneData.level);
    this.add.text(w / 2, 55, ld?.name ?? '', {
      fontSize: '8px', fontFamily: 'Press Start 2P, monospace', color: '#ffcc00',
    }).setOrigin(0.5);

    const sep = this.add.graphics();
    sep.lineStyle(1, COLORS_HEX.PRIMARY_BLUE, 0.3);
    sep.lineBetween(80, 72, w - 80, 72);

    // Load story content
    this.loadOutroContent();

    // Skip
    const hint = this.add.text(w / 2, h - 20, t('common.continue') + ' [Enter/Space]', {
      fontSize: '7px', fontFamily: 'Press Start 2P, monospace', color: '#666666',
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.4, duration: 1000, yoyo: true, repeat: -1 });

    this.input.keyboard?.on('keydown-ENTER', () => this.proceed());
    this.input.keyboard?.on('keydown-SPACE', () => this.proceed());
    this.input.keyboard?.on('keydown-ESC', () => this.proceed());

    // Auto-proceed after 8 seconds
    this.time.delayedCall(8000, () => this.proceed());
  }

  private async loadOutroContent(): Promise<void> {
    const w = this.cameras.main.width;
    const ld = getLevelDefinition(this.sceneData.level);
    const levelId = ld?.id ?? `level-${this.sceneData.level}`;

    // Try AI first
    const aiStory = await generateStory(
      levelId,
      'outro',
      getLocale(),
      ld?.bossDescription ?? `Level ${this.sceneData.level} outro`,
    );

    let storyText = '';
    let concepts: string[] = [];
    let realWorld = '';

    if (aiStory?.text) {
      storyText = aiStory.text;
      concepts = aiStory.learnedConcepts ?? [];
      realWorld = aiStory.realWorldExample ?? '';
    } else {
      const staticStory = getOutroStory(levelId);
      if (staticStory) {
        storyText = staticStory.text;
        concepts = staticStory.learnedConcepts ?? [];
        realWorld = staticStory.realWorldExample ?? '';
      }
    }

    // Story text
    this.add.text(w / 2, 120, storyText, {
      fontSize: '9px', fontFamily: 'Press Start 2P, monospace', color: '#cccccc',
      wordWrap: { width: w - 100 }, align: 'center', lineSpacing: 6,
    }).setOrigin(0.5, 0);

    // Learned concepts as pills
    if (concepts.length > 0) {
      this.add.text(w / 2, 240, 'LEARNED:', {
        fontSize: '7px', fontFamily: 'Press Start 2P, monospace', color: '#44ccff',
      }).setOrigin(0.5);

      const pillStartX = w / 2 - (concepts.length * 70) / 2;
      concepts.forEach((concept, idx) => {
        const px = pillStartX + idx * 70 + 35;
        this.add.text(px, 265, concept, {
          fontSize: '6px', fontFamily: 'Press Start 2P, monospace', color: '#ffffff',
          backgroundColor: '#2a4a6a', padding: { x: 6, y: 4 },
        }).setOrigin(0.5);
      });
    }

    // Real-world example
    if (realWorld) {
      this.add.rectangle(w / 2, 340, w - 80, 60, 0x1a2a1a).setStrokeStyle(1, 0x44aa44, 0.4);
      this.add.text(w / 2, 320, '\u{1F30D} REAL WORLD', {
        fontSize: '7px', fontFamily: 'Press Start 2P, monospace', color: '#44aa44',
      }).setOrigin(0.5);
      this.add.text(w / 2, 345, realWorld, {
        fontSize: '7px', fontFamily: 'Press Start 2P, monospace', color: '#88cc88',
        wordWrap: { width: w - 120 }, align: 'center', lineSpacing: 4,
      }).setOrigin(0.5);
    }

    // Stats
    this.add.text(w / 2, 410, `Puzzles solved: ${this.sceneData.puzzlesSolved} | Score: ${this.sceneData.score}`, {
      fontSize: '7px', fontFamily: 'Press Start 2P, monospace', color: '#888888',
    }).setOrigin(0.5);
  }

  private proceed(): void {
    fadeToScene(this, this.sceneData.nextScene, this.sceneData.nextSceneData);
  }
}
