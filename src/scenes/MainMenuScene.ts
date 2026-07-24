import Phaser from 'phaser';
import type { PlayerProfile } from '@/types';

export class MainMenuScene extends Phaser.Scene {
  private startButton!: Phaser.GameObjects.Text;
  private leaderboardButton!: Phaser.GameObjects.Text;

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    const profile = this.game.registry.get('playerProfile') as PlayerProfile | undefined;
    const username = profile?.username ?? 'Player';
    const personalBest = profile?.personalBest ?? 0;

    // Welcome text
    this.add.text(480, 100, `Welcome, ${username}!`, {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Personal best score
    this.add.text(480, 150, `Personal Best: ${personalBest}`, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffdd44',
    }).setOrigin(0.5);

    // Start Run button
    this.startButton = this.add.text(480, 260, '[ START RUN ]', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.startButton.on('pointerover', () => {
      this.startButton.setColor('#88ff88');
    });

    this.startButton.on('pointerout', () => {
      this.startButton.setColor('#44ff44');
    });

    this.startButton.on('pointerdown', () => {
      this.handleStartRun();
    });

    // Leaderboard button
    this.leaderboardButton = this.add.text(480, 330, '[ LEADERBOARD ]', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#4488ff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.leaderboardButton.on('pointerover', () => {
      this.leaderboardButton.setColor('#88bbff');
    });

    this.leaderboardButton.on('pointerout', () => {
      this.leaderboardButton.setColor('#4488ff');
    });

    this.leaderboardButton.on('pointerdown', () => {
      this.scene.start('LeaderboardScene');
    });

    // Keyboard hints
    this.add.text(480, 420, 'Press 1 or S to Start  |  Press 2 or L for Leaderboard', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5);

    // Keyboard support
    this.input.keyboard?.on('keydown-ONE', () => {
      this.handleStartRun();
    });
    this.input.keyboard?.on('keydown-S', () => {
      this.handleStartRun();
    });
    this.input.keyboard?.on('keydown-TWO', () => {
      this.scene.start('LeaderboardScene');
    });
    this.input.keyboard?.on('keydown-L', () => {
      this.scene.start('LeaderboardScene');
    });
  }

  private handleStartRun(): void {
    const tutorialDone = this.game.registry.get('tutorialDone') as boolean | undefined;
    if (tutorialDone) {
      this.scene.start('GameScene');
    } else {
      this.scene.start('TutorialScene');
    }
  }
}
