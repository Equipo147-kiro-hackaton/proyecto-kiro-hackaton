import Phaser from 'phaser';

interface TutorialStep {
  title: string;
  lines: string[];
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Room Navigation',
    lines: [
      'Use WASD or Arrow keys to move between rooms in the dungeon.',
      'Each level has combat rooms (where bugs await) and rest rooms (where you heal).',
    ],
  },
  {
    title: 'Puzzle Combat',
    lines: [
      'When you enter a combat room, a programming puzzle appears.',
      'Type your answer and press Enter to attack the bug.',
      'Correct answers deal damage based on remaining time. Wrong answers cost you 10 HP.',
    ],
  },
  {
    title: 'Timer Mechanics',
    lines: [
      'You have 60 seconds (90 for boss bugs) to solve each puzzle.',
      'Solving faster = more damage! If timer hits 0, you take 15 HP damage.',
      'Watch the timer turn red when 10 seconds remain!',
    ],
  },
  {
    title: 'Items & Strategy',
    lines: [
      'After defeating bugs, choose from 2 items to help you.',
      'You can hold up to 3 active items. Use them wisely!',
      'Items include: Timer Extension, HP Recovery, Score Multiplier, and more.',
    ],
  },
  {
    title: 'Ready to Go!',
    lines: [
      'Your goal: survive as many levels as possible and get the highest score!',
      'Good luck, hero! Press Enter to begin your first run.',
    ],
  },
];

export class TutorialScene extends Phaser.Scene {
  private currentStep = 0;
  private titleText!: Phaser.GameObjects.Text;
  private descriptionText!: Phaser.GameObjects.Text;
  private buttonText!: Phaser.GameObjects.Text;
  private stepIndicator!: Phaser.GameObjects.Text;

  constructor() {
    super('TutorialScene');
  }

  create(): void {
    this.currentStep = 0;

    // Title text (step title)
    this.titleText = this.add.text(480, 120, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Description text (step content)
    this.descriptionText = this.add.text(480, 270, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 700 },
      lineSpacing: 10,
    }).setOrigin(0.5);

    // Navigation button
    this.buttonText = this.add.text(480, 440, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.buttonText.on('pointerover', () => {
      this.buttonText.setColor('#88ff88');
    });

    this.buttonText.on('pointerout', () => {
      this.buttonText.setColor('#44ff44');
    });

    this.buttonText.on('pointerdown', () => {
      this.advance();
    });

    // Step indicator
    this.stepIndicator = this.add.text(480, 490, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5);

    // Keyboard support: Enter or Space advances
    this.input.keyboard?.on('keydown-ENTER', () => {
      this.advance();
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.advance();
    });

    this.renderStep();
  }

  private renderStep(): void {
    const step = TUTORIAL_STEPS[this.currentStep];
    const isLastStep = this.currentStep === TUTORIAL_STEPS.length - 1;

    this.titleText.setText(step.title);
    this.descriptionText.setText(step.lines.join('\n'));
    this.buttonText.setText(isLastStep ? '[ START! ]' : '[ NEXT \u2192 ]');
    this.stepIndicator.setText(`Step ${this.currentStep + 1}/${TUTORIAL_STEPS.length}`);
  }

  private advance(): void {
    if (this.currentStep < TUTORIAL_STEPS.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      this.onComplete();
    }
  }

  private onComplete(): void {
    this.game.registry.set('tutorialDone', true);
    this.scene.start('ExplorationScene', { level: 1, difficulty: 'beginner', hp: 100, score: 0 });
  }
}
