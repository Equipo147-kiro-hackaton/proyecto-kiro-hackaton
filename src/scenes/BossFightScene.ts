import Phaser from 'phaser';
import { createBossFightState, placeFragment, bossAutoAttack, shouldBossAttack, type BossFightState } from '@/systems/BossFightSystem';
import { FragmentSystem } from '@/systems/FragmentSystem';
import { getDifficultyConfig } from '@/systems/DifficultySystem';
import { getTotalLevels } from '@/systems/MapLoader';
import { playSFX } from '@/lib/AudioManager';
import { screenShake, screenFlash, floatingText, bossDamageFlash } from '@/systems/FeedbackSystem';
import type { DifficultyMode, Fragment } from '@/types';

interface BossSceneData {
  levelId: string;
  difficulty: DifficultyMode;
  currentLevel: number;
  score: number;
  heroHP: number;
  bossName: string;
  pipelineOrder: string[];
}

export class BossFightScene extends Phaser.Scene {
  private sceneData!: BossSceneData;
  private state!: BossFightState;
  private fragments: Fragment[] = [];
  private shuffledFragments: Fragment[] = [];
  private fragmentSystem!: FragmentSystem;
  private bossHPBar!: Phaser.GameObjects.Rectangle;
  private heartsText!: Phaser.GameObjects.Text;
  private fragmentButtons: Phaser.GameObjects.Text[] = [];
  private placedSlots: Phaser.GameObjects.Text[] = [];

  constructor() { super('BossFightScene'); }

  init(data: BossSceneData): void { this.sceneData = data; }

  create(): void {
    this.state = createBossFightState();
    this.fragmentSystem = new FragmentSystem();
    this.fragmentSystem.initLevel(this.sceneData.levelId);
    this.fragments = this.fragmentSystem.getFragmentsForLevel(this.sceneData.levelId);
    for (const f of this.fragments) this.fragmentSystem.collectFragment(f.id);
    this.shuffledFragments = [...this.fragments].sort(() => Math.random() - 0.5);
    this.buildUI();
    this.startBossTimer();
  }

  private buildUI(): void {
    const w = this.cameras.main.width, h = this.cameras.main.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);
    this.add.text(w / 2, 30, this.sceneData.bossName, { fontSize: '16px', fontFamily: 'monospace', color: '#ff4444', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.rectangle(w / 2, 55, 300, 16, 0x333333);
    this.bossHPBar = this.add.rectangle(w / 2 - 150, 55, 300, 14, 0xff3333).setOrigin(0, 0.5);
    this.heartsText = this.add.text(w / 2, 80, this.getHeartsDisplay(), { fontSize: '18px', fontFamily: 'monospace', color: '#ff3366' }).setOrigin(0.5);
    this.add.text(w / 2, 110, 'Place fragments in correct pipeline order:', { fontSize: '10px', fontFamily: 'monospace', color: '#aaaaaa' }).setOrigin(0.5);

    this.placedSlots = [];
    for (let i = 0; i < this.fragments.length; i++) {
      const slot = this.add.text(w / 2 - 150 + i * (300 / this.fragments.length), 135, `[${i + 1}]`, { fontSize: '9px', fontFamily: 'monospace', color: '#444444', backgroundColor: '#1a1a2e', padding: { x: 2, y: 2 } });
      this.placedSlots.push(slot);
    }

    this.fragmentButtons = [];
    for (let i = 0; i < this.shuffledFragments.length; i++) {
      const frag = this.shuffledFragments[i];
      const btn = this.add.text(w / 2, 180 + i * 30, frag.content, { fontSize: '11px', fontFamily: 'monospace', color: '#ffffff', backgroundColor: '#2a2a4a', padding: { x: 8, y: 4 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setBackgroundColor('#3a3a6a'));
      btn.on('pointerout', () => btn.setBackgroundColor('#2a2a4a'));
      btn.on('pointerdown', () => this.onSelect(frag, btn));
      this.fragmentButtons.push(btn);
    }

    this.add.text(w / 2, h - 20, 'Click fragments in order | ESC to forfeit', { fontSize: '8px', fontFamily: 'monospace', color: '#666666' }).setOrigin(0.5);
    this.input.keyboard?.on('keydown-ESC', () => this.onDefeat());
  }

  private onSelect(fragment: Fragment, button: Phaser.GameObjects.Text): void {
    if (this.state.isComplete) return;
    const result = placeFragment(this.state, fragment.id, this.sceneData.pipelineOrder, this.fragments);
    if (result.correct) {
      button.setVisible(false);
      playSFX(this, 'sfx-boss-hit');
      const idx = this.state.nextSlotIndex - 1;
      if (this.placedSlots[idx]) { this.placedSlots[idx].setText(fragment.content.substring(0, 10)); this.placedSlots[idx].setColor('#44ff44'); }
      bossDamageFlash(this, this.cameras.main.width / 2, 55, 300, 16);
      if (result.isCritical) floatingText(this, this.cameras.main.width / 2, 40, 'CRITICAL!', '#ffdd00');
      floatingText(this, this.cameras.main.width / 2 + 100, 55, `-${result.damageDealt}%`, '#ff4444');
      this.bossHPBar.setDisplaySize(300 * (this.state.bossHP / 100), 14);
      if (result.victory) this.onVictory();
    } else {
      playSFX(this, 'sfx-boss-attack'); screenShake(this, 4); screenFlash(this, 0xff0000, 200);
      this.heartsText.setText(this.getHeartsDisplay());
      floatingText(this, this.cameras.main.width / 2, 90, '-1 \u2665', '#ff4444');
      if (result.defeat) this.onDefeat();
    }
  }

  private startBossTimer(): void {
    const intervalMs = getDifficultyConfig(this.sceneData.difficulty).bossTimerSeconds * 1000;
    this.time.addEvent({ delay: 1000, loop: true, callback: () => {
      if (shouldBossAttack(this.state, intervalMs, Date.now())) {
        const r = bossAutoAttack(this.state);
        playSFX(this, 'sfx-boss-attack'); screenShake(this, 5); screenFlash(this, 0xff0000, 300);
        this.heartsText.setText(this.getHeartsDisplay());
        floatingText(this, this.cameras.main.width / 2, 90, 'Boss Attack!', '#ff4444');
        if (r.defeat) this.onDefeat();
      }
    }});
  }

  private onVictory(): void {
    playSFX(this, 'sfx-victory');
    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'BOSS DEFEATED!', { fontSize: '20px', fontFamily: 'monospace', color: '#44ff44', fontStyle: 'bold' }).setOrigin(0.5);
    this.time.delayedCall(2000, () => {
      if (this.sceneData.currentLevel >= getTotalLevels()) {
        this.scene.start('VictoryScene', { score: this.sceneData.score, bugsDefeated: this.sceneData.currentLevel, puzzlesSolved: this.fragments.length });
      } else {
        this.scene.start('ExplorationScene', { level: this.sceneData.currentLevel + 1, difficulty: this.sceneData.difficulty, hp: this.state.heroHearts * 25, score: this.sceneData.score + 200 });
      }
    });
  }

  private onDefeat(): void {
    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'DEFEATED', { fontSize: '20px', fontFamily: 'monospace', color: '#ff4444', fontStyle: 'bold' }).setOrigin(0.5);
    this.time.delayedCall(2000, () => { this.scene.start('GameOverScene', { score: this.sceneData.score, levelReached: this.sceneData.currentLevel, bugsDefeated: 0, puzzlesSolved: 0 }); });
  }

  private getHeartsDisplay(): string { return '\u2665'.repeat(this.state.heroHearts) + '\u2661'.repeat(4 - this.state.heroHearts); }
}
