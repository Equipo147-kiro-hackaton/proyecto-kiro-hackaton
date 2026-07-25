# Skill: AWS Serverless (Lambda + DynamoDB + API Gateway)

## Stack Serverless Cloud Quest

### Lambda (Node.js 20.x + TypeScript)
- Runtime: `nodejs20.x`
- Handler pattern: `export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>`
- Timeout: 10s máximo para APIs
- Memory: 128MB (suficiente para CRUD simple)
- Cold start mitigation: mantener imports ligeros, no inicializar SDK fuera del handler

### Estructura de Response
```typescript
const response = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  },
  body: JSON.stringify(body),
});
```

### DynamoDB Patterns
- Single Table Design cuando sea posible
- Partition key: distribución uniforme (evitar hot partitions)
- GSI para access patterns secundarios
- On-demand capacity para cargas impredecibles
- TTL para datos temporales (no aplica a scores permanentes)

### Operaciones DynamoDB
```typescript
// PutItem con condition (idempotent)
await client.send(new PutItemCommand({
  TableName: TABLE_NAME,
  Item: marshall(item),
  ConditionExpression: 'attribute_not_exists(#pk)',
  ExpressionAttributeNames: { '#pk': 'username' },
}));

// Query GSI (Leaderboard top 10)
await client.send(new QueryCommand({
  TableName: TABLE_NAME,
  IndexName: 'ScoreIndex',
  KeyConditionExpression: 'gameId = :gid',
  ExpressionAttributeValues: marshall({ ':gid': 'CLOUD_QUEST' }),
  ScanIndexForward: false, // DESC
  Limit: 10,
}));
```

### API Gateway
- REST API (no HTTP API — más control sobre throttling)
- Throttling: 100 req/s burst, 50 req/s steady
- Stages: `prod` (único para MVP)
- CORS habilitado a nivel de integración
- Request validation con models cuando sea posible

### Error Handling en Lambda
```typescript
try {
  // business logic
} catch (error: unknown) {
  if (error instanceof ConditionalCheckFailedException) {
    return response(409, { error: 'Resource already exists' });
  }
  console.error('Unexpected error:', error);
  return response(500, { error: 'Internal server error' });
  // NUNCA: return response(500, { error: error.message, stack: error.stack })
}
```

### Security
- Input validation en CADA Lambda (no confiar en API Gateway solo)
- Sanitize username: `/^[a-zA-Z0-9_]{3,20}$/`
- Validate score: must be positive integer, max 999999
- IAM Role: permisos por tabla y operación específica
- No usar `Scan` sin Limit (protección contra data dump)
- CORS restrictivo en producción

### CloudFormation IaC
- Toda infraestructura definida como código
- Parameters para valores que cambian entre environments
- Outputs para referencias cross-stack
- DeletionPolicy: Retain para tablas con datos

### Monitoring
- CloudWatch Logs automático con IAM role
- Métricas: Duration, Errors, Throttles, ConcurrentExecutions
- Alarmas en error rate > 5% por 5 minutos
