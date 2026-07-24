import Phaser from 'phaser';
import { getLeaderboard } from '@/lib/ApiClient';
import type { LeaderboardEntry } from '@/types';

/**
 * LeaderboardScene — displays the global top scores.
 * Loads data via ApiClient.getLeaderboard(), shows entries sorted highest to lowest,
 * handles loading/error states, and provides a "Back" button.
 *
 * Requirements: 5.5, 5.6, 5.7
 */
export class LeaderboardScene extends Phaser.Scene {
  private contentContainer!: Phaser.GameObjects.Container;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super('LeaderboardScene');
  }

  create(): void {
    this.contentContainer = this.add.container(0, 0);

    // Title
    this.add.text(480, 40, 'LEADERBOARD', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Loading indicator
    this.loadingText = this.add.text(480, 270, 'Loading...', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(480, 500, '[ BACK ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#66ccff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => backBtn.setColor('#99ddff'));
    backBtn.on('pointerout', () => backBtn.setColor('#66ccff'));
    backBtn.on('pointerdown', () => this.scene.start('MainMenuScene'));

    this.loadLeaderboard();
  }

  /**
   * Fetch leaderboard data within 3 seconds via ApiClient.
   * On success, render entries. On failure, show error with Retry button.
   * Requirement: 5.5
   */
  private async loadLeaderboard(): Promise<void> {
    try {
      const entries = await getLeaderboard();
      this.loadingText.setVisible(false);
      this.renderEntries(entries);
    } catch {
      this.loadingText.setVisible(false);
      this.showError();
    }
  }

  /**
   * Render leaderboard entries sorted highest to lowest.
   * Username truncated to 20 chars, score as numeric, date as YYYY-MM-DD.
   * If < 10 records, show only available records (no empty rows).
   * Requirements: 5.5, 5.6, 5.7
   */
  private renderEntries(entries: LeaderboardEntry[]): void {
    // Clear previous content
    this.contentContainer.removeAll(true);

    // Sort highest to lowest
    const sorted = [...entries].sort((a, b) => b.score - a.score);

    const startY = 90;
    const rowHeight = 36;
    const colRank = 120;
    const colUsername = 220;
    const colScore = 560;
    const colDate = 740;

    // Table header
    const headerStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
    };

    this.contentContainer.add(this.add.text(colRank, startY, '#', headerStyle));
    this.contentContainer.add(this.add.text(colUsername, startY, 'Username', headerStyle));
    this.contentContainer.add(this.add.text(colScore, startY, 'Score', headerStyle));
    this.contentContainer.add(this.add.text(colDate, startY, 'Date', headerStyle));

    // Separator line
    const separatorY = startY + 24;
    const separator = this.add.graphics();
    separator.lineStyle(1, 0x666666);
    separator.lineBetween(100, separatorY, 860, separatorY);
    this.contentContainer.add(separator);

    // Entries — only render available records, no empty placeholder rows
    sorted.forEach((entry, index) => {
      const y = separatorY + 16 + index * rowHeight;
      const isEven = index % 2 === 0;
      const textColor = isEven ? '#ffffff' : '#dddddd';

      // Alternating row background
      if (!isEven) {
        const bg = this.add.graphics();
        bg.fillStyle(0x222233, 0.5);
        bg.fillRect(100, y - 8, 760, rowHeight);
        this.contentContainer.add(bg);
      }

      const rowStyle: Phaser.Types.GameObjects.Text.TextStyle = {
        fontSize: '15px',
        fontFamily: 'monospace',
        color: textColor,
      };

      // Rank
      this.contentContainer.add(
        this.add.text(colRank, y, `${index + 1}`, rowStyle)
      );

      // Username — truncated to 20 chars
      const displayUsername = entry.username.length > 20
        ? entry.username.substring(0, 20)
        : entry.username;
      this.contentContainer.add(
        this.add.text(colUsername, y, displayUsername, rowStyle)
      );

      // Score — numeric
      this.contentContainer.add(
        this.add.text(colScore, y, `${entry.score}`, rowStyle)
      );

      // Date — YYYY-MM-DD format
      const displayDate = this.formatDate(entry.runDate);
      this.contentContainer.add(
        this.add.text(colDate, y, displayDate, rowStyle)
      );
    });
  }

  /**
   * Show error message and Retry button on fetch failure.
   */
  private showError(): void {
    this.contentContainer.removeAll(true);

    const errorText = this.add.text(480, 240, 'Could not load leaderboard', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ff6666',
    }).setOrigin(0.5);

    this.contentContainer.add(errorText);

    const retryBtn = this.add.text(480, 300, '[ RETRY ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerover', () => retryBtn.setColor('#88ff88'));
    retryBtn.on('pointerout', () => retryBtn.setColor('#44ff44'));
    retryBtn.on('pointerdown', () => {
      this.contentContainer.removeAll(true);
      this.loadingText.setVisible(true);
      this.loadLeaderboard();
    });

    this.contentContainer.add(retryBtn);
  }

  /**
   * Format a date string to YYYY-MM-DD.
   * Accepts ISO 8601 or already-formatted date strings.
   */
  private formatDate(dateStr: string): string {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    try {
      const date = new Date(dateStr);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateStr;
    }
  }
}
