import Phaser from 'phaser';
import { fadeIn, fadeToScene } from '@/lib/SceneTransition';
import { COLORS, COLORS_HEX } from '@/lib/Colors';
import { getMostRecentSave } from '@/systems/SaveSystem';
import type { PlayerProfile, DifficultyMode } from '@/types';

/**
 * MainMenuScene — Difficulty selection and run start with cyberpunk aesthetic.
 */
export class MainMenuScene extends Phaser.Scene {
  private selectedMode: DifficultyMode = 'normal';
  private modeButtons: Phaser.GameObjects.Text[] = [];
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private gridOffset = 0;

  constructor() { super('MainMenuScene'); }

  create(): void {
    fadeIn(this);
    this.createBackground();
    this.createHeader();
    this.createDifficultySelection();
    this.createActions();
    this.createFooter();
    this.setupKeyboard();
  }

  update(): void {
    this.gridOffset = (this.gridOffset + 0.2) % 40;
    this.drawGrid();
  }

  private createBackground(): void {
    this.add.rectangle(480, 270, 960, 540, COLORS_HEX.BG_DARK);
    this.gridGraphics = this.add.graphics().setAlpha(0.05);
  }

  private drawGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, COLORS_HEX.PRIMARY_BLUE);

    const spacing = 40;
    const offset = this.gridOffset;

    for (let x = -spacing + offset; x <= 960 + spacing; x += spacing) {
      this.gridGraphics.lineBetween(x, 0, x, 540);
    }
    for (let y = -spacing + offset; y <= 540 + spacing; y += spacing) {
      this.gridGraphics.lineBetween(0, y, 960, y);
    }
  }

  private createHeader(): void {
    const profile = this.game.registry.get('playerProfile') as PlayerProfile | undefined;
    const username = profile?.username ?? 'Player';
    const personalBest = profile?.personalBest ?? 0;

    this.add.text(480, 50, 'Cloud Quest: DevOps Dungeon', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: COLORS.TEXT_WHITE,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(480, 82, `Welcome, ${username}!  |  Best: ${personalBest}`, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: COLORS.ACCENT_GOLD,
    }).setOrigin(0.5);

    // Separator line
    const sep = this.add.graphics();
    sep.lineStyle(1, COLORS_HEX.PRIMARY_BLUE, 0.3);
    sep.lineBetween(200, 100, 760, 100);
  }

  private createDifficultySelection(): void {
    this.add.text(480, 120, 'SELECT DIFFICULTY', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: COLORS.TEXT_DIM,
    }).setOrigin(0.5);

    const modes: Array<{ mode: DifficultyMode; label: string; desc: string; color: string }> = [
      { mode: 'beginner', label: 'BEGINNER', desc: 'Auto-save, full hints, guides', color: COLORS.DIFFICULTY_BEGINNER },
      { mode: 'normal', label: 'NORMAL', desc: 'Manual saves at 30%/60%, hints after fail', color: COLORS.DIFFICULTY_NORMAL },
      { mode: 'hard', label: 'HARD', desc: 'No saves, no hints, no mercy', color: COLORS.DIFFICULTY_HARD },
    ];

    this.modeButtons = [];
    modes.forEach((m, idx) => {
      const y = 160 + idx * 48;

      const btn = this.add.text(480, y, `[ ${m.label} ]`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: m.color,
        fontStyle: 'bold',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      this.add.text(480, y + 18, m.desc, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: COLORS.TEXT_MUTED,
      }).setOrigin(0.5);

      btn.on('pointerdown', () => {
        this.selectedMode = m.mode;
        this.updateModeSelection();
      });

      btn.on('pointerover', () => {
        if (this.selectedMode !== m.mode) {
          btn.setAlpha(0.8);
        }
      });

      btn.on('pointerout', () => {
        this.updateModeSelection();
      });

      this.modeButtons.push(btn);
    });

    this.updateModeSelection();
  }

  private createActions(): void {
    // New Run button
    const newRunBtn = this.add.text(480, 325, '[ NEW RUN ]', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: COLORS.SUCCESS_GREEN,
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    newRunBtn.on('pointerover', () => newRunBtn.setColor('#88ffaa'));
    newRunBtn.on('pointerout', () => newRunBtn.setColor(COLORS.SUCCESS_GREEN));
    newRunBtn.on('pointerdown', () => this.startNewRun());

    // Pulse on New Run
    this.tweens.add({
      targets: newRunBtn,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Continue button (if saves exist)
    if (getMostRecentSave('beginner') || getMostRecentSave('normal')) {
      const contBtn = this.add.text(480, 365, '[ CONTINUE ]', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: COLORS.PRIMARY_CYAN,
        fontStyle: 'bold',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      contBtn.on('pointerover', () => contBtn.setColor('#88ddff'));
      contBtn.on('pointerout', () => contBtn.setColor(COLORS.PRIMARY_CYAN));
      contBtn.on('pointerdown', () => this.continueSave());
    }

    // Leaderboard button
    const lbBtn = this.add.text(480, 410, '[ LEADERBOARD ]', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: COLORS.PRIMARY_BLUE,
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    lbBtn.on('pointerover', () => lbBtn.setColor('#6699ff'));
    lbBtn.on('pointerout', () => lbBtn.setColor(COLORS.PRIMARY_BLUE));
    lbBtn.on('pointerdown', () => fadeToScene(this, 'LeaderboardScene'));
  }

  private createFooter(): void {
    this.add.text(480, 500, '1=Beginner  2=Normal  3=Hard  |  Enter=Start  |  L=Leaderboard', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: COLORS.TEXT_MUTED,
    }).setOrigin(0.5);
  }

  private setupKeyboard(): void {
    this.input.keyboard?.on('keydown-ONE', () => { this.selectedMode = 'beginner'; this.updateModeSelection(); });
    this.input.keyboard?.on('keydown-TWO', () => { this.selectedMode = 'normal'; this.updateModeSelection(); });
    this.input.keyboard?.on('keydown-THREE', () => { this.selectedMode = 'hard'; this.updateModeSelection(); });
    this.input.keyboard?.on('keydown-ENTER', () => this.startNewRun());
    this.input.keyboard?.on('keydown-L', () => fadeToScene(this, 'LeaderboardScene'));
  }

  private updateModeSelection(): void {
    const modeOrder: DifficultyMode[] = ['beginner', 'normal', 'hard'];
    this.modeButtons.forEach((btn, idx) => {
      if (modeOrder[idx] === this.selectedMode) {
        btn.setScale(1.1);
        btn.setAlpha(1);
      } else {
        btn.setScale(1);
        btn.setAlpha(0.5);
      }
    });
  }

  private startNewRun(): void {
    fadeToScene(this, 'ExplorationScene', {
      level: 1,
      difficulty: this.selectedMode,
      hp: 100,
      score: 0,
    });
  }

  private continueSave(): void {
    const save = getMostRecentSave(this.selectedMode) ?? getMostRecentSave('beginner') ?? getMostRecentSave('normal');
    if (save) {
      fadeToScene(this, 'ExplorationScene', {
        level: save.data.currentLevel,
        difficulty: save.data.mode,
        hp: save.data.heroHP,
        score: save.data.currentScore,
      });
    } else {
      this.startNewRun();
    }
  }
}
