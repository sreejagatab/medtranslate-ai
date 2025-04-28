# MedTranslate AI AWS Deployment Script

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "test", "prod")]
    [string]$Environment,

    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",

    [Parameter(Mandatory=$false)]
    [string]$ApiDomainName = "",

    [Parameter(Mandatory=$false)]
    [string]$CertificateArn = "",

    [Parameter(Mandatory=$false)]
    [int]$RetentionPeriodDays = 30
)

# Configuration
$StackName = "MedTranslate-$Environment"
$TemplateFile = Join-Path $PSScriptRoot "cloudformation\medtranslate-stack.yaml"
$SecretsName = "MedTranslate-$Environment"
$DeploymentBucket = "medtranslate-deployment-$Environment"

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version
    Write-Host "AWS CLI detected: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "AWS CLI is not installed or not in PATH. Please install AWS CLI and configure it." -ForegroundColor Red
    exit 1
}

# Check if user is logged in to AWS
try {
    $awsAccount = aws sts get-caller-identity --query "Account" --output text
    Write-Host "Deploying to AWS Account: $awsAccount" -ForegroundColor Green
} catch {
    Write-Host "Not logged in to AWS. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Check if deployment bucket exists, create if not
$bucketExists = $false
try {
    $bucketCheck = aws s3 ls "s3://$DeploymentBucket" --region $Region 2>$null
    if ($bucketCheck) {
        $bucketExists = $true
        Write-Host "Deployment bucket exists: $DeploymentBucket" -ForegroundColor Green
    }
} catch {
    $bucketExists = $false
}

if (-not $bucketExists) {
    Write-Host "Creating deployment bucket: $DeploymentBucket" -ForegroundColor Yellow
    aws s3 mb "s3://$DeploymentBucket" --region $Region

    # Enable versioning on the bucket
    aws s3api put-bucket-versioning `
        --bucket $DeploymentBucket `
        --versioning-configuration Status=Enabled `
        --region $Region
}

# Create or update JWT secret in Secrets Manager
Write-Host "Setting up JWT secret in AWS Secrets Manager..." -ForegroundColor Cyan

# Check if secret exists
$secretExists = $false
try {
    $secretInfo = aws secretsmanager describe-secret --secret-id $SecretsName 2>$null
    $secretExists = $true
    Write-Host "Secret $SecretsName already exists, updating..." -ForegroundColor Yellow
} catch {
    Write-Host "Secret $SecretsName does not exist, creating..." -ForegroundColor Yellow
}

# Generate a random JWT secret if not in production
if ($Environment -eq "prod") {
    $jwtSecret = Read-Host -Prompt "Enter JWT secret for production" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($jwtSecret)
    $jwtSecretPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
} else {
    $jwtSecretPlain = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
}

# Create or update secret
$secretValue = @{
    JwtSecret = $jwtSecretPlain
} | ConvertTo-Json

if ($secretExists) {
    aws secretsmanager update-secret --secret-id $SecretsName --secret-string $secretValue
} else {
    aws secretsmanager create-secret --name $SecretsName --description "MedTranslate AI Secrets for $Environment" --secret-string $secretValue

    # Add tags to secret
    aws secretsmanager tag-resource --secret-id $SecretsName --tags Key=Environment,Value=$Environment Key=Application,Value=MedTranslateAI
}

Write-Host "JWT secret configured successfully" -ForegroundColor Green

# Package Lambda functions
Write-Host "Packaging Lambda functions..." -ForegroundColor Cyan

# Create temporary directory for packaging
$TempDir = [System.IO.Path]::GetTempPath() + [System.Guid]::NewGuid().ToString()
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Auth Lambda
Write-Host "Packaging Auth Lambda..." -ForegroundColor Yellow
$AuthDir = Join-Path $TempDir "auth"
New-Item -ItemType Directory -Path $AuthDir | Out-Null
Copy-Item -Path "..\backend\lambda\auth\*" -Destination $AuthDir -Recurse
Copy-Item -Path "..\backend\node_modules" -Destination $AuthDir -Recurse
$currentLocation = Get-Location
Set-Location -Path $AuthDir
Compress-Archive -Path .\* -DestinationPath .\auth.zip -Force
aws s3 cp auth.zip "s3://$DeploymentBucket/$Environment/lambda/auth.zip" --region $Region
Set-Location -Path $currentLocation

# Translation Lambda
Write-Host "Packaging Translation Lambda..." -ForegroundColor Yellow
$TranslationDir = Join-Path $TempDir "translation"
New-Item -ItemType Directory -Path $TranslationDir | Out-Null
Copy-Item -Path "..\backend\lambda\translation\*" -Destination $TranslationDir -Recurse
Copy-Item -Path "..\backend\node_modules" -Destination $TranslationDir -Recurse
Set-Location -Path $TranslationDir
Compress-Archive -Path .\* -DestinationPath .\translation.zip -Force
aws s3 cp translation.zip "s3://$DeploymentBucket/$Environment/lambda/translation.zip" --region $Region
Set-Location -Path $currentLocation

# Storage Lambda
Write-Host "Packaging Storage Lambda..." -ForegroundColor Yellow
$StorageDir = Join-Path $TempDir "storage"
New-Item -ItemType Directory -Path $StorageDir | Out-Null
Copy-Item -Path "..\backend\lambda\storage\*" -Destination $StorageDir -Recurse
Copy-Item -Path "..\backend\lambda\auth\auth-service.js" -Destination $StorageDir
Copy-Item -Path "..\backend\node_modules" -Destination $StorageDir -Recurse
Set-Location -Path $StorageDir
Compress-Archive -Path .\* -DestinationPath .\storage.zip -Force
aws s3 cp storage.zip "s3://$DeploymentBucket/$Environment/lambda/storage.zip" --region $Region
Set-Location -Path $currentLocation

# WebSocket Lambda
Write-Host "Packaging WebSocket Lambda..." -ForegroundColor Yellow
$WebSocketDir = Join-Path $TempDir "websocket"
New-Item -ItemType Directory -Path $WebSocketDir | Out-Null
Copy-Item -Path "..\backend\websocket\*" -Destination $WebSocketDir -Recurse
Copy-Item -Path "..\backend\lambda\auth\auth-service.js" -Destination $WebSocketDir
Copy-Item -Path "..\backend\node_modules" -Destination $WebSocketDir -Recurse
Set-Location -Path $WebSocketDir
Compress-Archive -Path .\* -DestinationPath .\websocket.zip -Force
aws s3 cp websocket.zip "s3://$DeploymentBucket/$Environment/lambda/websocket.zip" --region $Region
Set-Location -Path $currentLocation

# Deploy CloudFormation stack
Write-Host "Deploying CloudFormation stack $StackName..." -ForegroundColor Cyan

# Build parameters array
$parameters = @(
    "ParameterKey=Environment,ParameterValue=$Environment",
    "ParameterKey=RetentionPeriodDays,ParameterValue=$RetentionPeriodDays"
)

if ($ApiDomainName) {
    $parameters += "ParameterKey=ApiDomainName,ParameterValue=$ApiDomainName"
}

if ($CertificateArn) {
    $parameters += "ParameterKey=CertificateArn,ParameterValue=$CertificateArn"
}

# Check if stack exists
$stackExists = $false
try {
    $stackInfo = aws cloudformation describe-stacks --stack-name $StackName 2>$null
    $stackExists = $true
    Write-Host "Stack $StackName already exists, updating..." -ForegroundColor Yellow
} catch {
    Write-Host "Stack $StackName does not exist, creating..." -ForegroundColor Yellow
}

# Create or update stack
if ($stackExists) {
    # Create change set
    $changeSetName = "$StackName-change-$(Get-Date -Format 'yyyyMMddHHmmss')"

    Write-Host "Creating change set $changeSetName..." -ForegroundColor Yellow
    aws cloudformation create-change-set `
        --stack-name $StackName `
        --change-set-name $changeSetName `
        --template-body file://$TemplateFile `
        --parameters $parameters `
        --capabilities CAPABILITY_NAMED_IAM

    # Wait for change set to be created
    Write-Host "Waiting for change set to be created..." -ForegroundColor Yellow
    aws cloudformation wait change-set-create-complete `
        --stack-name $StackName `
        --change-set-name $changeSetName

    # Describe change set
    Write-Host "Changes to be applied:" -ForegroundColor Yellow
    aws cloudformation describe-change-set `
        --stack-name $StackName `
        --change-set-name $changeSetName `
        --query "Changes[].{Action:ResourceChange.Action,LogicalId:ResourceChange.LogicalResourceId,Type:ResourceChange.ResourceType,Replacement:ResourceChange.Replacement}" `
        --output table

    # Confirm execution
    $confirmation = Read-Host "Do you want to execute the change set? (y/n)"
    if ($confirmation -eq 'y') {
        # Execute change set
        Write-Host "Executing change set..." -ForegroundColor Yellow
        aws cloudformation execute-change-set `
            --stack-name $StackName `
            --change-set-name $changeSetName

        # Wait for stack update to complete
        Write-Host "Waiting for stack update to complete..." -ForegroundColor Yellow
        aws cloudformation wait stack-update-complete --stack-name $StackName

        Write-Host "Stack update completed successfully" -ForegroundColor Green
    } else {
        # Delete change set
        Write-Host "Deleting change set..." -ForegroundColor Yellow
        aws cloudformation delete-change-set `
            --stack-name $StackName `
            --change-set-name $changeSetName

        Write-Host "Change set deleted" -ForegroundColor Yellow
        exit 0
    }
} else {
    # Create stack
    Write-Host "Creating stack..." -ForegroundColor Yellow
    aws cloudformation create-stack `
        --stack-name $StackName `
        --template-body file://$TemplateFile `
        --parameters $parameters `
        --capabilities CAPABILITY_NAMED_IAM

    # Wait for stack creation to complete
    Write-Host "Waiting for stack creation to complete..." -ForegroundColor Yellow
    aws cloudformation wait stack-create-complete --stack-name $StackName

    Write-Host "Stack creation completed successfully" -ForegroundColor Green
}

# Get stack outputs
$outputs = aws cloudformation describe-stacks --stack-name $StackName --query "Stacks[0].Outputs" --output json | ConvertFrom-Json

Write-Host "Stack outputs:" -ForegroundColor Cyan
foreach ($output in $outputs) {
    Write-Host "$($output.OutputKey): $($output.OutputValue)" -ForegroundColor Green
}

# Save outputs to file
$outputsFile = Join-Path $PSScriptRoot "outputs-$Environment.json"
$outputs | ConvertTo-Json | Out-File -FilePath $outputsFile
Write-Host "Stack outputs saved to $outputsFile" -ForegroundColor Green

# Clean up temporary directory
Remove-Item -Path $TempDir -Recurse -Force

# Next steps
Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Deploy backend code to Lambda functions" -ForegroundColor Yellow
Write-Host "2. Upload translation models to S3 bucket" -ForegroundColor Yellow
Write-Host "3. Configure frontend applications with API endpoints" -ForegroundColor Yellow
