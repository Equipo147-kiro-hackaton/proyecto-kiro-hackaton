/**
 * CameraController — Phaser component that applies computed camera framing
 * (zoom, bounds, follow, centering) to the scene's main camera.
 */

import Phaser from 'phaser';
import type { CameraFrame } from '@/systems/CameraFraming';

export class CameraController {
  private scene: Phaser.Scene;
  private currentFrame: CameraFrame | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Apply zoom, viewport, bounds, and centering based on the computed frame. */
  apply(frame: CameraFrame, mapWidthTiles: number, mapHeightTiles: number): void {
    this.currentFrame = frame;
    const cam = this.scene.cameras.main;

    cam.setViewport(
      frame.viewport.x,
      frame.viewport.y,
      frame.viewport.width,
      frame.viewport.height,
    );
    cam.setZoom(frame.zoom);
    cam.setBounds(
      frame.bounds.x,
      frame.bounds.y,
      frame.bounds.width,
      frame.bounds.height,
    );

    // Center map on axes where it doesn't fill the viewport
    if (frame.centerX || frame.centerY) {
      const mapPxW = mapWidthTiles * 16;
      const mapPxH = mapHeightTiles * 16;
      const centerX = frame.centerX ? mapPxW / 2 : cam.scrollX + frame.viewport.width / (2 * frame.zoom);
      const centerY = frame.centerY ? mapPxH / 2 : cam.scrollY + frame.viewport.height / (2 * frame.zoom);
      cam.centerOn(centerX, centerY);
    }
  }

  /** Start following a target sprite with the configured lerp factor. */
  follow(target: Phaser.GameObjects.Sprite): void {
    const lerp = this.currentFrame?.followLerp ?? 0.1;
    this.scene.cameras.main.startFollow(target, true, lerp, lerp);
  }

  /** Recalculate and apply frame before first frame of a new floor (Req 11.9). */
  reframe(frame: CameraFrame, mapWidthTiles: number, mapHeightTiles: number): void {
    this.apply(frame, mapWidthTiles, mapHeightTiles);
  }
}
