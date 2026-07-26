# Guia de Deploy — Cloud Quest: DevOps Dungeon

## Resumen

Todo el backend se despliega con UN solo comando desde tu terminal PowerShell.
Todo se destruye con otro comando. Zero configuracion manual en AWS Console.

---

## Prerequisitos (una sola vez)

### 1. AWS CLI instalado y configurado

```powershell
# Verificar que AWS CLI esta instalado
aws --version

# Configurar credenciales (si no lo has hecho)
aws configure
# Te pedira:
#   AWS Access Key ID: [tu access key]
#   AWS Secret Access Key: [tu secret key]
#   Default region: us-east-1
#   Default output format: json
```

### 2. Verificar que tienes permisos

```powershell
# Esto debe mostrar tu Account ID
aws sts get-caller-identity
```

Si falla, tus credenciales no son validas o no tienes permisos.

---

## Deploy (un solo comando)

Abre PowerShell en la raiz del proyecto y ejecuta:

```powershell
.\infra\scripts\deploy.ps1
```

**Que hace automaticamente:**
1. Crea un bucket S3 temporal para el codigo Lambda
2. Compila las 3 funciones Lambda (TypeScript -> JavaScript)
3. Empaqueta cada funcion en un .zip y lo sube a S3
4. Despliega el stack de CloudFormation (DynamoDB + IAM + Lambda + API Gateway)
5. Imprime la URL del API

**Tiempo estimado:** 3-5 minutos

**Output esperado:**
```
========================================
 DEPLOYMENT COMPLETE!
========================================

  API URL: https://abc123.execute-api.us-east-1.amazonaws.com/prod

  Next steps:
  1. Add to .env:  VITE_API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com/prod
  2. Test: curl https://abc123.execute-api.us-east-1.amazonaws.com/prod/scores
  3. When done testing: .\infra\scripts\destroy.ps1
```

---

## Despues del Deploy

### Paso 1: Configurar la URL en el frontend

Copia la URL del API que te dio el script y ponla en tu `.env`:

```
VITE_API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com/prod
```

### Paso 2: Verificar que funciona

```powershell
# Debe retornar [] (array vacio, no hay scores aun)
curl https://abc123.execute-api.us-east-1.amazonaws.com/prod/scores

# Crear un jugador
curl -X POST https://abc123.execute-api.us-east-1.amazonaws.com/prod/players -H "Content-Type: application/json" -d '{"username":"testplayer"}'
```

### Paso 3: Iniciar el juego

```powershell
npm run dev
```

Ahora el juego se conectara al backend real.

---

## Destroy (cuando termines de testear)

```powershell
.\infra\scripts\destroy.ps1
```

Te pedira confirmacion. Escribe `DELETE` y presiona Enter.

**Que hace automaticamente:**
1. Elimina el stack de CloudFormation (y TODO lo que contiene)
2. Limpia stacks legacy si existen
3. Vacia y elimina el bucket S3

**Resultado:** CERO recursos en AWS. Sin costos.

**Tiempo estimado:** 2-3 minutos

---

## Para el Demo Final del Hackathon

1. Ejecuta `.\infra\scripts\deploy.ps1`
2. Copia la API URL al `.env`
3. Ejecuta `npm run build` para generar el frontend
4. Conecta el repo a AWS Amplify (ver seccion abajo)
5. Graba el video / presenta la demo
6. Cuando termine el hackathon: `.\infra\scripts\destroy.ps1`

---

## Conectar a AWS Amplify (Frontend Hosting)

Esto es lo UNICO que requiere AWS Console manual:

### Pasos:

1. Ve a https://console.aws.amazon.com/amplify/
2. Click "New app" > "Host web app"
3. Selecciona "GitHub" como source
4. Autoriza y selecciona el repo `proyecto-kiro-hackaton`
5. Branch: `main` (o `develop`)
6. Amplify detectara `amplify.yml` automaticamente
7. En "Advanced settings" > "Environment variables":
   - Key: `VITE_API_BASE_URL`
   - Value: `[la URL que te dio deploy.ps1]`
8. Click "Save and deploy"

**Tiempo:** 3-5 minutos de build. Despues tendras una URL HTTPS publica.

---

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| `aws: command not found` | Instala AWS CLI: https://aws.amazon.com/cli/ |
| `An error occurred (AccessDenied)` | Tu usuario IAM necesita permisos de CloudFormation, S3, DynamoDB, Lambda, API Gateway, IAM |
| `Stack creation failed` | Corre `.\infra\scripts\destroy.ps1` y vuelve a intentar |
| `Lambda compilation failed` | Ejecuta `npm install` primero |
| El leaderboard muestra "No scores yet" | Normal si no has jugado aun. Los scores se guardan al completar un run. |

---

## Costos Estimados

Con la estrategia deploy-test-destroy:
- **DynamoDB (on-demand):** $0.00 (free tier: 25 WCU + 25 RCU)
- **Lambda:** $0.00 (free tier: 1M requests/month)
- **API Gateway:** $0.00 (free tier: 1M calls/month first 12 months)
- **S3:** $0.00 (unos KB de zips)

**Total por sesion de testing:** $0.00

Solo pagas si lo dejas corriendo dias con miles de requests.
