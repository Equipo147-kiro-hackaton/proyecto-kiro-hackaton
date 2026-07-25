import Phaser from 'phaser';
import { Hero, Direction } from '@/entities/Hero';
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
import { PuzzleOverlay } from '@/ui/PuzzleOverlay';
import { getMapConfig } from '@/systems/MapLoader';
import { getLevelDefinition } from '@/data/levels';
import { getDifficultyConfig, canSaveAtProgress, calculateProgress } from '@/systems/DifficultySystem';
import { saveGame, createSaveData } from '@/systems/SaveSystem';
import { playSFX } from '@/lib/AudioManager';
import { screenShake, screenFlash, floatingText, sparkleEffect, doorGlowEffect } from '@/systems/FeedbackSystem';
import { EventBus } from '@/lib/EventBus';
import type { Interactable, DifficultyMode } from '@/types';

/**
 * ExplorationScene — Main gameplay scene (replaces old GameScene).
 * Scene key: 'ExplorationScene'
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
  private puzzleOverlay: PuzzleOverlay | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

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
    if (!this.textures.exists(mc.tilesetKey)) this.load.image(mc.tilesetKey, mc.tilesetPath);
    if (!this.cache.tilemap.exists(mc.mapKey)) this.load.tilemapTiledJSON(mc.mapKey, mc.mapPath);
    if (!this.textures.exists('hero')) this.load.spritesheet('hero', 'assets/sprites/hero-spritesheet.png', { frameWidth: 16, frameHeight: 16 });
  }

  create(): void {
    const mc = getMapConfig(this.currentLevel);
    if (!mc) { this.scene.start('MainMenuScene'); return; }
    this.fragmentSystem = new FragmentSystem();
    this.puzzleEngine = new PuzzleEngine();
    const ld = getLevelDefinition(this.currentLevel);
    if (ld) this.fragmentSystem.initLevel(ld.id);

    this.map = this.make.tilemap({ key: mc.mapKey });
    const ts = this.map.addTilesetImage(mc.tilesetName, mc.tilesetKey);
    if (!ts) { this.scene.start('MainMenuScene'); return; }
    this.map.createLayer('ground', ts, 0, 0);
    const cl = this.map.createLayer('collision', ts, 0, 0);
    if (!cl) { this.scene.start('MainMenuScene'); return; }
    this.collisionLayer = cl;
    this.collisionLayer.setCollisionByExclusion([0]);
    this.collisionLayer.setAlpha(0.5);
    this.collisionData = this.extractCollisionData();
    this.initInteractables();
    this.spawnHero();
    this.interactionIndicator = new InteractionIndicator(this);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setZoom(2.5);
    this.cameras.main.startFollow(this.hero, true, 0.1, 0.1);
    this.setupInput();
    this.scene.launch('HUDScene');
    this.updateHUD();
  }

  update(): void { this.handleMovementInput(); this.updateInteractionIndicator(); }

  private spawnHero(): void {
    const ol = this.map.getObjectLayer('objects');
    let sx = 2, sy = 2;
    if (ol) {
      const sp = ol.objects.find((o) => Array.isArray(o.properties) && o.properties.some((p: { name: string; value: unknown }) => p.name === 'objectType' && p.value === 'spawn'));
      if (sp) { sx = Math.floor((sp.x ?? 0) / this.map.tileWidth); sy = Math.floor((sp.y ?? 0) / this.map.tileHeight); }
    }
    this.hero = new Hero(this, sx, sy, this.map.tileWidth);
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

  private initInteractables(): void {
    const ol = this.map.getObjectLayer('objects');
    if (!ol) return;
    const objs: TiledObjectData[] = ol.objects.map((o) => ({ id: o.id, name: o.name, type: o.type ?? '', x: o.x ?? 0, y: o.y ?? 0, width: o.width ?? 16, height: o.height ?? 16, properties: Array.isArray(o.properties) ? o.properties.map((p: { name: string; type: string; value: string | number | boolean }) => ({ name: p.name, type: p.type, value: p.value })) : undefined }));
    this.interactables = parseInteractables(objs, this.map.tileWidth, this.map.tileHeight);
  }

  private updateInteractionIndicator(): void {
    if (!this.hero) return;
    const { tileX, tileY } = this.hero.getTilePosition();
    const deltas = [{ dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }, { dx: 0, dy: -1 }];
    const d = deltas[this.hero.getFacing()];
    const f = findInteractableInRange(tileX, tileY, d.dx, d.dy, this.interactables);
    if (f && !f.activated) { this.currentInteractable = f; this.interactionIndicator.show(f.tileX * this.map.tileWidth + this.map.tileWidth / 2, f.tileY * this.map.tileHeight); }
    else { this.currentInteractable = null; this.interactionIndicator.hide(); }
  }

  private handleInteraction(): void {
    if (!this.currentInteractable || this.currentInteractable.activated || this.puzzleOverlay) return;
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
    playSFX(this, 'sfx-interact');
    this.puzzleOverlay = new PuzzleOverlay(this, {
      puzzle, difficulty: this.difficulty, fragmentId: interactable.fragmentId,
      onSolved: (sec: number) => {
        activateInteractable(interactable.id, this.interactables);
        if (interactable.fragmentId) this.fragmentSystem.collectFragment(interactable.fragmentId);
        const gain = 100 + sec * 2;
        this.score += gain;
        playSFX(this, 'sfx-fragment');
        const px = interactable.tileX * this.map.tileWidth + this.map.tileWidth / 2;
        const py = interactable.tileY * this.map.tileHeight + this.map.tileHeight / 2;
        sparkleEffect(this, px, py); floatingText(this, px, py - 8, `+${gain}`, '#ffdd44');
        this.updateHUD(); this.checkCompletion(); this.tryAutoSave();
      },
      onFailed: () => {
        const cfg = getDifficultyConfig(this.difficulty);
        this.heroHP = Math.max(0, this.heroHP - cfg.hpLossOnTimeout);
        if (this.heroHP <= 0) { this.onDefeat(); return; }
        playSFX(this, 'sfx-damage'); screenShake(this); screenFlash(this, 0xff0000); this.updateHUD();
      },
      onClosed: () => { this.hero.setMovementLocked(false); this.puzzleOverlay = null; },
    });
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
      floatingText(this, this.hero.x, this.hero.y - 16, `Need ${p.total - p.activated} more`, '#ff8844');
      return;
    }
    activateInteractable(interactable.id, this.interactables);
    playSFX(this, 'sfx-door');
    doorGlowEffect(this, interactable.tileX * this.map.tileWidth + 8, interactable.tileY * this.map.tileHeight + 8, this.map.tileWidth);
    this.time.delayedCall(1500, () => this.transitionToBoss());
  }

  private checkCompletion(): void {
    if (areAllFragmentInteractablesActivated(this.interactables)) floatingText(this, this.hero.x, this.hero.y - 24, 'Door Unlocked!', '#ffdd00');
  }

  private transitionToBoss(): void {
    this.scene.stop('HUDScene');
    const ld = getLevelDefinition(this.currentLevel);
    this.scene.start('BossFightScene', { levelId: ld?.id ?? 'level-1', difficulty: this.difficulty, currentLevel: this.currentLevel, score: this.score, heroHP: this.heroHP, bossName: ld?.bossName ?? 'Boss', pipelineOrder: ld?.pipelineOrder ?? [] });
  }

  private onDefeat(): void { this.scene.stop('HUDScene'); this.scene.start('GameOverScene', { score: this.score, levelReached: this.currentLevel, bugsDefeated: 0, puzzlesSolved: 0 }); }

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

  private updateHUD(): void {
    EventBus.emit('hud:updateHearts', { current: Math.min(Math.ceil(this.heroHP / 25), 4), max: 4 });
    const p = getFragmentProgress(this.interactables);
    EventBus.emit('hud:updateFragments', { collected: p.activated, total: p.total });
    EventBus.emit('hud:updateScore', { score: this.score });
    const mc = getMapConfig(this.currentLevel);
    EventBus.emit('hud:updateLevel', { level: this.currentLevel, name: mc?.displayName ?? '' });
    EventBus.emit('hud:updateMode', { mode: this.difficulty });
  }

  private extractCollisionData(): number[] {
    const data: number[] = [];
    for (let y = 0; y < this.map.height; y++) for (let x = 0; x < this.map.width; x++) { const t = this.collisionLayer.getTileAt(x, y); data.push(t && t.index > 0 ? t.index : 0); }
    return data;
  }
}
