import Phaser from 'phaser';

/**
 * Direction enum for the hero's facing.
 */
export enum Direction {
  Down = 0,
  Left = 1,
  Right = 2,
  Up = 3,
}

/**
 * Hero — Player-controlled character with discrete tile-based movement.
 *
 * Movement is tile-to-tile (not pixel-based). The hero moves in one tile step
 * per input, with a smooth tween animation between tiles. Cannot move while
 * a tween is active (prevents queuing multiple moves).
 *
 * Spritesheet layout: 4 columns (frames) × 4 rows (Down, Left, Right, Up)
 * Frame size: 16×16px
 */
export class Hero extends Phaser.GameObjects.Sprite {
  /** Current tile position (x in tile coords) */
  private tileX: number;
  /** Current tile position (y in tile coords) */
  private tileY: number;
  /** Tile size in pixels */
  private tileSize: number;
  /** Whether the hero is currently moving between tiles */
  private isMoving = false;
  /** Current facing direction */
  private facing: Direction = Direction.Down;
  /** Duration of movement tween in ms */
  private moveDuration = 150;
  /** Whether movement is locked (e.g., during puzzle overlay) */
  private movementLocked = false;
  /** Collision check callback */
  private collisionCheck: ((tileX: number, tileY: number) => boolean) | null = null;

  constructor(
    scene: Phaser.Scene,
    tileX: number,
    tileY: number,
    tileSize: number,
    textureKey = 'hero'
  ) {
    // Position sprite at center of the tile
    const pixelX = tileX * tileSize + tileSize / 2;
    const pixelY = tileY * tileSize + tileSize / 2;

    super(scene, pixelX, pixelY, textureKey, 0);

    this.tileX = tileX;
    this.tileY = tileY;
    this.tileSize = tileSize;

    // Add to scene
    scene.add.existing(this);

    // Create animations
    this.createAnimations();

    // Set depth above ground tiles
    this.setDepth(10);
  }

  /**
   * Create walk cycle animations for all 4 directions.
   * Frames: row 0 = down, row 1 = left, row 2 = right, row 3 = up
   * Each row has 4 frames (columns 0-3).
   */
  private createAnimations(): void {
    const anims = this.scene.anims;
    const texKey = this.texture.key;

    const directions: Array<{ key: string; row: number }> = [
      { key: `${texKey}-walk-down`, row: 0 },
      { key: `${texKey}-walk-left`, row: 1 },
      { key: `${texKey}-walk-right`, row: 2 },
      { key: `${texKey}-walk-up`, row: 3 },
    ];

    for (const dir of directions) {
      if (!anims.exists(dir.key)) {
        anims.create({
          key: dir.key,
          frames: anims.generateFrameNumbers(texKey, {
            start: dir.row * 4,
            end: dir.row * 4 + 3,
          }),
          frameRate: 8,
          repeat: -1,
        });
      }
    }

    // Idle frames (first frame of each direction)
    const idles: Array<{ key: string; frame: number }> = [
      { key: `${texKey}-idle-down`, frame: 0 },
      { key: `${texKey}-idle-left`, frame: 4 },
      { key: `${texKey}-idle-right`, frame: 8 },
      { key: `${texKey}-idle-up`, frame: 12 },
    ];

    for (const idle of idles) {
      if (!anims.exists(idle.key)) {
        anims.create({
          key: idle.key,
          frames: [{ key: texKey, frame: idle.frame }],
          frameRate: 1,
        });
      }
    }

    // Start with idle facing down
    this.play(`${texKey}-idle-down`);
  }

  /**
   * Set the collision check function. Called before each move
   * to determine if the target tile is walkable.
   * @param fn - Returns true if tile is walkable, false if blocked.
   */
  setCollisionCheck(fn: (tileX: number, tileY: number) => boolean): void {
    this.collisionCheck = fn;
  }

  /**
   * Lock/unlock hero movement (e.g., during puzzle overlays).
   */
  setMovementLocked(locked: boolean): void {
    this.movementLocked = locked;
  }

  /**
   * Check if the hero is currently moving.
   */
  getIsMoving(): boolean {
    return this.isMoving;
  }

  /**
   * Get current facing direction.
   */
  getFacing(): Direction {
    return this.facing;
  }

  /**
   * Get current tile position.
   */
  getTilePosition(): { tileX: number; tileY: number } {
    return { tileX: this.tileX, tileY: this.tileY };
  }

  /**
   * Attempt to move in a direction. If the target tile is walkable
   * and the hero is not already moving, initiates a movement tween.
   * @returns true if movement was initiated, false if blocked/busy.
   */
  move(direction: Direction): boolean {
    if (this.isMoving || this.movementLocked) return false;

    // Update facing regardless of whether we can move
    this.facing = direction;

    // Calculate target tile
    const delta = this.getDirectionDelta(direction);
    const targetTileX = this.tileX + delta.dx;
    const targetTileY = this.tileY + delta.dy;

    // Check collision
    if (this.collisionCheck && !this.collisionCheck(targetTileX, targetTileY)) {
      // Can't move — just face the direction (play idle)
      this.playIdleAnimation();
      return false;
    }

    // Initiate movement
    this.isMoving = true;

    // Play walk animation
    this.playWalkAnimation(direction);

    // Calculate target pixel position
    const targetPixelX = targetTileX * this.tileSize + this.tileSize / 2;
    const targetPixelY = targetTileY * this.tileSize + this.tileSize / 2;

    // Tween to target position
    this.scene.tweens.add({
      targets: this,
      x: targetPixelX,
      y: targetPixelY,
      duration: this.moveDuration,
      ease: 'Linear',
      onComplete: () => {
        this.tileX = targetTileX;
        this.tileY = targetTileY;
        this.isMoving = false;

        // Snap to exact pixel position (avoid floating point drift)
        this.x = targetPixelX;
        this.y = targetPixelY;

        // Emit movement event
        this.emit('moved', { tileX: this.tileX, tileY: this.tileY, direction });
      },
    });

    return true;
  }

  /**
   * Stop the hero (play idle animation for current facing).
   */
  stopMovement(): void {
    if (!this.isMoving) {
      this.playIdleAnimation();
    }
  }

  /**
   * Teleport the hero to a specific tile position (no animation).
   */
  teleportTo(tileX: number, tileY: number): void {
    this.tileX = tileX;
    this.tileY = tileY;
    this.x = tileX * this.tileSize + this.tileSize / 2;
    this.y = tileY * this.tileSize + this.tileSize / 2;
    this.isMoving = false;
  }

  /**
   * Get the tile position the hero is facing (adjacent tile).
   */
  getFacingTile(): { tileX: number; tileY: number } {
    const delta = this.getDirectionDelta(this.facing);
    return {
      tileX: this.tileX + delta.dx,
      tileY: this.tileY + delta.dy,
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────

  private getDirectionDelta(direction: Direction): { dx: number; dy: number } {
    switch (direction) {
      case Direction.Down: return { dx: 0, dy: 1 };
      case Direction.Up: return { dx: 0, dy: -1 };
      case Direction.Left: return { dx: -1, dy: 0 };
      case Direction.Right: return { dx: 1, dy: 0 };
    }
  }

  private playWalkAnimation(direction: Direction): void {
    const texKey = this.texture.key;
    const animKeys = [`${texKey}-walk-down`, `${texKey}-walk-left`, `${texKey}-walk-right`, `${texKey}-walk-up`];
    this.play(animKeys[direction], true);
  }

  private playIdleAnimation(): void {
    const texKey = this.texture.key;
    const idleKeys = [`${texKey}-idle-down`, `${texKey}-idle-left`, `${texKey}-idle-right`, `${texKey}-idle-up`];
    this.play(idleKeys[this.facing], true);
  }
}
