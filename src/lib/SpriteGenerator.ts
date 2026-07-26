/**
 * SpriteGenerator — Procedural sprite generation using Canvas API.
 * Creates hero spritesheet and object sprites at runtime.
 * Registers them as Phaser textures without needing external image files.
 */

import Phaser from 'phaser';

const TILE_SIZE = 16;

/**
 * Generate and register all procedural sprites for the game.
 * Call in ExplorationScene.create() before tilemap setup.
 */
export function generateAllSprites(scene: Phaser.Scene): void {
  if (!scene.textures.exists('hero-generated')) {
    generateHeroSpritesheet(scene);
  }
  if (!scene.textures.exists('obj-terminal')) {
    generateObjectSprites(scene);
  }
}

// ─── Hero Spritesheet ─────────────────────────────────────────────────────────

/**
 * Generate hero spritesheet: 4 columns (walk frames) x 4 rows (directions).
 * Directions: 0=down, 1=left, 2=right, 3=up
 */
function generateHeroSpritesheet(scene: Phaser.Scene): void {
  const frameW = TILE_SIZE;
  const frameH = TILE_SIZE;
  const cols = 4;
  const rows = 4;
  const canvas = document.createElement('canvas');
  canvas.width = frameW * cols;
  canvas.height = frameH * rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  for (let dir = 0; dir < rows; dir++) {
    for (let frame = 0; frame < cols; frame++) {
      drawHeroFrame(ctx, frame * frameW, dir * frameH, dir, frame);
    }
  }

  scene.textures.addCanvas('hero-generated', canvas);
}

function drawHeroFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: number,
  frame: number
): void {
  const bob = frame % 2 === 0 ? 0 : 1;
  const legSwap = frame % 2;

  ctx.clearRect(x, y, TILE_SIZE, TILE_SIZE);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 4, y + 14, 8, 2);

  // Legs
  ctx.fillStyle = '#333333';
  if (legSwap === 0) {
    ctx.fillRect(x + 5, y + 12 - bob, 2, 3);
    ctx.fillRect(x + 9, y + 11 - bob, 2, 3);
  } else {
    ctx.fillRect(x + 5, y + 11 - bob, 2, 3);
    ctx.fillRect(x + 9, y + 12 - bob, 2, 3);
  }

  // Body
  ctx.fillStyle = '#2266cc';
  ctx.fillRect(x + 4, y + 6 - bob, 8, 7);

  // Arms
  ctx.fillStyle = '#2266cc';
  if (direction === 1) {
    ctx.fillRect(x + 2, y + 7 - bob, 2, 4);
  } else if (direction === 2) {
    ctx.fillRect(x + 12, y + 7 - bob, 2, 4);
  } else {
    ctx.fillRect(x + 2, y + 7 - bob, 2, 5);
    ctx.fillRect(x + 12, y + 7 - bob, 2, 5);
  }

  // Head
  ctx.fillStyle = '#ffcc99';
  ctx.fillRect(x + 5, y + 2 - bob, 6, 5);

  // Hair
  ctx.fillStyle = '#553311';
  ctx.fillRect(x + 5, y + 1 - bob, 6, 2);
  if (direction === 3) {
    ctx.fillRect(x + 5, y + 2 - bob, 6, 3);
  }

  // Eyes (not visible from behind)
  if (direction !== 3) {
    ctx.fillStyle = '#ffffff';
    if (direction === 0) {
      ctx.fillRect(x + 6, y + 4 - bob, 2, 2);
      ctx.fillRect(x + 9, y + 4 - bob, 2, 2);
      ctx.fillStyle = '#111111';
      ctx.fillRect(x + 6, y + 5 - bob, 2, 1);
      ctx.fillRect(x + 9, y + 5 - bob, 2, 1);
    } else if (direction === 1) {
      ctx.fillRect(x + 5, y + 4 - bob, 2, 2);
      ctx.fillStyle = '#111111';
      ctx.fillRect(x + 5, y + 5 - bob, 1, 1);
    } else {
      ctx.fillRect(x + 9, y + 4 - bob, 2, 2);
      ctx.fillStyle = '#111111';
      ctx.fillRect(x + 10, y + 5 - bob, 1, 1);
    }
  }

  // Belt accent
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(x + 5, y + 9 - bob, 6, 1);
}

// ─── Object Sprites ───────────────────────────────────────────────────────────

function generateObjectSprites(scene: Phaser.Scene): void {
  createSprite(scene, 'obj-terminal', drawTerminal);
  createSprite(scene, 'obj-server', drawServer);
  createSprite(scene, 'obj-plant', drawPlant);
  createSprite(scene, 'obj-desk', drawDesk);
  createSprite(scene, 'obj-door', drawDoor);
}

function createSprite(
  scene: Phaser.Scene,
  key: string,
  drawFn: (ctx: CanvasRenderingContext2D) => void
): void {
  const canvas = document.createElement('canvas');
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  drawFn(ctx);
  scene.textures.addCanvas(key, canvas);
}

function drawTerminal(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#333344';
  ctx.fillRect(3, 2, 10, 8);
  ctx.fillStyle = '#0a1a2a';
  ctx.fillRect(4, 3, 8, 6);
  ctx.fillStyle = '#00ffcc';
  ctx.fillRect(5, 4, 2, 1);
  ctx.fillRect(5, 6, 4, 1);
  ctx.fillRect(5, 7, 3, 1);
  ctx.fillStyle = '#555555';
  ctx.fillRect(7, 10, 2, 2);
  ctx.fillRect(5, 12, 6, 1);
}

function drawServer(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#2a2a3a';
  ctx.fillRect(3, 1, 10, 14);
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(4, 2, 8, 3);
  ctx.fillRect(4, 6, 8, 3);
  ctx.fillRect(4, 10, 8, 3);
  ctx.fillStyle = '#00ff44';
  ctx.fillRect(5, 3, 1, 1);
  ctx.fillRect(5, 7, 1, 1);
  ctx.fillStyle = '#ff4400';
  ctx.fillRect(5, 11, 1, 1);
}

function drawPlant(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(5, 11, 6, 4);
  ctx.fillStyle = '#a0522d';
  ctx.fillRect(4, 10, 8, 2);
  ctx.fillStyle = '#228b22';
  ctx.fillRect(6, 4, 4, 3);
  ctx.fillRect(4, 5, 3, 4);
  ctx.fillRect(9, 5, 3, 4);
  ctx.fillRect(7, 2, 2, 3);
  ctx.fillStyle = '#2e8b57';
  ctx.fillRect(5, 6, 2, 2);
  ctx.fillRect(10, 7, 2, 2);
}

function drawDesk(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#8b6914';
  ctx.fillRect(1, 6, 14, 3);
  ctx.fillStyle = '#a07828';
  ctx.fillRect(2, 5, 12, 2);
  ctx.fillStyle = '#6b4914';
  ctx.fillRect(2, 9, 2, 5);
  ctx.fillRect(12, 9, 2, 5);
}

function drawDoor(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(3, 1, 10, 14);
  ctx.fillStyle = '#6b3410';
  ctx.fillRect(4, 2, 8, 12);
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(10, 7, 2, 2);
  ctx.fillStyle = '#444444';
  ctx.fillRect(4, 0, 8, 2);
}
