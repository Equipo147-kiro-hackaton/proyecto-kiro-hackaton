import Phaser from 'phaser';
import type { Puzzle, DifficultyMode } from '@/types';
import { PuzzleEngine } from '@/systems/PuzzleEngine';
import { EventBus } from '@/lib/EventBus';
import { playSFX } from '@/lib/AudioManager';
import { t } from '@/lib/i18n';

/**
 * PuzzleScene — Overlay scene rendered at native resolution (no zoom).
 * Launched in parallel with ExplorationScene when the player interacts with a terminal.
 * Covers the left 780px viewport (leaves 180px for HUD panel).
 *
 * Communication:
 * - Receives puzzle data via scene.launch(data)
 * - Emits 'puzzle-scene:solved', 'puzzle-scene:failed', 'puzzle-scene:closed' via EventBus
 */

const SCENE_WIDTH = 960;
const SCENE_HEIGHT = 540;

interface PuzzleSceneData {
  puzzle: Puzzle;
  difficulty: DifficultyMode;
  fragmentId?: string;
}

export class PuzzleScene extends Phaser.Scene {
  private puzzle!: Puzzle;
  private difficulty!: DifficultyMode;
  private fragmentId?: string;
  private puzzleEngine!: PuzzleEngine;

  // UI elements
  private timerText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private hangmanText!: Phaser.GameObjects.Text;
  private choiceButtons: Phaser.GameObjects.Text[] = [];

  // DOM input (hard mode)
  private answerInput: HTMLInputElement | null = null;
  private answerDOM: Phaser.GameObjects.DOMElement | null = null;

  // State
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private remainingSeconds = 60;
  private hintsShown = 0;
  private isResolved = false;
  private attemptsCount = 0;

  constructor() {
    super('PuzzleScene');
  }

  init(data: PuzzleSceneData): void {
    this.puzzle = data.puzzle;
    this.difficulty = data.difficulty;
    this.fragmentId = data.fragmentId;
    this.isResolved = false;
    this.attemptsCount = 0;
    this.hintsShown = 0;
    this.choiceButtons = [];
  }

  create(): void {
    this.puzzleEngine = new PuzzleEngine();

    // Set camera to cover only the game viewport (left 780px)
    this.cameras.main.setViewport(0, 0, SCENE_WIDTH, SCENE_HEIGHT);

    this.buildUI();
    this.startTimer();

    if (this.difficulty === 'beginner') {
      this.showNextHint();
    }
  }

  // ─── UI Construction ────────────────────────────────────────────────────

  private buildUI(): void {
    const cx = SCENE_WIDTH / 2;
    const cy = SCENE_HEIGHT / 2;

    // Semi-transparent backdrop
    this.add.rectangle(cx, cy, SCENE_WIDTH, SCENE_HEIGHT, 0x000000, 0.85);

    // Panel
    const panelW = 620;
    const panelH = 440;
    this.add.rectangle(cx, cy, panelW + 4, panelH + 4, 0x4488ff);
    this.add.rectangle(cx, cy, panelW, panelH, 0x0f0f24);

    // Title — category badge (top-left)
    const categoryLabel = this.puzzle.category.toUpperCase();
    this.add.text(cx - panelW / 2 + 20, cy - panelH / 2 + 16, t('puzzle.category_badge', { category: categoryLabel }), {
      fontSize: '14px', fontFamily: 'Press Start 2P, monospace', color: '#4488ff', fontStyle: 'bold',
    });

    // Timer (top-right, large and visible)
    this.timerText = this.add.text(cx + panelW / 2 - 20, cy - panelH / 2 + 16, '60s', {
      fontSize: '18px', fontFamily: 'Press Start 2P, monospace', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(1, 0);

    // Difficulty badge
    const diffColors: Record<DifficultyMode, string> = { beginner: '#44cc44', normal: '#cccc44', hard: '#cc4444' };
    this.add.text(cx, cy - panelH / 2 + 16, this.difficulty.toUpperCase(), {
      fontSize: '11px', fontFamily: 'Press Start 2P, monospace', color: diffColors[this.difficulty],
      backgroundColor: '#1a1a2e', padding: { x: 8, y: 3 },
    }).setOrigin(0.5, 0);

    // Question text (centered, readable size)
    this.add.text(cx, cy - panelH / 2 + 60, this.puzzle.question, {
      fontSize: '14px', fontFamily: 'Press Start 2P, monospace', color: '#ffffff',
      wordWrap: { width: panelW - 60 }, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5, 0);

    // Hangman underscores
    const answer = this.puzzle.correctAnswer;
    const underscores = answer.split('').map(c => c === ' ' ? '   ' : ' _ ').join('');
    this.hangmanText = this.add.text(cx, cy + 20, underscores, {
      fontSize: '16px', fontFamily: 'Press Start 2P, monospace', color: '#555588',
    }).setOrigin(0.5);

    // Build input area based on difficulty
    if (this.difficulty === 'hard') {
      this.buildTextInput(cx, cy, panelW);
    } else {
      this.buildMultipleChoice(cx, cy, panelW);
    }

    // Hint text (below options, near panel bottom)
    this.hintText = this.add.text(cx, cy + panelH / 2 - 18, '', {
      fontSize: '10px', fontFamily: 'Press Start 2P, monospace', color: '#ffcc88',
      wordWrap: { width: panelW - 40 }, align: 'center',
      backgroundColor: '#1a1a3a', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(20);

    // Feedback text
    this.feedbackText = this.add.text(cx, cy + panelH / 2 - 24, '', {
      fontSize: '16px', fontFamily: 'Press Start 2P, monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    // Close button (top-right X)
    const closeBtn = this.add.text(cx + panelW / 2 - 12, cy - panelH / 2 + 10, t('puzzle.close'), {
      fontSize: '16px', fontFamily: 'Press Start 2P, monospace', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.handleClose());

    // ESC key to close
    this.input.keyboard?.on('keydown-ESC', () => this.handleClose());
  }

  // ─── Multiple Choice (Beginner & Normal) ────────────────────────────────

  private buildMultipleChoice(cx: number, cy: number, panelW: number): void {
    const options = this.generateOptions();
    const startY = cy + 55;
    const spacing = 44;

    this.choiceButtons = [];
    options.forEach((option, idx) => {
      const btnY = startY + idx * spacing;
      const truncated = option.length > 45 ? option.substring(0, 43) + '..' : option;
      const label = `${String.fromCharCode(65 + idx)}) ${truncated}`;

      const btn = this.add.text(cx, btnY, label, {
        fontSize: '13px', fontFamily: 'Press Start 2P, monospace', color: '#dddddd',
        backgroundColor: '#2a2a4a', padding: { x: 16, y: 8 },
        fixedWidth: panelW - 100,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setBackgroundColor('#3a3a6a').setColor('#ffffff'));
      btn.on('pointerout', () => btn.setBackgroundColor('#2a2a4a').setColor('#dddddd'));
      btn.on('pointerdown', () => this.handleChoiceSelect(option, btn));

      this.choiceButtons.push(btn);
    });

    // Keyboard shortcuts 1-4
    this.input.keyboard?.on('keydown-ONE', () => this.selectByIndex(0));
    this.input.keyboard?.on('keydown-TWO', () => this.selectByIndex(1));
    this.input.keyboard?.on('keydown-THREE', () => this.selectByIndex(2));
    this.input.keyboard?.on('keydown-FOUR', () => this.selectByIndex(3));
  }

  private selectByIndex(idx: number): void {
    if (this.isResolved) return;
    if (idx >= this.choiceButtons.length) return;
    const options = this.generateOptions();
    this.handleChoiceSelect(options[idx], this.choiceButtons[idx]);
  }

  private generateOptions(): string[] {
    const correct = this.puzzle.correctAnswer;
    const distractors = this.generateDistractors(correct);
    const options = [correct, ...distractors];

    // Deterministic shuffle based on puzzle id
    let seed = 0;
    for (let i = 0; i < this.puzzle.id.length; i++) seed += this.puzzle.id.charCodeAt(i);
    for (let i = options.length - 1; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
      const j = seed % (i + 1);
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
  }

  private generateDistractors(correct: string): string[] {
    const distractors: string[] = [];
    const hints = this.puzzle.hints;

    if (correct.length <= 5 && /^\d+$/.test(correct)) {
      const num = parseInt(correct, 10);
      distractors.push(String(num + 1), String(num * 2), String(Math.max(0, num - 2)));
    } else if (correct.toLowerCase() === 'true' || correct.toLowerCase() === 'false') {
      return ['true', 'false', 'undefined'].filter(d => d.toLowerCase() !== correct.toLowerCase());
    } else {
      if (hints.length > 0) distractors.push(hints[0].split(' ').slice(0, 4).join(' '));
      if (hints.length > 1) distractors.push(hints[1].split(' ').slice(0, 4).join(' '));
      const modified = correct.length > 3 ? correct.substring(0, correct.length - 2) + '()' : correct + '.js';
      distractors.push(modified);
    }

    const unique = [...new Set(distractors)]
      .filter(d => d.toLowerCase() !== correct.toLowerCase() && d.length > 0)
      .slice(0, 3);

    const fillers = [t('puzzle.none_above'), 'undefined', 'null'];
    while (unique.length < 3) {
      const f = fillers[unique.length] ?? `alt_${unique.length}`;
      if (f.toLowerCase() !== correct.toLowerCase()) unique.push(f);
      else unique.push(`option_${unique.length}`);
    }
    return unique;
  }

  private handleChoiceSelect(selected: string, btn: Phaser.GameObjects.Text): void {
    if (this.isResolved) return;
    this.attemptsCount++;

    const isCorrect = this.puzzleEngine.evaluate(this.puzzle, selected);
    if (isCorrect) {
      btn.setBackgroundColor('#224422').setColor('#44ff44');
      this.handleCorrectAnswer();
    } else {
      btn.setBackgroundColor('#442222').setColor('#ff4444');
      btn.disableInteractive();
      this.handleIncorrectAnswer();
    }
  }

  // ─── Text Input (Hard Mode) ─────────────────────────────────────────────

  private buildTextInput(cx: number, cy: number, panelW: number): void {
    this.answerInput = document.createElement('input');
    this.answerInput.type = 'text';
    this.answerInput.placeholder = t('puzzle.answer_placeholder');
    this.answerInput.style.cssText = [
      'padding: 10px 16px', 'font-size: 16px', 'font-family: monospace',
      `width: ${panelW - 160}px`, 'border: 2px solid #4488ff', 'border-radius: 4px',
      'background-color: #0a0a1a', 'color: #ffffff', 'outline: none', 'text-align: center',
    ].join('; ');

    this.answerInput.addEventListener('keydown', (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.handleSubmit();
      if (e.key === 'Escape') this.handleClose();
    });

    this.answerDOM = this.add.dom(cx, cy + 60, this.answerInput);

    const submitBtn = this.add.text(cx, cy + 110, t('puzzle.submit'), {
      fontSize: '16px', fontFamily: 'Press Start 2P, monospace', color: '#44ff44', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    submitBtn.on('pointerover', () => submitBtn.setColor('#88ff88'));
    submitBtn.on('pointerout', () => submitBtn.setColor('#44ff44'));
    submitBtn.on('pointerdown', () => this.handleSubmit());

    this.time.delayedCall(100, () => this.answerInput?.focus());
  }

  // ─── Timer ──────────────────────────────────────────────────────────────

  private startTimer(): void {
    switch (this.difficulty) {
      case 'beginner': this.remainingSeconds = 90; break;
      case 'normal': this.remainingSeconds = 60; break;
      case 'hard': this.remainingSeconds = 45; break;
    }
    this.timerText.setText(`${this.remainingSeconds}s`);

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: this.remainingSeconds - 1,
      callback: () => {
        this.remainingSeconds--;
        this.timerText.setText(`${this.remainingSeconds}s`);

        if (this.remainingSeconds <= 10) {
          this.timerText.setColor('#ff4444');
          this.tweens.add({
            targets: this.timerText, scaleX: 1.2, scaleY: 1.2,
            duration: 100, yoyo: true, ease: 'Power2',
          });
        }
        if (this.remainingSeconds <= 0) this.handleTimeout();
      },
    });
  }

  // ─── Answer Handling ────────────────────────────────────────────────────

  private handleSubmit(): void {
    if (this.isResolved || !this.answerInput) return;
    const answer = this.answerInput.value.trim();
    if (answer.length === 0) return;

    this.attemptsCount++;
    if (this.puzzleEngine.evaluate(this.puzzle, answer)) {
      this.handleCorrectAnswer();
    } else {
      this.handleIncorrectAnswer();
    }
  }

  private handleCorrectAnswer(): void {
    this.isResolved = true;
    this.stopTimer();
    playSFX(this, 'sfx-correct');

    this.showFeedback(t('puzzle.correct'), '#44ff44');
    this.hangmanText.setText(this.puzzle.correctAnswer).setColor('#44ff44');

    // Educational reinforcement
    const lastHint = this.puzzle.hints[this.puzzle.hints.length - 1] ?? '';
    const msg = lastHint.length > 70 ? lastHint.substring(0, 68) + '..' : lastHint;
    this.hintText.setText(t('puzzle.reinforcement_prefix', { hint: msg })).setColor('#44ff88');

    if (this.answerInput) this.answerInput.disabled = true;

    this.time.delayedCall(1500, () => {
      EventBus.emit('puzzle-scene:solved', { remainingSeconds: this.remainingSeconds, fragmentId: this.fragmentId });
      this.closeScene();
    });
  }

  private handleIncorrectAnswer(): void {
    playSFX(this, 'sfx-incorrect');
    this.showFeedback(t('puzzle.wrong'), '#ff4444');

    if (this.answerInput) {
      this.answerInput.value = '';
      this.answerInput.style.borderColor = '#ff4444';
      this.time.delayedCall(500, () => {
        if (this.answerInput) this.answerInput.style.borderColor = '#4488ff';
      });
    }

    // Educational feedback: explain WHY wrong
    const reason = this.puzzle.hints[Math.min(this.hintsShown, this.puzzle.hints.length - 1)] ?? '';
    const truncReason = reason.length > 70 ? reason.substring(0, 68) + '..' : reason;
    this.hintText.setText(t('puzzle.hint_prefix', { hint: truncReason })).setColor('#ff8844');

    if (this.difficulty === 'beginner') this.showNextHint();
    else if (this.difficulty === 'normal' && this.attemptsCount >= 2) this.showNextHint();

    EventBus.emit('puzzle-scene:failed-attempt', { attempt: this.attemptsCount });
  }

  private handleTimeout(): void {
    if (this.isResolved) return;
    this.isResolved = true;
    this.stopTimer();
    playSFX(this, 'sfx-damage');

    this.showFeedback(t('puzzle.timeout'), '#ff8844');
    this.hangmanText.setText(this.puzzle.correctAnswer).setColor('#ff8844');
    if (this.answerInput) this.answerInput.disabled = true;
    this.disableChoiceButtons();

    this.time.delayedCall(2000, () => {
      EventBus.emit('puzzle-scene:failed', { fragmentId: this.fragmentId });
      this.closeScene();
    });
  }

  private handleClose(): void {
    if (this.isResolved) return;
    this.stopTimer();
    EventBus.emit('puzzle-scene:failed', { fragmentId: this.fragmentId });
    this.closeScene();
  }

  // ─── Hints ──────────────────────────────────────────────────────────────

  private showNextHint(): void {
    if (this.difficulty === 'hard') return;
    const hint = this.puzzleEngine.getHint(this.puzzle, this.hintsShown);
    if (hint) {
      this.hintsShown++;
    }
  }

  // ─── Feedback ───────────────────────────────────────────────────────────

  private showFeedback(text: string, color: string): void {
    this.feedbackText.setText(text).setColor(color).setAlpha(1);
    this.tweens.add({
      targets: this.feedbackText, alpha: 0, y: this.feedbackText.y - 12,
      duration: 1500, ease: 'Power2',
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private disableChoiceButtons(): void {
    for (const btn of this.choiceButtons) {
      btn.disableInteractive().setAlpha(0.5);
    }
  }

  private stopTimer(): void {
    if (this.timerEvent) { this.timerEvent.destroy(); this.timerEvent = null; }
  }

  private closeScene(): void {
    if (this.answerDOM) { this.answerDOM.destroy(); this.answerDOM = null; }
    this.answerInput = null;
    EventBus.emit('puzzle-scene:closed');
    this.scene.stop('PuzzleScene');
  }
}
