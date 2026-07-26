import Phaser from 'phaser';
import { Hero, Direction } from '@/entities/Hero';
import { Enemy } from '@/entities/Enemy';
import { InteractionIndicator } from '@/entities/InteractionIndicator';
import { isTileWalkable } from '@/lib/TilemapHelper';
import {
  parseInteractables,
  findInteractableInRange,
  activateInteractable,
  getFragmentProgress,
  areAllFragmentInteractablesActivated,
  type TiledObjectData,
} from '@/systems/InteractableSystem';
import { FragmentSystem } from '@/systems/FragmentSystem';
import { PuzzleEngine } from '@/systems/PuzzleEngine';
import { getMapConfig, type ScenarioType } from '@/systems/MapLoader';
import { getLevelDefinition, getBossSceneKey } from '@/data/levels';
import { getDifficultyConfig, canSaveAtProgress, calculateProgress } from '@/systems/DifficultySystem';
import { saveGame, createSaveData } from '@/systems/SaveSystem';
import { playSFX } from '@/lib/AudioManager';
import { screenShake, screenFlash, floatingText, sparkleEffect, doorGlowEffect } from '@/systems/FeedbackSystem';
import { COLORS_HEX } from '@/lib/Colors';
import { EventBus } from '@/lib/EventBus';
import { generateAllSprites } from '@/lib/SpriteGenerator';
import { generateProceduralMap, registerProceduralMap } from '@/lib/ProceduralMap';
import { t } from '@/lib/i18n';
import { HERO_VARIANT_BY_DIFFICULTY } from '@/types';
import type { Interactable, DifficultyMode } from '@/types';

/** Viewport width excluding the right HUD panel */
const GAME_VIEWPORT_WIDTH = 780;

/** Trap tile data */
interface TrapTile {
  tileX: number;
  tileY: number;
  triggered: boolean;
}

/**
 * ExplorationScene — Main gameplay scene with procedural decoration,
 * visible markers, traps, and right-side HUD panel.
 */
export class ExplorationScene extends Phaser.Scene {
  private currentLevel = 1;
  private difficulty: DifficultyMode = 'normal';
  private heroHP = 100;
  private score = 0;

  private map!: Phaser.Tilemaps.Tilemap;
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer;
  private collisionData: number[] = [];
  private hero!: Hero;
  private fragmentSystem!: FragmentSystem;
  private puzzleEngine!: PuzzleEngine;
  private interactables: Interactable[] = [];
  private interactionIndicator!: InteractionIndicator;
  private currentInteractable: Interactable | null = null;
  private puzzleActive = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  // Procedural decoration
  private decorationGraphics!: Phaser.GameObjects.Graphics;

  // Interactable markers (always visible pulsing dots)
  private markerGraphics!: Phaser.GameObjects.Graphics;
  private markerPulseTime = 0;

  // Traps
  private traps: TrapTile[] = [];
  private trapGraphics!: Phaser.GameObjects.Graphics;

  // Enemies
  private enemies: Enemy[] = [];
  private enemyContactCooldown = false;

  // Minimap
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private exploredTiles: Set<string> = new Set();

  constructor() { super('ExplorationScene'); }

  init(data: { level?: number; difficulty?: DifficultyMode; hp?: number; score?: number }): void {
    this.currentLevel = data.level ?? 1;
    this.difficulty = data.difficulty ?? 'normal';
    this.heroHP = data.hp ?? 100;
    this.score = data.score ?? 0;
  }

  preload(): void {
    const mc = getMapConfig(this.currentLevel);
    if (!mc) return;
    // Load the Puny Dungeon tileset (new high-quality asset)
    if (!this.textures.exists('tiles-puny-dungeon')) {
      this.load.image('tiles-puny-dungeon', 'assets/tilesets/puny-dungeon.png');
    }
    // Also load original tileset as fallback
    if (!this.textures.exists(mc.tilesetKey)) this.load.image(mc.tilesetKey, mc.tilesetPath);
    if (!this.cache.tilemap.exists(mc.mapKey)) this.load.tilemapTiledJSON(mc.mapKey, mc.mapPath);
    if (!this.textures.exists('hero')) this.load.spritesheet('hero', 'assets/sprites/hero-spritesheet.png', { frameWidth: 16, frameHeight: 16 });
  }

  create(): void {
    const mc = getMapConfig(this.currentLevel);
    if (!mc) { this.scene.start('MainMenuScene'); return; }

    // Generate procedural sprites
    generateAllSprites(this);

    this.fragmentSystem = new FragmentSystem();
    this.puzzleEngine = new PuzzleEngine();
    const ld = getLevelDefinition(this.currentLevel);
    if (ld) this.fragmentSystem.initLevel(ld.id);

    // Generate and register a procedural map using the Puny Dungeon tileset
    const procMap = generateProceduralMap(this.currentLevel, mc.scenario);
    registerProceduralMap(this, procMap);

    // Use the procedural map with the new tileset
    this.map = this.make.tilemap({ key: procMap.mapKey });
    const ts = this.map.addTilesetImage('puny-dungeon', 'tiles-puny-dungeon');
    if (!ts) {
      // Fallback: try original tileset/map
      this.map = this.make.tilemap({ key: mc.mapKey });
      const fallbackTs = this.map.addTilesetImage(mc.tilesetName, mc.tilesetKey);
      if (!fallbackTs) { this.scene.start('MainMenuScene'); return; }
      this.map.createLayer('ground', fallbackTs, 0, 0);
      const cl = this.map.createLayer('collision', fallbackTs, 0, 0);
      if (!cl) { this.scene.start('MainMenuScene'); return; }
      this.collisionLayer = cl;
    } else {
      this.map.createLayer('ground', ts, 0, 0);
      const cl = this.map.createLayer('collision', ts, 0, 0);
      if (!cl) { this.scene.start('MainMenuScene'); return; }
      this.collisionLayer = cl;
    }

    this.collisionLayer.setCollisionByExclusion([0]);
    this.collisionLayer.setAlpha(0.5);
    this.collisionData = this.extractCollisionData();
    this.initInteractables();
    this.placeObjectSprites();

    // Procedural elements
    this.decorationGraphics = this.add.graphics().setDepth(1);
    this.markerGraphics = this.add.graphics().setDepth(10);
    this.trapGraphics = this.add.graphics().setDepth(2);
    this.generateDecoration(mc.scenario);
    this.generateTraps();
    this.spawnEnemies();
    this.drawInteractableMarkers();

    this.spawnHero();
    this.interactionIndicator = new InteractionIndicator(this);

    // Camera: limit viewport to leave space for HUD panel
    this.cameras.main.setViewport(0, 0, GAME_VIEWPORT_WIDTH, 540);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setZoom(2.5);
    this.cameras.main.startFollow(this.hero, true, 0.1, 0.1);

    this.createLighting(mc.scenario);
    this.createMinimap();

    this.setupInput();
    this.scene.launch('HUDScene');
    this.updateHUD();
  }

  update(): void {
    this.handleMovementInput();
    this.updateInteractionIndicator();
    this.updateMarkerPulse();
    this.checkTrapCollision();
    this.checkEnemyContact();
    this.updateMinimap();
  }

  // ─── Procedural Decoration ──────────────────────────────────────────────

  private generateDecoration(scenario: ScenarioType): void {
    const tw = this.map.tileWidth;
    const th = this.map.tileHeight;
    const seed = this.currentLevel * 7919; // Deterministic per level
    let rng = seed;

    const nextRng = (): number => {
      rng = (rng * 1664525 + 1013904223) & 0x7fffffff;
      return rng / 0x7fffffff;
    };

    // Get color palette based on scenario
    const palette = this.getScenarioPalette(scenario);

    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        // Skip non-walkable tiles
        if (!isTileWalkable(this.collisionData, this.map.width, x, y)) continue;
        // Skip tiles with interactables
        if (this.interactables.some(i => i.tileX === x && i.tileY === y)) continue;

        // 15% chance to place a decoration
        if (nextRng() > 0.15) continue;

        const px = x * tw;
        const py = y * th;
        const decoType = Math.floor(nextRng() * palette.length);
        const color = palette[decoType];
        const size = 2 + Math.floor(nextRng() * 4);
        const offsetX = Math.floor(nextRng() * (tw - size));
        const offsetY = Math.floor(nextRng() * (th - size));

        this.decorationGraphics.fillStyle(color, 0.3 + nextRng() * 0.3);
        this.decorationGraphics.fillRect(px + offsetX, py + offsetY, size, size);
      }
    }
  }

  private getScenarioPalette(scenario: ScenarioType): number[] {
    switch (scenario) {
      case 'office':
        // Desks, plants, chairs: browns, greens, grays
        return [0x8b6914, 0x228b22, 0x555555, 0x4a7c3f, 0x8b7355, 0x2e8b57];
      case 'server':
        // LEDs, cables, rack lights: blues, greens, cyans
        return [0x00ff88, 0x0088ff, 0x00ffcc, 0x4444ff, 0x00ccaa, 0xff4400];
      case 'cloud':
        // Abstract: purples, whites, light blues
        return [0x8844ff, 0xaaaaff, 0x44aaff, 0xcc88ff, 0x6688ff, 0xffffff];
      default:
        return [0x666666, 0x888888, 0x444444];
    }
  }

  // ─── Interactable Markers (always visible pulsing glows) ────────────────

  private drawInteractableMarkers(): void {
    this.markerGraphics.clear();
    const tw = this.map.tileWidth;
    const th = this.map.tileHeight;
    const pulse = 0.4 + Math.sin(this.markerPulseTime) * 0.3;

    for (const interactable of this.interactables) {
      if (interactable.activated) continue;

      const cx = interactable.tileX * tw + tw / 2;
      const cy = interactable.tileY * th + th / 2;

      if (interactable.type === 'door') {
        // Door: golden glow
        this.markerGraphics.fillStyle(COLORS_HEX.ACCENT_GOLD, pulse * 0.6);
        this.markerGraphics.fillCircle(cx, cy, 5);
        this.markerGraphics.lineStyle(1, COLORS_HEX.ACCENT_GOLD, pulse);
        this.markerGraphics.strokeCircle(cx, cy, 7);
      } else {
        // Fragment/terminal: cyan glow
        this.markerGraphics.fillStyle(COLORS_HEX.PRIMARY_CYAN, pulse * 0.5);
        this.markerGraphics.fillCircle(cx, cy, 4);
        this.markerGraphics.lineStyle(1, COLORS_HEX.PRIMARY_CYAN, pulse * 0.8);
        this.markerGraphics.strokeCircle(cx, cy, 6);
      }
    }
  }

  private updateMarkerPulse(): void {
    this.markerPulseTime += 0.05;
    this.drawInteractableMarkers();
  }

  // ─── Traps ──────────────────────────────────────────────────────────────

  private generateTraps(): void {
    this.traps = [];
    const tw = this.map.tileWidth;
    const th = this.map.tileHeight;
    const trapCount = 2 + Math.floor(Math.random() * 2); // 2-3 traps
    const candidates: Array<{ x: number; y: number }> = [];

    // Find valid trap positions (walkable, no interactables, not spawn area)
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        if (!isTileWalkable(this.collisionData, this.map.width, x, y)) continue;
        if (this.interactables.some(i => i.tileX === x && i.tileY === y)) continue;
        // Skip spawn area (first 4x4 tiles)
        if (x < 4 && y < 4) continue;
        candidates.push({ x, y });
      }
    }

    // Pick random positions
    for (let i = 0; i < trapCount && candidates.length > 0; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      const pos = candidates.splice(idx, 1)[0];
      this.traps.push({ tileX: pos.x, tileY: pos.y, triggered: false });
    }

    // Draw trap indicators (subtle red dots — harder to see)
    for (const trap of this.traps) {
      const cx = trap.tileX * tw + tw / 2;
      const cy = trap.tileY * th + th / 2;
      this.trapGraphics.fillStyle(COLORS_HEX.DANGER_RED, 0.15);
      this.trapGraphics.fillCircle(cx, cy, 3);
    }
  }

  private checkTrapCollision(): void {
    if (!this.hero) return;
    const { tileX, tileY } = this.hero.getTilePosition();

    for (const trap of this.traps) {
      if (trap.triggered) continue;
      if (trap.tileX === tileX && trap.tileY === tileY) {
        trap.triggered = true;
        this.triggerTrap(trap);
      }
    }
  }

  private triggerTrap(trap: TrapTile): void {
    this.heroHP = Math.max(0, this.heroHP - 25);

    // Visual feedback
    screenShake(this, 6, 300);
    screenFlash(this, 0xff0000, 200);
    playSFX(this, 'sfx-damage');

    const px = trap.tileX * this.map.tileWidth + this.map.tileWidth / 2;
    const py = trap.tileY * this.map.tileHeight;
    floatingText(this, px, py - 8, t('explore.trap'), '#ff3366');

    // Redraw trap as triggered (visible red X)
    this.trapGraphics.fillStyle(COLORS_HEX.DANGER_RED, 0.4);
    this.trapGraphics.fillCircle(px, py + this.map.tileHeight / 2, 5);

    this.updateHUD();

    if (this.heroHP <= 0) {
      this.onDefeat();
    }
  }

  // ─── Minimap ─────────────────────────────────────────────────────────────

  private createMinimap(): void {
    // 100x100 minimap in top-left of viewport, fixed (no scroll)
    this.minimapGraphics = this.add.graphics().setDepth(110).setScrollFactor(0);
    this.updateMinimap();
  }

  private updateMinimap(): void {
    if (!this.hero) return;
    const { tileX, tileY } = this.hero.getTilePosition();

    // Mark surrounding tiles as explored (5x5 vision radius)
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.exploredTiles.add(`${tileX + dx},${tileY + dy}`);
      }
    }

    this.minimapGraphics.clear();

    const mapW = this.map.width;
    const mapH = this.map.height;
    const mmSize = 100;
    const mmX = 4;
    const mmY = 4;
    const tileW = mmSize / mapW;
    const tileH = mmSize / mapH;

    // Background
    this.minimapGraphics.fillStyle(0x000000, 0.6);
    this.minimapGraphics.fillRect(mmX - 1, mmY - 1, mmSize + 2, mmSize + 2);
    this.minimapGraphics.lineStyle(1, 0x4488ff, 0.5);
    this.minimapGraphics.strokeRect(mmX - 1, mmY - 1, mmSize + 2, mmSize + 2);

    // Draw explored tiles
    for (const key of this.exploredTiles) {
      const [tx, ty] = key.split(',').map(Number);
      if (tx < 0 || tx >= mapW || ty < 0 || ty >= mapH) continue;

      const walkable = isTileWalkable(this.collisionData, mapW, tx, ty);
      if (walkable) {
        this.minimapGraphics.fillStyle(0x334455, 0.8);
      } else {
        this.minimapGraphics.fillStyle(0x111122, 0.8);
      }
      this.minimapGraphics.fillRect(mmX + tx * tileW, mmY + ty * tileH, Math.max(tileW, 1), Math.max(tileH, 1));
    }

    // Draw interactables
    for (const inter of this.interactables) {
      if (inter.activated) continue;
      if (!this.exploredTiles.has(`${inter.tileX},${inter.tileY}`)) continue;
      const color = inter.type === 'door' ? 0xffcc00 : 0x00ccff;
      this.minimapGraphics.fillStyle(color, 1);
      this.minimapGraphics.fillRect(mmX + inter.tileX * tileW, mmY + inter.tileY * tileH, Math.max(tileW + 1, 2), Math.max(tileH + 1, 2));
    }

    // Draw hero position
    this.minimapGraphics.fillStyle(0x44ff44, 1);
    this.minimapGraphics.fillRect(mmX + tileX * tileW - 1, mmY + tileY * tileH - 1, 3, 3);
  }

  // ─── Lighting ────────────────────────────────────────────────────────────

  private createLighting(scenario: ScenarioType): void {
    const tw = this.map.tileWidth;
    const th = this.map.tileHeight;

    // 1. Per-scenario ambient tint overlay (scrolls with the map)
    const tintColors: Record<ScenarioType, { color: number; alpha: number }> = {
      office: { color: 0xffeedd, alpha: 0.04 },
      server: { color: 0x0044ff, alpha: 0.06 },
      cloud: { color: 0x8844ff, alpha: 0.05 },
    };
    const tint = tintColors[scenario] ?? tintColors.office;
    const tintOverlay = this.add.graphics().setDepth(3);
    tintOverlay.fillStyle(tint.color, tint.alpha);
    tintOverlay.fillRect(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    // 2. Warm/cool glows at interactable positions
    const glowGraphics = this.add.graphics().setDepth(3);
    for (const interactable of this.interactables) {
      if (interactable.activated) continue;
      const cx = interactable.tileX * tw + tw / 2;
      const cy = interactable.tileY * th + th / 2;

      if (interactable.type === 'door') {
        // Warm golden glow
        glowGraphics.fillStyle(0xffcc00, 0.08);
        glowGraphics.fillCircle(cx, cy, 12);
        glowGraphics.fillStyle(0xffcc00, 0.04);
        glowGraphics.fillCircle(cx, cy, 20);
      } else {
        // Cool cyan glow
        glowGraphics.fillStyle(0x00ccff, 0.07);
        glowGraphics.fillCircle(cx, cy, 10);
        glowGraphics.fillStyle(0x00ccff, 0.03);
        glowGraphics.fillCircle(cx, cy, 18);
      }
    }

    // 3. Vignette overlay (fixed to viewport, doesn't scroll)
    const vignetteGraphics = this.add.graphics().setDepth(100).setScrollFactor(0);
    const vw = GAME_VIEWPORT_WIDTH / 2.5; // account for zoom
    const vh = 540 / 2.5;
    // Draw radial darkness from edges
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const alpha = 0.12 * (i / steps);
      const inset = (steps - i) * 8;
      vignetteGraphics.fillStyle(0x000000, alpha);
      // Top edge
      vignetteGraphics.fillRect(0, 0, vw, inset);
      // Bottom edge
      vignetteGraphics.fillRect(0, vh - inset, vw, inset);
      // Left edge
      vignetteGraphics.fillRect(0, 0, inset, vh);
      // Right edge
      vignetteGraphics.fillRect(vw - inset, 0, inset, vh);
    }
  }

  // ─── Enemies ─────────────────────────────────────────────────────────────

  private spawnEnemies(): void {
    const enemyCount = 1 + this.currentLevel; // 2 on level 1, 3 on level 2, etc.
    const tw = this.map.tileWidth;
    const candidates: Array<{ x: number; y: number }> = [];

    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        if (!isTileWalkable(this.collisionData, this.map.width, x, y)) continue;
        if (this.interactables.some(i => i.tileX === x && i.tileY === y)) continue;
        if (this.traps.some(t => t.tileX === x && t.tileY === y)) continue;
        // Skip spawn area
        if (x < 5 && y < 5) continue;
        candidates.push({ x, y });
      }
    }

    for (let i = 0; i < enemyCount && candidates.length > 0; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      const pos = candidates.splice(idx, 1)[0];
      const variant = i % 4;
      const enemy = new Enemy(this, pos.x, pos.y, tw, variant);
      enemy.setCollisionCheck((tx, ty) => isTileWalkable(this.collisionData, this.map.width, tx, ty));
      this.enemies.push(enemy);
    }
  }

  private checkEnemyContact(): void {
    if (!this.hero || this.enemyContactCooldown) return;
    const { tileX, tileY } = this.hero.getTilePosition();

    for (const enemy of this.enemies) {
      if (enemy.isAtTile(tileX, tileY)) {
        this.handleEnemyContact();
        return;
      }
    }
  }

  private handleEnemyContact(): void {
    this.enemyContactCooldown = true;
    this.heroHP = Math.max(0, this.heroHP - 15);

    screenShake(this, 8, 400);
    screenFlash(this, 0xff0000, 250);
    playSFX(this, 'sfx-damage');
    floatingText(this, this.hero.x, this.hero.y - 12, '-15 HP', '#ff4444');

    this.updateHUD();

    if (this.heroHP <= 0) {
      this.onDefeat();
      return;
    }

    // 1.5s cooldown before next contact damage
    this.time.delayedCall(1500, () => { this.enemyContactCooldown = false; });
  }

  // ─── Hero & Input ───────────────────────────────────────────────────────

  private spawnHero(): void {
    const ol = this.map.getObjectLayer('objects');
    let sx = 2, sy = 2;
    if (ol) {
      const sp = ol.objects.find((o) => Array.isArray(o.properties) && o.properties.some((p: { name: string; value: unknown }) => p.name === 'objectType' && p.value === 'spawn'));
      if (sp) { sx = Math.floor((sp.x ?? 0) / this.map.tileWidth); sy = Math.floor((sp.y ?? 0) / this.map.tileHeight); }
    }
    this.hero = new Hero(this, sx, sy, this.map.tileWidth, `hero-${HERO_VARIANT_BY_DIFFICULTY[this.difficulty]}`);
    this.hero.setCollisionCheck((tx, ty) => isTileWalkable(this.collisionData, this.map.width, tx, ty));
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = { W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W), A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A), S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S), D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D) };
    this.input.keyboard.on('keydown-E', () => this.handleInteraction());
    this.input.keyboard.on('keydown-ESC', () => { this.scene.stop('HUDScene'); this.scene.start('MainMenuScene'); });
  }

  private handleMovementInput(): void {
    if (!this.hero || this.hero.getIsMoving()) return;
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) this.hero.move(Direction.Up);
    else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) this.hero.move(Direction.Down);
    else if (this.cursors.left.isDown || this.wasdKeys.A.isDown) this.hero.move(Direction.Left);
    else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) this.hero.move(Direction.Right);
    else this.hero.stopMovement();
  }

  // ─── Interactable System ────────────────────────────────────────────────

  private initInteractables(): void {
    const ol = this.map.getObjectLayer('objects');
    if (!ol) return;
    const objs: TiledObjectData[] = ol.objects.map((o) => ({ id: o.id, name: o.name, type: o.type ?? '', x: o.x ?? 0, y: o.y ?? 0, width: o.width ?? 16, height: o.height ?? 16, properties: Array.isArray(o.properties) ? o.properties.map((p: { name: string; type: string; value: string | number | boolean }) => ({ name: p.name, type: p.type, value: p.value })) : undefined }));
    this.interactables = parseInteractables(objs, this.map.tileWidth, this.map.tileHeight);
  }

  private placeObjectSprites(): void {
    const tw = this.map.tileWidth;
    const th = this.map.tileHeight;
    const typeToTexture: Record<string, string> = {
      terminal: 'obj-terminal',
      server: 'obj-server',
      door: 'obj-door',
      whiteboard: 'obj-desk',
      checkpoint: 'obj-plant',
    };

    for (const interactable of this.interactables) {
      const texKey = typeToTexture[interactable.type] ?? 'obj-terminal';
      if (!this.textures.exists(texKey)) continue;

      const px = interactable.tileX * tw + tw / 2;
      const py = interactable.tileY * th + th / 2;
      this.add.image(px, py, texKey).setDepth(5);
    }
  }

  private updateInteractionIndicator(): void {
    if (!this.hero) return;
    const { tileX, tileY } = this.hero.getTilePosition();
    const deltas = [{ dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }];
    const d = deltas[this.hero.getFacing()];
    const tw = this.map.tileWidth;
    const th = this.map.tileHeight;

    // Check direct facing (1 tile in front)
    const directTarget = findInteractableInRange(tileX, tileY, d.dx, d.dy, this.interactables);
    if (directTarget && !directTarget.activated) {
      this.currentInteractable = directTarget;
      this.interactionIndicator.showDirect(
        directTarget.tileX * tw + tw / 2,
        directTarget.tileY * th
      );
      return;
    }

    // Check proximity (any interactable within 2 tiles manhattan distance)
    let closestProximity: Interactable | null = null;
    let closestDist = Infinity;
    for (const inter of this.interactables) {
      if (inter.activated) continue;
      const dist = Math.abs(inter.tileX - tileX) + Math.abs(inter.tileY - tileY);
      if (dist <= 2 && dist < closestDist) {
        closestDist = dist;
        closestProximity = inter;
      }
    }

    if (closestProximity && !directTarget) {
      this.currentInteractable = null; // Can't interact yet, just warning
      this.interactionIndicator.showProximity(
        closestProximity.tileX * tw + tw / 2,
        closestProximity.tileY * th
      );
      return;
    }

    // Nothing nearby
    this.currentInteractable = null;
    this.interactionIndicator.hide();
  }

  private handleInteraction(): void {
    if (!this.currentInteractable || this.currentInteractable.activated || this.puzzleActive) return;
    const i = this.currentInteractable;
    if (i.type === 'door') { this.handleDoor(i); return; }
    if (i.puzzleId) this.openPuzzle(i); else this.activateDirectly(i);
  }

  private openPuzzle(interactable: Interactable): void {
    const ld = getLevelDefinition(this.currentLevel);
    const cats = ld?.puzzleCategories ?? ['devops'];
    const puzzle = this.puzzleEngine.draw(cats[Math.floor(Math.random() * cats.length)]);
    if (!puzzle) { this.activateDirectly(interactable); return; }

    this.hero.setMovementLocked(true);
    this.interactionIndicator.hide();
    this.puzzleActive = true;
    playSFX(this, 'sfx-interact');

    // Launch PuzzleScene as parallel overlay (renders at native res, no zoom)
    this.scene.launch('PuzzleScene', {
      puzzle,
      difficulty: this.difficulty,
      fragmentId: interactable.fragmentId,
    });

    // Listen for puzzle results via EventBus
    const onSolved = (data: { remainingSeconds: number; fragmentId?: string }) => {
      this.cleanupPuzzleListeners();
      activateInteractable(interactable.id, this.interactables);
      if (interactable.fragmentId) this.fragmentSystem.collectFragment(interactable.fragmentId);
      const gain = 100 + data.remainingSeconds * 2;
      this.score += gain;
      playSFX(this, 'sfx-fragment');
      const px = interactable.tileX * this.map.tileWidth + this.map.tileWidth / 2;
      const py = interactable.tileY * this.map.tileHeight + this.map.tileHeight / 2;
      sparkleEffect(this, px, py); floatingText(this, px, py - 8, `+${gain}`, '#ffdd44');
      this.updateHUD(); this.checkCompletion(); this.tryAutoSave();
    };

    const onFailed = () => {
      this.cleanupPuzzleListeners();
      const cfg = getDifficultyConfig(this.difficulty);
      this.heroHP = Math.max(0, this.heroHP - cfg.hpLossOnTimeout);
      if (this.heroHP <= 0) { this.onDefeat(); return; }
      playSFX(this, 'sfx-damage'); screenShake(this); screenFlash(this, 0xff0000); this.updateHUD();
    };

    const onClosed = () => {
      this.puzzleActive = false;
      this.hero.setMovementLocked(false);
    };

    EventBus.on('puzzle-scene:solved', onSolved);
    EventBus.on('puzzle-scene:failed', onFailed);
    EventBus.on('puzzle-scene:closed', onClosed);

    // Store refs for cleanup
    this._puzzleListenerCleanup = () => {
      EventBus.off('puzzle-scene:solved', onSolved);
      EventBus.off('puzzle-scene:failed', onFailed);
      EventBus.off('puzzle-scene:closed', onClosed);
    };
  }

  private _puzzleListenerCleanup: (() => void) | null = null;

  private cleanupPuzzleListeners(): void {
    if (this._puzzleListenerCleanup) {
      this._puzzleListenerCleanup();
      this._puzzleListenerCleanup = null;
    }
  }

  private activateDirectly(interactable: Interactable): void {
    activateInteractable(interactable.id, this.interactables);
    if (interactable.fragmentId) this.fragmentSystem.collectFragment(interactable.fragmentId);
    playSFX(this, 'sfx-interact');
    sparkleEffect(this, interactable.tileX * this.map.tileWidth + 8, interactable.tileY * this.map.tileHeight + 8);
    this.updateHUD(); this.checkCompletion();
  }

  private handleDoor(interactable: Interactable): void {
    if (!areAllFragmentInteractablesActivated(this.interactables)) {
      const p = getFragmentProgress(this.interactables);
      floatingText(this, this.hero.x, this.hero.y - 16, t('explore.need_more', { count: p.total - p.activated }), '#ff8844');
      return;
    }
    activateInteractable(interactable.id, this.interactables);
    playSFX(this, 'sfx-door');
    doorGlowEffect(this, interactable.tileX * this.map.tileWidth + 8, interactable.tileY * this.map.tileHeight + 8, this.map.tileWidth);
    this.time.delayedCall(1500, () => this.transitionToBoss());
  }

  private checkCompletion(): void {
    if (areAllFragmentInteractablesActivated(this.interactables)) floatingText(this, this.hero.x, this.hero.y - 24, t('explore.door_unlocked'), '#ffdd00');
  }

  // ─── Scene Transitions ──────────────────────────────────────────────────

  private transitionToBoss(): void {
    this.scene.stop('HUDScene');
    const ld = getLevelDefinition(this.currentLevel);
    const bossScene = getBossSceneKey(this.currentLevel);
    this.scene.start(bossScene, { levelId: ld?.id ?? 'level-1', difficulty: this.difficulty, currentLevel: this.currentLevel, score: this.score, heroHP: this.heroHP, bossName: ld?.bossName ?? 'Boss', pipelineOrder: ld?.pipelineOrder ?? [] });
  }

  private onDefeat(): void { this.scene.stop('HUDScene'); this.scene.start('GameOverScene', { score: this.score, levelReached: this.currentLevel, bugsDefeated: 0, puzzlesSolved: 0 }); }

  // ─── Save System ────────────────────────────────────────────────────────

  private tryAutoSave(): void {
    const cfg = getDifficultyConfig(this.difficulty);
    if (!cfg.autoSave && !cfg.saveEnabled) return;
    const ld = getLevelDefinition(this.currentLevel);
    const prog = this.fragmentSystem.getLevelProgress(ld?.id ?? 'level-1');
    const collected = prog.collected.filter((c) => c.collected);
    const pct = calculateProgress(collected.length, prog.totalRequired);
    if (canSaveAtProgress(this.difficulty, pct)) {
      const un = (this.game.registry.get('playerProfile') as { username: string } | undefined)?.username ?? 'player';
      saveGame(this.difficulty, 0, createSaveData(this.difficulty, un, this.currentLevel, this.score, this.heroHP, collected.map((c) => c.fragmentId), collected.length));
      EventBus.emit('hud:saved');
    }
  }

  // ─── HUD Update ─────────────────────────────────────────────────────────

  private updateHUD(): void {
    EventBus.emit('hud:updateHearts', { current: Math.min(Math.ceil(this.heroHP / 25), 4), max: 4 });
    const p = getFragmentProgress(this.interactables);
    EventBus.emit('hud:updateFragments', { collected: p.activated, total: p.total });
    EventBus.emit('hud:updateScore', { score: this.score });
    const mc = getMapConfig(this.currentLevel);
    EventBus.emit('hud:updateLevel', { level: this.currentLevel, name: mc?.displayName ?? '' });
    EventBus.emit('hud:updateMode', { mode: this.difficulty });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private extractCollisionData(): number[] {
    const data: number[] = [];
    for (let y = 0; y < this.map.height; y++) for (let x = 0; x < this.map.width; x++) { const t = this.collisionLayer.getTileAt(x, y); data.push(t && t.index > 0 ? t.index : 0); }
    return data;
  }
}
