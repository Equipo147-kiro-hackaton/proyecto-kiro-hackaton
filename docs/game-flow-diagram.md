# Cloud Quest: DevOps Dungeon — Diagrama de Flujo del Juego

## Flujo General de Escenas

```mermaid
flowchart TD
    START([Inicio]) --> LOGIN[LoginScene]
    LOGIN -->|Username válido + API OK| MENU[MainMenuScene]
    LOGIN -->|Error API| LOGIN

    MENU -->|Primer run| TUTORIAL[TutorialScene]
    MENU -->|Jugador recurrente| GAME[GameScene]
    TUTORIAL --> GAME

    GAME -->|HP = 0| GAMEOVER[GameOverScene]
    GAME -->|Level final completado| VICTORY[VictoryScene]

    GAMEOVER -->|New Run| GAME
    GAMEOVER -->|View Leaderboard| LEADERBOARD[LeaderboardScene]

    VICTORY -->|New Run| GAME
    VICTORY -->|View Leaderboard| LEADERBOARD

    LEADERBOARD --> MENU
```

## Flujo de un Run (partida completa)

```mermaid
flowchart TD
    INIT([Iniciar Run]) --> GEN[LevelGenerator genera 5-10 niveles]
    GEN --> LEVEL[Entrar al Level N]
    LEVEL --> ROOM{Tipo de Room}

    ROOM -->|Bug Room| BUG[Encuentro con Bug]
    ROOM -->|Item Room| ITEM[Recoger Item]
    ROOM -->|Rest Room| REST[Descanso: +25 HP]

    BUG --> PUZZLE[PuzzleEngine selecciona puzzle]
    PUZZLE --> TIMER[Timer inicia countdown]
    TIMER --> ANSWER{Respuesta correcta?}

    ANSWER -->|Sí| DAMAGE[Calcular daño al Bug]
    ANSWER -->|No / Timeout| HERO_DMG[Bug daña al Hero]

    DAMAGE --> BUG_DEAD{Bug HP = 0?}
    BUG_DEAD -->|Sí| SCORE[Sumar Score + Bonus]
    BUG_DEAD -->|No| PUZZLE

    HERO_DMG --> HERO_CHECK{Hero HP = 0?}
    HERO_CHECK -->|Sí + Second Chance| REVIVE[Revivir con 1 HP]
    HERO_CHECK -->|Sí, sin Second Chance| GAMEOVER2([Game Over])
    HERO_CHECK -->|No| PUZZLE
    REVIVE --> PUZZLE

    SCORE --> NEXT_ROOM{Más rooms en level?}
    ITEM --> NEXT_ROOM
    REST --> NEXT_ROOM

    NEXT_ROOM -->|Sí| ROOM
    NEXT_ROOM -->|No| NEXT_LEVEL{Más levels?}

    NEXT_LEVEL -->|Sí| LEVEL
    NEXT_LEVEL -->|No| VICTORY2([Victoria])
```

## Flujo de Resolución de Puzzle

```mermaid
flowchart TD
    START([Puzzle Iniciado]) --> SELECT[PuzzleEngine selecciona puzzle aleatorio]
    SELECT --> CATEGORY{Categoría}

    CATEGORY --> SYNTAX[Syntax Errors]
    CATEGORY --> LOGIC[Logic Errors]
    CATEGORY --> DEVOPS[DevOps Pipeline]
    CATEGORY --> MEMORY[Memory/Resource]

    SYNTAX --> SHOW[Mostrar código + opciones]
    LOGIC --> SHOW
    DEVOPS --> SHOW
    MEMORY --> SHOW

    SHOW --> TIMER[Timer: 60s countdown]
    TIMER --> INPUT{Jugador responde}

    INPUT -->|Respuesta correcta| CALC_DMG[Daño = clamp timer×2, 10, 120]
    INPUT -->|Respuesta incorrecta| NO_DMG[Sin daño al Bug]
    INPUT -->|Timeout| NO_DMG

    CALC_DMG --> BONUS{Timer > 30s?}
    BONUS -->|Sí| SPEED[+50 Speed Bonus]
    BONUS -->|No| APPLY[Aplicar daño base]
    SPEED --> APPLY

    APPLY --> ITEMS{Items activos?}
    ITEMS -->|Bug Weakener| WEAK[Reducir Bug HP 30%]
    ITEMS -->|Score Multiplier| MULT[Multiplicar score]
    ITEMS -->|Ninguno| END([Fin del turno])
    WEAK --> MULT
    MULT --> END

    NO_DMG --> HERO_HIT[Bug ataca al Hero]
    HERO_HIT --> END
```

## Flujo del Sistema de Items

```mermaid
flowchart TD
    FIND([Item encontrado]) --> CHECK{Items activos < 3?}

    CHECK -->|Sí| ADD[Agregar al inventario]
    CHECK -->|No| DISCARD[Prompt: descartar uno - 60s timeout]

    DISCARD --> CHOICE{Jugador elige?}
    CHOICE -->|Sí| SWAP[Intercambiar item]
    CHOICE -->|Timeout| IGNORE[Item no recogido]

    ADD --> TYPE{Tipo de Item}
    SWAP --> TYPE

    TYPE -->|Score Multiplier| SM_CHECK{Ya activo?}
    SM_CHECK -->|Sí| IGNORE2[No se apila]
    SM_CHECK -->|No| ACTIVATE[Activar efecto]

    TYPE -->|Second Chance| SC[Se activa al llegar HP=0]
    TYPE -->|Bug Weakener| BW[Reduce HP Bug 30% en próximo combate]
    TYPE -->|HP Potion| HP[+25 HP inmediato]
    TYPE -->|Time Extender| TE[+15s en próximo puzzle]
    TYPE -->|Shield| SH[Reduce daño recibido 50% una vez]

    ACTIVATE --> DONE([Item listo])
    SC --> DONE
    BW --> DONE
    HP --> DONE
    TE --> DONE
    SH --> DONE
```

## Flujo de Score y Leaderboard

```mermaid
flowchart TD
    RUN_END([Run finalizado]) --> CALC[Calcular score final]
    CALC --> COMPARE{Score > Personal Best?}

    COMPARE -->|Sí| UPDATE[Actualizar Personal Best]
    COMPARE -->|No| SUBMIT[Enviar score a API]
    UPDATE --> SUBMIT

    SUBMIT --> API[POST /scores → Lambda → DynamoDB]
    API --> OK{Respuesta OK?}

    OK -->|Sí| SAVED[Score guardado - emit SCORE_SAVED]
    OK -->|No| FAILED[Error - emit SCORE_NOT_SAVED]

    SAVED --> SHOW[Mostrar en GameOver/Victory]
    FAILED --> SHOW

    SHOW --> LB{Ver Leaderboard?}
    LB -->|Sí| FETCH[GET /scores → top 10]
    LB -->|No| END([Fin])
    FETCH --> DISPLAY[Mostrar tabla ordenada por score desc]
    DISPLAY --> END
```
