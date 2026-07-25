# Skill: Testing — Property-Based Testing (PBT)

## Framework: Vitest + fast-check

### Filosofía
- Los tests de ejemplo verifican casos conocidos
- Los tests de propiedad descubren casos DESCONOCIDOS
- PBT genera cientos de inputs aleatorios y verifica invariantes
- Si un test PBT falla, fast-check shrinks al caso mínimo reproductor

### Configuración
```typescript
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
```

### Reglas del Proyecto
- Mínimo 100 iteraciones por propiedad (`numRuns: 100`)
- Etiquetar cada PBT: `// Feature: cloud-quest-devops-dungeon, Property N: ...`
- Sistemas puros: cobertura mayor o igual a 90%
- AWS SDK: mockeado con `vi.mock`
- fetch: mockeado con `vi.fn()`

### Arbitrarios Comunes para Cloud Quest
```typescript
// Username válido
const arbUsername = fc.stringMatching(/^[a-zA-Z0-9_]{3,20}$/);

// Score válido
const arbScore = fc.integer({ min: 0, max: 999999 });

// Level number
const arbLevel = fc.integer({ min: 1, max: 10 });

// Timer seconds (0-60)
const arbTimer = fc.integer({ min: 0, max: 60 });

// HP (0-100)
const arbHP = fc.integer({ min: 0, max: 100 });

// Puzzle category
const arbCategory = fc.constantFrom('syntax', 'logic', 'devops', 'memory');

// Item ID
const arbItemId = fc.constantFrom(
  'Score_Multiplier', 'Second_Chance', 'Bug_Weakener',
  'HP_Potion', 'Time_Extender', 'Shield'
);
```

### Propiedades a Verificar en Cloud Quest

#### ScoreSystem
1. Score base siempre = 100 x level
2. Speed bonus es 0 o 50, nunca otro valor
3. Score final >= score base (bonus no resta)
4. Score es monótonamente creciente con level (a timer igual)

#### PuzzleEngine
1. Siempre retorna un puzzle válido de la categoría pedida
2. Nunca retorna el mismo puzzle dos veces consecutivas (si hay más de 1)
3. Puzzle tiene exactamente una respuesta correcta
4. Step count crece con el level

#### ItemSystem
5. Máximo 3 items activos simultáneamente
6. Score_Multiplier no se apila (aplicar 2 veces = aplicar 1 vez)
7. Second_Chance se consume al usarse
8. Inventario nunca tiene items duplicados del mismo tipo no-apilable

#### LevelGenerator
9. Genera entre 5 y 10 levels
10. Cada level tiene al menos 1 room
11. Bug HP escala correctamente: BASE x (1 + 0.10 x (N-1))
12. Rooms contienen tipos válidos (bug/item/rest)

#### Damage Calculation
13. Daño siempre entre 10 y 120 (clamp)
14. Daño = clamp(timer x 2, 10, 120)
15. Bug Weakener reduce HP exactamente 30% (floor)

### Mocking Pattern
```typescript
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({ send: vi.fn() })),
  PutItemCommand: vi.fn(),
  QueryCommand: vi.fn(),
  GetItemCommand: vi.fn(),
}));
```

### Anti-Patterns
- NO: Tests que dependen de orden de ejecución
- NO: Tests que mutan estado global compartido
- NO: Tests que verifican implementación en vez de comportamiento
- NO: Ignorar tests flaky — siempre investigar root cause
- NO: `any` en mocks — tipar correctamente
