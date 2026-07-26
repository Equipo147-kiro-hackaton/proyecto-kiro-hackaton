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

// ─── Phase 5 Polish Effects ───────────────────────────────────────────────────

/**
 * Additive-blend sparkle burst — used on fragment collection.
 * More particles with layered glow rings for a premium feel.
 */
export function sparkleCollect(scene: Phaser.Scene, x: number, y: number): void {
  const colors = [0x66ccff, 0x44ffaa, 0xffdd44, 0xffffff];

  // Inner glow ring
  const ring = scene.add.circle(x, y, 4, 0x66ccff, 0.6).setDepth(200);
  scene.tweens.add({
    targets: ring, scaleX: 4, scaleY: 4, alpha: 0,
    duration: 500, ease: 'Power2',
    onComplete: () => ring.destroy(),
  });

  // Outer particles (12 particles, random colors)
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 20 + Math.random() * 16;
    const tx = x + Math.cos(angle) * dist;
    const ty = y + Math.sin(angle) * dist;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 2 + Math.random() * 2;

    const p = scene.add.rectangle(x, y, size, size, color).setDepth(201).setAlpha(0.9);
    scene.tweens.add({
      targets: p, x: tx, y: ty, alpha: 0, scaleX: 0.1, scaleY: 0.1,
      duration: 300 + Math.random() * 300, ease: 'Power3',
      onComplete: () => p.destroy(),
    });
  }

  // Center flash
  const flash = scene.add.circle(x, y, 6, 0xffffff, 0.8).setDepth(202);
  scene.tweens.add({
    targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0,
    duration: 250, ease: 'Power2',
    onComplete: () => flash.destroy(),
  });
}

/**
 * Juicy damage number — large bouncing text that scales up then fades.
 * Used for boss damage display and enemy contact feedback.
 */
export function juicyDamageNumber(
  scene: Phaser.Scene, x: number, y: number, text: string, color = '#ff4444'
): void {
  const txt = scene.add.text(x, y, text, {
    fontSize: '16px', fontFamily: 'Press Start 2P, monospace', color, fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(250).setScale(0.3);

  // Scale up with bounce
  scene.tweens.add({
    targets: txt, scaleX: 1.2, scaleY: 1.2,
    duration: 150, ease: 'Back.easeOut',
    onComplete: () => {
      // Then float up and fade
      scene.tweens.add({
        targets: txt, y: y - 30, alpha: 0, scaleX: 0.8, scaleY: 0.8,
        duration: 800, ease: 'Power2',
        onComplete: () => txt.destroy(),
      });
    },
  });
}

/**
 * Confetti burst — multicolor particles exploding outward.
 * Used on boss defeat / victory scene.
 */
export function confettiBurst(scene: Phaser.Scene, x: number, y: number, count = 30): void {
  const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff, 0xffffff, 0xffaa44];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 80;
    const tx = x + Math.cos(angle) * speed;
    const ty = y + Math.sin(angle) * speed - Math.random() * 40; // Bias upward
    const color = colors[Math.floor(Math.random() * colors.length)];
    const w = 2 + Math.random() * 4;
    const h = 2 + Math.random() * 3;

    const confetti = scene.add.rectangle(x, y, w, h, color).setDepth(300).setRotation(Math.random() * Math.PI);

    scene.tweens.add({
      targets: confetti,
      x: tx,
      y: ty + 60, // Gravity-like fall
      rotation: confetti.rotation + Math.PI * 2 * (Math.random() > 0.5 ? 1 : -1),
      alpha: 0,
      duration: 1000 + Math.random() * 500,
      ease: 'Power1',
      onComplete: () => confetti.destroy(),
    });
  }
}

// ─── Cinematic Transitions ────────────────────────────────────────────────────

/**
 * Level fade + text reveal — used by IntroCutsceneScene.
 * Black overlay fades in, text scales up from center, then overlay fades out.
 */
export function cinematicLevelReveal(
  scene: Phaser.Scene, levelName: string, onComplete: () => void
): void {
  const w = scene.cameras.main.width;
  const h = scene.cameras.main.height;

  const overlay = scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 1).setDepth(500);
  const text = scene.add.text(w / 2, h / 2, levelName, {
    fontSize: '14px', fontFamily: 'Press Start 2P, monospace', color: '#ffcc00', fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(501).setScale(0.3).setAlpha(0);

  // Text scale up + reveal
  scene.tweens.add({
    targets: text, scaleX: 1, scaleY: 1, alpha: 1,
    duration: 600, ease: 'Back.easeOut', delay: 200,
  });

  // After text is shown, fade overlay out
  scene.time.delayedCall(1500, () => {
    scene.tweens.add({
      targets: [overlay, text], alpha: 0,
      duration: 500, ease: 'Power2',
      onComplete: () => {
        overlay.destroy();
        text.destroy();
        onComplete();
      },
    });
  });
}

/**
 * Boss intro zoom + shake — dramatic entrance for boss scenes.
 * Camera zooms slightly then shakes, with a red flash.
 */
export function bossIntroEffect(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  const originalZoom = cam.zoom;

  // Zoom in slightly
  scene.tweens.add({
    targets: cam, zoom: originalZoom * 1.05,
    duration: 300, yoyo: true, ease: 'Power2',
  });

  // Red flash + shake after a beat
  scene.time.delayedCall(150, () => {
    screenShake(scene, 6, 300);
    screenFlash(scene, 0xff2200, 200);
  });
}

/**
 * Victory slow-motion — brief time-scale slowdown for dramatic effect.
 * Slows tweens for 600ms then restores.
 */
export function victorySlowMotion(scene: Phaser.Scene): void {
  scene.tweens.timeScale = 0.3;
  scene.time.timeScale = 0.5;

  scene.time.delayedCall(300, () => {
    // Delayedcall uses the scene's time scale so actual wall time is ~600ms
    scene.tweens.timeScale = 1;
    scene.time.timeScale = 1;
  });
}
