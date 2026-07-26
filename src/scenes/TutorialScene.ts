import Phaser from 'phaser';
import { fadeIn, fadeToScene } from '@/lib/SceneTransition';
import { COLORS, COLORS_HEX } from '@/lib/Colors';
import { t, onLocaleChange } from '@/lib/i18n';
import type { DifficultyMode } from '@/types';
import type { TranslationKey } from '@/data/translations';

const TUTORIAL_DONE_KEY = 'cq-tutorial-done';

const TUTORIAL_STEP_KEYS: TranslationKey[] = [
  'tutorial.step_1',
  'tutorial.step_2',
  'tutorial.step_3',
  'tutorial.step_4',
  'tutorial.step_5',
  'tutorial.step_6',
];

interface TutorialSceneData {
  pendingDifficulty?: DifficultyMode;
}

/**
 * TutorialScene — First-run onboarding.
 * Called from MainMenuScene when localStorage.cq-tutorial-done is not set.
 */
export class TutorialScene extends Phaser.Scene {
  private currentStep = 0;
  private pendingDifficulty: DifficultyMode = 'beginner';

  private titleText!: Phaser.GameObjects.Text;
  private stepText!: Phaser.GameObjects.Text;
  private nextButton!: Phaser.GameObjects.Text;
  private skipButton!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private localeUnsubscribe: (() => void) | null = null;

  constructor() {
    super('TutorialScene');
  }

  init(data: TutorialSceneData): void {
    this.currentStep = 0;
    this.pendingDifficulty = data.pendingDifficulty ?? 'beginner';
  }

  create(): void {
    fadeIn(this);

    this.add.rectangle(480, 270, 960, 540, COLORS_HEX.BG_DARK);

    this.titleText = this.add
      .text(480, 60, t('tutorial.title'), {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '28px',
        color: COLORS.PRIMARY_CYAN,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const sep = this.add.graphics();
    sep.lineStyle(1, COLORS_HEX.PRIMARY_BLUE, 0.4);
    sep.lineBetween(200, 95, 760, 95);

    this.stepText = this.add
      .text(480, 250, '', {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '18px',
        color: COLORS.TEXT_WHITE,
        align: 'center',
        wordWrap: { width: 720 },
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    this.nextButton = this.add
      .text(480, 420, t('tutorial.next'), {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '18px',
        color: COLORS.SUCCESS_GREEN,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.nextButton.on('pointerover', () => this.nextButton.setColor('#88ff88'));
    this.nextButton.on('pointerout', () => this.nextButton.setColor(COLORS.SUCCESS_GREEN));
    this.nextButton.on('pointerdown', () => this.advance());

    this.skipButton = this.add
      .text(480, 465, t('tutorial.skip'), {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '12px',
        color: COLORS.TEXT_DIM,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.skipButton.on('pointerover', () => this.skipButton.setColor(COLORS.TEXT_WHITE));
    this.skipButton.on('pointerout', () => this.skipButton.setColor(COLORS.TEXT_DIM));
    this.skipButton.on('pointerdown', () => this.skipTutorial());

    this.progressText = this.add
      .text(480, 500, '', {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '11px',
        color: COLORS.TEXT_MUTED,
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ENTER', () => this.advance());
    this.input.keyboard?.on('keydown-SPACE', () => this.advance());
    this.input.keyboard?.on('keydown-ESC', () => this.skipTutorial());

    this.renderStep();

    this.localeUnsubscribe = onLocaleChange(() => this.renderStep());
    this.events.on('shutdown', () => {
      if (this.localeUnsubscribe) {
        this.localeUnsubscribe();
        this.localeUnsubscribe = null;
      }
    });
  }

  private renderStep(): void {
    const isLastStep = this.currentStep === TUTORIAL_STEP_KEYS.length - 1;
    const stepKey = TUTORIAL_STEP_KEYS[this.currentStep];

    this.titleText.setText(t('tutorial.title'));
    this.stepText.setText(t(stepKey));
    this.nextButton.setText(isLastStep ? t('tutorial.start') : t('tutorial.next'));
    this.skipButton.setText(t('tutorial.skip'));
    this.progressText.setText(`${this.currentStep + 1} / ${TUTORIAL_STEP_KEYS.length}`);
  }

  private advance(): void {
    if (this.currentStep < TUTORIAL_STEP_KEYS.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      this.completeAndStart();
    }
  }

  private skipTutorial(): void {
    localStorage.setItem(TUTORIAL_DONE_KEY, 'true');
    this.game.registry.set('tutorialDone', true);
    fadeToScene(this, 'MainMenuScene');
  }

  private completeAndStart(): void {
    localStorage.setItem(TUTORIAL_DONE_KEY, 'true');
    this.game.registry.set('tutorialDone', true);
    fadeToScene(this, 'ExplorationScene', {
      level: 1,
      difficulty: this.pendingDifficulty,
      hp: 100,
      score: 0,
    });
  }
}
