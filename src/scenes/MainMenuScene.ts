import Phaser from 'phaser';
import { fadeIn, fadeToScene } from '@/lib/SceneTransition';
import { COLORS, COLORS_HEX } from '@/lib/Colors';
import { t, getLocale, toggleLocale, onLocaleChange } from '@/lib/i18n';
import { playMusic, updateMusicVolume, stopMusic } from '@/lib/MusicManager';
import { toggleMute } from '@/lib/AudioManager';
import { getMostRecentSave } from '@/systems/SaveSystem';
import type { PlayerProfile, DifficultyMode } from '@/types';

const TUTORIAL_DONE_KEY = 'cq-tutorial-done';

type DiffLabelKey = 'menu.difficulty.beginner' | 'menu.difficulty.normal' | 'menu.difficulty.hard';
type DiffDescKey =
  | 'menu.difficulty.beginner_desc'
  | 'menu.difficulty.normal_desc'
  | 'menu.difficulty.hard_desc';

/**
 * MainMenuScene — Difficulty selection, run start, tutorial routing.
 */
export class MainMenuScene extends Phaser.Scene {
  private selectedMode: DifficultyMode = 'normal';
  private modeButtons: Phaser.GameObjects.Text[] = [];
  private modeDescriptions: Phaser.GameObjects.Text[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private welcomeText!: Phaser.GameObjects.Text;
  private selectDifficultyText!: Phaser.GameObjects.Text;
  private continueBtn: Phaser.GameObjects.Text | null = null;
  private leaderboardBtn!: Phaser.GameObjects.Text;
  private footerHintText!: Phaser.GameObjects.Text;
  private languageToggleBtn!: Phaser.GameObjects.Text;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private gridOffset = 0;
  private localeUnsubscribe: (() => void) | null = null;

  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    fadeIn(this);
    playMusic('menu');
    this.createBackground();
    this.createLanguageToggle();
    this.createHeader();
    this.createDifficultySelection();
    this.createActions();
    this.createFooter();
    this.setupKeyboard();

    this.localeUnsubscribe = onLocaleChange(() => this.refreshTexts());
    this.events.on('shutdown', () => {
      if (this.localeUnsubscribe) {
        this.localeUnsubscribe();
        this.localeUnsubscribe = null;
      }
    });
  }

  update(): void {
    this.gridOffset = (this.gridOffset + 0.2) % 40;
    this.drawGrid();
  }

  private createBackground(): void {
    this.add.rectangle(480, 270, 960, 540, COLORS_HEX.BG_DARK);
    this.gridGraphics = this.add.graphics().setAlpha(0.03);
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

  private createLanguageToggle(): void {
    this.languageToggleBtn = this.add
      .text(920, 24, `\ud83c\udf10 ${getLocale().toUpperCase()}`, {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '14px',
        color: COLORS.ACCENT_GOLD,
        fontStyle: 'bold',
        backgroundColor: COLORS.BG_PANEL,
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    this.languageToggleBtn.on('pointerover', () =>
      this.languageToggleBtn.setColor(COLORS.PRIMARY_CYAN),
    );
    this.languageToggleBtn.on('pointerout', () =>
      this.languageToggleBtn.setColor(COLORS.ACCENT_GOLD),
    );
    this.languageToggleBtn.on('pointerdown', () => toggleLocale());
  }

  private createHeader(): void {
    const profile = this.game.registry.get('playerProfile') as PlayerProfile | undefined;
    const username = profile?.username ?? 'Player';
    const personalBest = profile?.personalBest ?? 0;

    this.titleText = this.add
      .text(480, 50, t('menu.title'), {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '22px',
        color: COLORS.TEXT_WHITE,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.welcomeText = this.add
      .text(480, 82, t('menu.welcome', { username, best: personalBest }), {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '12px',
        color: COLORS.ACCENT_GOLD,
      })
      .setOrigin(0.5);

    const sep = this.add.graphics();
    sep.lineStyle(1, COLORS_HEX.PRIMARY_BLUE, 0.3);
    sep.lineBetween(200, 100, 760, 100);
  }

  private createDifficultySelection(): void {
    this.selectDifficultyText = this.add
      .text(480, 120, t('menu.select_difficulty'), {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '11px',
        color: '#8899aa',
      })
      .setOrigin(0.5);

    const modes: Array<{
      mode: DifficultyMode;
      labelKey: DiffLabelKey;
      descKey: DiffDescKey;
      color: string;
    }> = [
      {
        mode: 'beginner',
        labelKey: 'menu.difficulty.beginner',
        descKey: 'menu.difficulty.beginner_desc',
        color: COLORS.DIFFICULTY_BEGINNER,
      },
      {
        mode: 'normal',
        labelKey: 'menu.difficulty.normal',
        descKey: 'menu.difficulty.normal_desc',
        color: COLORS.DIFFICULTY_NORMAL,
      },
      {
        mode: 'hard',
        labelKey: 'menu.difficulty.hard',
        descKey: 'menu.difficulty.hard_desc',
        color: COLORS.DIFFICULTY_HARD,
      },
    ];

    this.modeButtons = [];
    this.modeDescriptions = [];
    modes.forEach((m, idx) => {
      const y = 160 + idx * 48;

      const btn = this.add
        .text(480, y, `[ ${t(m.labelKey)} ]`, {
          fontFamily: 'Press Start 2P, monospace',
          fontSize: '14px',
          color: m.color,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      const desc = this.add
        .text(480, y + 18, t(m.descKey), {
          fontFamily: 'Press Start 2P, monospace',
          fontSize: '9px',
          color: '#667788',
        })
        .setOrigin(0.5);

      btn.setData('labelKey', m.labelKey);
      desc.setData('descKey', m.descKey);
      btn.on('pointerdown', () => {
        this.selectedMode = m.mode;
        this.updateModeSelection();
        this.startNewRun();
      });
      btn.on('pointerover', () => {
        if (this.selectedMode !== m.mode) btn.setAlpha(0.8);
      });
      btn.on('pointerout', () => this.updateModeSelection());

      this.modeButtons.push(btn);
      this.modeDescriptions.push(desc);
    });

    this.updateModeSelection();
  }

  private createActions(): void {
    if (getMostRecentSave('beginner') || getMostRecentSave('normal')) {
      this.continueBtn = this.add
        .text(480, 365, t('menu.continue'), {
          fontFamily: 'Press Start 2P, monospace',
          fontSize: '14px',
          color: COLORS.PRIMARY_CYAN,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      this.continueBtn.on('pointerover', () => this.continueBtn?.setColor('#88ddff'));
      this.continueBtn.on('pointerout', () => this.continueBtn?.setColor(COLORS.PRIMARY_CYAN));
      this.continueBtn.on('pointerdown', () => this.continueSave());
    }

    this.leaderboardBtn = this.add
      .text(480, 340, t('menu.leaderboard'), {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '14px',
        color: COLORS.PRIMARY_BLUE,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.leaderboardBtn.on('pointerover', () => this.leaderboardBtn.setColor('#6699ff'));
    this.leaderboardBtn.on('pointerout', () => this.leaderboardBtn.setColor(COLORS.PRIMARY_BLUE));
    this.leaderboardBtn.on('pointerdown', () => fadeToScene(this, 'LeaderboardScene'));
  }

  private createFooter(): void {
    this.footerHintText = this.add
      .text(480, 440, t('menu.footer_hint'), {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '9px',
        color: COLORS.TEXT_MUTED,
      })
      .setOrigin(0.5);
  }

  private setupKeyboard(): void {
    this.input.keyboard?.on('keydown-ONE', () => {
      this.selectedMode = 'beginner';
      this.updateModeSelection();
      this.startNewRun();
    });
    this.input.keyboard?.on('keydown-TWO', () => {
      this.selectedMode = 'normal';
      this.updateModeSelection();
      this.startNewRun();
    });
    this.input.keyboard?.on('keydown-THREE', () => {
      this.selectedMode = 'hard';
      this.updateModeSelection();
      this.startNewRun();
    });
    this.input.keyboard?.on('keydown-L', () => fadeToScene(this, 'LeaderboardScene'));
    this.input.keyboard?.on('keydown-M', () => this.handleMuteToggle());
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

  private refreshTexts(): void {
    this.titleText.setText(t('menu.title'));
    const profile = this.game.registry.get('playerProfile') as PlayerProfile | undefined;
    const username = profile?.username ?? 'Player';
    const personalBest = profile?.personalBest ?? 0;
    this.welcomeText.setText(t('menu.welcome', { username, best: personalBest }));
    this.selectDifficultyText.setText(t('menu.select_difficulty'));

    this.modeButtons.forEach((btn) => {
      const labelKey = btn.getData('labelKey') as DiffLabelKey;
      btn.setText(`[ ${t(labelKey)} ]`);
    });
    this.modeDescriptions.forEach((desc) => {
      const descKey = desc.getData('descKey') as DiffDescKey;
      desc.setText(t(descKey));
    });

    if (this.continueBtn) this.continueBtn.setText(t('menu.continue'));
    this.leaderboardBtn.setText(t('menu.leaderboard'));
    this.footerHintText.setText(t('menu.footer_hint'));
    this.languageToggleBtn.setText(`\ud83c\udf10 ${getLocale().toUpperCase()}`);
  }

  private handleMuteToggle(): void {
    const muted = toggleMute();
    if (muted) {
      stopMusic();
    } else {
      playMusic('menu');
    }
    updateMusicVolume();
  }

  private startNewRun(): void {
    const tutorialDone = localStorage.getItem(TUTORIAL_DONE_KEY) === 'true';
    if (!tutorialDone) {
      fadeToScene(this, 'TutorialScene', {
        pendingDifficulty: this.selectedMode,
      });
    } else {
      fadeToScene(this, 'IntroCutsceneScene', {
        level: 1,
        difficulty: this.selectedMode,
        hp: 100,
        score: 0,
      });
    }
  }

  private continueSave(): void {
    const save =
      getMostRecentSave(this.selectedMode) ??
      getMostRecentSave('beginner') ??
      getMostRecentSave('normal');
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
