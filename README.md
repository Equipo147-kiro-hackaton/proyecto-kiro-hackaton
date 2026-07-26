# 🎮 Cloud Quest: DevOps Dungeon

> **Hackathon 2026** — Categoría: Videojuegos

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge)](https://TBD)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser.js-3.x-8C2F23?style=for-the-badge)](https://phaser.io/)
[![AWS](https://img.shields.io/badge/AWS-Amplify%20%2B%20DynamoDB-FF9900?style=for-the-badge&logo=amazon-aws)](https://aws.amazon.com/amplify/)

---

## 📖 Descripción

**Cloud Quest: DevOps Dungeon** es un videojuego roguelike web donde el jugador combate "bugs de producción" resolviendo puzzles de lógica de programación y DevOps en tiempo real.

Cada enemigo es un error de producción (`NullPointerException`, memory leak, race condition...). Para derrotarlo, el jugador debe resolver un puzzle de programación antes de que el timer llegue a cero. Cuanto más rápido lo resuelvas, más daño haces. Si fallas, pierdes HP.

**Aprende DevOps jugando.** Sin aburrimiento. Con puntuación global.

---

## 🎯 Problema que Resuelve

Aprender DevOps y lógica de programación es difícil y abstracto. Los recursos existentes son densos y sin retroalimentación inmediata. Cloud Quest convierte ese aprendizaje en un juego: cada concepto es un enemigo a derrotar, cada error tiene consecuencias, cada acierto rápido es recompensado.

---

## ✨ Características del MVP

| Característica | Descripción |
|---|---|
| 🗡️ **Combate por Puzzles** | 4 categorías: syntax errors, logic errors, DevOps pipeline, memory management |
| 🗺️ **Niveles Procedurales** | Cada partida genera 5–10 niveles únicos con BFS garantizando caminos navegables |
| ⚡ **Speed Bonus** | Resolver rápido (>30s restantes) otorga +50 puntos extra |
| 🎒 **Sistema de Ítems** | 6 tipos de ítems con efectos estratégicos (Timer Extension, Second Chance, etc.) |
| 🏆 **Leaderboard Global** | Top 10 scores persistidos en DynamoDB, accesibles en tiempo real |
| 📖 **Tutorial Interactivo** | Onboarding guiado para nuevos jugadores |
| ⌨️ **Keyboard-First** | Navegación completa por teclado (WASD + Enter + Escape) |

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Game Engine | Phaser.js 3 (TypeScript) |
| Build Tool | Vite (`phaser/template-vite-ts`) |
| Hosting | AWS Amplify (CloudFront + S3) |
| API | AWS API Gateway (REST) |
| Backend | AWS Lambda (Node.js 20.x) |
| Base de Datos | AWS DynamoDB (single-table + GSI) |
| Testing | Vitest + fast-check (property-based testing) |

---

## 🏗️ Arquitectura

```
Browser (Phaser Canvas 960×540)
  └── AWS Amplify Hosting
        └── Phaser Game (cliente TypeScript)
              ├── 7 Escenas: Login → MainMenu → Tutorial → Game → GameOver/Victory → Leaderboard
              ├── Sistemas: PuzzleEngine, LevelGenerator, ItemSystem, ScoreSystem
              ├── EventBus (Phaser.Events.EventEmitter)
              └── ApiClient → AWS API Gateway → Lambda → DynamoDB
```

**Flujo de escenas:**
```
LoginScene → MainMenuScene → [TutorialScene →] GameScene
                                                  ├── GameOverScene → LeaderboardScene
                                                  └── VictoryScene  → LeaderboardScene
```

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 20.x
- npm o pnpm
- Cuenta de AWS (para backend)
- `uv` instalado (para servidores MCP de Kiro)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Equipo147-kiro-hackaton/proyecto-kiro-hackaton.git
cd proyecto-kiro-hackaton

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores (ver sección Variables de Entorno)
```

### Desarrollo Local

```bash
# Iniciar servidor de desarrollo con hot reload
npm run dev
```

Abre `http://localhost:5173` en tu navegador.

### Build de Producción

```bash
npm run build
# Output en dist/
```

### Tests

```bash
# Ejecutar todos los tests (ejecución única)
npx vitest --run

# Con cobertura
npx vitest --run --coverage
```

---

## ⚙️ Variables de Entorno

Copia `.env.example` a `.env` y configura:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_BASE_URL` | URL base del API Gateway en Amplify | `https://abc.execute-api.us-east-1.amazonaws.com/prod` |
| `GITHUB_TOKEN` | Token de GitHub para MCP (configurar en el sistema, no en .env) | `ghp_xxxx` |
| `AWS_REGION` | Región AWS de la infraestructura | `us-east-1` |
| `DYNAMODB_TABLE_NAME` | Nombre de la tabla DynamoDB | `cloud-quest-scores` |

> ⚠️ **Nunca commitees `.env`** — está en `.gitignore`. Para `GITHUB_TOKEN`, configúralo como variable de entorno del sistema operativo.

**Windows PowerShell (permanente):**
```powershell
[System.Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "ghp_xxxx", "User")
```

---

## 📁 Estructura del Proyecto

```
proyecto-kiro-hackaton/
├── src/
│   ├── main.ts              # Entry point de Phaser.Game
│   ├── scenes/              # 7 escenas del juego (extienden Phaser.Scene)
│   ├── systems/             # PuzzleEngine, LevelGenerator, ItemSystem, ScoreSystem
│   ├── lib/                 # EventBus, ApiClient, validateUsername
│   ├── data/                # puzzles.ts y items.ts (datos estáticos)
│   └── types/               # index.ts con todos los tipos compartidos
├── lambda/                  # Funciones Lambda (Node.js + TypeScript)
│   ├── submitScore.ts       # POST /scores
│   ├── getLeaderboard.ts    # GET /scores
│   └── getOrCreatePlayer.ts # POST /players
├── public/assets/           # Sprites, sonidos, fuentes
├── .kiro/
│   ├── specs/               # Spec completo: requirements, design, tasks
│   └── steering/            # product.md, tech.md, structure.md
├── amplify.yml              # Build spec para AWS Amplify CI/CD
├── .env.example             # Plantilla de variables de entorno
└── README.md
```

---

## 🎮 Mecánicas del Juego

### Sistema de Combate
1. El héroe entra a una sala de combate
2. El `PuzzleEngine` presenta un puzzle relacionado con el tipo de Bug
3. El jugador tiene **60 segundos** (90 para boss bugs) para responder
4. **Respuesta correcta:** daño = `clamp(segundosRestantes × 2, 10, 120)`
5. **Respuesta incorrecta:** -10 HP al héroe + pista del puzzle
6. **Timer a 0:** -15 HP y la sala queda bloqueada

### Fórmulas de Puntuación
| Evento | Puntos |
|---|---|
| Puzzle resuelto | `100 × número de nivel` |
| Speed Bonus (>30s restantes) | +50 |
| Score Multiplier activo | ×2 al base score |
| Bug derrotado | `100 × dificultad del bug` |

### Categorías de Puzzles
- 🔴 **Syntax Errors** — Encuentra y corrige el error de sintaxis
- 🟡 **Logic Errors** — Traza la salida o encuentra el bug lógico
- 🔵 **DevOps Pipeline** — CI/CD, Docker, Kubernetes, configuración de infraestructura
- 🟢 **Memory/Resource Management** — Memory leaks, gestión de recursos

### Ítems (máx. 3 activos)
| Ítem | Efecto |
|---|---|
| ⏱️ Timer Extension | +15s al timer activo |
| ❤️ HP Recovery | +20 HP (máx. 100) |
| 💡 Hint Revealer | Auto-muestra pista en el siguiente error |
| 🌟 Score Multiplier | Duplica score por 3 salas (no apilable) |
| 🪲 Bug Weakener | -30% HP del próximo bug |
| 🛡️ Second Chance | Una vez: si HP llega a 0, queda en 1 |

---

## 🧪 Testing

**316 tests pasando** en 21 archivos de test. El proyecto usa **property-based testing** con `fast-check`:

```powershell
# Ejecutar todos los tests
npx vitest --run

# Con cobertura
npx vitest --run --coverage
```

```typescript
// Ejemplo: Property 7 — Damage formula clamp
test('Property 7: damage formula clamp', () => {
  fc.assert(fc.property(
    fc.integer({ min: 1, max: 90 }),
    (t) => computeDamage(t) === Math.max(10, Math.min(120, t * 2))
  ), { numRuns: 100 });
});
```

**Cobertura objetivo:** ≥90% en sistemas puros (PuzzleEngine, ScoreSystem, LevelGenerator, ItemSystem, validators).

---

## ☁️ Despliegue

### Backend (API Gateway + Lambda + DynamoDB)

```powershell
# Deploy completo (un solo comando)
.\infra\scripts\deploy.ps1

# Destruir todo (zero costos zombie)
.\infra\scripts\destroy.ps1
```

Ver guia completa: [`infra/DEPLOY-GUIDE.md`](infra/DEPLOY-GUIDE.md)

### Frontend (AWS Amplify Hosting)

1. Conecta el repo a AWS Amplify Console
2. Amplify detecta `amplify.yml` automaticamente
3. Configura variable `VITE_API_BASE_URL` con la URL del API
4. El juego queda disponible en una URL HTTPS publica

---

## 🌿 Git Workflow

### Ramas
```
main        ← producción (demo del hackathon)
 └── develop ← integración
      ├── feature/frontend-scenes
      ├── feature/game-systems
      ├── feature/lambda-backend
      ├── feature/puzzle-content
      └── feature/deployment
```

### Conventional Commits
```bash
feat: agregar PuzzleEngine con 4 categorías
fix: corregir clamp de daño cuando timer = 0
docs: actualizar README con URL de demo
test: agregar property tests para ScoreSystem
refactor: extraer validación de username a lib/
chore: configurar Amplify build spec
```

### Definition of Done
- ✅ Código implementado y compila sin errores TypeScript
- ✅ Tests relevantes escritos y pasando (`vitest --run`)
- ✅ No rompe funcionalidades existentes
- ✅ PR revisado por al menos 1 integrante del equipo

---

## 👥 Equipo

| Rol | Responsable |
|---|---|
| Product Owner | ⏳ |
| Líder Técnico | ⏳ |
| Frontend / Game | ⏳ |
| Backend / AWS | ⏳ |
| QA / Testing | ⏳ |

---

## 📋 Entregables del Hackathon

- [x] Repositorio publico en GitHub con README completo
- [x] Flujo completo jugable: login -> juego -> game over -> leaderboard
- [x] Spec completo: requirements, design, tasks (en `.kiro/specs/`)
- [ ] Demo publica accesible por URL HTTPS (deploy con `.\infra\scripts\deploy.ps1` + Amplify)
- [ ] Video de presentacion (maximo 5 minutos)

---

## 📄 Licencia

MIT — ver [LICENSE](LICENSE)

---

<p align="center">
  Construido con ❤️ para <strong>Hackathon 2026</strong> usando <strong>Kiro IDE</strong> y <strong>Spec-Driven Development</strong>
</p>
