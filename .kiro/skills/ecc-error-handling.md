# Skill: ECC — Error Correction & Compensation

## Filosofía

ECC (Error Correction and Compensation) trata al software como un sistema que DEBE fallar gracefully. Cada componente asume que sus dependencias pueden fallar y tiene estrategias de compensación.

## Principios

### 1. Fail Fast, Recover Gracefully
- Detectar errores lo antes posible en el pipeline
- No propagar estados inválidos — cortar inmediatamente
- Proveer fallbacks significativos, no pantallas en blanco
- El usuario SIEMPRE ve un estado coherente, incluso bajo error

### 2. Circuit Breaker Pattern
- Si una API falla 3 veces consecutivas, dejar de llamar por 30s
- Mostrar estado cached o mensaje informativo mientras tanto
- Reintentar automáticamente con exponential backoff
- Log de cada apertura/cierre del circuit breaker

### 3. Compensating Transactions
- Si una operación multi-paso falla a mitad, revertir los pasos completados
- Ejemplo: si submitScore falla después de calcular, mantener score en memoria para retry
- Idempotency keys en operaciones de escritura
- Nunca dejar el sistema en estado inconsistente

### 4. Error Boundaries por Capa
```
UI Layer        → Muestra mensaje amigable, ofrece retry
Game Logic      → Revierte al último estado válido conocido
Network Layer   → Retry con backoff, timeout, fallback a cache
Data Layer      → Validación de integridad, condition expressions
```

### 5. Observabilidad
- Cada error se clasifica: recoverable vs fatal
- Errores recoverables: log warning + compensar
- Errores fatales: log error + notificar + estado seguro
- Métricas de error rate por componente

### 6. Defensive Programming
- Assertions en precondiciones de funciones críticas
- Type guards antes de operar con datos externos
- Null checks explícitos (no optional chaining silencioso en lógica crítica)
- Inmutabilidad por defecto — copiar antes de mutar

### 7. Graceful Degradation
- Sin API → juego funciona offline (sin leaderboard)
- Sin assets → placeholder sprites con texto
- Timer falla → asumir tiempo máximo (beneficio al jugador)
- DynamoDB throttled → queue local + retry

## Aplicación en Cloud Quest

| Componente | Fallo | Compensación |
|---|---|---|
| ApiClient | Timeout | Retry x2 + mostrar "offline mode" |
| Leaderboard | API down | Mostrar "No disponible" + cache local |
| Score submit | Fallo | Guardar en localStorage + retry en próximo run |
| Puzzle load | Data corrupt | Fallback a puzzle hardcoded genérico |
| DynamoDB | Throttle | Exponential backoff + condition retry |
| Tilemap | Asset missing | Generar mapa procedural básico |

## Patrones de Código

```typescript
// CORRECTO: ECC Pattern
async function submitScoreWithECC(score: ScoreEntry): Promise<boolean> {
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await apiClient.submitScore(score);
      return true;
    } catch (error: unknown) {
      if (attempt === MAX_RETRIES) {
        localStorage.setItem('pending_score', JSON.stringify(score));
        eventBus.emit(EVENTS.SCORE_NOT_SAVED);
        return false;
      }
      await delay(attempt * 1000); // backoff
    }
  }
  return false;
}
```
