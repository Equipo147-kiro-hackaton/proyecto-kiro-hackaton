/**
 * TRANSLATIONS — All UI strings in English and Spanish (v2).
 *
 * Note: Puzzle content (questions, correctAnswers, hints) is intentionally kept
 * in English only. Programming concepts and DevOps commands are language-neutral
 * technical content that reads correctly in both locales. This mirrors the
 * pattern used by educational platforms like Codecademy and freeCodeCamp.
 *
 * Story content (level intros / outros) IS translated — see stories.ts (Phase 3).
 *
 * Adding a key: add to BOTH `en` and `es`. Fallback to `en` exists but should
 * not be relied upon — keep parity.
 */

const en = {
  // ─── Login Scene ─────────────────────────────────────────────────────────
  'login.title': 'Cloud Quest: DevOps Dungeon',
  'login.subtitle': 'Defeat production bugs with code!',
  'login.prompt': '> Enter your username to begin',
  'login.button': '[ LOGIN ]',
  'login.button_welcome': '[ WELCOME ]',
  'login.personal_best': 'Personal Best: {score}',
  'login.error_length': 'Username must be 3-20 characters.',
  'login.error_chars': 'Only letters, numbers, and underscores allowed.',
  'login.footer_hint': 'Enter = Login | 3-20 chars, letters/numbers/underscore',
  'login.placeholder': 'username_here',
  'login.language_toggle': 'EN',

  // ─── Main Menu ───────────────────────────────────────────────────────────
  'menu.title': 'Cloud Quest: DevOps Dungeon',
  'menu.welcome': 'Welcome, {username}!  |  Best: {best}',
  'menu.select_difficulty': 'SELECT DIFFICULTY',
  'menu.difficulty.beginner': 'BEGINNER',
  'menu.difficulty.normal': 'NORMAL',
  'menu.difficulty.hard': 'HARD',
  'menu.difficulty.beginner_desc': 'Auto-save, full hints, guides',
  'menu.difficulty.normal_desc': 'Manual saves at 30%/60%, hints after fail',
  'menu.difficulty.hard_desc': 'No saves, no hints, no mercy',
  'menu.new_run': '[ NEW RUN ]',
  'menu.continue': '[ CONTINUE ]',
  'menu.leaderboard': '[ LEADERBOARD ]',
  'menu.footer_hint': '1=Beginner  2=Normal  3=Hard  |  Enter=Start  |  L=Leaderboard',

  // ─── HUD ─────────────────────────────────────────────────────────────────
  'hud.hp': 'HP',
  'hud.score': 'SCORE',
  'hud.fragments': 'FRAGMENTS',
  'hud.status': 'STATUS',
  'hud.controls': 'CONTROLS',
  'hud.status_default': 'Explore the map.\nFind fragments.',
  'hud.status_remaining': 'Find {count} more\nfragments to\nunlock the door.',
  'hud.status_unlocked': '\u00bb DOOR UNLOCKED\n  Find the exit!',
  'hud.saved': 'SAVED \u2713',
  'hud.controls_list': 'WASD  Move\nE     Interact\nESC   Menu\nM     Mute',

  // ─── Puzzle ──────────────────────────────────────────────────────────────
  'puzzle.category_badge': '[ {category} PUZZLE ]',
  'puzzle.answer_placeholder': 'Type your answer...',
  'puzzle.submit': '[ SUBMIT ]',
  'puzzle.correct': 'CORRECT!',
  'puzzle.wrong': 'WRONG!',
  'puzzle.timeout': "TIME'S UP!",
  'puzzle.close': 'X',
  'puzzle.hint_prefix': '\u2139 {hint}',
  'puzzle.reinforcement_prefix': '\u2705 {hint}',
  'puzzle.none_above': 'None of the above',

  // ─── Boss Fight ──────────────────────────────────────────────────────────
  'boss.place_in_order': 'Place fragments in correct pipeline order:',
  'boss.click_hint': 'Click fragments in order | ESC to forfeit',
  'boss.critical': 'CRITICAL!',
  'boss.attack': 'Boss Attack!',
  'boss.defeated': 'BOSS DEFEATED!',
  'boss.player_defeated': 'DEFEATED',
  'boss.heart_lost': '-1 \u2665',
  'boss.forfeit_hint': 'Click fragments in order | ESC to forfeit',

  // ─── Exploration ─────────────────────────────────────────────────────────
  'explore.need_more': 'Need {count} more',
  'explore.trap': '\u26A1 TRAP! -25 HP',
  'explore.door_unlocked': 'Door Unlocked!',

  // ─── Game Over ───────────────────────────────────────────────────────────
  'gameover.title': 'GAME OVER',
  'gameover.final_score': 'Final Score: {score}',
  'gameover.level_reached': 'Level Reached: {level}',
  'gameover.bugs_defeated': 'Bugs Defeated: {count}',
  'gameover.puzzles_solved': 'Puzzles Solved: {count}',
  'gameover.new_run': '[ NEW RUN ]',
  'gameover.try_again': '[ TRY AGAIN ]',
  'gameover.view_leaderboard': '[ VIEW LEADERBOARD ]',

  // ─── Victory ─────────────────────────────────────────────────────────────
  'victory.title': 'DUNGEON CLEARED!',
  'victory.message': 'You vanquished all the production bugs!',
  'victory.final_score': 'Final Score: {score}',
  'victory.bugs_defeated': 'Bugs Defeated: {count}',
  'victory.puzzles_solved': 'Puzzles Solved: {count}',
  'victory.new_run': '[ NEW RUN ]',
  'victory.view_leaderboard': '[ VIEW LEADERBOARD ]',

  // ─── Leaderboard ─────────────────────────────────────────────────────────
  'leaderboard.title': 'LEADERBOARD',
  'leaderboard.loading': 'Loading...',
  'leaderboard.empty_title': 'No scores yet!',
  'leaderboard.empty_message': 'Play a run to be the first on the leaderboard.',
  'leaderboard.error': 'Could not load leaderboard',
  'leaderboard.retry': '[ RETRY ]',
  'leaderboard.back': '[ BACK ]',
  'leaderboard.col_rank': '#',
  'leaderboard.col_username': 'Username',
  'leaderboard.col_score': 'Score',
  'leaderboard.col_date': 'Date',

  // ─── Tutorial ────────────────────────────────────────────────────────────
  'tutorial.title': 'TUTORIAL',
  'tutorial.step_1': 'Welcome to Cloud Quest, a DevOps RPG.',
  'tutorial.step_2': 'Move your hero with WASD or arrow keys.',
  'tutorial.step_3': 'Approach a glowing terminal and press E to interact.',
  'tutorial.step_4': 'Solve puzzles to collect fragments.\nEach fragment brings you closer to the boss.',
  'tutorial.step_5': 'Beware of traps (red dots) \u2014 they cost -25 HP.',
  'tutorial.step_6': 'Collect all fragments, then reach the door to face the boss.',
  'tutorial.next': '[ NEXT ]',
  'tutorial.skip': '[ SKIP ]',
  'tutorial.start': '[ START ADVENTURE ]',

  // ─── Level Names ─────────────────────────────────────────────────────────
  'level.1.name': 'Level 1',
  'level.1.subtitle': 'The Office \u2014 Git Basics',
  'level.2.name': 'Level 2',
  'level.2.subtitle': 'Server Room \u2014 Build Pipeline',
  'level.3.name': 'Level 3',
  'level.3.subtitle': 'Server Room \u2014 K8s Deployment',
  'level.4.name': 'Level 4',
  'level.4.subtitle': 'Cloud \u2014 Security',
  'level.5.name': 'Level 5',
  'level.5.subtitle': 'Cloud \u2014 Full Production',

  // ─── Boss Names ──────────────────────────────────────────────────────────
  'boss.1.name': 'Merge Conflict Monster',
  'boss.2.name': 'Broken Build Daemon',
  'boss.3.name': 'CrashLoopBackOff Beast',
  'boss.4.name': 'Zero-Day Exploit',
  'boss.5.name': 'Production Outage',

  // ─── Common ──────────────────────────────────────────────────────────────
  'common.language': 'Language',
  'common.close': 'X',
  'common.back': 'Back',
  'common.continue': 'Continue',
  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
} as const;

const es: Record<keyof typeof en, string> = {
  // ─── Login Scene ─────────────────────────────────────────────────────────
  'login.title': 'Cloud Quest: DevOps Dungeon',
  'login.subtitle': '\u00a1Derrota bugs de producci\u00f3n con c\u00f3digo!',
  'login.prompt': '> Ingresa tu nombre de usuario para comenzar',
  'login.button': '[ INGRESAR ]',
  'login.button_welcome': '[ BIENVENIDO ]',
  'login.personal_best': 'Mejor puntaje: {score}',
  'login.error_length': 'El usuario debe tener entre 3 y 20 caracteres.',
  'login.error_chars': 'Solo se permiten letras, n\u00fameros y guiones bajos.',
  'login.footer_hint': 'Enter = Ingresar | 3-20 caracteres, letras/n\u00fameros/guiones bajos',
  'login.placeholder': 'usuario_aqui',
  'login.language_toggle': 'ES',

  // ─── Main Menu ───────────────────────────────────────────────────────────
  'menu.title': 'Cloud Quest: DevOps Dungeon',
  'menu.welcome': '\u00a1Bienvenido, {username}!  |  Mejor: {best}',
  'menu.select_difficulty': 'SELECCIONA DIFICULTAD',
  'menu.difficulty.beginner': 'PRINCIPIANTE',
  'menu.difficulty.normal': 'NORMAL',
  'menu.difficulty.hard': 'DIF\u00cdCIL',
  'menu.difficulty.beginner_desc': 'Auto-guardado, todas las pistas, gu\u00edas',
  'menu.difficulty.normal_desc': 'Guardado manual al 30%/60%, pistas tras fallo',
  'menu.difficulty.hard_desc': 'Sin guardado, sin pistas, sin piedad',
  'menu.new_run': '[ NUEVA PARTIDA ]',
  'menu.continue': '[ CONTINUAR ]',
  'menu.leaderboard': '[ RANKING ]',
  'menu.footer_hint': '1=Principiante  2=Normal  3=Dif\u00edcil  |  Enter=Iniciar  |  L=Ranking',

  // ─── HUD ─────────────────────────────────────────────────────────────────
  'hud.hp': 'HP',
  'hud.score': 'PUNTOS',
  'hud.fragments': 'FRAGMENTOS',
  'hud.status': 'ESTADO',
  'hud.controls': 'CONTROLES',
  'hud.status_default': 'Explora el mapa.\nEncuentra fragmentos.',
  'hud.status_remaining': 'Encuentra {count}\nfragmentos m\u00e1s\npara abrir la puerta.',
  'hud.status_unlocked': '\u00bb PUERTA ABIERTA\n  \u00a1Encuentra la salida!',
  'hud.saved': 'GUARDADO \u2713',
  'hud.controls_list': 'WASD  Mover\nE     Interactuar\nESC   Men\u00fa\nM     Silencio',

  // ─── Puzzle ──────────────────────────────────────────────────────────────
  'puzzle.category_badge': '[ PUZZLE {category} ]',
  'puzzle.answer_placeholder': 'Escribe tu respuesta...',
  'puzzle.submit': '[ ENVIAR ]',
  'puzzle.correct': '\u00a1CORRECTO!',
  'puzzle.wrong': '\u00a1INCORRECTO!',
  'puzzle.timeout': '\u00a1TIEMPO AGOTADO!',
  'puzzle.close': 'X',
  'puzzle.hint_prefix': '\u2139 {hint}',
  'puzzle.reinforcement_prefix': '\u2705 {hint}',
  'puzzle.none_above': 'Ninguna de las anteriores',

  // ─── Boss Fight ──────────────────────────────────────────────────────────
  'boss.place_in_order': 'Coloca los fragmentos en el orden correcto:',
  'boss.click_hint': 'Haz clic en los fragmentos en orden | ESC para rendirte',
  'boss.critical': '\u00a1CR\u00cdTICO!',
  'boss.attack': '\u00a1Ataque del jefe!',
  'boss.defeated': '\u00a1JEFE DERROTADO!',
  'boss.player_defeated': 'DERROTADO',
  'boss.heart_lost': '-1 \u2665',
  'boss.forfeit_hint': 'Haz clic en los fragmentos en orden | ESC para rendirte',

  // ─── Exploration ─────────────────────────────────────────────────────────
  'explore.need_more': 'Faltan {count}',
  'explore.trap': '\u26A1 \u00a1TRAMPA! -25 HP',
  'explore.door_unlocked': '\u00a1Puerta desbloqueada!',

  // ─── Game Over ───────────────────────────────────────────────────────────
  'gameover.title': 'FIN DEL JUEGO',
  'gameover.final_score': 'Puntaje final: {score}',
  'gameover.level_reached': 'Nivel alcanzado: {level}',
  'gameover.bugs_defeated': 'Bugs derrotados: {count}',
  'gameover.puzzles_solved': 'Puzzles resueltos: {count}',
  'gameover.new_run': '[ NUEVA PARTIDA ]',
  'gameover.try_again': '[ INTENTAR DE NUEVO ]',
  'gameover.view_leaderboard': '[ VER RANKING ]',

  // ─── Victory ─────────────────────────────────────────────────────────────
  'victory.title': '\u00a1DUNGEON COMPLETADO!',
  'victory.message': '\u00a1Venciste todos los bugs de producci\u00f3n!',
  'victory.final_score': 'Puntaje final: {score}',
  'victory.bugs_defeated': 'Bugs derrotados: {count}',
  'victory.puzzles_solved': 'Puzzles resueltos: {count}',
  'victory.new_run': '[ NUEVA PARTIDA ]',
  'victory.view_leaderboard': '[ VER RANKING ]',

  // ─── Leaderboard ─────────────────────────────────────────────────────────
  'leaderboard.title': 'RANKING',
  'leaderboard.loading': 'Cargando...',
  'leaderboard.empty_title': '\u00a1A\u00fan no hay puntajes!',
  'leaderboard.empty_message': 'Juega una partida para ser el primero en el ranking.',
  'leaderboard.error': 'No se pudo cargar el ranking',
  'leaderboard.retry': '[ REINTENTAR ]',
  'leaderboard.back': '[ VOLVER ]',
  'leaderboard.col_rank': '#',
  'leaderboard.col_username': 'Usuario',
  'leaderboard.col_score': 'Puntaje',
  'leaderboard.col_date': 'Fecha',

  // ─── Tutorial ────────────────────────────────────────────────────────────
  'tutorial.title': 'TUTORIAL',
  'tutorial.step_1': 'Bienvenido a Cloud Quest, un RPG de DevOps.',
  'tutorial.step_2': 'Mueve a tu h\u00e9roe con WASD o las flechas.',
  'tutorial.step_3': 'Acerc\u00e1te a una terminal brillante y presiona E para interactuar.',
  'tutorial.step_4': 'Resuelve puzzles para recolectar fragmentos.\nCada fragmento te acerca al jefe.',
  'tutorial.step_5': 'Cuidado con las trampas (puntos rojos) \u2014 cuestan -25 HP.',
  'tutorial.step_6': 'Recolecta todos los fragmentos y luego llega a la puerta para enfrentar al jefe.',
  'tutorial.next': '[ SIGUIENTE ]',
  'tutorial.skip': '[ SALTAR ]',
  'tutorial.start': '[ COMENZAR AVENTURA ]',

  // ─── Level Names ─────────────────────────────────────────────────────────
  'level.1.name': 'Nivel 1',
  'level.1.subtitle': 'La Oficina \u2014 Fundamentos de Git',
  'level.2.name': 'Nivel 2',
  'level.2.subtitle': 'Sala de Servidores \u2014 Pipeline de Build',
  'level.3.name': 'Nivel 3',
  'level.3.subtitle': 'Sala de Servidores \u2014 Despliegue K8s',
  'level.4.name': 'Nivel 4',
  'level.4.subtitle': 'La Nube \u2014 Seguridad',
  'level.5.name': 'Nivel 5',
  'level.5.subtitle': 'La Nube \u2014 Producci\u00f3n Total',

  // ─── Boss Names ──────────────────────────────────────────────────────────
  'boss.1.name': 'Monstruo del Merge Conflict',
  'boss.2.name': 'Demonio del Build Roto',
  'boss.3.name': 'Bestia CrashLoopBackOff',
  'boss.4.name': 'Exploit de D\u00eda Cero',
  'boss.5.name': 'Ca\u00edda de Producci\u00f3n',

  // ─── Common ──────────────────────────────────────────────────────────────
  'common.language': 'Idioma',
  'common.close': 'X',
  'common.back': 'Volver',
  'common.continue': 'Continuar',
  'common.confirm': 'Confirmar',
  'common.cancel': 'Cancelar',
};

export const TRANSLATIONS = { en, es } as const;

export type TranslationKey = keyof typeof en;
