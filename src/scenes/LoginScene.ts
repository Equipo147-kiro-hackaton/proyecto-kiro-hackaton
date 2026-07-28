import Phaser from 'phaser';
import { validateUsername } from '@/lib/validateUsername';
import { getOrCreateProfile } from '@/lib/LocalStorageService';
import { fadeIn, fadeToScene } from '@/lib/SceneTransition';
import { COLORS } from '@/lib/Colors';
import { t, getLocale, toggleLocale, onLocaleChange } from '@/lib/i18n';
import type { PlayerProfile } from '@/types';

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  color: number;
  alpha: number;
  angle: number;
}

interface CircuitLine {
  x: number;
  y: number;
  width: number;
  alpha: number;
  direction: number;
  color: number;
}

// Vibrant neon palette for the title screen
const NEON = {
  CYAN: '#00ffcc',
  GREEN: '#44ff88',
  GOLD: '#ffdd44',
  MAGENTA: '#ff44aa',
  WHITE: '#e0ffff',
  RED: '#ff3366',
  MUTED: '#555577',
  DARK_BG: '#0a0a2a',
} as const;

const NEON_HEX = {
  CYAN: 0x00ffcc,
  GREEN: 0x44ff88,
  GOLD: 0xffdd44,
  MAGENTA: 0xff44aa,
  BG_DARK: 0x050510,
  BG_MID: 0x0a0a2a,
  BG_CENTER: 0x111133,
} as const;

/**
 * LoginScene — Entry point. Username input + language selector.
 * Features a vibrant cyberpunk title screen with animated particles and glow effects.
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
  private particleGraphics!: Phaser.GameObjects.Graphics;
  private circuitGraphics!: Phaser.GameObjects.Graphics;
  private gridOffset = 0;
  private localeUnsubscribe: (() => void) | null = null;

  private particles: Particle[] = [];
  private circuitLines: CircuitLine[] = [];
  private pulseTimer = 0;
  private titleGlowText!: Phaser.GameObjects.Text;
  private subtitleGlowText: Phaser.GameObjects.Text | null = null;
  private frameDecorTop!: Phaser.GameObjects.Text;
  private frameDecorBottom!: Phaser.GameObjects.Text;

  constructor() {
    super('LoginScene');
  }

  create(): void {
    fadeIn(this);
    this.initParticles();
    this.initCircuitLines();
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

  update(_time: number, delta: number): void {
    this.gridOffset = (this.gridOffset + 0.2) % 40;
    this.pulseTimer += delta * 0.003;
    this.drawGrid();
    this.updateParticles(delta);
    this.updateCircuitLines();
  }

  private initParticles(): void {
    const colors = [NEON_HEX.CYAN, NEON_HEX.GREEN, NEON_HEX.GOLD, NEON_HEX.MAGENTA];
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        x: Math.random() * 960,
        y: Math.random() * 540,
        speed: 0.3 + Math.random() * 0.8,
        size: 1 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.2 + Math.random() * 0.6,
        angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.8,
      });
    }
  }

  private initCircuitLines(): void {
    const colors = [NEON_HEX.CYAN, NEON_HEX.GREEN, NEON_HEX.MAGENTA];
    // Left side circuit lines
    for (let i = 0; i < 6; i++) {
      this.circuitLines.push({
        x: 20,
        y: 80 + i * 70,
        width: 60 + Math.random() * 80,
        alpha: 0.3 + Math.random() * 0.4,
        direction: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    // Right side circuit lines
    for (let i = 0; i < 6; i++) {
      this.circuitLines.push({
        x: 960 - 20 - (60 + Math.random() * 80),
        y: 80 + i * 70,
        width: 60 + Math.random() * 80,
        alpha: 0.3 + Math.random() * 0.4,
        direction: -1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  private createBackground(): void {
    // Dark gradient background using layered rectangles
    this.add.rectangle(480, 270, 960, 540, NEON_HEX.BG_DARK);
    this.add.rectangle(480, 270, 960, 540, NEON_HEX.BG_MID).setAlpha(0.7);
    // Radial vignette-like effect: lighter center
    this.add.rectangle(480, 200, 600, 300, NEON_HEX.BG_CENTER).setAlpha(0.3);

    this.gridGraphics = this.add.graphics().setAlpha(0.06);
    this.circuitGraphics = this.add.graphics();
    this.particleGraphics = this.add.graphics();
  }

  private drawGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, NEON_HEX.CYAN);

    const spacing = 40;
    const offset = this.gridOffset;

    for (let x = -spacing + offset; x <= 960 + spacing; x += spacing) {
      this.gridGraphics.lineBetween(x, 0, x, 540);
    }
    for (let y = -spacing + offset; y <= 540 + spacing; y += spacing) {
      this.gridGraphics.lineBetween(0, y, 960, y);
    }
  }

  private updateParticles(delta: number): void {
    this.particleGraphics.clear();
    const speed = delta * 0.06;

    for (const p of this.particles) {
      p.x += Math.cos(p.angle) * p.speed * speed;
      p.y += Math.sin(p.angle) * p.speed * speed;

      // Wrap around
      if (p.y < -10) p.y = 550;
      if (p.y > 550) p.y = -10;
      if (p.x < -10) p.x = 970;
      if (p.x > 970) p.x = -10;

      // Flickering alpha
      const flicker = 0.7 + 0.3 * Math.sin(this.pulseTimer * 2 + p.x * 0.01);
      this.particleGraphics.fillStyle(p.color, p.alpha * flicker);
      this.particleGraphics.fillCircle(p.x, p.y, p.size);
    }
  }

  private updateCircuitLines(): void {
    this.circuitGraphics.clear();
    const pulse = 0.5 + 0.5 * Math.sin(this.pulseTimer * 1.5);

    for (const line of this.circuitLines) {
      const alphaAnimated = line.alpha * (0.4 + 0.6 * pulse);
      // Main line
      this.circuitGraphics.lineStyle(2, line.color, alphaAnimated);
      this.circuitGraphics.lineBetween(line.x, line.y, line.x + line.width, line.y);

      // Small terminal dot at end
      const dotX = line.direction === 1 ? line.x + line.width : line.x;
      this.circuitGraphics.fillStyle(line.color, alphaAnimated * 1.2);
      this.circuitGraphics.fillCircle(dotX, line.y, 3);

      // Small vertical connector
      const connY = line.y + (line.direction === 1 ? 8 : -8);
      this.circuitGraphics.lineStyle(1, line.color, alphaAnimated * 0.6);
      this.circuitGraphics.lineBetween(dotX, line.y, dotX, connY);
    }
  }

  private createLanguageToggle(): void {
    this.languageToggleBtn = this.add
      .text(920, 24, `\u{1F310} ${getLocale().toUpperCase()}`, {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '14px',
        color: NEON.GOLD,
        fontStyle: 'bold',
        backgroundColor: COLORS.BG_PANEL,
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    this.languageToggleBtn.on('pointerover', () => this.languageToggleBtn.setColor(NEON.CYAN));
    this.languageToggleBtn.on('pointerout', () => this.languageToggleBtn.setColor(NEON.GOLD));
    this.languageToggleBtn.on('pointerdown', () => {
      toggleLocale();
    });
  }

  private createTitle(): void {
    // Decorative frame top
    this.frameDecorTop = this.add
      .text(480, 50, '\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550', {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '10px',
        color: NEON.CYAN,
      })
      .setOrigin(0.5)
      .setAlpha(0.6);

    // Title glow layer (behind main title — creates glow effect)
    this.titleGlowText = this.add
      .text(480, 80, '', {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '38px',
        color: NEON.CYAN,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0.3);

    // Main title
    this.titleText = this.add
      .text(480, 80, '', {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '38px',
        color: NEON.WHITE,
        fontStyle: 'bold',
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: NEON.CYAN,
          blur: 12,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5);

    const fullTitle = t('login.title');
    let charIndex = 0;
    this.time.addEvent({
      delay: 50,
      repeat: fullTitle.length - 1,
      callback: () => {
        charIndex++;
        const text = fullTitle.substring(0, charIndex);
        this.titleText.setText(text);
        this.titleGlowText.setText(text);
      },
    });

    // After title typed — show subtitle with gold pulse
    this.time.delayedCall(fullTitle.length * 50 + 200, () => {
      this.subtitleText = this.add
        .text(480, 125, t('login.subtitle'), {
          fontFamily: 'Press Start 2P, monospace',
          fontSize: '16px',
          color: NEON.GOLD,
          shadow: {
            offsetX: 0,
            offsetY: 0,
            color: COLORS.ACCENT_GOLD,
            blur: 8,
            stroke: true,
            fill: true,
          },
        })
        .setOrigin(0.5)
        .setAlpha(0);

      this.tweens.add({
        targets: this.subtitleText,
        alpha: 1,
        duration: 600,
        ease: 'Power2',
      });

      // Pulse animation on subtitle
      this.tweens.add({
        targets: this.subtitleText,
        scaleX: { from: 1, to: 1.03 },
        scaleY: { from: 1, to: 1.03 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    });

    // Decorative frame bottom
    this.frameDecorBottom = this.add
      .text(480, 155, '\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550', {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '10px',
        color: NEON.CYAN,
      })
      .setOrigin(0.5)
      .setAlpha(0.6);

    // Title glow pulse animation
    this.tweens.add({
      targets: this.titleGlowText,
      alpha: { from: 0.2, to: 0.5 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private createForm(): void {
    // Tagline
    this.promptText = this.add
      .text(480, 185, t('login.prompt'), {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '12px',
        color: NEON.GREEN,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: NEON.GREEN,
          blur: 6,
          stroke: false,
          fill: true,
        },
      })
      .setOrigin(0.5);

    // Username input (HTML element with glowing cyan border)
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.placeholder = t('login.placeholder');
    this.inputElement.maxLength = 20;
    this.inputElement.style.cssText = [
      'padding: 12px 16px',
      'font-size: 16px',
      'font-family: "Press Start 2P", monospace',
      'width: 280px',
      'border: 2px solid #00ffcc',
      'border-radius: 6px',
      'background: #0a0a2a',
      'color: #00ffcc',
      'outline: none',
      'text-align: center',
      'transition: border-color 0.3s, box-shadow 0.3s',
      'box-shadow: 0 0 10px rgba(0, 255, 204, 0.2), inset 0 0 6px rgba(0, 255, 204, 0.05)',
    ].join('; ');

    this.inputElement.addEventListener('focus', () => {
      this.inputElement.style.borderColor = '#00ffcc';
      this.inputElement.style.boxShadow = '0 0 20px rgba(0, 255, 204, 0.5), inset 0 0 10px rgba(0, 255, 204, 0.1)';
    });

    this.inputElement.addEventListener('blur', () => {
      this.inputElement.style.borderColor = '#00ffcc';
      this.inputElement.style.boxShadow = '0 0 10px rgba(0, 255, 204, 0.2), inset 0 0 6px rgba(0, 255, 204, 0.05)';
    });

    this.inputElement.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') this.handleSubmit();
    });

    this.add.dom(480, 250, this.inputElement);

    // Login button — big, pulsing green with glow
    this.loginButton = this.add
      .text(480, 320, t('login.button'), {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '22px',
        color: NEON.GREEN,
        fontStyle: 'bold',
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: NEON.GREEN,
          blur: 10,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.loginButton.on('pointerover', () => {
      this.loginButton.setColor('#88ffcc');
      this.loginButton.setShadow(0, 0, '#88ffcc', 14, true, true);
    });
    this.loginButton.on('pointerout', () => {
      this.loginButton.setColor(NEON.GREEN);
      this.loginButton.setShadow(0, 0, NEON.GREEN, 10, true, true);
    });
    this.loginButton.on('pointerdown', () => this.handleSubmit());

    // Pulsing animation on login button
    this.tweens.add({
      targets: this.loginButton,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Error text
    this.errorText = this.add
      .text(480, 370, '', {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '11px',
        color: NEON.RED,
        wordWrap: { width: 420 },
        align: 'center',
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: NEON.RED,
          blur: 4,
          stroke: false,
          fill: true,
        },
      })
      .setOrigin(0.5);

    // Footer hint
    this.footerHintText = this.add
      .text(480, 510, t('login.footer_hint'), {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '9px',
        color: NEON.MUTED,
      })
      .setOrigin(0.5);

    // Small decorative accent
    this.add
      .text(480, 490, '\u2500\u2500\u2500  \u25C6  \u2500\u2500\u2500', {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '8px',
        color: NEON.MAGENTA,
      })
      .setOrigin(0.5)
      .setAlpha(0.5);

    this.time.delayedCall(100, () => this.inputElement.focus());
  }

  private refreshTexts(): void {
    this.titleText.setText(t('login.title'));
    this.titleGlowText.setText(t('login.title'));
    if (this.subtitleText) this.subtitleText.setText(t('login.subtitle'));
    this.promptText.setText(t('login.prompt'));
    this.loginButton.setText(t('login.button'));
    this.footerHintText.setText(t('login.footer_hint'));
    this.languageToggleBtn.setText(`\u{1F310} ${getLocale().toUpperCase()}`);
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

    this.loginButton.setColor(NEON.CYAN);
    this.loginButton.setText(t('login.button_welcome'));

    this.add
      .text(480, 410, t('login.personal_best', { score: profile.personalBest }), {
        fontFamily: 'Press Start 2P, monospace',
        fontSize: '14px',
        color: NEON.GOLD,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: NEON.GOLD,
          blur: 6,
          stroke: false,
          fill: true,
        },
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
