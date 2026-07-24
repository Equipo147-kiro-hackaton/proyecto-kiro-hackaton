import Phaser from 'phaser';
import { validateUsername } from '@/lib/validateUsername';
import { getOrCreatePlayer } from '@/lib/ApiClient';
import type { PlayerProfile } from '@/types';

export class LoginScene extends Phaser.Scene {
  private inputElement!: HTMLInputElement;
  private inputDOM!: Phaser.GameObjects.DOMElement;
  private loginButton!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;
  private loadingText!: Phaser.GameObjects.Text;
  private personalBestText!: Phaser.GameObjects.Text;
  private isLoading = false;

  constructor() {
    super('LoginScene');
  }

  create(): void {
    this.isLoading = false;

    // Title
    this.add.text(480, 80, 'Cloud Quest: DevOps Dungeon', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(480, 120, 'Defeat production bugs with code!', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Username label
    this.add.text(480, 180, 'Enter your username to begin', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#cccccc',
    }).setOrigin(0.5);

    // Create input element
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.placeholder = 'Enter username...';
    this.inputElement.maxLength = 20;
    this.inputElement.style.cssText = [
      'padding: 10px 14px',
      'font-size: 16px',
      'font-family: monospace',
      'width: 260px',
      'border: 2px solid #555555',
      'border-radius: 4px',
      'background-color: #1a1a2e',
      'color: #ffffff',
      'outline: none',
      'transition: border-color 0.2s',
    ].join('; ');

    this.inputElement.addEventListener('focus', () => {
      this.inputElement.style.borderColor = '#4488ff';
    });

    this.inputElement.addEventListener('blur', () => {
      this.inputElement.style.borderColor = '#555555';
    });

    // Submit on Enter key
    this.inputElement.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        this.handleSubmit();
      }
    });

    this.inputDOM = this.add.dom(480, 230, this.inputElement);

    // Login button
    this.loginButton = this.add.text(480, 290, '[ LOGIN ]', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.loginButton.on('pointerover', () => {
      if (!this.isLoading) {
        this.loginButton.setColor('#88ff88');
      }
    });

    this.loginButton.on('pointerout', () => {
      if (!this.isLoading) {
        this.loginButton.setColor('#44ff44');
      }
    });

    this.loginButton.on('pointerdown', () => {
      this.handleSubmit();
    });

    // Error text (hidden by default)
    this.errorText = this.add.text(480, 330, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ff4444',
      wordWrap: { width: 400 },
      align: 'center',
    }).setOrigin(0.5);

    // Loading text (hidden by default)
    this.loadingText = this.add.text(480, 370, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Personal best text (hidden by default)
    this.personalBestText = this.add.text(480, 410, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffdd44',
    }).setOrigin(0.5);

    // Auto-focus input after 100ms
    this.time.delayedCall(100, () => {
      this.inputElement.focus();
    });
  }

  private handleSubmit(): void {
    if (this.isLoading) return;

    const username = this.inputElement.value.trim();
    this.errorText.setText('');
    this.personalBestText.setText('');

    // Validate username
    if (username.length === 0) {
      this.showError('Please enter a username.');
      return;
    }

    if (username.length < 3 || username.length > 20) {
      this.showError('Username must be between 3 and 20 characters.');
      return;
    }

    if (!validateUsername(username)) {
      this.showError('Only letters, numbers, and underscores are allowed.');
      return;
    }

    // Valid username — call API
    this.setLoadingState(true);
    this.loadingText.setText('Connecting to server...');

    getOrCreatePlayer(username)
      .then((profile: PlayerProfile) => {
        this.setLoadingState(false);
        this.loadingText.setText('');

        // Store player profile in registry
        this.game.registry.set('playerProfile', profile);

        // Show personal best
        const bestScore = profile.personalBest ?? 0;
        this.personalBestText.setText(`Personal Best: ${bestScore}`);

        // Transition to MainMenuScene after 1s delay to show personal best
        this.time.delayedCall(1000, () => {
          this.scene.start('MainMenuScene');
        });
      })
      .catch(() => {
        this.setLoadingState(false);
        this.loadingText.setText('');
        this.showError('Connection failed. Please retry.');
      });
  }

  private showError(message: string): void {
    this.errorText.setText(message);
  }

  private setLoadingState(loading: boolean): void {
    this.isLoading = loading;
    if (loading) {
      this.loginButton.setText('[ ... ]');
      this.loginButton.setColor('#888888');
      this.loginButton.disableInteractive();
      this.inputElement.disabled = true;
    } else {
      this.loginButton.setText('[ LOGIN ]');
      this.loginButton.setColor('#44ff44');
      this.loginButton.setInteractive({ useHandCursor: true });
      this.inputElement.disabled = false;
    }
  }
}
