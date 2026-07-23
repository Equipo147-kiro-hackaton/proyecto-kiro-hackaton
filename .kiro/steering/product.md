# Product — Cloud Quest: DevOps Dungeon

## Visión del Producto

Cloud Quest: DevOps Dungeon es un videojuego roguelike web educativo donde los jugadores derrotan "bugs de producción" resolviendo puzzles de lógica de programación y DevOps en tiempo real. El objetivo es gamificar el aprendizaje de conceptos complejos de DevOps, haciendo el proceso educativo entretenido, competitivo e inmediato.

Proyecto desarrollado para **Hackathon 2026**. El entregable final es un MVP completamente funcional, desplegado públicamente en AWS Amplify, con demo en vivo y video de presentación.

---

## Problema que Resuelve

Aprender DevOps y lógica de programación es difícil y abstracto. Los recursos existentes son densos, aburridos y sin retroalimentación inmediata. Cloud Quest convierte ese aprendizaje en un juego: cada concepto es un enemigo a derrotar, cada error es una penalidad, cada acierto rápido es recompensado.

---

## Usuarios Objetivo

- **Jugador principal (Player):** Desarrolladores junior, estudiantes de tecnología o cualquier persona interesada en aprender DevOps y programación de forma lúdica.
- **Audiencia secundaria:** Equipos técnicos que quieran practicar conceptos de DevOps en formato gamificado.

---

## Propuesta de Valor

- Aprendizaje activo: los conceptos se internalizan resolviendo puzzles bajo presión de tiempo.
- Rejugabilidad: generación procedural de niveles asegura que cada partida sea diferente.
- Competencia: tabla de líderes global para motivar la mejora continua.
- Accesibilidad: funciona en cualquier navegador moderno sin instalación.

---

## Alcance del MVP

### Incluido
- Sistema de login con username (sin contraseña)
- Generación procedural de 5–10 niveles por partida
- 4 categorías de puzzles: syntax errors, logic errors, DevOps pipeline, memory/resource management
- 20+ puzzles en total (≥5 por categoría)
- 6 tipos de ítems coleccionables durante la partida
- Sistema de puntuación con Speed Bonus
- Tabla de líderes global (top 10)
- Tutorial interactivo para nuevos jugadores
- Despliegue público en HTTPS vía AWS Amplify

### Fuera del MVP
- Autenticación con contraseña / OAuth
- Sistema de niveles de usuario o XP persistente
- Múltiples personajes o clases de héroe
- Editor de puzzles
- Versión móvil nativa
- Monetización

---

## Glosario del Dominio

| Término | Definición |
|---|---|
| **Game** | La aplicación web completa |
| **Player** | El usuario jugando activamente |
| **Hero** | Personaje controlado por el Player |
| **Bug** | Enemigo representado como error de producción |
| **Puzzle** | Desafío de lógica/DevOps que derrota al Bug |
| **Level** | Piso del dungeon con Rooms generadas proceduralmente |
| **Room** | Habitación con Bugs, Ítems o descanso |
| **Run** | Una partida completa desde Level 1 |
| **Score** | Puntuación acumulada en un Run |
| **Leaderboard** | Tabla global de mejores Scores |
| **Item** | Objeto que mejora al Hero durante un Run |
| **HP** | Puntos de vida del Hero (0 = Game Over) |
| **Timer** | Contador regresivo para resolver un Puzzle |
| **Session** | Período activo desde login hasta cierre |

---

## Criterios de Éxito del Hackathon

- [ ] Demo pública accesible por URL HTTPS
- [ ] Flujo completo jugable: login → juego → game over → leaderboard
- [ ] Al menos un ciclo de puzzle resuelto demostrable en vivo
- [ ] Leaderboard con datos reales de DynamoDB
- [ ] Video de presentación de máximo 5 minutos
- [ ] Repositorio público en GitHub con README completo
