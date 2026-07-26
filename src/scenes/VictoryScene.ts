import Phaser from 'phaser';
import { ScoreSystem } from '@/systems/ScoreSystem';
import { submitScore as submitScoreLocal, updatePersonalBest } from '@/lib/LocalStorageService';
import { fadeIn, fadeToScene } from '@/lib/SceneTransition';
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
    fadeIn(this);

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
   * Start a new run: return to MainMenu for difficulty selection.
   * Requirement: 8.5
   */
  private startNewRun(): void {
    fadeToScene(this, 'MainMenuScene');
  }

  /**
   * Navigate to LeaderboardScene.
   * Requirement: 8.6
   */
  private viewLeaderboard(): void {
    fadeToScene(this, 'LeaderboardScene');
  }

  /**
   * Submit the run score to the backend via ScoreSystem and save locally.
   * Requirement: 5.3
   */
  private submitScoreToBackend(): void {
    const username = this.game.registry.get('playerProfile')?.username ?? 'anonymous';

    // Always save to localStorage (offline-first)
    submitScoreLocal(username, this.victoryData.score);
    updatePersonalBest(username, this.victoryData.score);

    // Also attempt API submission (fire and forget)
    const result: RunResult = {
      username,
      score: this.victoryData.score,
      highestLevel: this.victoryData.levelReached,
      totalPuzzlesSolved: this.victoryData.puzzlesSolved,
      totalBugsDefeated: this.victoryData.bugsDefeated,
    };
    this.scoreSystem.submitScore(result);
  }
}
