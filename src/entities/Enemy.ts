import Phaser from 'phaser';

/**
 * Enemy — A patrolling bug entity that damages the hero on contact.
 *
 * Behavior:
 * - Moves 1 tile per step with a smooth tween.
 * - Changes direction randomly every 1–3 steps.
 * - If blocked, picks a new direction immediately.
 * - On contact with the hero's tile, emits 'enemy:contact' event.
 *
 * Sprite: uses `enemy-bug-{variant}` texture (4 frames walk cycle).
 */
export class Enemy extends Phaser.GameObjects.Sprite {
  private tileX: number;
  private tileY: number;
  private tileSize: number;
  private isMoving = false;
  private stepsRemaining = 0;
  private currentDirection: { dx: number; dy: number } = { dx: 0, dy: 1 };
  private moveDuration = 300;
  private moveTimer: Phaser.Time.TimerEvent | null = null;
  private collisionCheck: ((tileX: number, tileY: number) => boolean) | null = null;
  private contactCallback: ((enemyTileX: number, enemyTileY: number) => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    tileX: number,
    tileY: number,
    tileSize: number,
    variant: number,
  ) {
    const px = tileX * tileSize + tileSize / 2;
    const py = tileY * tileSize + tileSize / 2;
    const texKey = `enemy-bug-${variant}`;

    super(scene, px, py, texKey, 0);

    this.tileX = tileX;
    this.tileY = tileY;
    this.tileSize = tileSize;

    scene.add.existing(this);
    this.setDepth(8);

    // Create walk animation for this variant
    const animKey = `${texKey}-walk`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(texKey, { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    this.play(animKey);

    // Start patrol
    this.pickNewDirection();
    this.startPatrol();
  }

  /**
   * Set the collision check function (same as hero's).
   */
  setCollisionCheck(fn: (tileX: number, tileY: number) => boolean): void {
    this.collisionCheck = fn;
  }

  /**
   * Set a callback for when the enemy occupies the same tile as the hero.
   */
  setContactCallback(fn: (enemyTileX: number, enemyTileY: number) => void): void {
    this.contactCallback = fn;
  }

  /**
   * Get current tile position.
   */
  getTilePosition(): { tileX: number; tileY: number } {
    return { tileX: this.tileX, tileY: this.tileY };
  }

  /**
   * Check if this enemy is on the same tile as a given position.
   */
  isAtTile(tx: number, ty: number): boolean {
    return this.tileX === tx && this.tileY === ty;
  }

  /**
   * Stop patrol (when scene shuts down).
   */
  stopPatrol(): void {
    if (this.moveTimer) {
      this.moveTimer.destroy();
      this.moveTimer = null;
    }
  }

  /**
   * Resume patrol after it was stopped (e.g., when returning from puzzle).
   */
  resumePatrol(): void {
    if (this.moveTimer) return; // Already patrolling
    this.startPatrol();
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private startPatrol(): void {
    // Move every 600-900ms
    const delay = 600 + Math.floor(Math.random() * 300);
    this.moveTimer = this.scene.time.addEvent({
      delay,
      loop: true,
      callback: () => this.step(),
    });
  }

  private step(): void {
    if (this.isMoving) return;

    if (this.stepsRemaining <= 0) {
      this.pickNewDirection();
    }

    const targetX = this.tileX + this.currentDirection.dx;
    const targetY = this.tileY + this.currentDirection.dy;

    // Check if can move
    if (this.collisionCheck && !this.collisionCheck(targetX, targetY)) {
      this.pickNewDirection();
      return;
    }

    // Move
    this.isMoving = true;
    this.stepsRemaining--;

    const targetPx = targetX * this.tileSize + this.tileSize / 2;
    const targetPy = targetY * this.tileSize + this.tileSize / 2;

    this.scene.tweens.add({
      targets: this,
      x: targetPx,
      y: targetPy,
      duration: this.moveDuration,
      ease: 'Linear',
      onComplete: () => {
        this.tileX = targetX;
        this.tileY = targetY;
        this.isMoving = false;
        this.x = targetPx;
        this.y = targetPy;

        // Check contact with hero
        if (this.contactCallback) {
          this.contactCallback(this.tileX, this.tileY);
        }
      },
    });
  }

  private pickNewDirection(): void {
    const directions = [
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
    ];
    this.currentDirection = directions[Math.floor(Math.random() * directions.length)];
    this.stepsRemaining = 1 + Math.floor(Math.random() * 3); // 1-3 steps
  }
}
