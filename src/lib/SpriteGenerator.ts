/**
 * SpriteGenerator — Procedural sprite generation using Canvas API.
 * Creates hero spritesheets (3 variants), object sprites, and enemy sprites at runtime.
 * Registers them as Phaser textures without needing external image files.
 */

import Phaser from 'phaser';
import type { HeroVariant } from '@/types';

const TILE_SIZE = 16;

/** Color palette for a hero variant */
interface HeroPalette {
  body: string;
  bodyAccent: string;
  hair: string;
  skin: string;
  belt: string;
  legs: string;
}

const HERO_PALETTES: Record<HeroVariant, HeroPalette> = {
  classic: {
    body: '#2266cc',
    bodyAccent: '#1a4f99',
    hair: '#553311',
    skin: '#ffcc99',
    belt: '#ffcc00',
    legs: '#333333',
  },
  devops: {
    body: '#228844',
    bodyAccent: '#196633',
    hair: '#222222',
    skin: '#e8b888',
    belt: '#44ccff',
    legs: '#1a1a2e',
  },
  cyberpunk: {
    body: '#8822cc',
    bodyAccent: '#6611aa',
    hair: '#ff44aa',
    skin: '#ccddee',
    belt: '#ff4400',
    legs: '#111122',
  },
};

/**
 * Generate and register all procedural sprites for the game.
 * Call in ExplorationScene.create() before tilemap setup.
 */
export function generateAllSprites(scene: Phaser.Scene): void {
  // Generate 3 hero variants
  for (const variant of ['classic', 'devops', 'cyberpunk'] as HeroVariant[]) {
    const key = `hero-${variant}`;
    if (!scene.textures.exists(key)) {
      generateHeroSpritesheet(scene, key, HERO_PALETTES[variant]);
    }
  }

  // Legacy single-texture fallback
  if (!scene.textures.exists('hero-generated')) {
    generateHeroSpritesheet(scene, 'hero-generated', HERO_PALETTES.classic);
  }

  if (!scene.textures.exists('obj-terminal')) {
    generateObjectSprites(scene);
  }

  if (!scene.textures.exists('enemy-bug-0')) {
    generateEnemySprites(scene);
  }
}

// ─── Hero Spritesheet ─────────────────────────────────────────────────────────

/**
 * Generate hero spritesheet: 4 columns (walk frames) x 4 rows (directions).
 * Directions: 0=down, 1=left, 2=right, 3=up
 */
function generateHeroSpritesheet(scene: Phaser.Scene, key: string, palette: HeroPalette): void {
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
      drawHeroFrame(ctx, frame * frameW, dir * frameH, dir, frame, palette);
    }
  }

  scene.textures.addCanvas(key, canvas);
  // Add spritesheet frames to the texture
  const tex = scene.textures.get(key);
  if (tex) {
    for (let dir = 0; dir < rows; dir++) {
      for (let frame = 0; frame < cols; frame++) {
        const idx = dir * cols + frame;
        tex.add(idx, 0, frame * frameW, dir * frameH, frameW, frameH);
      }
    }
  }
}

function drawHeroFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: number,
  frame: number,
  palette: HeroPalette
): void {
  const bob = frame % 2 === 0 ? 0 : 1;
  const legSwap = frame % 2;

  ctx.clearRect(x, y, TILE_SIZE, TILE_SIZE);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 4, y + 14, 8, 2);

  // Legs
  ctx.fillStyle = palette.legs;
  if (legSwap === 0) {
    ctx.fillRect(x + 5, y + 12 - bob, 2, 3);
    ctx.fillRect(x + 9, y + 11 - bob, 2, 3);
  } else {
    ctx.fillRect(x + 5, y + 11 - bob, 2, 3);
    ctx.fillRect(x + 9, y + 12 - bob, 2, 3);
  }

  // Body
  ctx.fillStyle = palette.body;
  ctx.fillRect(x + 4, y + 6 - bob, 8, 7);

  // Arms
  ctx.fillStyle = palette.bodyAccent;
  if (direction === 1) {
    ctx.fillRect(x + 2, y + 7 - bob, 2, 4);
  } else if (direction === 2) {
    ctx.fillRect(x + 12, y + 7 - bob, 2, 4);
  } else {
    ctx.fillRect(x + 2, y + 7 - bob, 2, 5);
    ctx.fillRect(x + 12, y + 7 - bob, 2, 5);
  }

  // Head
  ctx.fillStyle = palette.skin;
  ctx.fillRect(x + 5, y + 2 - bob, 6, 5);

  // Hair
  ctx.fillStyle = palette.hair;
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
  ctx.fillStyle = palette.belt;
  ctx.fillRect(x + 5, y + 9 - bob, 6, 1);
}

// ─── Enemy Sprites ────────────────────────────────────────────────────────────

/** Color palette for enemy variants */
interface EnemyPalette {
  bodyMain: string;
  bodyDark: string;
  eyes: string;
  accent: string;
}

const ENEMY_PALETTES: EnemyPalette[] = [
  { bodyMain: '#cc2222', bodyDark: '#881111', eyes: '#ffff00', accent: '#ff6644' }, // Red Bug
  { bodyMain: '#22aa22', bodyDark: '#116611', eyes: '#ff4444', accent: '#88ff44' }, // Green Bug
  { bodyMain: '#6622cc', bodyDark: '#441188', eyes: '#44ffff', accent: '#aa44ff' }, // Purple Bug
  { bodyMain: '#cc8800', bodyDark: '#885500', eyes: '#ffffff', accent: '#ffcc44' }, // Orange Bug
];

function generateEnemySprites(scene: Phaser.Scene): void {
  for (let i = 0; i < ENEMY_PALETTES.length; i++) {
    const key = `enemy-bug-${i}`;
    if (!scene.textures.exists(key)) {
      generateEnemySpritesheet(scene, key, ENEMY_PALETTES[i]);
    }
  }
}

/**
 * Generate enemy spritesheet: 4 columns (walk frames) x 1 row.
 */
function generateEnemySpritesheet(scene: Phaser.Scene, key: string, palette: EnemyPalette): void {
  const frameW = TILE_SIZE;
  const frameH = TILE_SIZE;
  const cols = 4;
  const canvas = document.createElement('canvas');
  canvas.width = frameW * cols;
  canvas.height = frameH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  for (let frame = 0; frame < cols; frame++) {
    drawEnemyFrame(ctx, frame * frameW, 0, frame, palette);
  }

  scene.textures.addCanvas(key, canvas);
  const tex = scene.textures.get(key);
  if (tex) {
    for (let frame = 0; frame < cols; frame++) {
      tex.add(frame, 0, frame * frameW, 0, frameW, frameH);
    }
  }
}

function drawEnemyFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  palette: EnemyPalette
): void {
  const bob = frame % 2 === 0 ? 0 : 1;
  const legSpread = frame % 2;

  ctx.clearRect(x, y, TILE_SIZE, TILE_SIZE);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 3, y + 14, 10, 2);

  // Legs (6 insect legs)
  ctx.fillStyle = palette.bodyDark;
  const legY = y + 11 - bob;
  if (legSpread === 0) {
    ctx.fillRect(x + 3, legY, 1, 3);
    ctx.fillRect(x + 6, legY + 1, 1, 3);
    ctx.fillRect(x + 9, legY, 1, 3);
    ctx.fillRect(x + 12, legY + 1, 1, 3);
  } else {
    ctx.fillRect(x + 3, legY + 1, 1, 3);
    ctx.fillRect(x + 6, legY, 1, 3);
    ctx.fillRect(x + 9, legY + 1, 1, 3);
    ctx.fillRect(x + 12, legY, 1, 3);
  }

  // Body (oval bug shape)
  ctx.fillStyle = palette.bodyMain;
  ctx.fillRect(x + 4, y + 4 - bob, 8, 8);
  ctx.fillRect(x + 3, y + 5 - bob, 10, 6);

  // Shell detail
  ctx.fillStyle = palette.bodyDark;
  ctx.fillRect(x + 7, y + 4 - bob, 2, 8);

  // Head
  ctx.fillStyle = palette.bodyMain;
  ctx.fillRect(x + 5, y + 2 - bob, 6, 4);

  // Eyes
  ctx.fillStyle = palette.eyes;
  ctx.fillRect(x + 5, y + 3 - bob, 2, 2);
  ctx.fillRect(x + 9, y + 3 - bob, 2, 2);

  // Antennae
  ctx.fillStyle = palette.accent;
  ctx.fillRect(x + 5, y + 1 - bob, 1, 2);
  ctx.fillRect(x + 10, y + 1 - bob, 1, 2);
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

// ─── Boss Sprites ─────────────────────────────────────────────────────────────

/**
 * Generate a large boss sprite (32x32) for Type A boss fights.
 * Creates a menacing pixel-art bug boss with glowing eyes.
 */
export function generateBossSprite(scene: Phaser.Scene): void {
  if (scene.textures.exists('boss-sprite')) return;

  const size = 32;
  const cols = 2; // 2 frames: idle, damage
  const canvas = document.createElement('canvas');
  canvas.width = size * cols;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Frame 0: idle
  drawBossFrame(ctx, 0, 0, false);
  // Frame 1: damage (flash)
  drawBossFrame(ctx, size, 0, true);

  scene.textures.addCanvas('boss-sprite', canvas);
  const tex = scene.textures.get('boss-sprite');
  if (tex) {
    tex.add(0, 0, 0, 0, size, size);
    tex.add(1, 0, size, 0, size, size);
  }
}

function drawBossFrame(ctx: CanvasRenderingContext2D, x: number, y: number, isDamaged: boolean): void {
  const bodyColor = isDamaged ? '#ff4444' : '#881122';
  const shellColor = isDamaged ? '#cc2222' : '#550011';
  const eyeColor = isDamaged ? '#ffffff' : '#ffff00';

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x + 6, y + 28, 20, 3);

  // Body (large oval)
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x + 6, y + 8, 20, 18);
  ctx.fillRect(x + 4, y + 10, 24, 14);

  // Shell pattern
  ctx.fillStyle = shellColor;
  ctx.fillRect(x + 14, y + 8, 4, 18);
  ctx.fillRect(x + 6, y + 16, 20, 3);

  // Head
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x + 9, y + 3, 14, 8);

  // Eyes (large, menacing)
  ctx.fillStyle = eyeColor;
  ctx.fillRect(x + 10, y + 5, 4, 4);
  ctx.fillRect(x + 18, y + 5, 4, 4);
  ctx.fillStyle = '#cc0000';
  ctx.fillRect(x + 11, y + 7, 2, 2);
  ctx.fillRect(x + 19, y + 7, 2, 2);

  // Horns/antennae
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(x + 10, y + 1, 2, 4);
  ctx.fillRect(x + 20, y + 1, 2, 4);

  // Legs (8 legs)
  ctx.fillStyle = shellColor;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 4, y + 12 + i * 4, 3, 2);
    ctx.fillRect(x + 25, y + 12 + i * 4, 3, 2);
  }

  // Mandibles
  ctx.fillStyle = '#cc4400';
  ctx.fillRect(x + 12, y + 10, 2, 3);
  ctx.fillRect(x + 18, y + 10, 2, 3);
}
