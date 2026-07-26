import Phaser from 'phaser';
import { COLORS_HEX } from '@/lib/Colors';

/**
 * InteractionIndicator — Visual prompt above interactable objects.
 *
 * Two modes:
 * - Proximity mode (2 tiles): Shows pulsing "!" warning icon
 * - Direct mode (facing): Shows "Press E" with glow effect
 */
export class InteractionIndicator extends Phaser.GameObjects.Container {
  private warningLabel: Phaser.GameObjects.Text;
  private actionLabel: Phaser.GameObjects.Text;
  private bgRect: Phaser.GameObjects.Rectangle;
  private glowRect: Phaser.GameObjects.Rectangle;
  private bounceTween: Phaser.Tweens.Tween | null = null;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private mode: 'hidden' | 'proximity' | 'direct' = 'hidden';

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    // Glow background (larger, semi-transparent)
    this.glowRect = scene.add.rectangle(0, 0, 40, 18, COLORS_HEX.ACCENT_GOLD, 0.2)
      .setStrokeStyle(1, COLORS_HEX.ACCENT_GOLD, 0.6);

    // Solid background
    this.bgRect = scene.add.rectangle(0, 0, 36, 14, 0x000000, 0.85)
      .setStrokeStyle(1, COLORS_HEX.ACCENT_GOLD);

    // Warning "!" label (proximity mode)
    this.warningLabel = scene.add.text(0, 0, '\u26A0', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // "Press E" label (direct mode)
    this.actionLabel = scene.add.text(0, 0, 'E', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#44ff88',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add([this.glowRect, this.bgRect, this.warningLabel, this.actionLabel]);
    this.setDepth(50);
    this.setVisible(false);
    this.actionLabel.setVisible(false);
    this.warningLabel.setVisible(false);

    scene.add.existing(this);
  }

  /**
   * Show in proximity mode: pulsing warning icon (hero within 2 tiles but not facing directly).
   */
  showProximity(x: number, y: number): void {
    if (this.mode === 'proximity' && this.visible) return;

    this.mode = 'proximity';
    this.setPosition(x, y - 14);
    this.setVisible(true);
    this.setAlpha(1);

    // Show warning, hide action
    this.warningLabel.setVisible(true);
    this.actionLabel.setVisible(false);
    this.bgRect.setStrokeStyle(1, COLORS_HEX.ACCENT_GOLD);
    this.glowRect.setFillStyle(COLORS_HEX.ACCENT_GOLD, 0.15);

    this.startBounce(y - 14);
  }

  /**
   * Show in direct mode: "Press E" with green glow (hero facing the object).
   */
  showDirect(x: number, y: number): void {
    if (this.mode === 'direct' && this.visible) return;

    this.mode = 'direct';
    this.setPosition(x, y - 14);
    this.setVisible(true);
    this.setAlpha(1);

    // Show action, hide warning
    this.warningLabel.setVisible(false);
    this.actionLabel.setVisible(true);
    this.bgRect.setStrokeStyle(1, COLORS_HEX.SUCCESS_GREEN);
    this.glowRect.setFillStyle(COLORS_HEX.SUCCESS_GREEN, 0.2);

    this.startBounce(y - 14);
    this.startGlow();
  }

  /**
   * Legacy show method — maps to showDirect for backward compatibility.
   */
  show(x: number, y: number): void {
    this.showDirect(x, y);
  }

  /**
   * Hide the indicator and stop animations.
   */
  hide(): void {
    if (this.mode === 'hidden') return;
    this.mode = 'hidden';
    this.setVisible(false);
    this.stopAnimations();
  }

  /**
   * Clean up resources.
   */
  cleanup(): void {
    this.hide();
    this.destroy(true);
  }

  private startBounce(baseY: number): void {
    if (this.bounceTween && this.bounceTween.isPlaying()) return;

    this.bounceTween = this.scene.tweens.add({
      targets: this,
      y: baseY - 4,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startGlow(): void {
    if (this.glowTween && this.glowTween.isPlaying()) return;

    this.glowTween = this.scene.tweens.add({
      targets: this.glowRect,
      alpha: { from: 0.4, to: 0.8 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopAnimations(): void {
    if (this.bounceTween) {
      this.bounceTween.stop();
      this.bounceTween = null;
    }
    if (this.glowTween) {
      this.glowTween.stop();
      this.glowTween = null;
    }
  }
}
