# deploy.ps1 — Cloud Quest: DevOps Dungeon Infrastructure Deploy
# Run from project root: .\infra\scripts\deploy.ps1

param(
    [string]$Region = "us-east-1",
    [string]$Environment = "hackathon"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Cloud Quest infrastructure to AWS ($Region)..." -ForegroundColor Cyan

# 1. DynamoDB Table
Write-Host "`n📦 [1/3] Deploying DynamoDB table..." -ForegroundColor Yellow
aws cloudformation deploy `
    --template-file infra/cloudformation/dynamodb.yml `
    --stack-name cloud-quest-dynamodb `
    --region $Region `
    --no-fail-on-empty-changeset

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ DynamoDB deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ DynamoDB deployed" -ForegroundColor Green

# 2. IAM Role
Write-Host "`n🔐 [2/3] Deploying IAM Role for Lambda..." -ForegroundColor Yellow
aws cloudformation deploy `
    --template-file infra/cloudformation/lambda-role.yml `
    --stack-name cloud-quest-lambda-role `
    --region $Region `
    --capabilities CAPABILITY_NAMED_IAM `
    --no-fail-on-empty-changeset

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ IAM Role deployment failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ IAM Role deployed" -ForegroundColor Green

# 3. Output summary
Write-Host "`n✅ Infrastructure deployed successfully!" -ForegroundColor Green
Write-Host "`n📋 Stack outputs:" -ForegroundColor Cyan

aws cloudformation describe-stacks `
    --stack-name cloud-quest-dynamodb `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output table

Write-Host "`n💡 Next step: Deploy Lambda functions and configure API Gateway in AWS Amplify console." -ForegroundColor Yellow
