# Continuous Delivery Strategy — Cloud Quest: DevOps Dungeon

## Filosofia

Aplicamos Continuous Delivery (CD) con la premisa de que **cada commit en `develop` es potencialmente desplegable** y **cada merge a `main` se despliega automaticamente**. La calidad se garantiza mediante quality gates automatizados en multiples capas.

## Arquitectura del Pipeline

```
Developer Local (Kiro)          GitHub Actions              AWS
========================       ==================         ==========

[Code Change]
     |
     v
[Kiro Hooks - Local Gates]
  - PostFileSave: tsc --noEmit
  - PreTaskExec: vitest --run
  - PostTaskExec: vitest --run
  - Quality Gate: conventions check
     |
     v
[git push -> develop]
     |
     v
[CI Workflow] ----------------------------------------------
  |                                                        |
  +-- quality-check                                        |
  |   +-- TypeScript check                                 |
  |   +-- Vitest + coverage                                |
  |   +-- Build frontend                                   |
  |   +-- Build Lambdas                                    |
  |                                                        |
  +-- security-scan                                        |
      +-- npm audit                                        |
                                                           |
[PR -> develop or main] ------------------------------------
  |
  v
[Quality Gates Workflow]
  +-- Coverage >= 70%
  +-- Zero TypeScript errors
  +-- Zero 'any' usage
  +-- Security patterns (no secrets, no eval)
  +-- Lambda validation (CORS, input validation)
  |
  v
[PR Summary -> GitHub Check]
  |
  v
[Merge to main]
  |
  v
[CD Workflow] ----------------------------------------------
  |                                                        |
  +-- Gate 1: Tests pass                                   |
  +-- Gate 2: Build succeeds -------> artifact: dist/      |
  +-- Gate 3: Security scan                                |
  +-- Gate 4: Deploy Lambdas --------------------------> AWS Lambda
  +-- Gate 5: Verify Amplify --------------------------> AWS Amplify
                                                           |
                                                           v
                                                    [PRODUCTION LIVE]
```

## Capas de Quality Gates

### Capa 1: Local (Kiro Hooks)

| Hook | Trigger | Accion |
|------|---------|--------|
| `lint-on-save` | PostFileSave (.ts) | `tsc --noEmit` |
| `quality-gate-writes` | PreToolUse (fs_write) | Verifica convenciones |
| `pre-task-test-gate` | PreTaskExec | `vitest --run` |
| `test-after-task` | PostTaskExec | `vitest --run` |

**Resultado:** El codigo nunca llega a git con errores de TypeScript o tests rotos.

### Capa 2: CI en Push (GitHub Actions)

**Workflow:** `.github/workflows/ci.yml`
- Se ejecuta en cada push a `develop` y `main`
- Se ejecuta en cada PR
- Jobs paralelos: `quality-check` + `security-scan`

**Quality check:**
1. TypeScript type check
2. Vitest con coverage
3. Build del frontend (Vite)
4. Build de Lambdas (tsc)

**Security scan:**
1. `npm audit` para dependencias
2. Falla en vulnerabilidades critical

### Capa 3: Quality Gates en PR (GitHub Actions)

**Workflow:** `.github/workflows/quality-gates.yml`
- Se ejecuta solo en PRs a `develop` o `main`
- Son **required checks** — bloquean merge si fallan

**Gates:**
| Gate | Threshold | Bloquea Merge |
|------|-----------|---------------|
| Coverage | >= 70% statements | Si |
| TypeScript | 0 errors | Si |
| No `any` | 0 occurrences | Si |
| Security patterns | No secrets/eval | Si |
| Lambda validation | CORS headers present | Si |

### Capa 4: CD en Merge a Main (GitHub Actions)

**Workflow:** `.github/workflows/cd.yml`
- Se ejecuta SOLO cuando algo llega a `main`
- Pipeline secuencial con gates dependientes
- Usa environment `production` (requiere approval en GitHub si se configura)

**Secuencia:**
```
test -> build -> security -> deploy-lambdas -> verify-deployment
```

## Estrategia de Ramas (GitFlow Simplificado)

```
main (produccion — auto-deploy)
  +-- develop (integracion — CI en cada push)
       +-- feature/xyz (desarrollo — local + CI en PR)
       +-- fix/abc (hotfix — local + CI en PR)
```

**Reglas:**
- `main` protegido: solo merge via PR con quality gates passing
- `develop` protegido: solo merge via PR con CI passing
- Feature branches: push libre, PR requerido para merge

## Interaccion Agentes Kiro + GitHub

### Flujo de Desarrollo con Agentes

```
1. Developer pide feature a Kiro
2. Kiro delega al agente apropiado (@game-architect, @backend-engineer, etc.)
3. El agente trabaja respetando sus constraints y skills
4. Hooks locales validan en tiempo real:
   - PostFileSave -> TypeScript OK
   - PostTaskExec -> Tests pasan
5. Kiro commitea y pushea a feature branch
6. GitHub Actions CI corre automaticamente
7. Kiro crea PR a develop
8. Quality Gates workflow corre en el PR
9. Si todo pasa -> merge automatico o manual
10. Merge a main -> CD workflow despliega a produccion
```

### Agentes y su Rol en CD

| Agente | Rol en Pipeline |
|--------|-----------------|
| @game-architect | Asegura que scenes/systems compilan y tests pasan |
| @backend-engineer | Valida Lambdas, CloudFormation templates, CORS |
| @security-auditor | Revisa antes de merge: OWASP checklist |
| @quality-engineer | Escribe tests PBT, asegura coverage threshold |
| @devops-deployer | Mantiene workflows, scripts de deploy, IaC |
| @ux-accessibility | Verifica a11y compliance antes de release |

## Secrets Requeridos en GitHub

Configurar en Settings -> Secrets and variables -> Actions:

| Secret | Uso |
|--------|-----|
| `AWS_ACCESS_KEY_ID` | Deploy de CloudFormation y Lambdas |
| `AWS_SECRET_ACCESS_KEY` | Deploy de CloudFormation y Lambdas |
| `VITE_API_BASE_URL` | URL del API Gateway para build de produccion |

## Configurar Branch Protection

En GitHub -> Settings -> Branches -> Branch protection rules:

### `main`
- Require PR before merging
- Require status checks: `quality-check`, `security-scan`
- Require branches to be up to date
- Require linear history

### `develop`
- Require PR before merging
- Require status checks: `quality-check`

## Rollback Strategy

Si un deploy a produccion falla:

1. **Frontend (Amplify):** Rollback automatico al build anterior desde consola Amplify
2. **Lambdas:** Revert el commit en `main` -> CD re-despliega version anterior
3. **DynamoDB:** No se borra — DeletionPolicy: Retain
4. **CloudFormation:** Rollback automatico si el stack update falla

## Metricas de CD (DORA Metrics)

| Metrica | Target |
|---------|--------|
| Lead time (commit -> produccion) | < 15 min |
| Deployment frequency | Multiple por dia |
| Change failure rate | < 5% |
| Mean time to recovery | < 30 min |
