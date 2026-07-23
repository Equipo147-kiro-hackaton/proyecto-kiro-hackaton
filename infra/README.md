# Infrastructure — Cloud Quest: DevOps Dungeon

Toda la infraestructura de AWS se define y gestiona desde esta carpeta.
Se usa **AWS CloudFormation** (templates JSON/YAML nativos) para mantener la infraestructura como código sin dependencias externas adicionales.

## Recursos AWS Gestionados

| Recurso | Nombre | Descripción |
|---|---|---|
| DynamoDB Table | `cloud-quest-scores` | Tabla principal con GSI para leaderboard |
| Lambda Function | `cloud-quest-submit-score` | POST /scores |
| Lambda Function | `cloud-quest-get-leaderboard` | GET /scores |
| Lambda Function | `cloud-quest-get-or-create-player` | POST /players |
| API Gateway | `cloud-quest-api` | REST API pública |
| IAM Role | `cloud-quest-lambda-role` | Permisos Lambda → DynamoDB |
| Amplify App | `cloud-quest-devops-dungeon` | Hosting + CI/CD |

## Archivos

```
infra/
├── README.md                    ← Este archivo
├── cloudformation/
│   ├── dynamodb.yml             ← Tabla DynamoDB + GSI
│   ├── lambda-role.yml          ← IAM Role para Lambdas
│   ├── api-gateway.yml          ← API Gateway REST + rutas
│   └── main.yml                 ← Stack principal (nested stacks)
└── scripts/
    ├── deploy.ps1               ← Deploy completo (Windows PowerShell)
    └── destroy.ps1              ← Teardown completo (con confirmación)
```

## Prerequisitos

1. AWS CLI v2 instalado y configurado (`aws configure`)
2. Perfil IAM con permisos: `AmazonDynamoDBFullAccess`, `AWSLambdaFullAccess`, `AmazonAPIGatewayAdministrator`, `IAMFullAccess`, `CloudFormationFullAccess`
3. Variable de entorno `AWS_REGION` configurada (default: `us-east-1`)

## Deploy

```powershell
# Deploy completo desde la raíz del proyecto
.\infra\scripts\deploy.ps1

# O manualmente stack por stack
aws cloudformation deploy `
  --template-file infra/cloudformation/dynamodb.yml `
  --stack-name cloud-quest-dynamodb `
  --region us-east-1
```

## Teardown

```powershell
# ⚠️ DESTRUCTIVO — elimina TODOS los recursos y datos
.\infra\scripts\destroy.ps1
```
