# Skill: Security by Design

## Principios Fundamentales

Este skill aplica seguridad desde el diseño en cada línea de código. No es un paso posterior — es una propiedad inherente del sistema.

## Reglas de Aplicación

### Input Validation (Defense in Depth)
- Todo input del usuario se valida ANTES de procesarse
- Usar allowlists (no denylists) para validación
- Sanitizar datos antes de renderizar en DOM (XSS prevention)
- Validar tipos, longitud, formato y rango en cada boundary

### Principio de Mínimo Privilegio
- IAM Roles con permisos exactos — nunca `*` en resources
- Lambda functions solo acceden a las tablas que necesitan
- CORS configurado con origins específicos, no `*` en producción
- API Gateway con throttling y rate limiting

### Secure Data Handling
- Nunca loggear datos sensibles (tokens, secrets, PII)
- Variables de entorno para secrets — nunca hardcodeadas
- Usar HTTPS exclusivamente (redirect HTTP → HTTPS)
- Headers de seguridad: CSP, X-Frame-Options, X-Content-Type-Options

### Error Handling Seguro
- Nunca exponer stack traces al cliente
- Errores genéricos al usuario, detallados en logs internos
- No revelar existencia/inexistencia de recursos en mensajes de error
- Timeout en todas las operaciones de red (5s máximo)

### DynamoDB Security
- Usar condition expressions para prevenir race conditions
- Validar partition keys y sort keys antes de queries
- No confiar en datos que vienen del cliente para construir queries
- Limit en queries para prevenir data exfiltration

### Client-Side Security
- No almacenar secrets en localStorage/sessionStorage
- Validar respuestas del servidor antes de usar
- Content Security Policy para prevenir XSS
- No ejecutar código dinámico (no eval, no Function constructor)

## Checklist por Feature
1. [ ] Inputs validados con tipos estrictos
2. [ ] Errores no exponen internals
3. [ ] Sin hardcoded secrets
4. [ ] HTTPS enforced
5. [ ] Rate limiting considerado
6. [ ] Principio de mínimo privilegio aplicado
7. [ ] Datos sanitizados antes de render
