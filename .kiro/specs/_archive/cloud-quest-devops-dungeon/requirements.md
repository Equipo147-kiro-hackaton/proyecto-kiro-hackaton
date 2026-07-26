# Requirements Document

## Introduction

Cloud Quest: DevOps Dungeon es un videojuego roguelike web donde el jugador combate "bugs" de producción resolviendo puzles de lógica de programación en tiempo real. El objetivo es gamificar el aprendizaje de conceptos de DevOps y lógica de programación, haciendo el proceso educativo entretenido e interactivo. El proyecto es un MVP desarrollado para el Hackathon 2026, usando Phaser.js como motor de juego, AWS Amplify para hosting, DynamoDB para persistencia, y Kiro IDE con Spec-Driven Development para el diseño de niveles y lógica del juego.

## Glossary

- **Game**: La aplicación web completa de Cloud Quest: DevOps Dungeon.
- **Player**: El usuario que interactúa activamente con el Game durante una sesión de juego.
- **Hero**: El personaje controlado por el Player dentro del dungeon.
- **Bug**: Enemigo del juego representado como un error de producción (null pointer, memory leak, race condition, etc.) que el Hero debe derrotar.
- **Puzzle**: Desafío de lógica de programación o DevOps que el Player debe resolver para derrotar a un Bug.
- **Level**: Piso del dungeon compuesto por un conjunto de rooms, bugs y puzzles generados de forma procedural.
- **Room**: Habitación dentro de un Level que puede contener Bugs, Items, o ser una sala de descanso.
- **Run**: Una partida completa desde el Level 1 hasta la derrota o victoria del Hero.
- **Score**: Puntuación acumulada durante un Run basada en puzzles resueltos, tiempo y combo de victorias.
- **Leaderboard**: Tabla global de mejores Scores de todos los Players.
- **Item**: Objeto que el Hero puede obtener para mejorar sus estadísticas o habilidades durante un Run.
- **Health_Points (HP)**: Puntos de vida del Hero. Cuando llegan a 0, el Run termina.
- **Timer**: Contador de tiempo descendente que el Player tiene para resolver un Puzzle.
- **Amplify_Backend**: Servicio de AWS Amplify que gestiona el hosting y la API del Game.
- **DynamoDB_Store**: Base de datos DynamoDB que persiste Scores y datos de Players.
- **Puzzle_Engine**: Componente del Game responsable de generar y evaluar Puzzles.
- **Level_Generator**: Componente del Game responsable de la generación procedural de Levels.
- **Session**: Período activo de juego de un Player desde que inicia sesión hasta que cierra.

---

## Requirements

### Requirement 1: Inicio de Sesión y Perfil del Jugador

**User Story:** As a Player, I want to register and log in with a username, so that my Scores are saved and I can appear in the Leaderboard.

#### Acceptance Criteria

1. THE Game SHALL present a login screen requesting a username of between 3 and 20 alphanumeric characters before starting a Run.
2. WHEN a Player submits a username, THE Game SHALL validate that the username contains only alphanumeric characters and underscores.
3. IF a Player submits a username with fewer than 3 or more than 20 characters, THEN THE Game SHALL display an inline error message indicating the valid range.
4. IF a Player submits a username containing characters other than alphanumeric characters or underscores, THEN THE Game SHALL display an inline error message specifying that only letters, numbers, and underscores are allowed.
5. WHEN a valid username is submitted, THE DynamoDB_Store SHALL create or retrieve the Player profile associated with that username within 3 seconds.
6. IF the DynamoDB_Store fails to respond within 3 seconds or returns an error, THEN THE Game SHALL display an error message and allow the Player to retry submission without re-entering the username.
7. WHEN a Player profile is retrieved, THE Game SHALL display the Player's personal best Score before starting a new Run.
8. WHEN a Player logs in for the first time and no prior Score exists, THE Game SHALL display a personal best Score of 0.

---

### Requirement 2: Generación Procedural de Niveles

**User Story:** As a Player, I want each Run to feel different, so that the game remains challenging and replayable.

#### Acceptance Criteria

1. WHEN a new Run starts, THE Level_Generator SHALL produce a sequence of between 5 and 10 Levels, where each Level within the same Run has a unique layout configuration (no two Levels share the same Room count and Bug placement combination).
2. THE Level_Generator SHALL place between 3 and 7 Rooms per Level, including at least 1 combat Room and 1 rest Room per Level.
3. WHEN generating a Level at Level number N, THE Level_Generator SHALL assign Bug HP equal to a base value multiplied by (1 + 0.10 × (N − 1)), and SHALL increase Puzzle step count by 1 for every 2 Levels completed, starting at the base step count for Level 1.
4. WHEN generating two consecutive Runs for the same Player username, THE Level_Generator SHALL produce Level sequences where at least 50% of corresponding Level indices differ in Room count or Bug placement.
5. THE Level_Generator SHALL guarantee that every generated Level contains at least one navigable path from the entrance Room to the exit Room, where "navigable" means every Room door on the path is traversable without requiring combat completion from a non-combat Room.
6. IF the Level_Generator cannot satisfy the minimum Room type constraints (at least 1 combat Room and 1 rest Room) after 3 generation attempts for a given Level, THEN THE Game SHALL log a generation failure and present the Player with a pre-defined fallback Level layout for that Level index.

---

### Requirement 3: Sistema de Combate mediante Puzzles

**User Story:** As a Player, I want to defeat Bugs by solving programming logic puzzles, so that I learn DevOps and coding concepts while playing.

#### Acceptance Criteria

1. WHEN the Hero enters a combat Room, THE Puzzle_Engine SHALL present a Puzzle associated with the Bug type present in that Room within 2 seconds of the Hero's entry event.
2. THE Puzzle_Engine SHALL maintain a pool of at least 5 Puzzles per category across 4 distinct categories: syntax errors, logic errors, DevOps pipeline configuration, and memory/resource management.
3. WHEN a Puzzle is presented, THE Game SHALL display a Timer starting at 60 seconds for standard Bugs and 90 seconds for boss Bugs, updating the displayed value every 1 second.
4. WHEN the Player submits a correct answer before the Timer reaches 0, THE Game SHALL reduce the Bug's HP by (remaining Timer seconds × 2), with a minimum damage of 10 and a maximum damage of 120.
5. IF the Player submits an incorrect answer, THEN THE Game SHALL deduct 10 Health_Points from the Hero, display the next available hint for the Puzzle, and continue the Timer from its current value.
6. IF the Timer reaches 0 before the Player submits an answer, THEN THE Game SHALL deduct 15 Health_Points from the Hero, mark the Puzzle as failed, and transition the Room to a non-combat state where the Bug remains at its current HP and blocks the exit.
7. WHEN a Bug's HP reaches 0, THE Game SHALL remove the Bug from the Room, mark the Room as cleared, and award the Player a Score bonus equal to 100 multiplied by the Bug's difficulty level.
8. THE Puzzle_Engine SHALL ensure that every Puzzle has exactly one correct answer and between 1 and 3 verifiable hints, where each hint is a distinct clue that does not directly reveal the answer.
9. WHEN the Hero's HP reaches 0 during combat, THE Game SHALL immediately end the current Puzzle, cease Timer updates, and transition to the Game_Over screen within 1 second.
10. IF all hints for a Puzzle have been displayed and the Player submits an incorrect answer, THEN THE Game SHALL deduct 10 Health_Points from the Hero and display a message indicating no further hints are available, without revealing the correct answer.

---

### Requirement 4: Progresión del Héroe e Items

**User Story:** As a Player, I want to find Items that improve my Hero, so that I have strategic choices that affect my Run.

#### Acceptance Criteria

1. WHEN the Hero completes a combat Room, THE Game SHALL present the Player with a random selection of 2 Items drawn from the remaining (not yet awarded in this Run) Item pool without replacement.
2. THE Game SHALL include at least 6 distinct Item types: Timer_Extension (adds 15 seconds to the active Timer, capped at the initial Timer maximum), HP_Recovery (restores 20 HP up to the Hero's maximum of 100 HP), Hint_Revealer (automatically displays the next available hint when the Player's next answer in the current or next Puzzle is incorrect), Score_Multiplier (doubles the base Score for the next 3 Rooms, non-stackable), Bug_Weakener (reduces the next Bug's HP by 30%, rounded down to the nearest integer), and Second_Chance (triggers once when HP would reach 0, setting HP to 1 instead and removing itself from the active Item list).
3. WHEN the Player selects an Item after completing a combat Room, THE Hero SHALL immediately apply the Item's effect and THE Item SHALL be removed from the selection pool for the current Run.
4. THE Game SHALL allow the Hero to carry a maximum of 3 active (held and not yet consumed or expired) Items simultaneously.
5. IF the Hero already carries 3 active Items and the Player selects a new Item, THEN THE Game SHALL display a discard prompt showing the descriptions of all 3 held Items and the new Item; IF the Player does not respond within 60 seconds, THEN THE Game SHALL cancel the selection and preserve the existing 3 Items unchanged.
6. WHEN the Hero enters a rest Room, THE Game SHALL restore 25 Health_Points to the Hero up to a maximum of 100 Health_Points and display the Hero's updated HP value after restoration.
7. WHEN the Hero has both a Score_Multiplier and a Bug_Weakener active simultaneously, THE Game SHALL apply the Bug_Weakener to reduce the Bug's HP first, then calculate the Score for defeating that Bug based on the reduced HP value, then apply the Score_Multiplier to that calculated Score.

---

### Requirement 5: Sistema de Puntuación y Leaderboard

**User Story:** As a Player, I want to see my Score and compare it with other players on a Leaderboard, so that I have motivation to improve.

#### Acceptance Criteria

1. WHEN the Player solves a Puzzle correctly, THE Game SHALL increment the Score by a base value of 100 points multiplied by the current Level number.
2. WHEN the Player solves a Puzzle correctly with more than 30 seconds remaining on the Timer, THE Game SHALL apply a Speed_Bonus of 50 additional points.
3. WHEN a Run ends (Hero defeat or Level completion), THE DynamoDB_Store SHALL persist the final Score, the Player's username, the highest Level reached, and a UTC timestamp (accurate to the second) within 5 seconds of the Run end event.
4. IF the DynamoDB_Store is unavailable when a Run ends, THEN THE Game SHALL display the final Score and Run summary to the Player and queue the Score for a single retry submission attempt within 30 seconds; IF the retry fails, THE Game SHALL notify the Player that the Score was not saved.
5. WHEN the Leaderboard screen is opened, THE Game SHALL retrieve and display the Leaderboard data within 3 seconds, showing Scores ordered from highest to lowest.
6. IF fewer than 10 Score records exist in the DynamoDB_Store, THEN THE Game SHALL display all available records ordered from highest to lowest Score, with no empty placeholder rows.
7. THE Game SHALL display each Leaderboard entry with the Player's username (truncated to 20 characters if necessary), Score, and the date of the Run in YYYY-MM-DD format.
8. WHEN the Player's Score for a completed Run exceeds their previously stored personal best, THE DynamoDB_Store SHALL update the Player's personal best Score record with the new Score and a UTC timestamp.

---

### Requirement 6: Interfaz de Juego y Renderizado

**User Story:** As a Player, I want a visually clear and responsive game interface, so that I can focus on solving puzzles without UI friction.

#### Acceptance Criteria

1. THE Game SHALL render all game scenes using Phaser.js at a target resolution of 960x540 pixels, scaling proportionally to fit the browser viewport.
2. WHILE a Puzzle is active, THE Game SHALL display the Puzzle text, the Hero's current HP, the Timer countdown, and the available answer input field simultaneously on screen.
3. WHEN the Timer has 10 seconds or fewer remaining, THE Game SHALL change the Timer display color to red and play an audible alert sound of at most 1 second in duration, played once.
4. WHEN the Hero's HP drops below 25% of the Hero's maximum HP (below 25 HP), THE Game SHALL display a low-health visual indicator on the Hero sprite; WHEN the Hero's HP is restored to 25 HP or above, THE Game SHALL remove the low-health visual indicator.
5. THE Game SHALL provide transitions between Rooms using a fade animation with a duration between 100 milliseconds and 500 milliseconds.
6. WHEN a Run ends, THE Game SHALL display a summary screen showing the final Score as a numeric value, the highest Level reached, total Puzzles solved, and a button to start a new Run.
7. WHEN the browser viewport is smaller than 960x540 pixels, THE Game SHALL scale down the rendered canvas proportionally to fit within the viewport without cropping game content or introducing horizontal or vertical scrollbars.

---

### Requirement 7: Despliegue y Hosting en AWS Amplify

**User Story:** As a developer, I want the Game deployed on AWS Amplify, so that it is publicly accessible for the Hackathon demo.

#### Acceptance Criteria

1. THE Amplify_Backend SHALL serve the compiled Game build from a public HTTPS URL with an initial page load time of less than 3 seconds, measured from the first HTTP request to the last asset (HTML, JavaScript bundles, CSS, and Phaser.js asset files) completing download, on a connection with a minimum download speed of 25 Mbps.
2. WHEN a Player accesses the Game URL, THE Amplify_Backend SHALL return the application bundle with an HTTP 200 response and deliver all required assets (HTML, JS, CSS, and game sprites) without requiring additional authentication, completing within 5 seconds total bundle load time on a 25 Mbps connection.
3. THE Amplify_Backend SHALL expose at least one REST API endpoint for Score submission and at least one REST API endpoint for Leaderboard retrieval, both connected to the DynamoDB_Store.
4. WHEN the DynamoDB_Store receives a Score write request under fewer than 100 concurrent write requests, THE DynamoDB_Store SHALL complete the write operation and return a success confirmation within 2 seconds.
5. IF a DynamoDB_Store write operation fails, THEN THE Amplify_Backend SHALL return an HTTP 500 response with a JSON error body, and THE DynamoDB_Store SHALL not partially commit the failed write (atomic failure guarantee).
6. THE Amplify_Backend SHALL enforce HTTPS by issuing a 301 redirect for any HTTP request to the equivalent HTTPS URL, ensuring no game data or Player credentials are transmitted over plaintext HTTP.

---

### Requirement 8: Flujo de Fin de Partida y Rejugabilidad

**User Story:** As a Player, I want a clear end-of-run experience, so that I am motivated to start a new Run immediately.

#### Acceptance Criteria

1. WHEN the Hero's Health_Points reach 0, THE Game SHALL transition to a Game_Over screen within 1 second of the HP depletion event.
2. WHEN the Player completes the final Level, THE Game SHALL transition to a Victory screen within 1 second, displaying the final Score, total Bugs defeated, and a congratulatory message.
3. THE Game_Over screen SHALL display the Player's final Score, the Level reached, total Bugs defeated, and exactly two options: "New Run" and "View Leaderboard".
4. THE Victory screen SHALL display the Player's final Score, total Bugs defeated, and exactly two options: "New Run" and "View Leaderboard".
5. WHEN the Player selects "New Run" from the Game_Over or Victory screen, THE Game SHALL reset the Hero to 100 HP, clear all active Items, reset the Score to 0, set the starting Level to 1, and invoke the Level_Generator to produce a new Level sequence.
6. THE Game SHALL preserve the Player's username across consecutive Runs within the same Session, so that the Player does not need to re-enter the username for each Run.

---

### Requirement 9: Accesibilidad y Experiencia del Jugador

**User Story:** As a Player, I want the game controls and puzzle interface to be keyboard-navigable, so that I can play without depending exclusively on mouse input.

#### Acceptance Criteria

1. THE Game SHALL allow the Player to navigate Room exits using arrow keys or WASD keys, select Items using arrow keys and the Enter or Space key, and submit Puzzle answers using the Enter key, in addition to mouse/touch input.
2. WHEN a Puzzle answer input field is displayed, THE Game SHALL automatically focus that input field within 100 milliseconds of the Puzzle being presented, so the Player can begin typing immediately without clicking.
3. THE Game SHALL display all Puzzle instructions and answer options with a minimum font size of 14px and a contrast ratio of at least 4.5:1 for normal text and at least 3:1 for large text (18px or larger), conforming to WCAG 2.1 AA standards.
4. WHEN the Player presses the Escape key during a Run, THE Game SHALL display a pause menu within 200 milliseconds with options to resume, view controls, or return to the main menu.
5. IF the current Session has no prior completed Room, THEN THE Game SHALL present an interactive tutorial covering the core combat and puzzle mechanics before the Player enters the first scored Room.
6. THE Game SHALL display a visible focus indicator (a minimum 2px outline or equivalent) on any interactive element (buttons, input fields, Item selections, Room exits) that currently has keyboard focus.
