/**
 * FeedbackSystem — Visual feedback effects for game events.
 * Provides screen shake, flash overlays, floating text, and particle-like effects.
 */

import Phaser from 'phaser';

export function screenShake(scene: Phaser.Scene, intensity = 3, duration = 200): void {
  scene.cameras.main.shake(duration, intensity / 100);
}

export function screenFlash(scene: Phaser.Scene, color: number = 0xff0000, duration = 150): void {
  const flash = scene.add.rectangle(
    scene.cameras.main.width / 2, scene.cameras.main.height / 2,
    scene.cameras.main.width, scene.cameras.main.height, color, 0.3
  ).setScrollFactor(0).setDepth(999);

  scene.tweens.add({
    targets: flash, alpha: 0, duration, ease: 'Power2',
    onComplete: () => flash.destroy(),
  });
}

export function floatingText(
  scene: Phaser.Scene, x: number, y: number, text: string, color = '#ffffff', duration = 1000
): void {
  const txt = scene.add.text(x, y, text, {
    fontSize: '12px', fontFamily: 'monospace', color, fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(200);

  scene.tweens.add({
    targets: txt, y: y - 24, alpha: 0, duration, ease: 'Power2',
    onComplete: () => txt.destroy(),
  });
}

export function sparkleEffect(scene: Phaser.Scene, x: number, y: number, color = 0x66ccff, count = 6): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const distance = 16 + Math.random() * 12;
    const targetX = x + Math.cos(angle) * distance;
    const targetY = y + Math.sin(angle) * distance;

    const particle = scene.add.rectangle(x, y, 3, 3, color).setDepth(200);

    scene.tweens.add({
      targets: particle, x: targetX, y: targetY, alpha: 0, scaleX: 0.2, scaleY: 0.2,
      duration: 400 + Math.random() * 200, ease: 'Power2',
      onComplete: () => particle.destroy(),
    });
  }
}

export function pulseEffect(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, scale = 1.3): void {
  scene.tweens.add({
    targets: target, scaleX: scale, scaleY: scale, duration: 150, yoyo: true, ease: 'Back.easeOut',
  });
}

export function doorGlowEffect(scene: Phaser.Scene, x: number, y: number, tileSize: number): void {
  const glow = scene.add.rectangle(x, y, tileSize, tileSize, 0xffdd00, 0.0).setDepth(15);

  scene.tweens.add({
    targets: glow, alpha: { from: 0, to: 0.6 }, duration: 500, yoyo: true, repeat: 2,
    ease: 'Sine.easeInOut', onComplete: () => glow.destroy(),
  });
}

export function bossDamageFlash(scene: Phaser.Scene, x: number, y: number, width: number, height: number): void {
  const flash = scene.add.rectangle(x, y, width, height, 0xff0000, 0.4).setDepth(300);

  scene.tweens.add({
    targets: flash, alpha: 0, duration: 300, ease: 'Power2',
    onComplete: () => flash.destroy(),
  });
}
