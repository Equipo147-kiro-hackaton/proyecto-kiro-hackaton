# Skill: Phaser.js 3 Game Development

## Framework: Phaser 3.80+

### Arquitectura de Escenas
- Cada escena tiene ciclo: `init() → preload() → create() → update()`
- `init(data)` recibe datos de la escena anterior vía `this.scene.start('Key', data)`
- `preload()` solo para carga de assets — nunca lógica
- `create()` para setup inicial — instanciar objetos, bindings
- `update(time, delta)` para game loop — usar delta para frame-independent movement

### Comunicación entre Escenas
```typescript
// CORRECTO: Registry + EventBus
this.game.registry.set('runState', runState);
eventBus.emit(EVENTS.PUZZLE_SUBMITTED);

// INCORRECTO: Referencia directa
this.scene.get('GameScene').someProperty; // NUNCA
```

### ScaleManager
- Resolución base: 960x540
- Mode: `Phaser.Scale.FIT`
- AutoCenter: `Phaser.Scale.CENTER_BOTH`
- Diseñar UI relativa al canvas, no a píxeles absolutos

### Input Handling
- Keyboard: `this.input.keyboard.createCursorKeys()` en `create()`
- Mouse/Touch: `this.input.on('pointerdown', handler)`
- Para UI buttons: usar `setInteractive()` + pointer events
- Siempre limpiar listeners en `shutdown` event de la escena

### Tilemaps
- Formato Tiled JSON
- Cargar tileset en preload: `this.load.image('tiles', 'path')`
- Cargar map: `this.load.tilemapTiledJSON('map', 'path')`
- Crear layers en create: `map.createLayer('layerName', tileset)`
- Collision: `layer.setCollisionByProperty({ collides: true })`

### Physics (Arcade)
- Usar Arcade Physics para 2D simple
- `this.physics.add.sprite()` para personajes con física
- `this.physics.add.collider(player, layer)` para colisiones
- Velocity-based movement, no position manipulation directa

### Performance
- Object pooling para bullets, particles, enemies
- Destroy sprites que salen del viewport
- Usar texture atlases en vez de imágenes individuales
- `setActive(false)` + `setVisible(false)` en vez de destroy para reusar

### Animations
- Definir en create: `this.anims.create({ key, frames, frameRate, repeat })`
- `sprite.play('animKey')` para reproducir
- `sprite.on('animationcomplete', handler)` para callbacks

### Audio
- Preload: `this.load.audio('key', ['path.mp3', 'path.ogg'])`
- Play: `this.sound.play('key', { volume: 0.5 })`
- Siempre tener fallback si audio no carga (juego funciona sin sonido)

### Timers y Delays
- `this.time.delayedCall(ms, callback)` — no setTimeout
- `this.time.addEvent({ delay, callback, loop })` para repetición
- Todos los timers se auto-limpian cuando la escena se destruye

### Best Practices Cloud Quest
- Separar lógica de dominio (systems/) de presentación (scenes/)
- Systems son puros — testeables sin Phaser
- Scenes solo renderizan y capturan input
- Nunca hacer fetch/API calls dentro de update()
- Usar `Phaser.Math.Clamp()` para valores acotados
