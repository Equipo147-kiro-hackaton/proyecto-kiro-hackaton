import Phaser from 'phaser';
import type { Puzzle, DifficultyMode } from '@/types';
import { PuzzleEngine } from '@/systems/PuzzleEngine';
import { EventBus } from '@/lib/EventBus';

/**
 * PuzzleOverlayConfig — Configuration for creating a puzzle overlay.
 */
export interface PuzzleOverlayConfig {
  puzzle: Puzzle;
  difficulty: DifficultyMode;
  fragmentId?: string;
  onSolved: (remainingSeconds: number) => void;
  onFailed: () => void;
  onClosed: () => void;
}

/**
 * PuzzleOverlay — In-world puzzle UI that appears when interacting with objects.
 *
 * Replaces the old DOM-based puzzle input with a full Phaser overlay:
 * - Semi-transparent backdrop that blocks game input
 * - Puzzle question text (styled per interactable type)
 * - Answer input (DOM element for keyboard input)
 * - Timer countdown
 * - Hints display (mode-dependent)
 * - Submit button
 * - Visual feedback on correct/incorrect answers
 */
export class PuzzleOverlay extends Phaser.GameObjects.Container {
  private config: PuzzleOverlayConfig;
  private puzzleEngine: PuzzleEngine;

  // UI Elements
  private backdrop!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.Rectangle;
  private panelBorder!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private questionText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private submitBtn!: Phaser.GameObjects.Text;
  private closeBtn!: Phaser.GameObjects.Text;

  // DOM input
  private answerInput: HTMLInputElement | null = null;
  private answerDOM: Phaser.GameObjects.DOMElement | null = null;

  // State
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private remainingSeconds: number;
  private hintsShown = 0;
  private isResolved = false;
  private attemptsCount = 0;

  // Viewport dimensions (used for centering)
  private viewW: number;
  private viewH: number;

  constructor(scene: Phaser.Scene, config: PuzzleOverlayConfig) {
    super(scene, 0, 0);

    this.config = config;
    this.puzzleEngine = new PuzzleEngine();
    this.remainingSeconds = 60; // Default, adjusted by difficulty

    // Get camera viewport dimensions
    this.viewW = scene.cameras.main.width;
    this.viewH = scene.cameras.main.height;

    // Set scroll factor to 0 so overlay stays fixed to camera
    this.setScrollFactor(0);
    this.setDepth(500);

    this.buildUI();
    this.startTimer();

    // Show hints immediately in beginner mode
    if (config.difficulty === 'beginner') {
      this.showNextHint();
    }

    scene.add.existing(this);
  }

  // ─── UI Construction ────────────────────────────────────────────────────

  private buildUI(): void {
    const centerX = this.viewW / 2;
    const centerY = this.viewH / 2;

    // Semi-transparent backdrop (covers full viewport)
    this.backdrop = this.scene.add.rectangle(centerX, centerY, this.viewW, this.viewH, 0x000000, 0.75)
      .setScrollFactor(0)
      .setInteractive(); // Block clicks through
    this.add(this.backdrop);

    // Main panel
    const panelW = Math.min(380, this.viewW - 40);
    const panelH = Math.min(280, this.viewH - 40);

    this.panelBorder = this.scene.add.rectangle(centerX, centerY, panelW + 4, panelH + 4, 0x4488ff)
      .setScrollFactor(0);
    this.add(this.panelBorder);

    this.panel = this.scene.add.rectangle(centerX, centerY, panelW, panelH, 0x1a1a2e)
      .setScrollFactor(0);
    this.add(this.panel);

    // Title (category indicator)
    const categoryLabel = this.config.puzzle.category.toUpperCase();
    this.titleText = this.scene.add.text(centerX, centerY - panelH / 2 + 18, `[ ${categoryLabel} PUZZLE ]`, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#4488ff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);
    this.add(this.titleText);

    // Timer
    this.timerText = this.scene.add.text(centerX + panelW / 2 - 30, centerY - panelH / 2 + 18, `${this.remainingSeconds}s`, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0);
    this.add(this.timerText);

    // Question text
    this.questionText = this.scene.add.text(centerX, centerY - 40, this.config.puzzle.question, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#ffffff',
      wordWrap: { width: panelW - 40 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5).setScrollFactor(0);
    this.add(this.questionText);

    // Answer input (DOM)
    this.answerInput = document.createElement('input');
    this.answerInput.type = 'text';
    this.answerInput.placeholder = 'Your answer...';
    this.answerInput.style.cssText = [
      'padding: 6px 10px',
      'font-size: 12px',
      'font-family: monospace',
      `width: ${panelW - 80}px`,
      'border: 2px solid #4488ff',
      'border-radius: 3px',
      'background-color: #0a0a1a',
      'color: #ffffff',
      'outline: none',
      'text-align: center',
    ].join('; ');

    this.answerInput.addEventListener('keydown', (e: KeyboardEvent) => {
      e.stopPropagation(); // Prevent game input while typing
      if (e.key === 'Enter') {
        this.handleSubmit();
      }
      if (e.key === 'Escape') {
        this.handleClose();
      }
    });

    this.answerDOM = this.scene.add.dom(centerX, centerY + 30, this.answerInput)
      .setScrollFactor(0);
    this.add(this.answerDOM);

    // Submit button
    this.submitBtn = this.scene.add.text(centerX, centerY + 65, '[ SUBMIT ]', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });

    this.submitBtn.on('pointerover', () => this.submitBtn.setColor('#88ff88'));
    this.submitBtn.on('pointerout', () => this.submitBtn.setColor('#44ff44'));
    this.submitBtn.on('pointerdown', () => this.handleSubmit());
    this.add(this.submitBtn);

    // Close button (top-right corner of panel)
    this.closeBtn = this.scene.add.text(centerX + panelW / 2 - 12, centerY - panelH / 2 + 8, 'X', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });

    this.closeBtn.on('pointerdown', () => this.handleClose());
    this.add(this.closeBtn);

    // Hint text (below submit)
    this.hintText = this.scene.add.text(centerX, centerY + 90, '', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#ffcc88',
      wordWrap: { width: panelW - 40 },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0);
    this.add(this.hintText);

    // Feedback text (floating)
    this.feedbackText = this.scene.add.text(centerX, centerY + 110, '', {
      fontSize: '10px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
    this.add(this.feedbackText);

    // Auto-focus input
    this.scene.time.delayedCall(100, () => {
      this.answerInput?.focus();
    });
  }

  // ─── Timer ──────────────────────────────────────────────────────────────

  private startTimer(): void {
    // Timer duration based on difficulty
    switch (this.config.difficulty) {
      case 'beginner':
        this.remainingSeconds = 90;
        break;
      case 'normal':
        this.remainingSeconds = 60;
        break;
      case 'hard':
        this.remainingSeconds = 45;
        break;
    }

    this.timerText.setText(`${this.remainingSeconds}s`);

    this.timerEvent = this.scene.time.addEvent({
      delay: 1000,
      repeat: this.remainingSeconds - 1,
      callback: () => {
        this.remainingSeconds--;
        this.timerText.setText(`${this.remainingSeconds}s`);

        if (this.remainingSeconds <= 10) {
          this.timerText.setColor('#ff4444');
        }

        if (this.remainingSeconds <= 0) {
          this.handleTimeout();
        }
      },
    });
  }

  // ─── Answer Handling ────────────────────────────────────────────────────

  private handleSubmit(): void {
    if (this.isResolved) return;
    if (!this.answerInput) return;

    const answer = this.answerInput.value.trim();
    if (answer.length === 0) return;

    this.attemptsCount++;
    const isCorrect = this.puzzleEngine.evaluate(this.config.puzzle, answer);

    if (isCorrect) {
      this.handleCorrectAnswer();
    } else {
      this.handleIncorrectAnswer();
    }
  }

  private handleCorrectAnswer(): void {
    this.isResolved = true;
    this.stopTimer();

    // Show success feedback
    this.showFeedback('CORRECT!', '#44ff44');

    // Disable input
    if (this.answerInput) {
      this.answerInput.disabled = true;
      this.answerInput.style.borderColor = '#44ff44';
    }

    // Emit event
    EventBus.emit('puzzle:solved', {
      puzzle: this.config.puzzle,
      remainingSeconds: this.remainingSeconds,
      fragmentId: this.config.fragmentId,
    });

    // Close after brief delay
    this.scene.time.delayedCall(1200, () => {
      this.config.onSolved(this.remainingSeconds);
      this.cleanup();
    });
  }

  private handleIncorrectAnswer(): void {
    // Show error feedback
    this.showFeedback('WRONG!', '#ff4444');

    // Clear input
    if (this.answerInput) {
      this.answerInput.value = '';
      this.answerInput.style.borderColor = '#ff4444';

      // Reset border color after a moment
      this.scene.time.delayedCall(500, () => {
        if (this.answerInput) {
          this.answerInput.style.borderColor = '#4488ff';
        }
      });
    }

    // Show hints based on difficulty
    if (this.config.difficulty === 'beginner') {
      this.showNextHint();
    } else if (this.config.difficulty === 'normal' && this.attemptsCount >= 2) {
      this.showNextHint();
    }
    // Hard mode: no hints ever

    // Emit failure event (for HP deduction by the calling system)
    EventBus.emit('puzzle:failed-attempt', {
      puzzle: this.config.puzzle,
      attempt: this.attemptsCount,
    });
  }

  private handleTimeout(): void {
    if (this.isResolved) return;
    this.isResolved = true;
    this.stopTimer();

    this.showFeedback("TIME'S UP!", '#ff8844');

    if (this.answerInput) {
      this.answerInput.disabled = true;
    }

    EventBus.emit('puzzle:timeout', { puzzle: this.config.puzzle });

    this.scene.time.delayedCall(1500, () => {
      this.config.onFailed();
      this.cleanup();
    });
  }

  private handleClose(): void {
    if (this.isResolved) return;
    this.stopTimer();

    // Closing without solving counts as failure
    this.config.onFailed();
    this.cleanup();
  }

  // ─── Hints ──────────────────────────────────────────────────────────────

  private showNextHint(): void {
    if (this.config.difficulty === 'hard') return;

    const hint = this.puzzleEngine.getHint(this.config.puzzle, this.hintsShown);
    if (hint) {
      this.hintsShown++;
      this.hintText.setText(`Hint ${this.hintsShown}: ${hint}`);
    }
  }

  // ─── Feedback ───────────────────────────────────────────────────────────

  private showFeedback(text: string, color: string): void {
    this.feedbackText.setText(text);
    this.feedbackText.setColor(color);
    this.feedbackText.setAlpha(1);

    this.scene.tweens.add({
      targets: this.feedbackText,
      alpha: 0,
      y: this.feedbackText.y - 10,
      duration: 1200,
      ease: 'Power2',
    });
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────

  private stopTimer(): void {
    if (this.timerEvent) {
      this.timerEvent.destroy();
      this.timerEvent = null;
    }
  }

  /**
   * Remove all overlay elements and notify parent.
   */
  cleanup(): void {
    this.stopTimer();

    // Remove DOM element
    if (this.answerDOM) {
      this.answerDOM.destroy();
      this.answerDOM = null;
    }
    this.answerInput = null;

    // Destroy container and all children
    this.destroy(true);

    // Notify that overlay is closed
    this.config.onClosed();
  }

  /**
   * Check if the overlay is still active (not resolved/cleaned up).
   */
  isActive(): boolean {
    return !this.isResolved && this.active;
  }
}
