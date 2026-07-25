import Phaser from 'phaser';
import { validateUsername } from '@/lib/validateUsername';
import { getOrCreateProfile } from '@/lib/LocalStorageService';
import type { PlayerProfile } from '@/types';

export class LoginScene extends Phaser.Scene {
  private inputElement!: HTMLInputElement;
  private loginButton!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;

  constructor() { super('LoginScene'); }

  create(): void {
    this.add.text(480, 80, 'Cloud Quest: DevOps Dungeon', { fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(480, 120, 'Defeat production bugs with code!', { fontFamily: 'monospace', fontSize: '14px', color: '#aaaaaa' }).setOrigin(0.5);
    this.add.text(480, 180, 'Enter your username to begin', { fontFamily: 'monospace', fontSize: '16px', color: '#cccccc' }).setOrigin(0.5);

    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.placeholder = 'Enter username...';
    this.inputElement.maxLength = 20;
    this.inputElement.style.cssText = 'padding:10px 14px;font-size:16px;font-family:monospace;width:260px;border:2px solid #555;border-radius:4px;background:#1a1a2e;color:#fff;outline:none;text-align:center';
    this.inputElement.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') this.handleSubmit(); });
    this.add.dom(480, 230, this.inputElement);

    this.loginButton = this.add.text(480, 290, '[ LOGIN ]', { fontFamily: 'monospace', fontSize: '18px', color: '#44ff44', fontStyle: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.loginButton.on('pointerdown', () => this.handleSubmit());

    this.errorText = this.add.text(480, 330, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ff4444', wordWrap: { width: 400 }, align: 'center' }).setOrigin(0.5);

    this.time.delayedCall(100, () => this.inputElement.focus());
  }

  private handleSubmit(): void {
    const username = this.inputElement.value.trim();
    this.errorText.setText('');

    if (username.length < 3 || username.length > 20) { this.errorText.setText('Username must be 3-20 characters.'); return; }
    if (!validateUsername(username)) { this.errorText.setText('Only letters, numbers, and underscores allowed.'); return; }

    const profile: PlayerProfile = getOrCreateProfile(username);
    this.game.registry.set('playerProfile', profile);

    this.add.text(480, 380, `Personal Best: ${profile.personalBest}`, { fontFamily: 'monospace', fontSize: '16px', color: '#ffdd44' }).setOrigin(0.5);
    this.time.delayedCall(800, () => this.scene.start('MainMenuScene'));
  }
}
