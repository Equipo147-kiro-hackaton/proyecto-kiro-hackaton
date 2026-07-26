import Phaser from 'phaser';
import { validateUsername } from '@/lib/validateUsername';
import { getOrCreateProfile } from '@/lib/LocalStorageService';
import { fadeIn, fadeToScene } from '@/lib/SceneTransition';
import { COLORS, COLORS_HEX } from '@/lib/Colors';
import type { PlayerProfile } from '@/types';

/**
 * LoginScene — Entry point. Username input with cyberpunk terminal aesthetic.
 */
export class LoginScene extends Phaser.Scene {
  private inputElement!: HTMLInputElement;
  private loginButton!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private gridOffset = 0;

  constructor() { super('LoginScene'); }

  create(): void {
    fadeIn(this);
    this.createBackground();
    this.createTitle();
    this.createForm();
  }

  update(): void {
    // Animate grid scrolling
    this.gridOffset = (this.gridOffset + 0.3) % 40;
    this.drawGrid();
  }

  private createBackground(): void {
    // Dark background
    this.add.rectangle(480, 270, 960, 540, COLORS_HEX.BG_DARK);

    // Animated grid
    this.gridGraphics = this.add.graphics().setAlpha(0.08);
  }

  private drawGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, COLORS_HEX.PRIMARY_CYAN);

    const spacing = 40;
    const offset = this.gridOffset;

    // Vertical lines
    for (let x = -spacing + offset; x <= 960 + spacing; x += spacing) {
      this.gridGraphics.lineBetween(x, 0, x, 540);
    }
    // Horizontal lines
    for (let y = -spacing + offset; y <= 540 + spacing; y += spacing) {
      this.gridGraphics.lineBetween(0, y, 960, y);
    }
  }

  private createTitle(): void {
    // Main title with typing effect
    this.titleText = this.add.text(480, 80, '', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: COLORS.TEXT_WHITE,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Type out the title character by character
    const fullTitle = 'Cloud Quest: DevOps Dungeon';
    let charIndex = 0;
    this.time.addEvent({
      delay: 50,
      repeat: fullTitle.length - 1,
      callback: () => {
        charIndex++;
        this.titleText.setText(fullTitle.substring(0, charIndex));
      },
    });

    // Subtitle (appears after title finishes typing)
    this.time.delayedCall(fullTitle.length * 50 + 200, () => {
      this.add.text(480, 120, 'Defeat production bugs with code!', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: COLORS.PRIMARY_CYAN,
      }).setOrigin(0.5).setAlpha(0).setName('subtitle');

      const subtitle = this.children.getByName('subtitle') as Phaser.GameObjects.Text;
      if (subtitle) {
        this.tweens.add({
          targets: subtitle,
          alpha: 1,
          duration: 500,
          ease: 'Power2',
        });
      }
    });
  }

  private createForm(): void {
    // Prompt text
    this.add.text(480, 180, '> Enter your username to begin', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: COLORS.TEXT_DIM,
    }).setOrigin(0.5);

    // Input element
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.placeholder = 'username_here';
    this.inputElement.maxLength = 20;
    this.inputElement.style.cssText = [
      'padding: 10px 14px',
      'font-size: 16px',
      'font-family: monospace',
      'width: 260px',
      'border: 2px solid #4488ff',
      'border-radius: 4px',
      `background: ${COLORS.BG_PANEL}`,
      `color: ${COLORS.PRIMARY_CYAN}`,
      'outline: none',
      'text-align: center',
      'transition: border-color 0.2s, box-shadow 0.2s',
    ].join('; ');

    this.inputElement.addEventListener('focus', () => {
      this.inputElement.style.borderColor = COLORS.PRIMARY_CYAN;
      this.inputElement.style.boxShadow = '0 0 8px rgba(0, 255, 204, 0.3)';
    });

    this.inputElement.addEventListener('blur', () => {
      this.inputElement.style.borderColor = '#4488ff';
      this.inputElement.style.boxShadow = 'none';
    });

    this.inputElement.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') this.handleSubmit();
    });

    this.add.dom(480, 230, this.inputElement);

    // Login button with pulsing effect
    this.loginButton = this.add.text(480, 290, '[ LOGIN ]', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: COLORS.SUCCESS_GREEN,
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.loginButton.on('pointerover', () => this.loginButton.setColor('#88ffaa'));
    this.loginButton.on('pointerout', () => this.loginButton.setColor(COLORS.SUCCESS_GREEN));
    this.loginButton.on('pointerdown', () => this.handleSubmit());

    // Subtle pulse animation on login button
    this.tweens.add({
      targets: this.loginButton,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Error text
    this.errorText = this.add.text(480, 330, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: COLORS.DANGER_RED,
      wordWrap: { width: 400 },
      align: 'center',
    }).setOrigin(0.5);

    // Keyboard shortcut hint
    this.add.text(480, 500, 'Enter = Login | 3-20 chars, letters/numbers/underscore', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: COLORS.TEXT_MUTED,
    }).setOrigin(0.5);

    // Auto-focus
    this.time.delayedCall(100, () => this.inputElement.focus());
  }

  private handleSubmit(): void {
    const username = this.inputElement.value.trim();
    this.errorText.setText('');

    if (username.length < 3 || username.length > 20) {
      this.errorText.setText('Username must be 3-20 characters.');
      this.shakeInput();
      return;
    }
    if (!validateUsername(username)) {
      this.errorText.setText('Only letters, numbers, and underscores allowed.');
      this.shakeInput();
      return;
    }

    const profile: PlayerProfile = getOrCreateProfile(username);
    this.game.registry.set('playerProfile', profile);

    // Show success and transition
    this.loginButton.setColor(COLORS.PRIMARY_CYAN);
    this.loginButton.setText('[ WELCOME ]');

    this.add.text(480, 370, `Personal Best: ${profile.personalBest}`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: COLORS.ACCENT_GOLD,
    }).setOrigin(0.5);

    this.time.delayedCall(800, () => {
      fadeToScene(this, 'MainMenuScene');
    });
  }

  private shakeInput(): void {
    // Shake the error text briefly
    this.tweens.add({
      targets: this.errorText,
      x: this.errorText.x + 4,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.inOut',
    });
  }
}
