import Phaser from 'phaser';
import { createBossFightState, placeFragment, bossAutoAttack, shouldBossAttack, type BossFightState } from '@/systems/BossFightSystem';
import { FragmentSystem } from '@/systems/FragmentSystem';
import { getDifficultyConfig } from '@/systems/DifficultySystem';
import { getTotalLevels } from '@/systems/MapLoader';
import { playSFX } from '@/lib/AudioManager';
import { screenShake, screenFlash, floatingText, bossDamageFlash } from '@/systems/FeedbackSystem';
import { generateBossSprite } from '@/lib/SpriteGenerator';
import { playMusic } from '@/lib/MusicManager';
import { t } from '@/lib/i18n';
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

/**
 * BossFightScene — Type A (Pipeline Assembly).
 * Player orders collected fragments to build a CI/CD pipeline.
 * Enhanced with boss sprite, idle animation, fragment icons, and slot tweens.
 */
export class BossFightScene extends Phaser.Scene {
  private sceneData!: BossSceneData;
  private state!: BossFightState;
  private fragments: Fragment[] = [];
  private shuffledFragments: Fragment[] = [];
  private fragmentSystem!: FragmentSystem;
  private bossHPBar!: Phaser.GameObjects.Rectangle;
  private bossSprite!: Phaser.GameObjects.Sprite;
  private heartsText!: Phaser.GameObjects.Text;
  private fragmentButtons: Phaser.GameObjects.Text[] = [];
  private placedSlots: Phaser.GameObjects.Text[] = [];

  constructor() { super('BossFightScene'); }

  init(data: BossSceneData): void { this.sceneData = data; }

  create(): void {
    generateBossSprite(this);
    playMusic('boss');

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
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a0a1a);

    // Boss name
    this.add.text(w / 2, 20, this.sceneData.bossName, {
      fontSize: '12px', fontFamily: 'Press Start 2P, monospace', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Boss sprite with idle pulse
    this.bossSprite = this.add.sprite(w / 2, 70, 'boss-sprite', 0).setScale(2);
    this.tweens.add({
      targets: this.bossSprite,
      scaleX: 2.1, scaleY: 1.9,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Boss HP bar
    this.add.rectangle(w / 2, 110, 302, 18, 0x222222).setStrokeStyle(1, 0x666666);
    this.bossHPBar = this.add.rectangle(w / 2 - 150, 110, 300, 14, 0xff3333).setOrigin(0, 0.5);

    // Hearts
    this.heartsText = this.add.text(w / 2, 130, this.getHeartsDisplay(), {
      fontSize: '14px', fontFamily: 'Press Start 2P, monospace', color: '#ff3366',
    }).setOrigin(0.5);

    // Instructions
    this.add.text(w / 2, 155, t('boss.place_in_order'), {
      fontSize: '8px', fontFamily: 'Press Start 2P, monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Placement slots (fragment icons)
    this.placedSlots = [];
    const slotStartX = w / 2 - (this.fragments.length * 50) / 2;
    for (let i = 0; i < this.fragments.length; i++) {
      const slotX = slotStartX + i * 50 + 25;
      // Slot background
      this.add.rectangle(slotX, 180, 44, 24, 0x1a1a2e).setStrokeStyle(1, 0x4488ff, 0.5);
      const slot = this.add.text(slotX, 180, `[${i + 1}]`, {
        fontSize: '7px', fontFamily: 'Press Start 2P, monospace', color: '#444444',
      }).setOrigin(0.5);
      this.placedSlots.push(slot);
    }

    // Fragment buttons
    this.fragmentButtons = [];
    const btnStartY = 215;
    for (let i = 0; i < this.shuffledFragments.length; i++) {
      const frag = this.shuffledFragments[i];
      const btnY = btnStartY + i * 34;
      const btn = this.add.text(w / 2, btnY, `\u25B6 ${frag.content}`, {
        fontSize: '9px', fontFamily: 'Press Start 2P, monospace', color: '#ffffff',
        backgroundColor: '#2a2a4a', padding: { x: 12, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => { btn.setBackgroundColor('#3a3a6a'); btn.setScale(1.03); });
      btn.on('pointerout', () => { btn.setBackgroundColor('#2a2a4a'); btn.setScale(1); });
      btn.on('pointerdown', () => this.onSelect(frag, btn));
      this.fragmentButtons.push(btn);
    }

    // Forfeit hint
    this.add.text(w / 2, h - 16, t('boss.forfeit_hint'), {
      fontSize: '6px', fontFamily: 'Press Start 2P, monospace', color: '#666666',
    }).setOrigin(0.5);
    this.input.keyboard?.on('keydown-ESC', () => this.onDefeat());
  }

  private onSelect(fragment: Fragment, button: Phaser.GameObjects.Text): void {
    if (this.state.isComplete) return;
    const result = placeFragment(this.state, fragment.id, this.sceneData.pipelineOrder, this.fragments);
    if (result.correct) {
      // Animate button flying to slot
      const idx = this.state.nextSlotIndex - 1;
      const slot = this.placedSlots[idx];
      if (slot) {
        // Tween button to slot position then hide
        this.tweens.add({
          targets: button,
          x: slot.x,
          y: slot.y,
          scaleX: 0.6,
          scaleY: 0.6,
          duration: 300,
          ease: 'Back.in',
          onComplete: () => {
            button.setVisible(false);
            slot.setText(fragment.content.substring(0, 6));
            slot.setColor('#44ff44');
            // Slot pop animation
            this.tweens.add({
              targets: slot, scaleX: 1.3, scaleY: 1.3,
              duration: 150, yoyo: true, ease: 'Power2',
            });
          },
        });
      } else {
        button.setVisible(false);
      }

      playSFX(this, 'sfx-boss-hit');
      bossDamageFlash(this, this.cameras.main.width / 2, 110, 300, 14);

      // Boss damage animation
      this.bossSprite.setFrame(1);
      this.time.delayedCall(200, () => this.bossSprite.setFrame(0));

      if (result.isCritical) floatingText(this, this.cameras.main.width / 2, 90, t('boss.critical'), '#ffdd00');
      floatingText(this, this.cameras.main.width / 2 + 120, 110, `-${result.damageDealt}%`, '#ff4444');
      this.bossHPBar.setDisplaySize(300 * (this.state.bossHP / 100), 14);
      if (result.victory) this.onVictory();
    } else {
      playSFX(this, 'sfx-boss-attack');
      screenShake(this, 4);
      screenFlash(this, 0xff0000, 200);
      this.heartsText.setText(this.getHeartsDisplay());
      floatingText(this, this.cameras.main.width / 2, 140, t('boss.heart_lost'), '#ff4444');
      // Shake the wrong button
      this.tweens.add({
        targets: button, x: button.x + 4, duration: 50,
        yoyo: true, repeat: 3, ease: 'Linear',
      });
      if (result.defeat) this.onDefeat();
    }
  }

  private startBossTimer(): void {
    const intervalMs = getDifficultyConfig(this.sceneData.difficulty).bossTimerSeconds * 1000;
    this.time.addEvent({ delay: 1000, loop: true, callback: () => {
      if (shouldBossAttack(this.state, intervalMs, Date.now())) {
        const r = bossAutoAttack(this.state);
        playSFX(this, 'sfx-boss-attack');
        screenShake(this, 5);
        screenFlash(this, 0xff0000, 300);
        this.heartsText.setText(this.getHeartsDisplay());
        floatingText(this, this.cameras.main.width / 2, 140, t('boss.attack'), '#ff4444');
        // Boss attack animation
        this.tweens.add({
          targets: this.bossSprite, y: this.bossSprite.y + 10,
          duration: 100, yoyo: true, ease: 'Power2',
        });
        if (r.defeat) this.onDefeat();
      }
    }});
  }

  private onVictory(): void {
    playSFX(this, 'sfx-victory');
    // Boss death animation
    this.tweens.add({
      targets: this.bossSprite, alpha: 0, scaleX: 3, scaleY: 0.2,
      duration: 600, ease: 'Power2',
    });
    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, t('boss.defeated'), {
      fontSize: '16px', fontFamily: 'Press Start 2P, monospace', color: '#44ff44', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.time.delayedCall(2500, () => {
      if (this.sceneData.currentLevel >= getTotalLevels()) {
        this.scene.start('LearningSummaryScene', {
          level: this.sceneData.currentLevel,
          difficulty: this.sceneData.difficulty,
          hp: this.state.heroHearts * 25,
          score: this.sceneData.score + 200,
          puzzlesSolved: this.fragments.length,
          nextScene: 'VictoryScene',
          nextSceneData: {
            score: this.sceneData.score + 200,
            levelReached: this.sceneData.currentLevel,
            bugsDefeated: this.sceneData.currentLevel,
            puzzlesSolved: this.fragments.length,
          },
        });
      } else {
        this.scene.start('LearningSummaryScene', {
          level: this.sceneData.currentLevel,
          difficulty: this.sceneData.difficulty,
          hp: this.state.heroHearts * 25,
          score: this.sceneData.score + 200,
          puzzlesSolved: this.fragments.length,
          nextScene: 'IntroCutsceneScene',
          nextSceneData: {
            level: this.sceneData.currentLevel + 1,
            difficulty: this.sceneData.difficulty,
            hp: this.state.heroHearts * 25,
            score: this.sceneData.score + 200,
          },
        });
      }
    });
  }

  private onDefeat(): void {
    this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, t('boss.player_defeated'), {
      fontSize: '16px', fontFamily: 'Press Start 2P, monospace', color: '#ff4444', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.time.delayedCall(2000, () => {
      this.scene.start('GameOverScene', {
        score: this.sceneData.score,
        levelReached: this.sceneData.currentLevel,
        bugsDefeated: 0,
        puzzlesSolved: 0,
      });
    });
  }

  private getHeartsDisplay(): string {
    return '\u2665'.repeat(this.state.heroHearts) + '\u2661'.repeat(4 - this.state.heroHearts);
  }
}
