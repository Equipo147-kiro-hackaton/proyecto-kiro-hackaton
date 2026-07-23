# Structure — Cloud Quest: DevOps Dungeon

## Árbol de Directorios Completo

```
proyecto-kiro-hackaton/
│
├── .kiro/
│   ├── specs/
│   │   └── cloud-quest-devops-dungeon/
│   │       ├── .config.kiro
│   │       ├── requirements.md
│   │       ├── design.md
│   │       └── tasks.md
│   ├── steering/
│   │   ├── product.md        ← Visión, alcance, glosario
│   │   ├── tech.md           ← Stack, patrones, convenciones
│   │   └── structure.md      ← Este archivo
│   └── settings/
│       └── mcp.json          ← Configuración MCP del workspace
│
├── src/
│   ├── main.ts               ← Entry point de Phaser.Game
│   │
│   ├── scenes/               ← Una clase por escena, extienden Phaser.Scene
│   │   ├── LoginScene.ts
│   │   ├── MainMenuScene.ts
│   │   ├── TutorialScene.ts
│   │   ├── GameScene.ts
│   │   ├── GameOverScene.ts
│   │   ├── VictoryScene.ts
│   │   └── LeaderboardScene.ts
│   │
│   ├── systems/              ← Lógica de juego pura (sin dependencia de Phaser)
│   │   ├── PuzzleEngine.ts
│   │   ├── LevelGenerator.ts
│   │   ├── ItemSystem.ts
│   │   └── ScoreSystem.ts
│   │
│   ├── lib/                  ← Utilidades y servicios compartidos
│   │   ├── EventBus.ts
│   │   ├── ApiClient.ts
│   │   └── validateUsername.ts
│   │
│   ├── data/                 ← Datos estáticos (bundleados con el cliente)
│   │   ├── puzzles.ts        ← PUZZLE_POOL: Record<PuzzleCategory, Puzzle[]>
│   │   └── items.ts          ← ITEM_DEFINITIONS: Item[]
│   │
│   └── types/
│       └── index.ts          ← Todos los interfaces TypeScript compartidos
│
├── lambda/                   ← Funciones Lambda (Node.js 20.x + TypeScript)
│   ├── submitScore.ts        ← POST /scores
│   ├── getLeaderboard.ts     ← GET /scores
│   └── getOrCreatePlayer.ts  ← POST /players
│
├── public/                   ← Assets estáticos (sprites, sonidos, fuentes)
│   ├── assets/
│   │   ├── sprites/
│   │   ├── sounds/
│   │   └── fonts/
│   └── index.html
│
├── dist/                     ← Output de build (gitignored, generado por Vite)
│
├── amplify.yml               ← Build spec para AWS Amplify CI/CD
├── customHttp.yml            ← Reglas HTTP para Amplify (redirect HTTP→HTTPS)
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Responsabilidades por Directorio

### `src/scenes/`
- Contiene las 7 escenas del juego
- Cada archivo = una clase que extiende `Phaser.Scene`
- **Solo** lógica de presentación y manejo de input de usuario
- Delegan lógica de dominio a `src/systems/` y comunicación a `EventBus`
- **No** contienen lógica de negocio directamente

### `src/systems/`
- Contiene los 4 sistemas de lógica del juego
- **Independientes de Phaser** — pueden testearse sin DOM/canvas
- Reciben y retornan tipos definidos en `src/types/index.ts`
- Son instanciados por `GameScene` y almacenados en `game.registry`

### `src/lib/`
- Utilidades sin estado o con estado mínimo
- `EventBus.ts`: singleton exportado como instancia, no como clase
- `ApiClient.ts`: módulo con funciones exportadas (no clase)
- `validateUsername.ts`: función pura exportada

### `src/data/`
- **Solo datos estáticos** — no lógica
- Se importan directamente en los sistemas que los necesitan
- `puzzles.ts`: `PUZZLE_POOL` (Record), mínimo 5 puzzles por categoría
- `items.ts`: `ITEM_DEFINITIONS` (array), exactamente 6 ítems

### `src/types/`
- Un solo archivo `index.ts` con **todos** los tipos e interfaces compartidos
- No exporta clases ni lógica, solo tipos
- Es el contrato entre sistemas, escenas y la API

### `lambda/`
- Funciones Lambda independientes, compiladas con `tsc` antes del deploy
- Cada función maneja un endpoint REST
- Usan `@aws-sdk/client-dynamodb` — mockeado en tests con `vi.mock`
- No comparten código entre sí directamente (evitar dependencias cruzadas)

### `public/assets/`
- Assets estáticos servidos directamente por Vite/Amplify
- Sprites, sonidos (alerta de timer ≤1s), fuentes
- Optimizados para web (PNG para sprites, MP3/OGG para sonidos)

---

## Convenciones de Nombres de Archivos

| Patrón | Uso |
|---|---|
| `PascalCase.ts` | Clases (escenas, sistemas) |
| `camelCase.ts` | Utilidades y módulos (lib/, data/) |
| `*.test.ts` | Tests unitarios y de propiedad |
| `index.ts` | Barrel exports (solo en `types/`) |
| `SCREAMING_SNAKE_CASE` | Constantes exportadas (`EVENTS`, `PUZZLE_POOL`, `ITEM_DEFINITIONS`) |

---

## Flujo de Estado del Juego

```
game.registry
  ├── 'playerProfile'   → PlayerProfile (username, personalBest)
  ├── 'runState'        → RunState (score, HP, level, items, puzzle...)
  └── 'tutorialDone'    → boolean

RunState (en memoria, no persistido)
  ├── Creado al iniciar un Run (LevelGenerator.generate())
  ├── Actualizado durante el juego (GameScene)
  └── Destruido al finalizar el Run (GameOver / Victory)
      └── Solo el Score final se persiste en DynamoDB
```

---

## Flujo de Escenas

```
LoginScene
  └── (username válido + DynamoDB OK)
        └── MainMenuScene
              ├── (primer run, sin rooms completadas) → TutorialScene → GameScene
              └── (jugador recurrente)                → GameScene
                    ├── (HP = 0) → GameOverScene
                    │     ├── "New Run"         → GameScene
                    │     └── "View Leaderboard" → LeaderboardScene → MainMenuScene
                    └── (Level final completado) → VictoryScene
                          ├── "New Run"         → GameScene
                          └── "View Leaderboard" → LeaderboardScene → MainMenuScene
```

---

## API Endpoints

| Método | Ruta | Descripción | Lambda |
|---|---|---|---|
| `POST` | `/players` | Crear o recuperar perfil del jugador | `getOrCreatePlayer.ts` |
| `POST` | `/scores` | Guardar resultado de un Run | `submitScore.ts` |
| `GET` | `/scores` | Obtener top 10 del Leaderboard | `getLeaderboard.ts` |

Base URL configurada en `VITE_API_BASE_URL` (variable de entorno de Amplify).
