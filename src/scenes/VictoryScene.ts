import Phaser from 'phaser';
import { ScoreSystem } from '@/systems/ScoreSystem';
import type { VictoryData, RunResult } from '@/types';

/**
 * VictoryScene — displayed when the Player completes the final Level.
 * Shows final score, bugs defeated, congratulatory message, and provides
 * "New Run" and "View Leaderboard" buttons.
 *
 * Requirements: 8.2, 8.4, 8.5, 8.6
 */
export class VictoryScene extends Phaser.Scene {
  private victoryData!: VictoryData;
  private scoreSystem!: ScoreSystem;

  constructor() {
    super('VictoryScene');
  }

  init(data: VictoryData): void {
    this.victoryData = data;
  }

  create(): void {
    this.scoreSystem = new ScoreSystem();

    this.displayResults();
    this.createButtons();
    this.submitScoreToBackend();
  }

  /**
   * Display the victory results: title, score, bugs defeated, puzzles solved,
   * and congratulatory message.
   * Requirements: 8.2, 8.4
   */
  private displayResults(): void {
    // Title in gold
    this.add.text(480, 70, 'DUNGEON CLEARED!', {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Congratulatory message
    this.add.text(480, 130, 'You vanquished all the production bugs!', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Final Score
    this.add.text(480, 200, `Final Score: ${this.victoryData.score}`, {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Bugs Defeated
    this.add.text(480, 250, `Bugs Defeated: ${this.victoryData.bugsDefeated}`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#cccccc',
    }).setOrigin(0.5);

    // Puzzles Solved
    this.add.text(480, 290, `Puzzles Solved: ${this.victoryData.puzzlesSolved}`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#cccccc',
    }).setOrigin(0.5);
  }

  /**
   * Create "New Run" and "View Leaderboard" buttons.
   * Requirement: 8.4
   */
  private createButtons(): void {
    // New Run button
    const newRunBtn = this.add.text(480, 380, '[ NEW RUN ]', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    newRunBtn.on('pointerover', () => newRunBtn.setColor('#88ff88'));
    newRunBtn.on('pointerout', () => newRunBtn.setColor('#44ff44'));
    newRunBtn.on('pointerdown', () => this.startNewRun());

    // View Leaderboard button
    const leaderboardBtn = this.add.text(480, 440, '[ VIEW LEADERBOARD ]', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#66ccff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    leaderboardBtn.on('pointerover', () => leaderboardBtn.setColor('#99ddff'));
    leaderboardBtn.on('pointerout', () => leaderboardBtn.setColor('#66ccff'));
    leaderboardBtn.on('pointerdown', () => this.viewLeaderboard());
  }

  /**
   * Start a new run: reset RunState (HP=100, items=[], score=0, level=1),
   * preserve username, generate new levels, transition to GameScene.
   * Requirement: 8.5
   */
  private startNewRun(): void {
    this.scene.start('GameScene');
  }

  /**
   * Navigate to LeaderboardScene.
   * Requirement: 8.6
   */
  private viewLeaderboard(): void {
    this.scene.start('LeaderboardScene');
  }

  /**
   * Submit the run score to the backend via ScoreSystem.
   * Requirement: 5.3
   */
  private submitScoreToBackend(): void {
    const result: RunResult = {
      username: this.game.registry.get('playerProfile')?.username ?? 'anonymous',
      score: this.victoryData.score,
      highestLevel: this.game.registry.get('runState')?.highestLevelReached ?? 10,
      totalPuzzlesSolved: this.victoryData.puzzlesSolved,
      totalBugsDefeated: this.victoryData.bugsDefeated,
    };

    // Fire and forget — ScoreSystem handles retry logic internally
    this.scoreSystem.submitScore(result);
  }
}
