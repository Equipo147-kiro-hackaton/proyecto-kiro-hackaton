import Phaser from 'phaser';
import { Hero, Direction } from '@/entities/Hero';
import { InteractionIndicator } from '@/entities/InteractionIndicator';
import { isTileWalkable } from '@/lib/TilemapHelper';
import {
  parseInteractables,
  findInteractableInRange,
  findNearbyInteractables,
  activateInteractable,
  getFragmentProgress,
  type TiledObjectData,
} from '@/systems/InteractableSystem';
import { PuzzleOverlay } from '@/ui/PuzzleOverlay';
import { PuzzleEngine } from '@/systems/PuzzleEngine';
import { EventBus } from '@/lib/EventBus';
import type { Interactable, DifficultyMode } from '@/types';

/**
 * TileTestScene — Test scene for validating tilemap pipeline,
 * hero movement, and interactable system.
 * Scene key: 'TileTestScene'
 */
export class TileTestScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer;
  private hero!: Hero;
  private collisionData: number[] = [];

  // Interactable system
  private interactables: Interactable[] = [];
  private interactionIndicator!: InteractionIndicator;
  private currentInteractable: Interactable | null = null;
  private progressText!: Phaser.GameObjects.Text;

  // Puzzle overlay
  private puzzleOverlay: PuzzleOverlay | null = null;
  private puzzleEngine!: PuzzleEngine;
  private currentDifficulty: DifficultyMode = 'normal';

  // Input keys
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super('TileTestScene');
  }

  preload(): void {
    // Load tileset image
    this.load.image('placeholder-tiles', 'assets/tilesets/placeholder-tileset.png');
    // Load tilemap JSON
    this.load.tilemapTiledJSON('test-map', 'assets/tilemaps/test-map.json');
    // Load hero spritesheet (4 cols × 4 rows, 16×16 frames)
    this.load.spritesheet('hero', 'assets/sprites/hero-spritesheet.png', {
      frameWidth: 16,
      frameHeight: 16,
    });
  }

  create(): void {
    // Create the tilemap
    this.map = this.make.tilemap({ key: 'test-map' });

    // Add the tileset image to the map
    const tileset = this.map.addTilesetImage('placeholder', 'placeholder-tiles');
    if (!tileset) {
      console.error('Failed to load tileset');
      return;
    }

    // Create layers
    const ground = this.map.createLayer('ground', tileset, 0, 0);
    const collision = this.map.createLayer('collision', tileset, 0, 0);

    if (!ground || !collision) {
      console.error('Failed to create tilemap layers');
      return;
    }

    this.groundLayer = ground;
    this.collisionLayer = collision;

    // Set collision on wall tiles (index 2 in our tilemap = tile ID 2)
    this.collisionLayer.setCollisionByExclusion([0]);

    // Make collision layer semi-transparent for debugging
    this.collisionLayer.setAlpha(0.5);

    // Extract collision data for the movement system
    this.collisionData = this.extractCollisionData();

    // Parse and display objects from the object layer
    this.displayObjectMarkers();

    // Spawn the hero at the spawn point
    this.spawnHero();

    // Setup camera to follow hero
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setZoom(2.5);
    this.cameras.main.startFollow(this.hero, true, 0.1, 0.1);

    // Initialize interactable system
    this.initInteractables();

    // Initialize puzzle engine
    this.puzzleEngine = new PuzzleEngine();

    // Create interaction indicator
    this.interactionIndicator = new InteractionIndicator(this);

    // Setup input
    this.setupInput();

    // Display position info (fixed to camera)
    this.add.text(4, 4, 'WASD/Arrows: move | E: interact | ESC: back', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 2, y: 1 },
    }).setScrollFactor(0).setDepth(100);

    // Fragment progress text
    const progress = getFragmentProgress(this.interactables);
    this.progressText = this.add.text(4, 16, `Fragments: ${progress.activated}/${progress.total}`, {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#66ccff',
      backgroundColor: '#000000aa',
      padding: { x: 2, y: 1 },
    }).setScrollFactor(0).setDepth(100);

    console.log('TileTestScene loaded with Hero + InteractableSystem');
    console.log(`  Map: ${this.map.width}x${this.map.height} tiles`);
    console.log(`  Interactables: ${this.interactables.length}`);
  }

  update(): void {
    this.handleMovementInput();
    this.updateInteractionIndicator();
  }

  // ─── Hero Spawn ─────────────────────────────────────────────────────────

  private spawnHero(): void {
    // Find spawn point in objects layer
    const objectLayer = this.map.getObjectLayer('objects');
    let spawnTileX = 2;
    let spawnTileY = 2;

    if (objectLayer) {
      const spawnObj = objectLayer.objects.find((obj) => {
        if (Array.isArray(obj.properties)) {
          return obj.properties.some(
            (p: { name: string; value: unknown }) => p.name === 'objectType' && p.value === 'spawn'
          );
        }
        return obj.type === 'spawn';
      });

      if (spawnObj) {
        spawnTileX = Math.floor((spawnObj.x ?? 0) / this.map.tileWidth);
        spawnTileY = Math.floor((spawnObj.y ?? 0) / this.map.tileHeight);
      }
    }

    // Create hero at spawn tile
    this.hero = new Hero(this, spawnTileX, spawnTileY, this.map.tileWidth);

    // Set collision check callback
    this.hero.setCollisionCheck((tileX: number, tileY: number) => {
      return isTileWalkable(this.collisionData, this.map.width, tileX, tileY);
    });
  }

  // ─── Input Setup ────────────────────────────────────────────────────────

  private setupInput(): void {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // E key for interaction
    this.input.keyboard.on('keydown-E', () => {
      this.handleInteraction();
    });

    // ESC to go back
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('MainMenuScene');
    });
  }

  /**
   * Handle directional input and initiate hero movement.
   * Only one direction processed per frame to prevent diagonal movement.
   */
  private handleMovementInput(): void {
    if (!this.hero || this.hero.getIsMoving()) return;

    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      this.hero.move(Direction.Up);
    } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      this.hero.move(Direction.Down);
    } else if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      this.hero.move(Direction.Left);
    } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      this.hero.move(Direction.Right);
    } else {
      // No input — show idle
      this.hero.stopMovement();
    }
  }

  // ─── Interactable System ─────────────────────────────────────────────────

  /**
   * Initialize interactables from the tilemap objects layer.
   */
  private initInteractables(): void {
    const objectLayer = this.map.getObjectLayer('objects');
    if (!objectLayer) return;

    // Convert Phaser's TiledObject format to our TiledObjectData format
    const tiledObjects: TiledObjectData[] = objectLayer.objects.map((obj) => ({
      id: obj.id,
      name: obj.name,
      type: obj.type ?? '',
      x: obj.x ?? 0,
      y: obj.y ?? 0,
      width: obj.width ?? 16,
      height: obj.height ?? 16,
      properties: Array.isArray(obj.properties)
        ? obj.properties.map((p: { name: string; type: string; value: string | number | boolean }) => ({
            name: p.name,
            type: p.type,
            value: p.value,
          }))
        : undefined,
    }));

    this.interactables = parseInteractables(tiledObjects, this.map.tileWidth, this.map.tileHeight);
  }

  /**
   * Check if the hero is near an interactable and show/hide indicator.
   */
  private updateInteractionIndicator(): void {
    if (!this.hero) return;

    const { tileX, tileY } = this.hero.getTilePosition();
    const facing = this.hero.getFacing();

    // Get direction delta from Hero's facing
    const deltas: Array<{ dx: number; dy: number }> = [
      { dx: 0, dy: 1 },  // Down
      { dx: -1, dy: 0 }, // Left
      { dx: 1, dy: 0 },  // Right
      { dx: 0, dy: -1 }, // Up
    ];
    const delta = deltas[facing];

    // Check for interactable at facing tile
    const facingInteractable = findInteractableInRange(
      tileX, tileY, delta.dx, delta.dy, this.interactables
    );

    if (facingInteractable && !facingInteractable.activated) {
      this.currentInteractable = facingInteractable;
      // Show indicator above the interactable
      const indicatorX = facingInteractable.tileX * this.map.tileWidth + this.map.tileWidth / 2;
      const indicatorY = facingInteractable.tileY * this.map.tileHeight;
      this.interactionIndicator.show(indicatorX, indicatorY);
    } else {
      this.currentInteractable = null;
      this.interactionIndicator.hide();
    }
  }

  /**
   * Handle E key press — interact with the current interactable.
   */
  private handleInteraction(): void {
    if (!this.currentInteractable) return;
    if (this.currentInteractable.activated) return;
    if (this.puzzleOverlay) return; // Already showing a puzzle

    const interactable = this.currentInteractable;

    // If interactable has a puzzle, show the puzzle overlay
    if (interactable.puzzleId) {
      this.openPuzzleOverlay(interactable);
    } else {
      // No puzzle — just activate directly (e.g., door)
      this.activateInteractableDirectly(interactable);
    }
  }

  /**
   * Open the puzzle overlay for an interactable with a puzzle.
   */
  private openPuzzleOverlay(interactable: Interactable): void {
    // Get a puzzle from the engine (use the category from the puzzle data)
    const puzzle = this.puzzleEngine.draw(
      interactable.puzzleId?.startsWith('syn') ? 'syntax' :
      interactable.puzzleId?.startsWith('log') ? 'logic' :
      interactable.puzzleId?.startsWith('dev') ? 'devops' : 'memory'
    );

    if (!puzzle) {
      // No puzzles available — activate directly
      this.activateInteractableDirectly(interactable);
      return;
    }

    // Lock hero movement
    this.hero.setMovementLocked(true);

    // Hide interaction indicator
    this.interactionIndicator.hide();

    // Create the overlay
    this.puzzleOverlay = new PuzzleOverlay(this, {
      puzzle,
      difficulty: this.currentDifficulty,
      fragmentId: interactable.fragmentId,
      onSolved: (remainingSeconds: number) => {
        // Mark interactable as activated
        activateInteractable(interactable.id, this.interactables);

        // Show success feedback
        this.showInteractionFeedback(interactable);

        // Update progress
        const progress = getFragmentProgress(this.interactables);
        this.progressText.setText(`Fragments: ${progress.activated}/${progress.total}`);

        console.log(`Puzzle solved! Fragment: ${interactable.fragmentId}, Time left: ${remainingSeconds}s`);
      },
      onFailed: () => {
        console.log(`Puzzle failed for: ${interactable.id}`);
      },
      onClosed: () => {
        // Unlock hero movement
        this.hero.setMovementLocked(false);
        this.puzzleOverlay = null;
      },
    });
  }

  /**
   * Activate an interactable directly (no puzzle required).
   */
  private activateInteractableDirectly(interactable: Interactable): void {
    // Mark as activated
    activateInteractable(interactable.id, this.interactables);

    // Hide indicator
    this.interactionIndicator.hide();
    this.currentInteractable = null;

    // Emit interaction event
    const { tileX, tileY } = this.hero.getTilePosition();
    EventBus.emit('interactable:activated', {
      interactable,
      heroTileX: tileX,
      heroTileY: tileY,
    });

    // Show feedback
    this.showInteractionFeedback(interactable);

    // Update progress display
    const progress = getFragmentProgress(this.interactables);
    this.progressText.setText(`Fragments: ${progress.activated}/${progress.total}`);

    console.log(`Activated directly: ${interactable.type} (${interactable.id})`);
  }

  /**
   * Show visual feedback when an interactable is activated.
   */
  private showInteractionFeedback(interactable: Interactable): void {
    const pixelX = interactable.tileX * this.map.tileWidth + this.map.tileWidth / 2;
    const pixelY = interactable.tileY * this.map.tileHeight + this.map.tileHeight / 2;

    // Flash the tile
    const flash = this.add.rectangle(pixelX, pixelY, this.map.tileWidth, this.map.tileHeight, 0x44ff44, 0.6)
      .setDepth(20);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    // Show text feedback
    const label = interactable.fragmentId ? `+Fragment!` : `Activated!`;
    const feedbackText = this.add.text(pixelX, pixelY - 16, label, {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#44ff44',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(60);

    this.tweens.add({
      targets: feedbackText,
      y: pixelY - 32,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => feedbackText.destroy(),
    });
  }

  // ─── Collision Data Extraction ──────────────────────────────────────────

  /**
   * Extract collision data as a flat array from the collision tilemap layer.
   * 0 = walkable, non-zero = blocked.
   */
  private extractCollisionData(): number[] {
    const data: number[] = [];
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.collisionLayer.getTileAt(x, y);
        // Tile index 0 or null = empty/walkable, anything else = collision
        data.push(tile && tile.index > 0 ? tile.index : 0);
      }
    }
    return data;
  }

  /**
   * Parse the objects layer and show colored rectangles for each object type.
   */
  private displayObjectMarkers(): void {
    const objectLayer = this.map.getObjectLayer('objects');
    if (!objectLayer) {
      console.warn('No objects layer found in tilemap');
      return;
    }

    const colorMap: Record<string, number> = {
      spawn: 0xff8800,
      terminal: 0x00cc55,
      server: 0x0099dd,
      whiteboard: 0xdddddd,
      door: 0xddcc00,
    };

    for (const obj of objectLayer.objects) {
      const objType = this.getObjectProperty(obj, 'objectType') ?? obj.type ?? 'unknown';
      const color = colorMap[objType] ?? 0xff00ff;

      // Draw a colored rectangle at the object position
      const marker = this.add.rectangle(
        (obj.x ?? 0) + (obj.width ?? 16) / 2,
        (obj.y ?? 0) + (obj.height ?? 16) / 2,
        obj.width ?? 16,
        obj.height ?? 16,
        color,
        0.6
      );

      // Add label
      this.add.text(
        (obj.x ?? 0),
        (obj.y ?? 0) - 10,
        objType,
        {
          fontSize: '8px',
          fontFamily: 'monospace',
          color: `#${color.toString(16).padStart(6, '0')}`,
        }
      );
    }
  }

  /**
   * Get a custom property value from a Tiled object.
   */
  private getObjectProperty(obj: Phaser.Types.Tilemaps.TiledObject, name: string): string | undefined {
    if (!obj.properties) return undefined;
    
    // Properties can be an array of {name, type, value} objects
    if (Array.isArray(obj.properties)) {
      const prop = obj.properties.find(
        (p: { name: string; value: unknown }) => p.name === name
      );
      return prop ? String(prop.value) : undefined;
    }
    
    // Or it can be a plain object
    return (obj.properties as Record<string, unknown>)[name] as string | undefined;
  }
}
