# Requirements Document — Dungeon Visual Overhaul

## Introduction

Esta feature reconstruye la capa visual y espacial de la exploración de **Cloud Quest: DevOps Dungeon** para que el calabozo se lea como un datacenter pixel-art temático, y no como una grilla gris de tiles repetidos. El spec complementa (no reemplaza) al spec activo `cloud-quest-v2-rpg`: reutiliza sus sistemas (i18n, StorySystem, DifficultySystem, FragmentSystem, EventBus) y reescribe únicamente generación de mapa, tematización, colisiones, HUD, minimapa, cámara e iluminación.

El estado actual de `ExplorationScene` presenta cinco problemas verificados en código:

1. **Contraste nulo.** `ProceduralMap` pinta el mismo índice de tile (`WALL_MID`, `WALL_BOT`) en bordes y anillos, y `ExplorationScene` aplica `collisionLayer.setAlpha(0.5)` sobre la capa de colisión, lo que mezcla muro, piso y vacío en una sola mancha gris.
2. **Ausencia de props.** La decoración se dibuja como rectángulos de 2–6 px con `Phaser.GameObjects.Graphics` (`generateDecoration`), no como mobiliario reconocible.
3. **Colisiones inconsistentes.** `ProceduralMap` escribe el índice del tile decorativo `PILLAR` en la capa `collision`, mientras `ExplorationScene.extractCollisionData` y `isTileWalkable` asumen que "0 = caminable"; además el spawn está fijo en el tile (3,3) sin validar que sea caminable ni que existan rutas hasta terminales y puerta.
4. **Layout único.** El mismo generador de 20×15 se usa para las tres dificultades: no hay sala única compacta para `beginner` ni planta multi-sala para `normal` / `hard`.
5. **HUD lateral plano.** `HUDScene` ocupa un panel de 180 px de texto (`PANEL_X = 960 - 180`) y la cámara de juego queda recortada a 780 px, en lugar de un HUD superpuesto estilo terminal.

El objetivo es acercar el resultado a las referencias visuales aportadas usando exclusivamente ingeniería sobre los activos existentes (`public/assets/tilesets/puny-dungeon.png`, CC0, y `src/lib/SpriteGenerator.ts`), sin depender de arte nuevo encargado.

### Fuera de alcance

- Rediseño de `LoginScene` (su estética terminal actual se conserva y se toma como referencia de coherencia).
- Cambios en mecánicas de puzzle, fórmulas de score, daño o HP definidas en `.kiro/steering/tech.md`.
- Cambios en las escenas de jefe (`BossFightScene`, `BossActionMenuScene`, `BossRushScene`) más allá de recibir el tema visual activo.
- Encargo o compra de assets de arte nuevos.

---

## Glosario

- **Juego**: la aplicación Phaser completa, resolución lógica 960×540 con `ScaleManager` en modo FIT.
- **Viewport**: región visible de 960 píxeles de ancho por 540 píxeles de alto, con origen de coordenadas `(0, 0)` en su esquina superior izquierda.
- **ExplorationScene**: escena de exploración jugable (`src/scenes/ExplorationScene.ts`).
- **HUDScene**: escena paralela de interfaz (`src/scenes/HUDScene.ts`).
- **ThemeSystem**: sistema puro nuevo que resuelve el tema visual (paleta, índices de tile, parámetros de iluminación) a partir del modo de dificultad y del número de nivel.
- **Tema**: conjunto cerrado de valores visuales identificado por `beginner` (verde/ámbar), `normal` (teal/verde) o `hard` (rojo/naranja).
- **LayoutSystem**: sistema puro nuevo que produce un Descriptor_De_Planta a partir de dificultad, número de nivel y semilla.
- **Descriptor_De_Planta**: estructura de datos independiente de Phaser que describe salas, corredores, tiles, spawn, terminales, puertas y posición del jefe.
- **Sala**: región rectangular de tiles caminables con un rol asignado (`start`, `terminal`, `boss`, `rest`).
- **Corredor**: secuencia de tiles caminables de ancho 1 o 2 que conecta dos Salas.
- **Tile_Caminable**: tile que el Héroe puede ocupar. Se representa con valor `0` en el arreglo de colisión.
- **Tile_Bloqueante**: tile que el Héroe no puede ocupar. Se representa con cualquier valor distinto de `0` en el arreglo de colisión.
- **Objetivo**: tile que contiene un interactuable requerido para progresar (terminal con fragmento, puerta de salida o acceso al jefe).
- **Objetivo de tipo terminal**: Objetivo que contiene una terminal con fragmento de pipeline y que se activa al resolver su puzzle.
- **Tile_De_Puerta**: tile del Objetivo de tipo puerta, es decir la puerta de salida que da acceso al jefe del nivel.
- **Tile_De_Spawn**: tile caminable en el que la ExplorationScene coloca al Héroe al iniciar un nivel.
- **PropPlacer**: sistema puro nuevo que asigna Props a tiles del Descriptor_De_Planta de forma determinista.
- **Prop**: elemento decorativo de datacenter (rack, monitor CRT, torre de servidor, panel eléctrico, haz de cables, contenedor de energía, candado) representado como sprite o tile, con marca de bloqueante o no bloqueante.
- **Prop bloqueante**: Prop cuya presencia escribe su valor de tile, distinto de `0`, en el arreglo de colisión del tile que ocupa.
- **Prop no bloqueante**: Prop que conserva el valor `0` en el arreglo de colisión del tile que ocupa.
- **Contenedor corrupto**: variante del Prop contenedor de energía usada por el Tema `hard`.
- **CircuitPathSystem**: sistema puro nuevo que calcula los trazos de circuito luminosos del piso.
- **Circuit_Path**: secuencia ordenada de tiles caminables que conecta la Sala de inicio con cada Objetivo y que se dibuja como traza luminosa sobre el piso.
- **MapValidator**: sistema puro nuevo que verifica el contrato de colisión y la alcanzabilidad del Descriptor_De_Planta.
- **TilemapSerializer**: módulo puro nuevo que convierte un Descriptor_De_Planta en JSON con formato Tiled.
- **TilemapParser**: módulo puro nuevo que convierte un JSON con formato Tiled en un Descriptor_De_Planta.
- **LightingSystem**: sistema nuevo que calcula viñeta, tinte ambiental y halos de iluminación por Objetivo según el Tema.
- **MinimapRenderer**: componente de `ExplorationScene` que dibuja la topología descubierta, la posición del Héroe y el Objetivo activo.
- **MinimapProjection**: módulo puro nuevo que convierte coordenadas de tile del Descriptor_De_Planta en coordenadas de dibujo del minimapa.
- **DialogBox**: componente de interfaz nuevo que muestra texto narrativo estilo consola en la zona inferior central de la pantalla.
- **CameraController**: componente de `ExplorationScene` que fija zoom, límites y seguimiento de la cámara principal.
- **CameraFraming**: módulo puro nuevo que calcula el zoom y los límites de cámara a partir de la dificultad y de las dimensiones del mapa.
- **SpriteGenerator**: módulo existente (`src/lib/SpriteGenerator.ts`) que produce texturas en tiempo de ejecución sin requerir archivos de imagen.
- **StorySystem**: sistema existente (`src/systems/StorySystem.ts`) que provee los textos narrativos por nivel y localización.
- **EventBus**: emisor de eventos compartido entre escenas (`src/lib/EventBus.ts`).
- **Localización activa**: idioma vigente del Juego, `en` o `es`, resuelto por `src/lib/i18n.ts`.
- **Ratio_De_Contraste**: cociente de luminancia relativa entre dos colores, calculado según la fórmula WCAG 2.1 `(L1 + 0.05) / (L2 + 0.05)`, donde `L1` es la mayor de las dos luminancias relativas.
- **Distancia_De_Chebyshev**: entre dos tiles `(f1, c1)` y `(f2, c2)`, el valor `max(|f1 − f2|, |c1 − c2|)`.
- **Distancia_De_Manhattan**: entre dos tiles `(f1, c1)` y `(f2, c2)`, el valor `|f1 − f2| + |c1 − c2|`.
- **Héroe**: entidad controlada por el jugador (`src/entities/Hero.ts`).
- **Semilla**: entero que determina toda decisión pseudoaleatoria de una generación de mapa.

---

## Requirements

### Requirement 1: Paleta y contraste legible por tema

**User Story:** Como jugador, quiero distinguir de un vistazo el piso caminable, los muros y el vacío, para poder orientarme sin adivinar dónde puedo caminar.

#### Acceptance Criteria

1. THE ThemeSystem SHALL exponer exactamente tres Temas, identificados por las cadenas en minúsculas `beginner`, `normal` y `hard`, y ningún otro identificador de Tema.
2. WHEN el ThemeSystem recibe uno de los tres identificadores de dificultad válidos, THE ThemeSystem SHALL retornar un Tema que contenga exactamente ocho colores definidos y no nulos: piso, muro, vacío, acento primario, acento secundario, peligro, texto de interfaz y fondo de interfaz.
3. FOR ALL Temas, THE ThemeSystem SHALL garantizar que el Ratio_De_Contraste entre el color de piso y el color de muro, calculado con la mayor de las dos luminancias relativas en el numerador y sin redondeo previo, sea mayor o igual a 3.0.
4. FOR ALL Temas, THE ThemeSystem SHALL garantizar que el Ratio_De_Contraste entre el color de piso y el color de vacío, calculado con la mayor de las dos luminancias relativas en el numerador y sin redondeo previo, sea mayor o igual a 4.5.
5. FOR ALL Temas, THE ThemeSystem SHALL garantizar que el Ratio_De_Contraste entre el color de texto de interfaz y el color de fondo de interfaz, calculado con la mayor de las dos luminancias relativas en el numerador y sin redondeo previo, sea mayor o igual a 4.5.
6. THE ThemeSystem SHALL asignar acentos con saturación mayor o igual a 40 % y matiz dentro de los siguientes rangos: Tema `beginner` acento primario verde (matiz 90°–150°) y acento secundario ámbar (matiz 35°–55°); Tema `normal` acento primario teal (matiz 160°–200°) y acento secundario verde (matiz 90°–150°); Tema `hard` acento primario rojo (matiz 345°–360° o 0°–15°) y acento secundario naranja (matiz 16°–40°).
7. WHEN la ExplorationScene construye la capa de colisión del mapa, THE ExplorationScene SHALL renderizarla con opacidad 1.0 y con los índices de tile de piso, muro y vacío provistos por el Tema activo.
8. IF el ThemeSystem recibe un identificador que no coincide carácter a carácter con `beginner`, `normal` o `hard` —incluyendo cadena vacía, valor nulo, valor indefinido o variaciones de mayúsculas y minúsculas—, THEN THE ThemeSystem SHALL retornar el Tema `normal` completo sin lanzar excepción y exponer al llamador una indicación de que se aplicó el Tema por defecto.
9. WHEN el ThemeSystem recibe dos veces la misma combinación de identificador de dificultad y número de nivel, THE ThemeSystem SHALL retornar Temas con valores idénticos campo por campo.
10. IF el ThemeSystem recibe un número de nivel fuera del rango 1 a 5, THEN THE ThemeSystem SHALL resolver el Tema usando el límite del rango más cercano (1 o 5) y retornar un Tema válido sin lanzar excepción.
11. FOR ALL pares de Temas distintos, THE ThemeSystem SHALL garantizar que el color de piso, el acento primario y el acento secundario difieran entre ambos Temas.

**Trazabilidad:** nuevo `src/systems/ThemeSystem.ts`; extiende `src/lib/Colors.ts`; reemplaza `getScenarioPalette` y `setAlpha(0.5)` en `ExplorationScene`.

---

### Requirement 2: Planta del calabozo diferenciada por dificultad

**User Story:** Como jugador, quiero que cada dificultad tenga una estructura espacial propia, para que la progresión de aprendizaje se refleje en el tamaño y la complejidad del mapa.

#### Acceptance Criteria

1. WHEN el LayoutSystem recibe la dificultad `beginner`, THE LayoutSystem SHALL producir un Descriptor_De_Planta con exactamente una Sala, cero Corredores y el rol `start` asignado a esa única Sala.
2. WHEN el LayoutSystem recibe la dificultad `beginner`, THE LayoutSystem SHALL producir una Sala cuyo ancho esté entre 10 y 14 tiles y cuya altura esté entre 8 y 11 tiles, contenida en un mapa cuyo ancho total esté entre 12 y 16 tiles y cuya altura total esté entre 10 y 13 tiles.
3. WHEN el LayoutSystem recibe la dificultad `normal`, THE LayoutSystem SHALL producir un Descriptor_De_Planta con entre 4 y 6 Salas, cada una con ancho entre 5 y 10 tiles y altura entre 4 y 8 tiles, contenidas en un mapa cuyo ancho total esté entre 20 y 40 tiles y cuya altura total esté entre 20 y 40 tiles, y con Corredores tales que cada Sala sea alcanzable desde la Sala `start` recorriendo Tiles_Caminables adyacentes en las cuatro direcciones cardinales.
4. WHEN el LayoutSystem recibe la dificultad `hard`, THE LayoutSystem SHALL producir un Descriptor_De_Planta con la misma cantidad de Salas, las mismas dimensiones de Salas, los mismos Corredores y las mismas dimensiones totales de mapa que produce para la dificultad `normal` con la misma Semilla y el mismo número de nivel, difiriendo únicamente en el Tema activo y en la cantidad de Objetivos de tipo terminal.
5. FOR ALL Descriptores_De_Planta con más de una Sala, THE LayoutSystem SHALL asignar el rol `start` a exactamente una Sala, el rol `boss` a exactamente una Sala distinta de la Sala `start`, y exactamente un rol a cada Sala.
6. WHEN el LayoutSystem recibe la dificultad `beginner`, THE LayoutSystem SHALL ubicar 2 Objetivos de tipo terminal en Tiles_Caminables distintos entre sí, distintos del tile de spawn y distintos del tile de la puerta.
7. WHEN el LayoutSystem recibe la dificultad `normal`, THE LayoutSystem SHALL ubicar 3 Objetivos de tipo terminal en Tiles_Caminables distintos entre sí, ninguno dentro de la Sala con rol `boss`, ninguno en el tile de spawn y ninguno en el tile de la puerta.
8. WHEN el LayoutSystem recibe la dificultad `hard`, THE LayoutSystem SHALL ubicar 5 Objetivos de tipo terminal en Tiles_Caminables distintos entre sí, ninguno dentro de la Sala con rol `boss`, ninguno en el tile de spawn y ninguno en el tile de la puerta.
9. WHEN el LayoutSystem recibe dos veces la misma tripleta de dificultad, número de nivel entero entre 1 y 5 y Semilla entera entre 0 y 2147483647, THE LayoutSystem SHALL producir Descriptores_De_Planta iguales campo por campo en dimensiones de mapa, arreglo de tiles, arreglo de colisión, Salas con sus roles, Corredores, tile de spawn y lista ordenada de Objetivos.
10. FOR ALL Descriptores_De_Planta, THE LayoutSystem SHALL producir Salas que no compartan ningún tile entre sí y que estén separadas entre sí por al menos 1 tile.
11. FOR ALL Descriptores_De_Planta, THE LayoutSystem SHALL rodear cada Sala y cada Corredor con Tiles_Bloqueantes de al menos 1 tile de grosor en su perímetro exterior.
12. FOR ALL Descriptores_De_Planta, THE LayoutSystem SHALL ubicar exactamente 1 Objetivo de tipo puerta en un Tile_Caminable dentro de la Sala con rol `boss` cuando el Descriptor_De_Planta tiene más de una Sala, y dentro de la única Sala cuando el Descriptor_De_Planta tiene exactamente una Sala.
13. FOR ALL Descriptores_De_Planta, THE LayoutSystem SHALL ubicar el tile de spawn del Héroe en un Tile_Caminable interior de la Sala con rol `start` que no coincida con ningún tile de Objetivo.
14. IF el LayoutSystem recibe un identificador de dificultad distinto de `beginner`, `normal` y `hard`, THEN THE LayoutSystem SHALL producir el Descriptor_De_Planta correspondiente a la dificultad `normal` para el número de nivel y la Semilla recibidos.

**Trazabilidad:** nuevo `src/systems/LayoutSystem.ts`; reemplaza `generateProceduralMap` en `src/lib/ProceduralMap.ts`; consume `getDifficultyConfig` de `src/systems/DifficultySystem.ts` y `getLevelDefinition` de `src/data/levels.ts`.

---

### Requirement 3: Contrato único de colisión y alcanzabilidad garantizada

**User Story:** Como jugador, quiero que el héroe aparezca en un lugar válido y que ningún muro me deje encerrado, para no quedar bloqueado ni atravesar paredes.

#### Acceptance Criteria

1. THE MapValidator, THE LayoutSystem, THE PropPlacer y THE ExplorationScene SHALL representar en el arreglo de colisión todo Tile_Caminable con el valor entero `0` y todo Tile_Bloqueante con un valor entero distinto de `0`.
2. FOR ALL Descriptores_De_Planta recibidos, THE MapValidator SHALL comprobar que el valor del arreglo de colisión en el tile de spawn del Héroe sea `0`.
3. FOR ALL Descriptores_De_Planta recibidos, THE MapValidator SHALL comprobar que, para cada Objetivo, exista al menos una secuencia de tiles con valor de colisión `0` que inicie en el tile de spawn, termine en el tile del Objetivo y en la que cada par de tiles consecutivos sea adyacente en una de las cuatro direcciones cardinales, sin considerar adyacencias diagonales.
4. FOR ALL Descriptores_De_Planta recibidos, THE MapValidator SHALL comprobar que el valor del arreglo de colisión sea `0` en el tile de cada Objetivo de tipo terminal, en el tile de la puerta de salida y en el tile de acceso al jefe.
5. FOR ALL Descriptores_De_Planta recibidos, THE MapValidator SHALL comprobar que todo tile de la fila `0`, de la fila `alto − 1`, de la columna `0` y de la columna `ancho − 1` tenga un valor de colisión distinto de `0`.
6. IF el MapValidator detecta el incumplimiento de alguna de las comprobaciones de los criterios 2 a 5, THEN THE MapValidator SHALL retornar un resultado con indicador de validez negativo y una lista con una entrada por incumplimiento, donde cada entrada contiene el identificador de la comprobación incumplida y las coordenadas de fila y columna del tile afectado.
7. IF el MapValidator retorna un resultado con indicador de validez negativo para un Descriptor_De_Planta generado, THEN THE LayoutSystem SHALL descartar ese Descriptor_De_Planta y generar uno nuevo con la Semilla del intento anterior incrementada en 1, hasta acumular un máximo de 10 intentos de generación contando el intento inicial.
8. IF el LayoutSystem acumula 10 intentos sin obtener un Descriptor_De_Planta con indicador de validez positivo, THEN THE LayoutSystem SHALL retornar un Descriptor_De_Planta de una sola Sala rectangular de 12 tiles de ancho por 9 tiles de alto, con perímetro de Tiles_Bloqueantes, sin Props bloqueantes, con el spawn, los Objetivos de tipo terminal y la puerta de salida ubicados sobre Tiles_Caminables distintos dentro de esa Sala, y cuyo resultado de validación del MapValidator no contenga incumplimientos.
9. WHEN el PropPlacer marca un Prop como bloqueante, THE PropPlacer SHALL escribir en el arreglo de colisión del tile ocupado por ese Prop el valor entero de tile del Prop, distinto de `0`.
10. WHEN el PropPlacer marca un Prop como no bloqueante, THE PropPlacer SHALL conservar el valor `0` en el arreglo de colisión del tile ocupado por ese Prop.
11. IF el Héroe intenta moverse hacia un tile con valor de colisión distinto de `0` o hacia una coordenada fuera del rango de `0` a `ancho − 1` en columnas o de `0` a `alto − 1` en filas, THEN THE ExplorationScene SHALL conservar sin cambio las coordenadas de tile del Héroe.
12. THE ExplorationScene SHALL derivar su arreglo de colisión del mismo Descriptor_De_Planta cuyo resultado de validación del MapValidator no contiene incumplimientos, sin recalcular ni reescribir valores de colisión propios.
13. WHEN el MapValidator completa las comprobaciones de los criterios 2 a 5 sin detectar incumplimientos, THE MapValidator SHALL retornar un resultado con indicador de validez positivo y una lista de incumplimientos vacía.
14. IF el MapValidator recibe un Descriptor_De_Planta cuyo arreglo de colisión tiene una cantidad de valores distinta del producto de ancho por alto declarados, o cuyo ancho o alto queda fuera del rango de 10 a 40 tiles, o cuyo tile de spawn queda fuera de los límites declarados, THEN THE MapValidator SHALL retornar un resultado con indicador de validez negativo y una entrada de incumplimiento que identifique la causa detectada, sin lanzar una excepción.
15. WHEN el LayoutSystem produce un Descriptor_De_Planta, THE LayoutSystem SHALL ubicar el tile de spawn del Héroe sobre un Tile_Caminable perteneciente a la Sala con rol `start` o, si el Descriptor_De_Planta tiene una sola Sala, sobre un Tile_Caminable de esa Sala.

**Trazabilidad:** nuevo `src/systems/MapValidator.ts`; consume `isTileWalkable` y `hasNavigablePath` de `src/lib/TilemapHelper.ts` y `attemptMove` de `src/systems/MovementSystem.ts`; corrige la escritura de `TILES.PILLAR` en la capa `collision` y el spawn fijo `(3,3)` de `src/lib/ProceduralMap.ts`.

---

### Requirement 4: Serialización y parseo del mapa temático

**User Story:** Como desarrollador, quiero convertir el descriptor de planta a formato Tiled y recuperarlo sin pérdida, para poder cargarlo en Phaser y depurarlo con herramientas externas.

#### Acceptance Criteria

1. WHEN el TilemapSerializer recibe un Descriptor_De_Planta, THE TilemapSerializer SHALL producir un objeto JSON con formato Tiled que contenga las cuatro capas `ground`, `props`, `collision` y `objects`, con el ancho y el alto declarados iguales a las dimensiones en tiles del Descriptor_De_Planta, y con exactamente ancho × alto valores en cada una de las capas `ground`, `props` y `collision`.
2. WHEN el TilemapSerializer recibe un Descriptor_De_Planta, THE TilemapSerializer SHALL declarar el tileset `puny-dungeon` con 26 columnas, 16 píxeles de ancho de tile y 16 píxeles de alto de tile.
3. WHEN el TilemapParser recibe un JSON con formato Tiled producido por el TilemapSerializer, THE TilemapParser SHALL producir un Descriptor_De_Planta cuyas dimensiones, arreglo de tiles de piso, arreglo de Props, arreglo de colisión, tile de spawn, Objetivos y Circuit_Paths correspondan a los valores declarados en el JSON, conservando el valor `0` para cada Tile_Caminable según el contrato de colisión del Requerimiento 3.
4. FOR ALL Descriptores_De_Planta cuyo resultado de validación del MapValidator no contiene incumplimientos, y ÚNICAMENTE para esos Descriptores_De_Planta, parsear el resultado de serializar SHALL producir un Descriptor_De_Planta igual al original campo por campo en dimensiones, arreglo de tiles, arreglo de colisión, conjunto de Objetivos con su tipo y coordenadas de tile, tile de spawn, Props con su tipo, coordenadas y marca de bloqueante, y Circuit_Paths con la misma secuencia ordenada de tiles. WHERE el resultado de validación del MapValidator contiene al menos un incumplimiento, THE propiedad de ida y vuelta de este criterio SHALL quedar fuera de aplicación y el comportamiento exigible SHALL ser el declarado en los criterios 6 a 11.
5. FOR ALL Descriptores_De_Planta para los que el TilemapSerializer produce efectivamente un JSON con formato Tiled, serializar el resultado de parsear ese JSON SHALL producir un JSON idéntico al original en el conjunto de claves, en el valor de cada clave y en el orden de los valores de cada capa. IF el TilemapSerializer no produce JSON para un Descriptor_De_Planta recibido, THEN THE TilemapSerializer SHALL retornar al llamador una salida de error explícita que identifique la causa, y ese caso SHALL contarse como incumplimiento de este criterio en lugar de satisfacerlo por ausencia de salida.
6. IF el TilemapParser recibe un JSON que carece de la capa `ground`, de la capa `collision` o de la capa `objects`, THEN THE TilemapParser SHALL retornar un error que nombre cada capa faltante y SHALL abstenerse de producir un Descriptor_De_Planta.
7. IF el TilemapParser recibe un JSON cuya cantidad de valores de una capa de tiles difiere del producto de ancho por alto declarados, THEN THE TilemapParser SHALL retornar un error que nombre la capa afectada, la cantidad esperada y la cantidad recibida, y SHALL abstenerse de producir un Descriptor_De_Planta.
8. WHEN el TilemapSerializer recibe un Descriptor_De_Planta, THE TilemapSerializer SHALL declarar en la capa `objects` el tile de spawn, cada Objetivo con su tipo y sus coordenadas de tile, y cada Circuit_Path como la secuencia ordenada de coordenadas de tile que lo compone.
9. IF el TilemapParser recibe un valor que no es un objeto JSON, o un JSON que carece del ancho declarado, del alto declarado o de la declaración del tileset `puny-dungeon`, THEN THE TilemapParser SHALL producir una salida de error explícita y observable por el llamador —un resultado de error retornado o una excepción declarada en la firma del módulo, y no un indicador interno silencioso ni un registro de diagnóstico como único efecto— que identifique el dato ausente o inválido, y SHALL abstenerse de producir un Descriptor_De_Planta.
10. IF el TilemapParser recibe un JSON que contiene las capas `ground`, `collision` y `objects` pero carece de la capa `props`, THEN THE TilemapParser SHALL producir un Descriptor_De_Planta con cero Props y con el resto de sus campos derivados de las capas presentes.
11. IF el TilemapParser recibe un JSON cuya capa `objects` está presente pero carece de la declaración de los Objetivos, de la declaración del tile de spawn o de la declaración de los Circuit_Paths, THEN THE TilemapParser SHALL producir una salida de error explícita y observable por el llamador que nombre cada declaración ausente y SHALL abstenerse de producir un Descriptor_De_Planta, sin sustituir la declaración ausente por valores por defecto, por un tile de spawn de reserva ni por colecciones vacías de Objetivos o de Circuit_Paths.

**Trazabilidad:** nuevos `src/systems/TilemapSerializer.ts` y `src/systems/TilemapParser.ts`; reemplazan la construcción inline de JSON Tiled en `src/lib/ProceduralMap.ts`; `registerProceduralMap` conserva su rol de registro en la caché de Phaser.

---

### Requirement 5: Props de datacenter distribuidos de forma determinista

**User Story:** Como jugador, quiero ver racks, monitores, cables y paneles poblando el calabozo, para sentir que exploro un datacenter y no una grilla vacía.

#### Acceptance Criteria

1. THE PropPlacer SHALL soportar al menos los siete tipos de Prop siguientes: rack de servidores, monitor CRT, torre de servidor, panel eléctrico, haz de cables, contenedor de energía y candado.
2. WHEN el PropPlacer recibe un Descriptor_De_Planta y una Semilla, THE PropPlacer SHALL ubicar en cada Sala una cantidad entera `N` de Props tal que `floor(0.12 × P) ≤ N ≤ floor(0.25 × P)`, donde `P` es la cantidad de Tiles_Caminables de esa Sala adyacentes en una de las cuatro direcciones cardinales a un Tile_Bloqueante, y SHALL ubicar `N = 0` en las Salas cuyo `floor(0.25 × P)` sea igual a 0.
3. THE PropPlacer SHALL ubicar los Props de tipo rack de servidores únicamente en Tiles_Caminables adyacentes en una de las cuatro direcciones cardinales a un Tile_Bloqueante del perímetro de una Sala.
4. THE PropPlacer SHALL abstenerse de ubicar Props sobre el tile de spawn, sobre tiles de Objetivo, sobre tiles adyacentes en una de las cuatro direcciones cardinales a un tile de Objetivo, sobre tiles pertenecientes a un Circuit_Path, sobre tiles pertenecientes a un Corredor y sobre tiles que ya contienen otro Prop.
5. WHEN el PropPlacer recibe dos veces el mismo par de Descriptor_De_Planta y Semilla, THE PropPlacer SHALL producir la misma lista ordenada de Props, con idéntico tipo, idénticas coordenadas de tile e idéntica marca de bloqueante o no bloqueante en cada posición de la lista.
6. FOR ALL resultados del PropPlacer, THE MapValidator SHALL confirmar que, después de escribir los Props bloqueantes en el arreglo de colisión, sigue existiendo una ruta de Tiles_Caminables adyacentes en las cuatro direcciones cardinales desde el tile de spawn hasta cada Objetivo.
7. WHERE la dificultad activa es `hard`, THE PropPlacer SHALL sustituir cada Prop de tipo contenedor de energía por un Prop de tipo contenedor corrupto del Tema `hard`, conservando sus coordenadas de tile y su marca de bloqueante o no bloqueante.
8. THE ExplorationScene SHALL renderizar cada Prop como sprite o tile del tileset `puny-dungeon`, con una profundidad de dibujo estrictamente mayor que la de la capa de piso y la de los Circuit_Paths, y estrictamente menor que la del Héroe.
9. THE PropPlacer SHALL marcar como bloqueantes los Props de tipo rack de servidores, torre de servidor y panel eléctrico, y SHALL marcar como no bloqueantes los Props de tipo monitor CRT, haz de cables, contenedor de energía, contenedor corrupto y candado.
10. IF escribir un Prop bloqueante en el arreglo de colisión provocaría que el MapValidator reporte una violación de alcanzabilidad entre el tile de spawn y algún Objetivo, THEN THE PropPlacer SHALL descartar ese Prop, SHALL conservar el valor `0` en el arreglo de colisión de ese tile y SHALL excluir ese Prop de la lista retornada.
11. THE PropPlacer SHALL ubicar como máximo un Prop por tile y como máximo 40 Props por Descriptor_De_Planta.

**Trazabilidad:** nuevo `src/systems/PropPlacer.ts`; nuevos generadores en `src/lib/SpriteGenerator.ts`; reemplaza `generateDecoration` y `getScenarioPalette` de `ExplorationScene`.

---

### Requirement 6: Trazas de circuito que guían el recorrido

**User Story:** Como jugador, quiero una guía luminosa en el piso que me indique hacia dónde ir, para no perderme buscando terminales y puertas.

#### Acceptance Criteria

1. WHEN el CircuitPathSystem recibe un Descriptor_De_Planta validado por el MapValidator, THE CircuitPathSystem SHALL producir exactamente un Circuit_Path por cada Objetivo del Descriptor_De_Planta, cuyo primer tile sea el tile de spawn y cuyo último tile sea el tile de ese Objetivo.
2. FOR ALL Circuit_Paths producidos, THE CircuitPathSystem SHALL garantizar que cada tile del Circuit_Path sea un Tile_Caminable del Descriptor_De_Planta recibido y esté contenido dentro de los límites del mapa.
3. FOR ALL Circuit_Paths producidos, THE CircuitPathSystem SHALL garantizar que cada par de tiles consecutivos sea adyacente en una de las cuatro direcciones cardinales y que ningún tile aparezca más de una vez en el mismo Circuit_Path.
4. FOR ALL Circuit_Paths producidos, THE CircuitPathSystem SHALL garantizar que la longitud del Circuit_Path, medida como cantidad de tiles que lo componen, sea menor o igual a `floor(1.5 × L)`, donde `L` es la cantidad de tiles de la ruta más corta de Tiles_Caminables adyacentes en las cuatro direcciones cardinales entre sus dos extremos.
5. WHEN el CircuitPathSystem recibe dos veces el mismo Descriptor_De_Planta, THE CircuitPathSystem SHALL producir la misma cantidad de Circuit_Paths, la misma secuencia de tiles en cada Circuit_Path y el mismo orden de la colección de Circuit_Paths, sin depender de estado previo ni de fuentes de aleatoriedad no derivadas del Descriptor_De_Planta.
6. IF el CircuitPathSystem no encuentra ninguna ruta de Tiles_Caminables adyacentes en las cuatro direcciones cardinales entre el tile de spawn y un Objetivo, THEN THE CircuitPathSystem SHALL omitir el Circuit_Path de ese Objetivo, SHALL conservar los Circuit_Paths de los Objetivos restantes y SHALL retornar una violación que identifique las coordenadas del Objetivo inalcanzable.
7. IF el tile de un Objetivo coincide con el tile de spawn, THEN THE CircuitPathSystem SHALL producir para ese Objetivo un Circuit_Path de exactamente un tile.
8. THE ExplorationScene SHALL dibujar cada Circuit_Path con el color de acento primario del Tema activo, con un ancho de trazo entre 2 y 4 píxeles y con una profundidad de dibujo mayor que la de la capa de piso y menor que la de los Props y la del Héroe.
9. THE ExplorationScene SHALL animar cada Circuit_Path con un pulso de período entre 1.0 y 2.0 segundos que oscile su opacidad entre el 60 % y el 100 % de la opacidad base definida en el criterio 11.
10. WHEN un Objetivo se activa, THE ExplorationScene SHALL redibujar dentro de 500 milisegundos el Circuit_Path que conduce a ese Objetivo con el color de acento secundario del Tema activo.
11. WHERE la dificultad activa es `hard`, THE ExplorationScene SHALL dibujar los Circuit_Paths con opacidad base 0.35 en lugar de la opacidad base 0.75 usada en las dificultades `beginner` y `normal`.
12. IF un tile pertenece a más de un Circuit_Path y al menos uno de esos Circuit_Paths conduce a un Objetivo no activado, THEN THE ExplorationScene SHALL dibujar ese tile con el color de acento primario del Tema activo.

**Trazabilidad:** nuevo `src/systems/CircuitPathSystem.ts`; consume `hasNavigablePath` de `src/lib/TilemapHelper.ts`; se dibuja en `ExplorationScene` con `Phaser.GameObjects.Graphics`.

---

### Requirement 7: Iluminación y halos por tema

**User Story:** Como jugador, quiero que los objetos interactuables brillen y que el ambiente tenga atmósfera, para identificar rápidamente con qué puedo interactuar.

#### Acceptance Criteria

1. WHEN el LightingSystem recibe un identificador de Tema reconocido y una dificultad reconocida, THE LightingSystem SHALL retornar un color de tinte ambiental tomado del Tema recibido, una opacidad de tinte en el rango cerrado de 0.03 a 0.12 y una intensidad de viñeta en el rango cerrado de 0.10 a 0.35.
2. WHILE la ExplorationScene tiene al menos un Objetivo no activado, THE ExplorationScene SHALL dibujar sobre cada Objetivo no activado un halo con el color de acento primario del Tema activo, con radio entre 12 y 24 píxeles, opacidad máxima en el rango cerrado de 0.40 a 0.80 y animación de pulso de período entre 1.0 y 2.0 segundos.
3. WHEN un Objetivo se activa, THE ExplorationScene SHALL retirar el halo de ese Objetivo dentro de 500 milisegundos.
4. THE ExplorationScene SHALL dibujar una viñeta que cubra los 960×540 píxeles del viewport, con opacidad igual a la intensidad de viñeta retornada por el LightingSystem, y cuya posición en pantalla permanezca invariable ante cualquier desplazamiento o cambio de zoom de la cámara principal.
5. WHERE la dificultad activa es `hard`, THE LightingSystem SHALL retornar una intensidad de viñeta en el rango cerrado de 0.25 a 0.35.
6. FOR ALL identificadores de Tema reconocidos y FOR ALL dificultades reconocidas, THE LightingSystem SHALL retornar la opacidad de tinte y la intensidad de viñeta dentro de los rangos cerrados declarados en los criterios 1, 5 y 7, y SHALL retornar los mismos valores ante invocaciones repetidas con los mismos argumentos.
7. WHERE la dificultad activa es `beginner` o `normal`, THE LightingSystem SHALL retornar una intensidad de viñeta en el rango cerrado de 0.10 a 0.20.
8. IF el LightingSystem recibe un identificador de Tema no reconocido o una dificultad no reconocida, THEN THE LightingSystem SHALL retornar los parámetros de iluminación correspondientes al Tema `normal` combinado con la dificultad `normal` para ambos parámetros —color y opacidad de tinte ambiental, e intensidad de viñeta—, aun cuando uno de los dos argumentos recibidos sí sea reconocido, descartando el argumento reconocido en lugar de preservarlo, y sin propagar error.
9. WHEN la ExplorationScene crea la iluminación de un nivel, THE ExplorationScene SHALL aplicar el tinte ambiental con el color y la opacidad retornados por el LightingSystem sobre las capas de piso, muro y Props del mapa activo, y SHALL excluir de ese tinte los elementos de HUDScene, del DialogBox y del minimapa.
10. WHEN la ExplorationScene recibe del LightingSystem una intensidad de viñeta o una opacidad de tinte fuera de los rangos cerrados declarados en los criterios 1, 5 y 7, THE ExplorationScene SHALL acotar el valor al límite más cercano del rango válido antes de aplicarlo.

**Trazabilidad:** nuevo `src/systems/LightingSystem.ts`; reemplaza `createLighting` de `ExplorationScene`; consume el Tema del Requerimiento 1.

---

### Requirement 8: HUD superpuesto estilo terminal

**User Story:** Como jugador, quiero un HUD superpuesto y compacto en las esquinas, para ver el estado de la partida sin perder área de juego.

#### Acceptance Criteria

1. THE HUDScene SHALL renderizar todos sus elementos superpuestos sobre el área completa de 960×540 píxeles, con factor de desplazamiento 0 respecto a la cámara principal y con una profundidad de dibujo mayor que la de todos los elementos renderizados por la ExplorationScene.
2. THE HUDScene SHALL contener la barra de HP segmentada y el contador de Objetivos resueltos dentro del rectángulo del viewport comprendido entre las coordenadas (8, 8) y (300, 76), conservando un margen mínimo de 8 píxeles respecto a los bordes superior e izquierdo del viewport.
3. THE HUDScene SHALL contener el marcador de score dentro del rectángulo del viewport comprendido entre las coordenadas (660, 8) y (952, 60), conservando un margen mínimo de 8 píxeles respecto a los bordes superior y derecho del viewport.
4. THE HUDScene SHALL contener los indicadores de controles disponibles dentro del rectángulo del viewport comprendido entre las coordenadas (660, 468) y (952, 532), conservando un margen mínimo de 8 píxeles respecto a los bordes inferior y derecho del viewport.
5. WHEN el HUDScene recibe un evento de actualización de HP, THE HUDScene SHALL renderizar dentro de 100 milisegundos la barra de HP con una cantidad de segmentos llenos igual a `clamp(ceil(hp / 25), 0, 4)` sobre un total de 4 segmentos, junto con el texto del valor numérico en el formato `HP_actual/100`.
6. THE HUDScene SHALL renderizar el contador de Objetivos con el formato `X/N`, donde `N` es la cantidad total de Objetivos del nivel comprendida entre 1 y 5 y `X` es la cantidad de Objetivos activados comprendida entre 0 y `N`.
7. THE HUDScene SHALL obtener cada cadena de texto visible mediante la función `t()` de `src/lib/i18n.ts`.
8. WHEN la localización activa cambia, THE HUDScene SHALL actualizar todas sus cadenas de texto visibles a la nueva localización dentro de 500 milisegundos, preservando sin alteración los valores numéricos de HP, Objetivos y score que estaba mostrando.
9. THE HUDScene SHALL recibir los datos de HP, Objetivos, score, nivel y dificultad mediante eventos del EventBus.
10. WHERE la dificultad activa es `hard`, THE HUDScene SHALL omitir los indicadores de controles del rectángulo declarado en el criterio 4.
11. THE HUDScene SHALL aplicar al fondo de cada bloque de interfaz una opacidad en el rango cerrado de 0.45 a 0.75 y SHALL garantizar un Ratio_De_Contraste mayor o igual a 4.5 entre el color del texto y el color del fondo de ese bloque.
12. WHILE la HUDScene no ha recibido ningún evento del EventBus desde su creación, THE HUDScene SHALL renderizar los valores por defecto HP `100/100`, contador de Objetivos `0/N` y score `0`, sin dejar en blanco ninguno de los bloques declarados en los criterios 2 y 3, y SHALL mostrar esos valores por defecto ÚNICAMENTE en esa condición previa a la primera recepción de datos. WHILE la HUDScene ya recibió al menos un evento del EventBus, THE HUDScene SHALL renderizar los últimos valores de HP, contador de Objetivos y score recibidos, conservándolos ante la ausencia de eventos posteriores en lugar de volver a los valores por defecto.
13. WHERE la dificultad activa es `normal` o `hard`, THE HUDScene SHALL renderizar una banda superior centrada horizontalmente en el viewport que muestre el nombre de la dificultad activa, el contador de Objetivos y el score.
14. THE HUDScene SHALL abstenerse de dibujar elementos dentro de la región del viewport comprendida entre las coordenadas (240, 135) y (720, 405).
15. WHILE el HP del Héroe es igual a 0, THE HUDScene SHALL permanecer visible y SHALL renderizar la barra de HP con 0 segmentos llenos sobre un total de 4 segmentos y con el texto `0/100`.

**Trazabilidad:** reescribe `src/scenes/HUDScene.ts` eliminando `PANEL_WIDTH = 180` y `PANEL_X`; consume los eventos `hud:*` que ya emite `ExplorationScene.updateHUD`; requiere ampliar `src/data/translations.ts`.

---

### Requirement 9: Minimapa con topología y objetivo

**User Story:** Como jugador, quiero un minimapa en la esquina inferior izquierda, para entender la topología del piso y saber hacia dónde queda mi próximo objetivo.

#### Acceptance Criteria

1. THE MinimapRenderer SHALL dibujar el minimapa en la esquina inferior izquierda del viewport de 960×540, con un margen de 8 píxeles respecto al borde izquierdo y de 8 píxeles respecto al borde inferior, y con un ancho máximo de 120 píxeles y un alto máximo de 120 píxeles.
2. THE MinimapRenderer SHALL fijar el minimapa al viewport de forma que no se desplace con el movimiento de la cámara.
3. THE MinimapRenderer SHALL dibujar únicamente los tiles marcados como descubiertos.
4. WHEN el Héroe ocupa un tile, THE MinimapRenderer SHALL marcar como descubiertos, dentro de 100 milisegundos, todos los tiles cuya Distancia_De_Chebyshev al tile del Héroe sea menor o igual a 3, y SHALL conservar el estado de descubierto de cada tile hasta que finalice el nivel activo.
5. THE MinimapRenderer SHALL dibujar los Tiles_Caminables descubiertos y los Tiles_Bloqueantes descubiertos con colores distintos, con un Ratio_De_Contraste mayor o igual a 3.0 entre ambos.
6. THE MinimapRenderer SHALL dibujar la posición del Héroe con el color de acento primario del Tema activo.
7. THE MinimapRenderer SHALL dibujar con el color de acento secundario del Tema activo el Objetivo no activado de menor Distancia_De_Manhattan al tile del Héroe, resolviendo los empates por el Objetivo de menor índice de fila y, ante igual fila, por el de menor índice de columna.
8. IF un Objetivo se encuentra en un tile no descubierto, THEN THE MinimapRenderer SHALL omitir ese Objetivo del dibujo.
9. FOR ALL tamaños de Descriptor_De_Planta entre 10 y 40 tiles por lado, THE MinimapProjection SHALL calcular la escala de proyección como `max(1, floor(120 / max(ancho, alto)))` píxeles por tile y SHALL producir coordenadas de dibujo contenidas dentro de los límites del minimapa declarados en el criterio 1.
10. WHERE la dificultad activa es `beginner`, THE MinimapRenderer SHALL marcar como descubiertos todos los tiles del Descriptor_De_Planta al iniciar el nivel.
11. IF ningún Objetivo está descubierto, THEN THE MinimapRenderer SHALL omitir el marcador de Objetivo y SHALL conservar el dibujo de los tiles descubiertos y de la posición del Héroe.
12. IF las dimensiones del Descriptor_De_Planta recibido quedan fuera del rango de 1 a 40 tiles por lado, THEN THE MinimapProjection SHALL retornar una proyección vacía sin lanzar excepción y THE ExplorationScene SHALL conservar el resto de los elementos de la interfaz sin alteración.

**Trazabilidad:** reescribe `createMinimap` y `updateMinimap` de `ExplorationScene`, moviendo el cálculo de escala y recorte a un módulo puro nuevo `src/systems/MinimapProjection.ts`.

---

### Requirement 10: Caja de diálogo narrativa estilo consola

**User Story:** Como jugador, quiero leer la narrativa del nivel en una caja de consola en la parte inferior, para entender el contexto de lo que estoy resolviendo.

#### Acceptance Criteria

1. THE DialogBox SHALL renderizarse fijo al viewport en la zona inferior centrada horizontalmente, ocupando entre el 80 % y el 96 % del ancho del viewport y entre el 18 % y el 30 % de su altura, por encima de todos los elementos del mundo de juego, mostrando el prompt `> ` al inicio de la primera línea y un máximo de 4 líneas de 60 caracteres por página.
2. WHEN la ExplorationScene inicia un nivel, THE ExplorationScene SHALL solicitar al StorySystem el texto de introducción del nivel y mostrarlo en el DialogBox dentro de los 500 milisegundos posteriores al inicio del nivel.
3. THE DialogBox SHALL revelar el texto con escritura progresiva a una velocidad constante comprendida entre 20 y 60 caracteres por segundo, con una desviación máxima de ±10 % respecto a la velocidad configurada.
4. WHEN el jugador presiona la tecla de avance (Espacio, Enter o clic sobre el DialogBox) mientras el DialogBox revela texto progresivamente, THE DialogBox SHALL detener la escritura progresiva y mostrar el texto completo de la página actual en un plazo máximo de 100 milisegundos.
5. WHEN el jugador presiona la tecla de avance mientras el DialogBox muestra el texto completo de la última página y no hay mensajes en cola, THE DialogBox SHALL ocultarse.
6. WHILE el DialogBox está visible, THE ExplorationScene SHALL bloquear el movimiento del Héroe y la tecla de interacción, manteniendo habilitadas únicamente la tecla de pausa y la tecla de avance.
7. THE DialogBox SHALL obtener cada cadena de texto visible mediante la función `t()` de `src/lib/i18n.ts` o mediante el StorySystem en la localización activa, y SHALL mostrar la clave literal cuando la clave solicitada no exista en ninguna localización.
8. WHEN un Objetivo se activa, THE ExplorationScene SHALL mostrar en el DialogBox el mensaje de progreso correspondiente al Objetivo activado en la localización activa, y SHALL encolar el mensaje en orden de llegada con un máximo de 5 mensajes pendientes cuando el DialogBox ya esté visible, descartando los mensajes que excedan ese máximo sin interrumpir el mensaje en curso.
9. WHERE la dificultad activa es `hard`, THE ExplorationScene SHALL mostrar en el DialogBox la variante de introducción del nivel etiquetada para `hard`, de hasta 400 caracteres, y SHALL usar la variante de introducción estándar cuando la variante `hard` no exista para el nivel y la localización activos.
10. IF el StorySystem no retorna texto para el nivel y la localización activos, THEN THE DialogBox SHALL mostrar el texto de reserva del nivel obtenido mediante `t()` dentro del mismo plazo de 500 milisegundos, sin mostrar una caja vacía y sin bloquear el inicio del nivel.
11. WHILE el DialogBox muestra el texto completo de una página, THE DialogBox SHALL mostrar el indicador de continuar de forma intermitente con un período entre 0.5 y 1.5 segundos.
12. WHEN el jugador presiona la tecla de avance mientras el DialogBox muestra el texto completo de una página y existen páginas o mensajes en cola pendientes, THE DialogBox SHALL reemplazar el contenido visible por la siguiente página o mensaje pendiente e iniciar de nuevo la escritura progresiva.
13. WHEN el DialogBox se oculta, THE ExplorationScene SHALL restablecer el control de movimiento e interacción del Héroe en el mismo fotograma y SHALL consumir la pulsación que provocó el cierre para que no active ninguna interacción del mundo de juego.

**Trazabilidad:** nuevo componente en `src/entities/DialogBox.ts`; consume `getIntroStory` de `src/systems/StorySystem.ts`, `src/data/stories.ts` y `t()` de `src/lib/i18n.ts`.

---

### Requirement 11: Encuadre de cámara por dificultad

**User Story:** Como jugador, quiero que la cámara se acerque en la sala única de principiante y muestre el plano completo en los pisos grandes, para leer el espacio adecuado a cada layout.

#### Acceptance Criteria

1. WHERE la dificultad activa es `beginner`, WHEN la ExplorationScene carga el mapa del nivel, THE CameraController SHALL fijar el zoom de la cámara principal en 3.0.
2. WHERE la dificultad activa es `normal` o `hard`, WHEN la ExplorationScene carga el mapa del nivel, THE CameraController SHALL fijar el zoom de la cámara principal en `clamp(960 / (anchoMapaEnTiles × 16), 1.5, 2.5)` redondeado a 2 decimales.
3. WHEN la ExplorationScene carga el mapa del nivel, THE CameraController SHALL fijar el viewport de la cámara principal en 960 píxeles de ancho por 540 píxeles de alto con origen en `(0, 0)`.
4. WHEN la ExplorationScene carga el mapa del nivel, THE CameraController SHALL fijar los límites de la cámara principal en `anchoMapaEnTiles × 16 + 32` píxeles de ancho por `altoMapaEnTiles × 16 + 32` píxeles de alto, con origen en `(−16, −16)`, agregando un margen de relleno de 16 píxeles en cada uno de los cuatro lados por sobre las dimensiones exactas del mapa en píxeles, de modo que los mapas de menor superficie conserven límites de área positiva en ambos ejes.
5. WHILE el Héroe se mueve, THE CameraController SHALL seguir al Héroe con un factor de interpolación de suavizado de 0.10 con tolerancia de ±0.01, siendo ese factor el valor normativo exigible; la distancia menor o igual a 5 píxeles entre el Héroe y el centro del viewport tras 1 segundo sin movimiento del Héroe SHALL ser una condición esperada que puede excederse siempre que el factor de interpolación se mantenga dentro de la tolerancia declarada.
6. THE CameraFraming SHALL producir, para todo mapa de entre 12×10 y 40×40 tiles y para toda dificultad reconocida, un valor de zoom dentro del rango cerrado de 1.5 a 3.0, idéntico ante entradas idénticas y calculado sin depender del motor de render.
7. WHERE la dificultad activa es `beginner`, IF el mapa renderizado con zoom 3.0 resulta de menor tamaño que el viewport en uno de los dos ejes, THEN THE CameraController SHALL centrar el mapa en ese eje y SHALL abstenerse de desplazar la cámara en ese eje.
8. IF las dimensiones del mapa recibidas por el CameraController son inválidas o están ausentes, o la dificultad activa no es reconocida, THEN THE CameraController SHALL aplicar un zoom de reserva de 2.5, SHALL preservar el viewport de 960×540 píxeles y SHALL continuar la ejecución de la ExplorationScene.
9. WHEN la ExplorationScene cambia de piso, THE CameraController SHALL recalcular el zoom y los límites de la cámara principal antes de renderizar el primer fotograma del piso nuevo.

**Trazabilidad:** reemplaza el bloque de cámara de `ExplorationScene.create` (`setViewport(0, 0, 780, 540)` y `setZoom(2.5)`); nuevo cálculo puro en `src/systems/CameraFraming.ts`.

---

### Requirement 12: Fidelidad visual alcanzable con activos existentes

**User Story:** Como responsable del proyecto, quiero que el resultado visual se logre con los activos que ya tenemos, para no depender de arte nuevo antes de la demo.

#### Acceptance Criteria

1. THE Juego SHALL obtener el 100 % de los tiles de piso, muro, vacío y Prop del archivo `public/assets/tilesets/puny-dungeon.png` o de texturas generadas en tiempo de ejecución por `src/lib/SpriteGenerator.ts`, sin cargar ningún otro archivo de imagen.
2. FOR ALL rutas de archivo de imagen solicitadas por el Juego durante la carga de recursos, THE Juego SHALL garantizar que cada ruta corresponda a un archivo ya presente en `public/assets/`, de modo que el conjunto de rutas solicitadas sea un subconjunto del inventario existente y esta feature agregue cero archivos de imagen nuevos.
3. WHEN la ExplorationScene crea el mapa y la textura `puny-dungeon` no está registrada en la caché de texturas del Juego, THE ExplorationScene SHALL renderizar el mapa completo con texturas generadas por `src/lib/SpriteGenerator.ts` dentro del mismo ciclo de creación de la escena, sin exceder 2000 milisegundos, y SHALL conservar el mismo arreglo de colisión, spawn, Objetivos y Props del Descriptor_De_Planta validado.
4. FOR ALL Temas, THE ThemeSystem SHALL aplicar la diferenciación cromática mediante tinte de tiles y capas de color sobre un conjunto de índices de tile base idéntico para los tres Temas, y SHALL requerir cero archivos de imagen adicionales por Tema.
5. THE documento de diseño de esta feature SHALL incluir una sección de limitaciones de fidelidad visual que enumere, por cada imagen de referencia visual aportada al spec, al menos un elemento no reproducible con los activos existentes, y SHALL declarar para cada elemento enumerado la aproximación adoptada en su lugar.
6. WHEN la ExplorationScene solicita texturas de reserva, THE SpriteGenerator SHALL producir una textura de 16×16 píxeles para piso, para muro, para vacío y para cada uno de los siete tipos de Prop declarados en el Requerimiento 5.
7. FOR ALL Temas, THE Juego SHALL garantizar que las texturas de reserva del SpriteGenerator cumplan un Ratio_De_Contraste mayor o igual a 3.0 entre piso y muro y mayor o igual a 4.5 entre piso y vacío.
8. IF la carga de un archivo de imagen desde `public/assets/` falla o el archivo solicitado no existe, THEN THE Juego SHALL continuar la ejecución de la ExplorationScene con las texturas de reserva del SpriteGenerator, SHALL indicar el recurso no cargado en el diagnóstico de la sesión y SHALL abstenerse de detener la escena o de mostrar una pantalla de error.

**Trazabilidad:** `public/assets/tilesets/puny-dungeon.png` (CC0), `src/lib/SpriteGenerator.ts`, `src/systems/ThemeSystem.ts`.

---

### Requirement 13: Rendimiento, compatibilidad y no regresión

**User Story:** Como jugador, quiero que el juego siga siendo fluido y que el flujo de escenas siga funcionando, para que la mejora visual no rompa la partida.

#### Acceptance Criteria

1. THE Juego SHALL conservar la resolución lógica de 960×540 píxeles y el modo FIT del ScaleManager.
2. WHILE la ExplorationScene está activa, THE Juego SHALL mantener un promedio mayor o igual a 50 fotogramas por segundo en cada ventana móvil de 60 fotogramas consecutivos, durante una sesión continua de 30 segundos o más, medido sobre el Descriptor_De_Planta de mayor superficie en tiles producido por el LayoutSystem, en un navegador de escritorio con aceleración por hardware.
3. WHILE la ExplorationScene está activa, THE ExplorationScene SHALL mantener en 6 o menos la cantidad de objetos `Phaser.GameObjects.Graphics` persistentes existentes en cualquier instante posterior a la finalización de su método `create`.
4. THE ExplorationScene SHALL conservar las cuatro transiciones existentes: interacción con una terminal hacia `PuzzleScene`; interacción con la puerta de salida con todos los Objetivos de tipo terminal activados hacia la escena de jefe correspondiente al nivel; HP igual a 0 hacia `GameOverScene`; y pulsación de ESC confirmada hacia `MainMenuScene`.
5. WHEN se ejecuta `npx vitest --run`, THE Juego SHALL completar la suite con cero pruebas fallidas, conservando sin modificación las pruebas existentes antes de esta feature, con excepción de las pruebas que verifican las firmas reemplazadas de `ProceduralMap`.
6. THE ThemeSystem, THE LayoutSystem, THE PropPlacer, THE CircuitPathSystem, THE MapValidator, THE TilemapSerializer, THE TilemapParser, THE MinimapProjection y THE CameraFraming SHALL declarar cero importaciones del módulo `phaser`, y sus pruebas SHALL ejecutarse en el entorno jsdom sin instanciar `Phaser.Game`.
7. THE código de esta feature SHALL compilar con TypeScript en modo estricto con cero errores de compilación y SHALL declarar cero anotaciones de tipo `any`, usando `unknown` con guardas de tipo donde el tipo no se conozca de antemano.
8. FOR ALL sistemas puros introducidos por esta feature, THE suite de pruebas SHALL alcanzar una cobertura de líneas mayor o igual al 90 % en cada módulo individual, sin agregar la cobertura entre módulos.
9. THE suite de pruebas basada en propiedades SHALL ejecutar un mínimo de 100 iteraciones por propiedad y SHALL etiquetar cada propiedad con un comentario en el formato definido en `.kiro/steering/tech.md`.
10. WHEN la ExplorationScene recupera el foco al retornar de `PuzzleScene`, THE ExplorationScene SHALL conservar el mapa activo, las coordenadas de tile del Héroe y el estado de activación de cada Objetivo, sin regenerar el Descriptor_De_Planta.
11. WHEN la ExplorationScene se detiene, THE ExplorationScene SHALL liberar todos los objetos `Phaser.GameObjects.Graphics`, los tweens y los temporizadores que creó.
12. THE cadena de generación de mapa, incluidos los hasta 10 intentos de generación declarados en el Requerimiento 3, SHALL completarse en 500 milisegundos o menos.

**Trazabilidad:** `src/main.ts`, `vitest.config.ts`, `.kiro/steering/tech.md`, `.kiro/steering/structure.md`.

---

### Requirement 14: Localización de los textos nuevos

**User Story:** Como jugador hispanohablante o angloparlante, quiero que todos los textos nuevos aparezcan en mi idioma, para entender la interfaz y la narrativa sin cambiar de idioma mental.

#### Acceptance Criteria

1. THE Juego SHALL definir cada clave de texto nueva de esta feature en las localizaciones `en` y `es` de `src/data/translations.ts` con un valor de tipo string de longitud entre 1 y 240 caracteres, y con el mismo conjunto de nombres de placeholder `{param}` en ambas localizaciones.
2. THE HUDScene, THE DialogBox y THE ExplorationScene SHALL obtener cada cadena de texto visible al jugador mediante la función `t()` de `src/lib/i18n.ts`, sin literales de texto visible declarados directamente en la escena o el componente.
3. WHEN la localización activa cambia, THE Juego SHALL actualizar a la nueva localización, dentro de 500 milisegundos, todas las cadenas de texto visibles de cada escena registrada, tanto de las escenas activas como de las inactivas, sin condicionar la actualización a que la escena esté visible; y THE proceso de actualización de localización SHALL abstenerse por sí mismo de alterar el HP, el score, el nivel actual y la posición del Héroe, admitiendo que otra lógica de juego modifique esos valores durante la misma ventana de 500 milisegundos.
4. IF la función `t()` recibe una clave que no existe en la localización activa pero sí existe en la localización `en`, THEN THE Juego SHALL retornar el valor definido en `en`.
5. THE Juego SHALL mantener, para las claves de traducción nuevas de esta feature, un conjunto de claves en la localización `en` idéntico al conjunto de claves en la localización `es`, sin claves presentes en una sola localización.
6. IF la función `t()` recibe una clave que no existe en ninguna de las dos localizaciones, THEN THE Juego SHALL retornar la clave recibida como texto, sin lanzar excepción y sin interrumpir el renderizado de la escena que la solicitó.
7. IF la función `t()` recibe una plantilla con un placeholder `{param}` cuyo nombre no está presente en el objeto de parámetros recibido, THEN THE Juego SHALL retornar la cadena conservando ese placeholder en forma literal y sustituyendo los placeholders restantes que sí tienen valor.
8. WHILE la HUDScene o el DialogBox están visibles, WHEN la localización activa cambia, THE Juego SHALL actualizar sus cadenas de texto visibles a la nueva localización dentro de 500 milisegundos, sin cerrar el diálogo abierto ni reiniciar la secuencia de texto en curso.

**Trazabilidad:** `src/lib/i18n.ts`, `src/data/translations.ts`.

---

## Notas de trazabilidad con el spec `cloud-quest-v2-rpg`

| Requerimiento v2 | Relación con esta feature |
|---|---|
| R1.2 Sprites de objetos en interactuables | Se amplía con el catálogo de Props del Requerimiento 5 |
| R1.4 Iluminación ambiental | Se reemplaza por el Requerimiento 7, ahora parametrizado por Tema |
| R1.5 Minimapa | Se reemplaza por el Requerimiento 9, con proyección pura y testeable |
| R3.4 Integración de narrativa en interfaz | Se materializa en el DialogBox del Requerimiento 10 |
| CR1 TypeScript estricto, CR2 cobertura, CR4 localización | Se heredan en los Requerimientos 13 y 14 |

Las fórmulas de negocio de `.kiro/steering/tech.md` (daño, score, HP, escalado de bugs) permanecen sin cambios en esta feature.
