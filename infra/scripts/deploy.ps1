# deploy.ps1 — Cloud Quest: DevOps Dungeon — Full Backend Deploy
# Deploys: S3 bucket (for code) + Lambda functions + DynamoDB + API Gateway
# Run from project root: .\infra\scripts\deploy.ps1
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Node.js 20.x installed
#   - npm install completed (for @aws-sdk packages in lambda/)

param(
    [string]$Region = "us-east-1",
    [string]$StackName = "cloud-quest-backend",
    [string]$BucketName = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Location).Path

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Cloud Quest: DevOps Dungeon - Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ─── Step 0: Determine S3 Bucket Name ─────────────────────────────────────────
if ($BucketName -eq "") {
    $AccountId = (aws sts get-caller-identity --query "Account" --output text --region $Region).Trim()
    $BucketName = "cloud-quest-lambda-$AccountId-$Region"
}
Write-Host "[0/5] Using S3 bucket: $BucketName" -ForegroundColor Yellow

# ─── Step 1: Create S3 Bucket (if not exists) ─────────────────────────────────
Write-Host ""
Write-Host "[1/5] Creating S3 bucket for Lambda code..." -ForegroundColor Yellow

$bucketExists = aws s3api head-bucket --bucket $BucketName --region $Region 2>&1
if ($LASTEXITCODE -ne 0) {
    if ($Region -eq "us-east-1") {
        aws s3api create-bucket --bucket $BucketName --region $Region
    } else {
        aws s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration LocationConstraint=$Region
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create S3 bucket" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Created bucket: $BucketName" -ForegroundColor Green
} else {
    Write-Host "  Bucket already exists: $BucketName" -ForegroundColor Green
}

# ─── Step 2: Compile Lambda Functions ──────────────────────────────────────────
Write-Host ""
Write-Host "[2/5] Compiling Lambda functions (TypeScript -> JavaScript)..." -ForegroundColor Yellow

$LambdaDir = Join-Path $ProjectRoot "lambda"
$LambdaBuildDir = Join-Path $ProjectRoot "lambda-build"

# Clean previous build
if (Test-Path $LambdaBuildDir) {
    Remove-Item -Recurse -Force $LambdaBuildDir
}
New-Item -ItemType Directory -Path $LambdaBuildDir -Force | Out-Null

# Create tsconfig for lambda compilation
$LambdaTsConfig = @{
    compilerOptions = @{
        target = "ES2022"
        module = "commonjs"
        moduleResolution = "node"
        outDir = "./lambda-build"
        rootDir = "./lambda"
        strict = $true
        esModuleInterop = $true
        skipLibCheck = $true
        forceConsistentCasingInFileNames = $true
        declaration = $false
        sourceMap = $false
    }
    include = @("lambda/**/*.ts")
    exclude = @("node_modules")
} | ConvertTo-Json -Depth 4

$LambdaTsConfig | Out-File -FilePath (Join-Path $ProjectRoot "tsconfig.lambda.json") -Encoding UTF8

npx tsc --project tsconfig.lambda.json
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Lambda compilation failed" -ForegroundColor Red
    exit 1
}
Write-Host "  Compiled 3 Lambda functions" -ForegroundColor Green

# ─── Step 3: Package and Upload Lambda Zips ────────────────────────────────────
Write-Host ""
Write-Host "[3/5] Packaging and uploading Lambda functions to S3..." -ForegroundColor Yellow

$functions = @("submitScore", "getLeaderboard", "getOrCreatePlayer")
$S3Prefix = "cloud-quest-lambda"

foreach ($fn in $functions) {
    $jsFile = Join-Path $LambdaBuildDir "$fn.js"
    $zipFile = Join-Path $LambdaBuildDir "$fn.zip"

    if (-not (Test-Path $jsFile)) {
        Write-Host "  ERROR: $jsFile not found" -ForegroundColor Red
        exit 1
    }

    # Create zip with just the .js file
    Compress-Archive -Path $jsFile -DestinationPath $zipFile -Force

    # Upload to S3
    aws s3 cp $zipFile "s3://$BucketName/$S3Prefix/$fn.zip" --region $Region
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Failed to upload $fn.zip" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Uploaded: $fn.zip" -ForegroundColor Green
}

# ─── Step 4: Deploy CloudFormation Stack ───────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Deploying CloudFormation stack: $StackName..." -ForegroundColor Yellow

aws cloudformation deploy `
    --template-file infra/cloudformation/backend.yml `
    --stack-name $StackName `
    --region $Region `
    --capabilities CAPABILITY_NAMED_IAM `
    --parameter-overrides `
        LambdaCodeBucket=$BucketName `
        LambdaCodePrefix=$S3Prefix `
    --no-fail-on-empty-changeset

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: CloudFormation deployment failed" -ForegroundColor Red
    Write-Host "Check the AWS Console for stack events and error details." -ForegroundColor Yellow
    exit 1
}
Write-Host "  Stack deployed successfully!" -ForegroundColor Green

# ─── Step 5: Get Outputs ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "[5/5] Retrieving stack outputs..." -ForegroundColor Yellow

$ApiUrl = (aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" `
    --output text).Trim()

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  API URL: $ApiUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "  1. Add to .env:  VITE_API_BASE_URL=$ApiUrl" -ForegroundColor White
Write-Host "  2. Test: curl $ApiUrl/scores" -ForegroundColor White
Write-Host "  3. When done testing: .\infra\scripts\destroy.ps1" -ForegroundColor White
Write-Host ""

# Clean up temp files
Remove-Item -Path (Join-Path $ProjectRoot "tsconfig.lambda.json") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $LambdaBuildDir -ErrorAction SilentlyContinue
