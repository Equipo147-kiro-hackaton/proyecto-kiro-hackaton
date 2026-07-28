import Phaser from 'phaser';
import { ScoreSystem } from '@/systems/ScoreSystem';
import { submitScore as submitScoreLocal, updatePersonalBest } from '@/lib/LocalStorageService';
import { fadeIn, fadeToScene } from '@/lib/SceneTransition';
import { t } from '@/lib/i18n';
import type { GameOverData, RunResult } from '@/types';

/**
 * GameOverScene — displayed when the hero's HP reaches 0.
 * Dramatic dark atmosphere with falling ember particles, animated title,
 * typewriter challenge message, and pulsing retry button.
 *
 * Requirements: 8.1, 8.3, 8.5, 8.6
 */

const CHALLENGE_MESSAGES = [
  'The bugs are laughing at you...',
  'Your server crashed. Deploy again?',
  'Production is still burning. Get back in there.',
  '404: Victory Not Found',
  'git reset --hard? Try again.',
  'The dungeon grows stronger...',
  'Error: Skill level insufficient. Retry?',
  'Your pipeline broke. Fix it and rerun.',
  'The bugs won this round. Next round?',
  'System failure. Reboot initiated...',
  'Los bugs celebran tu caida...',
  'El servidor se apago. Reiniciar?',
];

export class GameOverScene extends Phaser.Scene {
  private gameOverData!: GameOverData;
  private scoreSystem!: ScoreSystem;
  private particles: Phaser.GameObjects.Rectangle[] = [];
  private vignetteOverlay!: Phaser.GameObjects.Rectangle;
  private pulseDirection = 1;
  private pulseAlpha = 0.15;

  constructor() {
    super('GameOverScene');
  }

  init(data: GameOverData): void {
    this.gameOverData = data;
    this.particles = [];
    this.pulseDirection = 1;
    this.pulseAlpha = 0.15;
  }

  create(): void {
    this.scoreSystem = new ScoreSystem();
    fadeIn(this);

    this.createBackground();
    this.createParticles();
    this.animateTitle();
    this.submitScoreToBackend();
  }

  /**
   * Create the dark background with red vignette overlay.
   */
  private createBackground(): void {
    // Near-black base
    this.cameras.main.setBackgroundColor('#0a0505');

    // Red vignette overlay that pulses
    this.vignetteOverlay = this.add.rectangle(480, 270, 960, 540, 0x330000, 0.15);
    this.vignetteOverlay.setDepth(0);
  }

  /**
   * Create falling red/dark ember particles.
   */
  private createParticles(): void {
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(20, 940);
      const y = Phaser.Math.Between(-50, 540);
      const size = Phaser.Math.Between(2, 5);
      const color = Phaser.Math.RND.pick([0xff2222, 0xaa1111, 0x661111, 0xff4400]);
      const alpha = Phaser.Math.FloatBetween(0.3, 0.8);

      const particle = this.add.rectangle(x, y, size, size, color, alpha);
      particle.setDepth(1);
      (particle as unknown as Record<string, number>)['fallSpeed'] = Phaser.Math.FloatBetween(0.3, 1.2);
      (particle as unknown as Record<string, number>)['drift'] = Phaser.Math.FloatBetween(-0.3, 0.3);
      this.particles.push(particle);
    }
  }

  /**
   * Animate the GAME OVER title scaling in, then trigger subsequent elements.
   */
  private animateTitle(): void {
    // Skull decoration
    const skull = this.add.text(480, 55, '\u2620 \u25BC\u25BC\u25BC \u2620', {
      fontSize: '18px',
      fontFamily: 'Press Start 2P, monospace',
      color: '#661111',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    // GAME OVER title
    const title = this.add.text(480, 100, t('gameover.title'), {
      fontSize: '42px',
      fontFamily: 'Press Start 2P, monospace',
      color: '#cc2222',
      fontStyle: 'bold',
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#ff0000',
        blur: 12,
        fill: true,
      },
    }).setOrigin(0.5).setScale(0.5).setAlpha(0).setDepth(10);

    // Scale-in title animation
    this.tweens.add({
      targets: title,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Skull fades in with title
    this.tweens.add({
      targets: skull,
      alpha: 0.8,
      duration: 500,
      ease: 'Sine.easeIn',
    });

    // After 300ms: typewriter challenge message
    this.time.delayedCall(300, () => {
      this.typewriterMessage();
    });

    // After 800ms: stats fade in
    this.time.delayedCall(800, () => {
      this.displayStats();
    });

    // After 1200ms: buttons fade in with pulse
    this.time.delayedCall(1200, () => {
      this.createButtons();
    });
  }

  /**
   * Display a random challenge message with typewriter effect.
   */
  private typewriterMessage(): void {
    const message = Phaser.Math.RND.pick(CHALLENGE_MESSAGES);
    const msgText = this.add.text(480, 160, '', {
      fontSize: '14px',
      fontFamily: 'Press Start 2P, monospace',
      color: '#ffaa33',
    }).setOrigin(0.5).setDepth(10);

    let charIndex = 0;
    const timer = this.time.addEvent({
      delay: 40,
      repeat: message.length - 1,
      callback: () => {
        charIndex++;
        msgText.setText(message.substring(0, charIndex));
      },
    });

    // Ensure timer reference is kept alive
    this.events.once('shutdown', () => {
      timer.destroy();
    });
  }

  /**
   * Display stats (score, level, bugs, puzzles) in compact format.
   */
  private displayStats(): void {
    const stats = [
      t('gameover.final_score', { score: this.gameOverData.score }),
      t('gameover.level_reached', { level: this.gameOverData.levelReached }),
      t('gameover.bugs_defeated', { count: this.gameOverData.bugsDefeated }),
      t('gameover.puzzles_solved', { count: this.gameOverData.puzzlesSolved }),
    ];

    const startY = 210;
    const spacing = 32;

    stats.forEach((stat, index) => {
      const text = this.add.text(480, startY + index * spacing, stat, {
        fontSize: '14px',
        fontFamily: 'Press Start 2P, monospace',
        color: '#777777',
      }).setOrigin(0.5).setAlpha(0).setDepth(10);

      this.tweens.add({
        targets: text,
        alpha: 0.9,
        duration: 400,
        delay: index * 80,
        ease: 'Sine.easeIn',
      });
    });
  }

  /**
   * Create "TRY AGAIN" and "LEADERBOARD" buttons with fade-in and pulse.
   */
  private createButtons(): void {
    // TRY AGAIN button
    const tryAgainBtn = this.add.text(480, 380, t('gameover.try_again'), {
      fontSize: '20px',
      fontFamily: 'Press Start 2P, monospace',
      color: '#ffaa33',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0).setDepth(10).setInteractive({ useHandCursor: true });

    // Fade in
    this.tweens.add({
      targets: tryAgainBtn,
      alpha: 1,
      duration: 400,
      ease: 'Sine.easeIn',
    });

    // Pulsing scale animation
    this.tweens.add({
      targets: tryAgainBtn,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    tryAgainBtn.on('pointerover', () => tryAgainBtn.setColor('#ffcc66'));
    tryAgainBtn.on('pointerout', () => tryAgainBtn.setColor('#ffaa33'));
    tryAgainBtn.on('pointerdown', () => this.startNewRun());

    // LEADERBOARD button
    const leaderboardBtn = this.add.text(480, 430, t('gameover.view_leaderboard'), {
      fontSize: '14px',
      fontFamily: 'Press Start 2P, monospace',
      color: '#4477aa',
    }).setOrigin(0.5).setAlpha(0).setDepth(10).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: leaderboardBtn,
      alpha: 1,
      duration: 400,
      delay: 150,
      ease: 'Sine.easeIn',
    });

    leaderboardBtn.on('pointerover', () => leaderboardBtn.setColor('#6699cc'));
    leaderboardBtn.on('pointerout', () => leaderboardBtn.setColor('#4477aa'));
    leaderboardBtn.on('pointerdown', () => this.viewLeaderboard());
  }

  /**
   * Update loop: animate particles and vignette pulse.
   */
  update(): void {
    // Animate falling particles
    for (const particle of this.particles) {
      const data = particle as unknown as Record<string, number>;
      particle.y += data['fallSpeed'];
      particle.x += data['drift'];

      // Reset particle when it falls off screen
      if (particle.y > 560) {
        particle.y = -10;
        particle.x = Phaser.Math.Between(20, 940);
      }
    }

    // Vignette pulse
    this.pulseAlpha += 0.002 * this.pulseDirection;
    if (this.pulseAlpha >= 0.25) {
      this.pulseDirection = -1;
    } else if (this.pulseAlpha <= 0.08) {
      this.pulseDirection = 1;
    }
    this.vignetteOverlay.setAlpha(this.pulseAlpha);
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
    submitScoreLocal(username, this.gameOverData.score);
    updatePersonalBest(username, this.gameOverData.score);

    // Also attempt API submission (fire and forget)
    const result: RunResult = {
      username,
      score: this.gameOverData.score,
      highestLevel: this.gameOverData.levelReached,
      totalPuzzlesSolved: this.gameOverData.puzzlesSolved,
      totalBugsDefeated: this.gameOverData.bugsDefeated,
    };
    this.scoreSystem.submitScore(result);
  }
}
