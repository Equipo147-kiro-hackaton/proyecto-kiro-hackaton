import Phaser from 'phaser';

/**
 * InteractionIndicator — Visual "Press E" prompt that appears
 * above interactable objects when the hero is in range.
 *
 * Rendered as a floating text with a subtle bounce animation.
 */
export class InteractionIndicator extends Phaser.GameObjects.Container {
  private label: Phaser.GameObjects.Text;
  private bgRect: Phaser.GameObjects.Rectangle;
  private bounceTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    // Background rectangle
    this.bgRect = scene.add.rectangle(0, 0, 28, 12, 0x000000, 0.7)
      .setStrokeStyle(1, 0x44ff44);

    // "E" text label
    this.label = scene.add.text(0, 0, 'E', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add([this.bgRect, this.label]);
    this.setDepth(50);
    this.setVisible(false);

    scene.add.existing(this);
  }

  /**
   * Show the indicator at a specific world position (above the interactable).
   * @param x - Pixel x (center of tile)
   * @param y - Pixel y (above the tile)
   */
  show(x: number, y: number): void {
    this.setPosition(x, y - 12);
    this.setVisible(true);
    this.setAlpha(1);

    // Start bounce animation if not already running
    if (!this.bounceTween || !this.bounceTween.isPlaying()) {
      this.bounceTween = this.scene.tweens.add({
        targets: this,
        y: y - 16,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /**
   * Hide the indicator.
   */
  hide(): void {
    this.setVisible(false);
    if (this.bounceTween) {
      this.bounceTween.stop();
      this.bounceTween = null;
    }
  }

  /**
   * Clean up resources.
   */
  cleanup(): void {
    this.hide();
    this.destroy(true);
  }
}
