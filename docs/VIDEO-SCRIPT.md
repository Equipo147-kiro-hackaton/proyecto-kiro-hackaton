# Guion del Video — Cloud Quest: DevOps Dungeon

**Duracion total:** 5 minutos maximo  
**Formato:** Grabacion de pantalla + voz en off  
**Herramienta sugerida:** OBS Studio o Loom  

---

## Estructura del Video

### [0:00 - 0:30] Intro — El Problema

**Visual:** Slide con titulo del juego o la pantalla de login con la animacion del grid.

**Guion:**

> "Aprender DevOps es dificil. Los recursos son densos, aburridos, y no dan retroalimentacion inmediata. Cloud Quest: DevOps Dungeon cambia eso. Es un videojuego roguelike web donde aprendes DevOps derrotando bugs de produccion con puzzles de programacion en tiempo real."

---

### [0:30 - 1:00] Que es Cloud Quest

**Visual:** Mostrar el MainMenu con la seleccion de dificultad.

**Guion:**

> "Cloud Quest es un juego original y jugable de principio a fin. El jugador explora un dungeon tematico — una oficina, un servidor, la nube — resolviendo puzzles de 4 categorias: errores de sintaxis, errores logicos, pipelines DevOps, y gestion de memoria. Cada nivel termina con un boss fight donde debes ordenar un pipeline correctamente bajo presion de tiempo."

---

### [1:00 - 3:30] Demo en Vivo

**Visual:** Jugar un ciclo completo. Mostrar cada pantalla.

#### Login (10s)
- Escribir un username
- Mostrar la validacion y el efecto visual del boton

#### Menu Principal (10s)
- Seleccionar dificultad "Normal"
- Click en NEW RUN

#### Exploracion (60s)
- Mover el heroe con WASD
- Interactuar con un terminal (tecla E)
- Mostrar el puzzle overlay apareciendo
- Resolver un puzzle correctamente (mostrar feedback verde, sparkles)
- Resolver uno incorrectamente (mostrar shake rojo, hint)
- Recolectar un fragmento

#### Boss Fight (40s)
- Mostrar la transicion al boss
- Ordenar fragmentos en el pipeline correcto
- Mostrar el boss perdiendo HP
- Victoria del boss

#### Game Over / Victory (20s)
- Mostrar la pantalla de resultados (score, nivel, puzzles resueltos)
- Click en VIEW LEADERBOARD

#### Leaderboard (10s)
- Mostrar los scores guardados
- Volver al menu

---

### [3:30 - 4:30] Stack Tecnologico y Desarrollo

**Visual:** Mostrar diagrama de arquitectura o el codigo en Kiro IDE.

**Guion:**

> "Cloud Quest esta construido con Phaser.js 3 en TypeScript strict, empaquetado con Vite. El backend usa AWS: DynamoDB para la base de datos, Lambda para las funciones serverless, y API Gateway para la REST API. Todo desplegado con CloudFormation — un solo comando despliega, otro destruye. Zero costos zombie."

> "El frontend se hostea en AWS Amplify con HTTPS automatico. El juego funciona offline gracias a localStorage como fallback — si la API no esta disponible, los scores se guardan localmente."

> "Desarrollamos usando Kiro IDE con Spec-Driven Development. Las specs definen requirements, design y tasks. Los 316 tests unitarios y property-based tests garantizan que las formulas del juego son correctas."

---

### [4:30 - 5:00] Cierre

**Visual:** Volver al juego funcionando, o slide final.

**Guion:**

> "Cloud Quest: DevOps Dungeon demuestra que aprender DevOps puede ser divertido, competitivo e inmediato. Cada concepto es un enemigo a derrotar. Cada error tiene consecuencias. Cada acierto rapido es recompensado. Gracias por ver."

**Mostrar:**
- URL del demo en vivo
- URL del repositorio GitHub

---

## Tips para la Grabacion

1. **Resolucion:** Graba a 1920x1080 o 1280x720
2. **Audio:** Ambiente silencioso, microfono cerca
3. **Velocidad:** No te apresures. Si necesitas editar, corta las pausas
4. **Errores:** Si cometes un error durante la demo, dejalo — muestra que es real
5. **Duracion:** Apunta a 4:30 para tener margen. Nunca exceder 5:00
6. **Subtitulos:** Opcional pero suma puntos de accesibilidad
