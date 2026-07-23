# Tech — Cloud Quest: DevOps Dungeon

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Game engine | Phaser.js 3 | ^3.80.0 |
| Lenguaje | TypeScript | strict mode |
| Build tool | Vite (template `phaser/template-vite-ts`) | ^5.x |
| Testing | Vitest + fast-check | latest |
| Hosting | AWS Amplify (CloudFront + S3) | Gen 1 |
| API | AWS API Gateway (REST) | — |
| Funciones | AWS Lambda (Node.js 20.x, TypeScript) | — |
| Base de datos | AWS DynamoDB | on-demand |
| Control de versiones | Git + GitHub | — |

---

## Arquitectura General

```
Browser (Phaser Canvas)
  └── AWS Amplify Hosting (CloudFront + S3)
        └── Phaser Game (client)
              ├── Scene Stack (Login → MainMenu → Tutorial → Game → GameOver/Victory → Leaderboard)
              ├── Game.registry (RunState, PlayerProfile)
              ├── EventBus (Phaser.Events.EventEmitter)
              ├── PuzzleEngine
              ├── LevelGenerator
              ├── ItemSystem
              ├── ScoreSystem
              └── ApiClient (fetch wrapper)
                    └── AWS API Gateway
                          └── Lambda Functions
                                └── DynamoDB (cloud-quest-scores)
```

---

## Estructura del Proyecto

```
proyecto-kiro-hackaton/
├── src/
│   ├── main.ts                  # Phaser.Game entry point (960×540, ScaleManager FIT)
│   ├── scenes/
│   │   ├── LoginScene.ts
│   │   ├── MainMenuScene.ts
│   │   ├── TutorialScene.ts
│   │   ├── GameScene.ts
│   │   ├── GameOverScene.ts
│   │   ├── VictoryScene.ts
│   │   └── LeaderboardScene.ts
│   ├── systems/
│   │   ├── PuzzleEngine.ts
│   │   ├── LevelGenerator.ts
│   │   ├── ItemSystem.ts
│   │   └── ScoreSystem.ts
│   ├── lib/
│   │   ├── EventBus.ts          # Phaser.Events.EventEmitter singleton
│   │   ├── ApiClient.ts         # fetch wrapper con AbortController (5s timeout)
│   │   └── validateUsername.ts  # regex /^[a-zA-Z0-9_]{3,20}$/
│   ├── data/
│   │   ├── puzzles.ts           # PUZZLE_POOL estático (≥5 puzzles × 4 categorías)
│   │   └── items.ts             # ITEM_DEFINITIONS (6 tipos)
│   └── types/
│       └── index.ts             # Todos los interfaces y tipos compartidos
├── lambda/
│   ├── submitScore.ts           # POST /scores
│   ├── getLeaderboard.ts        # GET /scores
│   └── getOrCreatePlayer.ts     # POST /players
├── amplify.yml                  # Build spec de Amplify
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

---

## Patrones y Convenciones de Código

### TypeScript
- **Strict mode siempre activo** (`"strict": true` en tsconfig.json)
- Path alias `@/` → `src/` para todos los imports internos
- Interfaces para tipos de datos compartidos; clases para sistemas con estado
- No usar `any`; usar `unknown` y type guards cuando sea necesario

### Escenas de Phaser
- Cada escena extiende `Phaser.Scene` con ciclo estándar: `init → preload → create → update`
- Comunicación entre escenas EXCLUSIVAMENTE vía `game.registry` y `EventBus`
- Nunca pasar estado directamente entre escenas por referencia directa
- Usar `Phaser.Time.delayedCall` para auto-focus de inputs (100ms max)

### EventBus
Usar siempre los nombres de eventos definidos en `EVENTS`:
```typescript
export const EVENTS = {
  PUZZLE_SUBMITTED: 'puzzle:submitted',
  TIMER_EXPIRED:    'timer:expired',
  BUG_DEFEATED:     'bug:defeated',
  HERO_HP_CHANGED:  'hero:hpChanged',
  RUN_ENDED:        'run:ended',
  SCORE_SAVED:      'score:saved',
  SCORE_NOT_SAVED:  'score:notSaved',
} as const;
```

### ApiClient
- Toda llamada al backend usa `AbortController` con timeout de **5 segundos**
- URL base en variable de entorno `VITE_API_BASE_URL` — nunca hardcodeada
- Errores propagan como Promises rechazadas; el caller maneja el error

### Variables de Entorno
| Variable | Uso |
|---|---|
| `VITE_API_BASE_URL` | Base URL del API Gateway en Amplify |

---

## DynamoDB — Diseño de Tabla

**Tabla:** `cloud-quest-scores`

| Atributo | Tipo | Rol |
|---|---|---|
| `username` | String | Partition Key |
| `runId` | String | Sort Key (UUID por run) |
| `score` | Number | GSI sort key |
| `gameId` | String | GSI partition key (`"CLOUD_QUEST"` siempre) |
| `highestLevel` | Number | — |
| `timestamp` | String | ISO 8601 UTC |

**GSI: `ScoreIndex`**
- Partition key: `gameId = "CLOUD_QUEST"` (valor constante para evitar hot partition)
- Sort key: `score` (Number, orden descendente)
- Projection: ALL

---

## Reglas de Negocio Críticas

### Fórmulas — NO modificar sin actualizar requirements.md y design.md

| Fórmula | Valor |
|---|---|
| Daño por puzzle | `clamp(timerSeconds × 2, 10, 120)` |
| Score base | `100 × levelNumber` |
| Speed Bonus | `+50 si timerSeconds > 30` |
| Bug HP scaling | `BASE_HP × (1 + 0.10 × (N−1))` |
| Puzzle step count | `BASE_STEPS + floor((N−1) / 2)` |
| HP rest room | `min(currentHP + 25, 100)` |
| Bug Weakener | Reducir HP del Bug en 30% (redondear hacia abajo) |
| Score Multiplier | Bug Weakener se aplica PRIMERO, luego Score Multiplier |

### Items — Reglas de Apilamiento
- `Score_Multiplier`: no apilable. Si ya está activo, no se suma un segundo.
- `Second_Chance`: se activa UNA VEZ cuando HP llegaría a 0, luego se elimina del inventario.
- Máximo **3 ítems activos** simultáneamente. Si se tienen 3 y se selecciona uno nuevo, se muestra prompt de descarte con timeout de 60s.

---

## Testing

### Configuración
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
```

### Reglas
- **Property-based tests** con `fast-check` — mínimo 100 iteraciones por propiedad
- Etiquetar cada test PBT con comentario: `// Feature: cloud-quest-devops-dungeon, Property N: ...`
- Los sistemas puros (PuzzleEngine, ScoreSystem, LevelGenerator, ItemSystem, validators) deben tener **≥90% de cobertura**
- AWS SDK mockeado con `vi.mock` en todos los tests de Lambda
- `fetch` mockeado con `vi.fn()` en tests de ApiClient

### Comando de Tests
```bash
npx vitest --run
```
(usar `--run` para ejecución única, no modo watch)

---

## Git y Colaboración

### Estrategia de Ramas
```
main
 └── develop
      ├── feature/frontend-scenes
      ├── feature/game-systems
      ├── feature/lambda-backend
      ├── feature/puzzle-content
      └── feature/deployment
```

### Conventional Commits
```
feat: agregar PuzzleEngine con 4 categorías
fix: corregir clamp de daño cuando timer = 0
docs: actualizar README con URL de demo
test: agregar property tests para ScoreSystem
refactor: extraer validación de username a lib/
chore: configurar Amplify build spec
```

### Definición de Terminado (DoD)
Una tarea está terminada cuando:
1. Código implementado y compila sin errores TypeScript
2. Tests relevantes escritos y pasando (`vitest --run`)
3. No rompe funcionalidades existentes
4. Mergeado a `develop` con PR revisado por al menos 1 integrante
