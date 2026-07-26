/**
 * SceneTransition — Utility for smooth fade transitions between scenes.
 * Provides a consistent 300ms fade-out → scene.start → fade-in pattern.
 */

import Phaser from 'phaser';

const FADE_DURATION = 300;

/**
 * Transition to another scene with a fade-out/fade-in effect.
 * @param scene - The current scene initiating the transition
 * @param targetScene - The scene key to transition to
 * @param data - Optional data to pass to the target scene
 */
export function fadeToScene(
  scene: Phaser.Scene,
  targetScene: string,
  data?: Record<string, unknown>
): void {
  // Prevent double-transitions
  if (scene.cameras.main.fadeEffect.isRunning) return;

  scene.cameras.main.fadeOut(FADE_DURATION, 0, 0, 0);

  scene.cameras.main.once(
    Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
    () => {
      scene.scene.start(targetScene, data);
    }
  );
}

/**
 * Apply a fade-in effect when a scene starts.
 * Call this in the scene's create() method.
 * @param scene - The scene that just started
 */
export function fadeIn(scene: Phaser.Scene): void {
  scene.cameras.main.fadeIn(FADE_DURATION, 0, 0, 0);
}
