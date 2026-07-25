import Phaser from 'phaser';
import { ScoreSystem } from '@/systems/ScoreSystem';
import { LevelGenerator } from '@/systems/LevelGenerator';
import type { GameOverData, RunResult } from '@/types';

/**
 * GameOverScene — displayed when the hero's HP reaches 0.
 * Shows final score, level reached, bugs defeated, and provides
 * "New Run" and "View Leaderboard" buttons.
 *
 * Requirements: 8.1, 8.3, 8.5, 8.6
 */
export class GameOverScene extends Phaser.Scene {
  private gameOverData!: GameOverData;
  private scoreSystem!: ScoreSystem;

  constructor() {
    super('GameOverScene');
  }

  init(data: GameOverData): void {
    this.gameOverData = data;
  }

  create(): void {
    this.scoreSystem = new ScoreSystem();

    this.displayResults();
    this.createButtons();
    this.submitScoreToBackend();
  }

  /**
   * Display the game over results: title, score, level, bugs defeated, puzzles solved.
   */
  private displayResults(): void {
    // Title
    this.add.text(480, 80, 'GAME OVER', {
      fontSize: '40px',
      fontFamily: 'monospace',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Final Score
    this.add.text(480, 170, `Final Score: ${this.gameOverData.score}`, {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Level Reached
    this.add.text(480, 220, `Level Reached: ${this.gameOverData.levelReached}`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#cccccc',
    }).setOrigin(0.5);

    // Bugs Defeated
    this.add.text(480, 260, `Bugs Defeated: ${this.gameOverData.bugsDefeated}`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#cccccc',
    }).setOrigin(0.5);

    // Puzzles Solved
    this.add.text(480, 300, `Puzzles Solved: ${this.gameOverData.puzzlesSolved}`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#cccccc',
    }).setOrigin(0.5);
  }

  /**
   * Create "New Run" and "View Leaderboard" buttons.
   */
  private createButtons(): void {
    // New Run button
    const newRunBtn = this.add.text(480, 390, '[ NEW RUN ]', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    newRunBtn.on('pointerover', () => newRunBtn.setColor('#88ff88'));
    newRunBtn.on('pointerout', () => newRunBtn.setColor('#44ff44'));
    newRunBtn.on('pointerdown', () => this.startNewRun());

    // View Leaderboard button
    const leaderboardBtn = this.add.text(480, 450, '[ VIEW LEADERBOARD ]', {
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
    // GameScene.create() already initializes a fresh RunState from playerProfile,
    // so we just need to start the scene. The LevelGenerator.generate() is called
    // inside GameScene.initRunState().
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
   * Requirement: 8.3
   */
  private submitScoreToBackend(): void {
    const result: RunResult = {
      username: this.game.registry.get('playerProfile')?.username ?? 'anonymous',
      score: this.gameOverData.score,
      highestLevel: this.gameOverData.levelReached,
      totalPuzzlesSolved: this.gameOverData.puzzlesSolved,
      totalBugsDefeated: this.gameOverData.bugsDefeated,
    };

    // Fire and forget — ScoreSystem handles retry logic internally
    this.scoreSystem.submitScore(result);
  }
}
