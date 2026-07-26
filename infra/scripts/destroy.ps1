# destroy.ps1 — Cloud Quest: DevOps Dungeon — Complete Teardown
# Deletes: CloudFormation stack (DynamoDB + Lambda + API Gateway + IAM) + S3 bucket
# Run from project root: .\infra\scripts\destroy.ps1
#
# ZERO resources remain after this script. No zombie costs.

param(
    [string]$Region = "us-east-1",
    [string]$StackName = "cloud-quest-backend"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host " Cloud Quest: DevOps Dungeon - DESTROY" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "This will DELETE:" -ForegroundColor Yellow
Write-Host "  - CloudFormation stack: $StackName" -ForegroundColor White
Write-Host "  - DynamoDB table: cloud-quest-scores (ALL DATA)" -ForegroundColor White
Write-Host "  - Lambda functions (3)" -ForegroundColor White
Write-Host "  - API Gateway" -ForegroundColor White
Write-Host "  - IAM Role" -ForegroundColor White
Write-Host "  - S3 bucket with Lambda code" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Type 'DELETE' to confirm destruction"
if ($confirm -ne "DELETE") {
    Write-Host "Aborted. No resources were deleted." -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# ─── Step 1: Delete CloudFormation Stack ───────────────────────────────────────
Write-Host "[1/3] Deleting CloudFormation stack: $StackName..." -ForegroundColor Yellow

$stackExists = aws cloudformation describe-stacks --stack-name $StackName --region $Region 2>&1
if ($LASTEXITCODE -eq 0) {
    aws cloudformation delete-stack --stack-name $StackName --region $Region
    Write-Host "  Waiting for stack deletion (this may take 2-3 minutes)..." -ForegroundColor White
    aws cloudformation wait stack-delete-complete --stack-name $StackName --region $Region
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: Stack deletion may have failed. Check AWS Console." -ForegroundColor Red
    } else {
        Write-Host "  Stack deleted." -ForegroundColor Green
    }
} else {
    Write-Host "  Stack does not exist, skipping." -ForegroundColor Gray
}

# ─── Step 2: Delete old stacks (if they exist from previous deploys) ───────────
Write-Host ""
Write-Host "[2/3] Cleaning up legacy stacks (if any)..." -ForegroundColor Yellow

$legacyStacks = @("cloud-quest-dynamodb", "cloud-quest-lambda-role")
foreach ($stack in $legacyStacks) {
    $exists = aws cloudformation describe-stacks --stack-name $stack --region $Region 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Deleting legacy stack: $stack" -ForegroundColor Yellow
        aws cloudformation delete-stack --stack-name $stack --region $Region
        aws cloudformation wait stack-delete-complete --stack-name $stack --region $Region
        Write-Host "  Deleted: $stack" -ForegroundColor Green
    }
}

# ─── Step 3: Delete S3 Bucket ──────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/3] Deleting S3 bucket with Lambda code..." -ForegroundColor Yellow

$AccountId = (aws sts get-caller-identity --query "Account" --output text --region $Region).Trim()
$BucketName = "cloud-quest-lambda-$AccountId-$Region"

$bucketExists = aws s3api head-bucket --bucket $BucketName --region $Region 2>&1
if ($LASTEXITCODE -eq 0) {
    # Empty the bucket first (required before deletion)
    aws s3 rm "s3://$BucketName" --recursive --region $Region
    aws s3api delete-bucket --bucket $BucketName --region $Region
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Bucket deleted: $BucketName" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Could not delete bucket. It may need manual cleanup." -ForegroundColor Yellow
    }
} else {
    Write-Host "  Bucket does not exist, skipping." -ForegroundColor Gray
}

# ─── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " ALL RESOURCES DESTROYED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Zero AWS resources remain. No ongoing costs." -ForegroundColor White
Write-Host "  To redeploy: .\infra\scripts\deploy.ps1" -ForegroundColor White
Write-Host ""
