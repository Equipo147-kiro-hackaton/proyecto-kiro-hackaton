import Phaser from 'phaser';
import { validateUsername } from '@/lib/validateUsername';
import { getOrCreateProfile } from '@/lib/LocalStorageService';
import { fadeIn, fadeToScene } from '@/lib/SceneTransition';
import { COLORS, COLORS_HEX } from '@/lib/Colors';
import { t, getLocale, toggleLocale, onLocaleChange } from '@/lib/i18n';
import type { PlayerProfile } from '@/types';

/**
 * LoginScene — Entry point. Username input + language selector.
 */
export class LoginScene extends Phaser.Scene {
  private inputElement!: HTMLInputElement;
  private loginButton!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText: Phaser.GameObjects.Text | null = null;
  private promptText!: Phaser.GameObjects.Text;
  private footerHintText!: Phaser.GameObjects.Text;
  private languageToggleBtn!: Phaser.GameObjects.Text;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private gridOffset = 0;
  private localeUnsubscribe: (() => void) | null = null;

  constructor() {
    super('LoginScene');
  }

  create(): void {
    fadeIn(this);
    this.createBackground();
    this.createLanguageToggle();
    this.createTitle();
    this.createForm();

    this.localeUnsubscribe = onLocaleChange(() => this.refreshTexts());

    this.events.on('shutdown', () => {
      if (this.localeUnsubscribe) {
        this.localeUnsubscribe();
        this.localeUnsubscribe = null;
      }
    });
  }

  update(): void {
    this.gridOffset = (this.gridOffset + 0.3) % 40;
    this.drawGrid();
  }

  private createBackground(): void {
    this.add.rectangle(480, 270, 960, 540, COLORS_HEX.BG_DARK);
    this.gridGraphics = this.add.graphics().setAlpha(0.08);
  }

  private drawGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, COLORS_HEX.PRIMARY_CYAN);

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
        fontFamily: 'monospace',
        fontSize: '14px',
        color: COLORS.ACCENT_GOLD,
        fontStyle: 'bold',
        backgroundColor: COLORS.BG_PANEL,
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    this.languageToggleBtn.on('pointerover', () => this.languageToggleBtn.setColor(COLORS.PRIMARY_CYAN));
    this.languageToggleBtn.on('pointerout', () => this.languageToggleBtn.setColor(COLORS.ACCENT_GOLD));
    this.languageToggleBtn.on('pointerdown', () => {
      toggleLocale();
    });
  }

  private createTitle(): void {
    this.titleText = this.add
      .text(480, 80, '', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: COLORS.TEXT_WHITE,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const fullTitle = t('login.title');
    let charIndex = 0;
    this.time.addEvent({
      delay: 50,
      repeat: fullTitle.length - 1,
      callback: () => {
        charIndex++;
        this.titleText.setText(fullTitle.substring(0, charIndex));
      },
    });

    this.time.delayedCall(fullTitle.length * 50 + 200, () => {
      this.subtitleText = this.add
        .text(480, 120, t('login.subtitle'), {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: COLORS.PRIMARY_CYAN,
        })
        .setOrigin(0.5)
        .setAlpha(0);

      this.tweens.add({
        targets: this.subtitleText,
        alpha: 1,
        duration: 500,
        ease: 'Power2',
      });
    });
  }

  private createForm(): void {
    this.promptText = this.add
      .text(480, 180, t('login.prompt'), {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: COLORS.TEXT_DIM,
      })
      .setOrigin(0.5);

    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.placeholder = t('login.placeholder');
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

    this.loginButton = this.add
      .text(480, 290, t('login.button'), {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: COLORS.SUCCESS_GREEN,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.loginButton.on('pointerover', () => this.loginButton.setColor('#88ffaa'));
    this.loginButton.on('pointerout', () => this.loginButton.setColor(COLORS.SUCCESS_GREEN));
    this.loginButton.on('pointerdown', () => this.handleSubmit());

    this.tweens.add({
      targets: this.loginButton,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.errorText = this.add
      .text(480, 330, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: COLORS.DANGER_RED,
        wordWrap: { width: 400 },
        align: 'center',
      })
      .setOrigin(0.5);

    this.footerHintText = this.add
      .text(480, 500, t('login.footer_hint'), {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: COLORS.TEXT_MUTED,
      })
      .setOrigin(0.5);

    this.time.delayedCall(100, () => this.inputElement.focus());
  }

  private refreshTexts(): void {
    this.titleText.setText(t('login.title'));
    if (this.subtitleText) this.subtitleText.setText(t('login.subtitle'));
    this.promptText.setText(t('login.prompt'));
    this.loginButton.setText(t('login.button'));
    this.footerHintText.setText(t('login.footer_hint'));
    this.languageToggleBtn.setText(`\ud83c\udf10 ${getLocale().toUpperCase()}`);
    if (this.inputElement) {
      this.inputElement.placeholder = t('login.placeholder');
    }
  }

  private handleSubmit(): void {
    const username = this.inputElement.value.trim();
    this.errorText.setText('');

    if (username.length < 3 || username.length > 20) {
      this.errorText.setText(t('login.error_length'));
      this.shakeInput();
      return;
    }
    if (!validateUsername(username)) {
      this.errorText.setText(t('login.error_chars'));
      this.shakeInput();
      return;
    }

    const profile: PlayerProfile = getOrCreateProfile(username);
    this.game.registry.set('playerProfile', profile);

    this.loginButton.setColor(COLORS.PRIMARY_CYAN);
    this.loginButton.setText(t('login.button_welcome'));

    this.add
      .text(480, 370, t('login.personal_best', { score: profile.personalBest }), {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: COLORS.ACCENT_GOLD,
      })
      .setOrigin(0.5);

    this.time.delayedCall(800, () => {
      fadeToScene(this, 'MainMenuScene');
    });
  }

  private shakeInput(): void {
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
