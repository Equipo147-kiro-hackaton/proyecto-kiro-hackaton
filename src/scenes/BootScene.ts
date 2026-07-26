import Phaser from 'phaser';
import { COLORS_HEX } from '@/lib/Colors';
import { t } from '@/lib/i18n';

/**
 * BootScene — Loading screen shown while assets preload.
 * Displays a progress bar and a random gameplay tip.
 * Transitions to LoginScene once all assets are ready.
 */

const TIPS = [
  'Press M to mute/unmute music at any time.',
  'Collect all fragments to unlock the door to the boss.',
  'Watch out for red traps — they cost -25 HP!',
  'Patrolling bugs deal -15 HP on contact. Keep moving!',
  'In Rush Mode, combos increase your damage output.',
  'The backup action in JRPG mode restores 1 heart — use it wisely.',
  'Each level has a different boss type. Stay alert!',
  'Press ESC to return to the main menu from any scene.',
  'Your score is saved locally even without internet.',
  'Toggle language with the globe icon in the menu.',
];

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    this.add.rectangle(w / 2, h / 2, w, h, COLORS_HEX.BG_DARK);

    // Title
    this.add.text(w / 2, h * 0.3, 'CLOUD QUEST', {
      fontSize: '18px', fontFamily: 'Press Start 2P, monospace', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.3 + 28, 'DevOps Dungeon', {
      fontSize: '10px', fontFamily: 'Press Start 2P, monospace', color: '#4488ff',
    }).setOrigin(0.5);

    // Progress bar
    const barWidth = 300;
    const barHeight = 16;
    const barX = w / 2 - barWidth / 2;
    const barY = h * 0.55;

    // Bar background
    this.add.rectangle(w / 2, barY + barHeight / 2, barWidth + 4, barHeight + 4, 0x222233)
      .setStrokeStyle(1, 0x4488ff, 0.5);

    const progressBar = this.add.graphics();

    // Loading text
    const loadingText = this.add.text(w / 2, barY - 16, t('leaderboard.loading'), {
      fontSize: '8px', fontFamily: 'Press Start 2P, monospace', color: '#aaaaaa',
    }).setOrigin(0.5);

    // Random tip
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    this.add.text(w / 2, h * 0.75, `TIP: ${tip}`, {
      fontSize: '7px', fontFamily: 'Press Start 2P, monospace', color: '#666666',
      wordWrap: { width: w - 100 }, align: 'center',
    }).setOrigin(0.5);

    // Progress callback
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x4488ff, 1);
      progressBar.fillRect(barX + 2, barY + 2, (barWidth - 4) * value, barHeight - 4);
      loadingText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      loadingText.setText('READY');
    });

    // Load game assets (tileset, hero spritesheet)
    if (!this.textures.exists('tiles-puny-dungeon')) {
      this.load.image('tiles-puny-dungeon', 'assets/tilesets/puny-dungeon.png');
    }
    if (!this.textures.exists('hero')) {
      this.load.spritesheet('hero', 'assets/sprites/hero-spritesheet.png', { frameWidth: 16, frameHeight: 16 });
    }

    // Load SFX audio files (Kenney CC0)
    const sfxFiles = [
      { key: 'sfx-step', path: 'assets/sounds/step.ogg' },
      { key: 'sfx-interact', path: 'assets/sounds/interact.ogg' },
      { key: 'sfx-correct', path: 'assets/sounds/correct.ogg' },
      { key: 'sfx-incorrect', path: 'assets/sounds/incorrect.ogg' },
      { key: 'sfx-fragment', path: 'assets/sounds/fragment.ogg' },
      { key: 'sfx-boss-hit', path: 'assets/sounds/boss-hit.ogg' },
      { key: 'sfx-boss-attack', path: 'assets/sounds/boss-attack.ogg' },
      { key: 'sfx-victory', path: 'assets/sounds/victory.ogg' },
      { key: 'sfx-damage', path: 'assets/sounds/damage.ogg' },
      { key: 'sfx-door', path: 'assets/sounds/door.ogg' },
    ];
    for (const sfx of sfxFiles) {
      if (!this.cache.audio.exists(sfx.key)) {
        this.load.audio(sfx.key, sfx.path);
      }
    }
  }

  create(): void {
    // Brief pause for visual effect, then go to login
    this.time.delayedCall(400, () => {
      this.scene.start('LoginScene');
    });

    // F12 screenshot functionality
    this.input.keyboard?.on('keydown-F12', () => this.takeScreenshot());
  }

  private takeScreenshot(): void {
    this.game.renderer.snapshot((image: Phaser.Display.Color | HTMLImageElement) => {
      if (image instanceof HTMLImageElement) {
        const link = document.createElement('a');
        link.href = image.src;
        link.download = `cloud-quest-screenshot-${Date.now()}.png`;
        link.click();
      }
    });
  }
}
