import Phaser from 'phaser';
import type { PlayerProfile, DifficultyMode } from '@/types';
import { getMostRecentSave } from '@/systems/SaveSystem';

export class MainMenuScene extends Phaser.Scene {
  private selectedMode: DifficultyMode = 'normal';
  private modeButtons: Phaser.GameObjects.Text[] = [];

  constructor() { super('MainMenuScene'); }

  create(): void {
    const profile = this.game.registry.get('playerProfile') as PlayerProfile | undefined;
    const username = profile?.username ?? 'Player';
    const personalBest = profile?.personalBest ?? 0;

    this.add.text(480, 60, 'Cloud Quest: DevOps Dungeon', { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(480, 95, `Welcome, ${username}!  |  Best: ${personalBest}`, { fontFamily: 'monospace', fontSize: '12px', color: '#ffdd44' }).setOrigin(0.5);

    this.add.text(480, 140, 'SELECT DIFFICULTY', { fontFamily: 'monospace', fontSize: '12px', color: '#aaaaaa' }).setOrigin(0.5);

    const modes: Array<{ mode: DifficultyMode; label: string; desc: string; color: string }> = [
      { mode: 'beginner', label: 'BEGINNER', desc: 'Auto-save, full hints, guides', color: '#44cc44' },
      { mode: 'normal', label: 'NORMAL', desc: 'Manual saves at 30%/60%, hints after fail', color: '#cccc44' },
      { mode: 'hard', label: 'HARD', desc: 'No saves, no hints, no mercy', color: '#cc4444' },
    ];

    this.modeButtons = [];
    modes.forEach((m, idx) => {
      const y = 175 + idx * 42;
      const btn = this.add.text(480, y, `[ ${m.label} ]`, { fontFamily: 'monospace', fontSize: '16px', color: m.color, fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.add.text(480, y + 18, m.desc, { fontFamily: 'monospace', fontSize: '9px', color: '#888888' }).setOrigin(0.5);
      btn.on('pointerdown', () => { this.selectedMode = m.mode; this.updateModeSelection(); });
      this.modeButtons.push(btn);
    });
    this.updateModeSelection();

    const newRunBtn = this.add.text(480, 320, '[ NEW RUN ]', { fontFamily: 'monospace', fontSize: '18px', color: '#44ff44', fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    newRunBtn.on('pointerover', () => newRunBtn.setColor('#88ff88'));
    newRunBtn.on('pointerout', () => newRunBtn.setColor('#44ff44'));
    newRunBtn.on('pointerdown', () => this.startNewRun());

    if (getMostRecentSave('beginner') || getMostRecentSave('normal')) {
      const contBtn = this.add.text(480, 360, '[ CONTINUE ]', { fontFamily: 'monospace', fontSize: '16px', color: '#66ccff', fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      contBtn.on('pointerdown', () => this.continueSave());
    }

    const lbBtn = this.add.text(480, 400, '[ LEADERBOARD ]', { fontFamily: 'monospace', fontSize: '16px', color: '#4488ff' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    lbBtn.on('pointerdown', () => this.scene.start('LeaderboardScene'));

    this.add.text(480, 480, '1=Beginner 2=Normal 3=Hard | Enter=Start | L=Leaderboard', { fontFamily: 'monospace', fontSize: '9px', color: '#555555' }).setOrigin(0.5);
    this.input.keyboard?.on('keydown-ONE', () => { this.selectedMode = 'beginner'; this.updateModeSelection(); });
    this.input.keyboard?.on('keydown-TWO', () => { this.selectedMode = 'normal'; this.updateModeSelection(); });
    this.input.keyboard?.on('keydown-THREE', () => { this.selectedMode = 'hard'; this.updateModeSelection(); });
    this.input.keyboard?.on('keydown-ENTER', () => this.startNewRun());
    this.input.keyboard?.on('keydown-L', () => this.scene.start('LeaderboardScene'));
  }

  private updateModeSelection(): void {
    const modeOrder: DifficultyMode[] = ['beginner', 'normal', 'hard'];
    this.modeButtons.forEach((btn, idx) => {
      btn.setScale(modeOrder[idx] === this.selectedMode ? 1.1 : 1);
      btn.setAlpha(modeOrder[idx] === this.selectedMode ? 1 : 0.6);
    });
  }

  private startNewRun(): void {
    this.scene.start('ExplorationScene', { level: 1, difficulty: this.selectedMode, hp: 100, score: 0 });
  }

  private continueSave(): void {
    const save = getMostRecentSave(this.selectedMode) ?? getMostRecentSave('beginner') ?? getMostRecentSave('normal');
    if (save) {
      this.scene.start('ExplorationScene', { level: save.data.currentLevel, difficulty: save.data.mode, hp: save.data.heroHP, score: save.data.currentScore });
    } else { this.startNewRun(); }
  }
}
