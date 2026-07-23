# destroy.ps1 — Cloud Quest: DevOps Dungeon Infrastructure Teardown
# ⚠️  DESTRUCTIVE: deletes all stacks and data
# Run from project root: .\infra\scripts\destroy.ps1

param(
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "⚠️  WARNING: This will delete ALL Cloud Quest infrastructure and data!" -ForegroundColor Red
$confirm = Read-Host "Type 'DELETE' to confirm"

if ($confirm -ne "DELETE") {
    Write-Host "Aborted." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n🗑️  Destroying Cloud Quest infrastructure..." -ForegroundColor Red

$stacks = @(
    "cloud-quest-lambda-role",
    "cloud-quest-dynamodb"
)

foreach ($stack in $stacks) {
    Write-Host "  Deleting stack: $stack" -ForegroundColor Yellow
    aws cloudformation delete-stack --stack-name $stack --region $Region
    aws cloudformation wait stack-delete-complete --stack-name $stack --region $Region
    Write-Host "  ✅ $stack deleted" -ForegroundColor Green
}

Write-Host "`n✅ All infrastructure destroyed." -ForegroundColor Green
