import Phaser from 'phaser';
import { ScoreSystem } from '@/systems/ScoreSystem';
import { submitScore as submitScoreLocal, updatePersonalBest } from '@/lib/LocalStorageService';
import { fadeIn, fadeToScene } from '@/lib/SceneTransition';
import { t } from '@/lib/i18n';
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
   */
  private displayResults(): void {
    // Title in gold
    this.add.text(480, 70, t('victory.title'), {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Congratulatory message
    this.add.text(480, 130, t('victory.message'), {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Final Score
    this.add.text(480, 200, t('victory.final_score', { score: this.victoryData.score }), {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Bugs Defeated
    this.add.text(480, 250, t('victory.bugs_defeated', { count: this.victoryData.bugsDefeated }), {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#cccccc',
    }).setOrigin(0.5);

    // Puzzles Solved
    this.add.text(480, 290, t('victory.puzzles_solved', { count: this.victoryData.puzzlesSolved }), {
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
    const newRunBtn = this.add.text(480, 380, t('victory.new_run'), {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    newRunBtn.on('pointerover', () => newRunBtn.setColor('#88ff88'));
    newRunBtn.on('pointerout', () => newRunBtn.setColor('#44ff44'));
    newRunBtn.on('pointerdown', () => this.startNewRun());

    // View Leaderboard button
    const leaderboardBtn = this.add.text(480, 440, t('victory.view_leaderboard'), {
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
   */
  private startNewRun(): void {
    fadeToScene(this, 'MainMenuScene');
  }

  /**
   * Navigate to LeaderboardScene.
   */
  private viewLeaderboard(): void {
    fadeToScene(this, 'LeaderboardScene');
  }

  /**
   * Submit the run score to the backend via ScoreSystem and save locally.
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
