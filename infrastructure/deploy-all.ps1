# MedTranslate AI Master Deployment Script

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
$ScriptPath = $PSScriptRoot

Write-Host "Starting MedTranslate AI deployment for $Environment environment..." -ForegroundColor Cyan

# Step 1: Deploy infrastructure
Write-Host "Step 1: Deploying infrastructure..." -ForegroundColor Cyan
& "$ScriptPath\deploy.ps1" -Environment $Environment -Region $Region -ApiDomainName $ApiDomainName -CertificateArn $CertificateArn -RetentionPeriodDays $RetentionPeriodDays

if ($LASTEXITCODE -ne 0) {
    Write-Host "Infrastructure deployment failed. Exiting." -ForegroundColor Red
    exit 1
}

# Step 2: Upload translation models
Write-Host "Step 2: Uploading translation models..." -ForegroundColor Cyan
& "$ScriptPath\upload-models.ps1" -Environment $Environment -Region $Region

if ($LASTEXITCODE -ne 0) {
    Write-Host "Model upload failed. Exiting." -ForegroundColor Red
    exit 1
}

# Step 3: Deploy Lambda functions
Write-Host "Step 3: Deploying Lambda functions..." -ForegroundColor Cyan
& "$ScriptPath\deploy-lambda.ps1" -Environment $Environment -Region $Region

if ($LASTEXITCODE -ne 0) {
    Write-Host "Lambda deployment failed. Exiting." -ForegroundColor Red
    exit 1
}

# Step 4: Configure frontend applications
Write-Host "Step 4: Configuring frontend applications..." -ForegroundColor Cyan
& "$ScriptPath\configure-frontend.ps1" -Environment $Environment

if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend configuration failed. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "MedTranslate AI deployment completed successfully!" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow

# Load outputs
$OutputsFile = Join-Path $PSScriptRoot "outputs-$Environment.json"
if (Test-Path $OutputsFile) {
    $outputs = Get-Content $OutputsFile | ConvertFrom-Json
    $apiEndpoint = ($outputs | Where-Object { $_.OutputKey -eq "ApiEndpoint" }).OutputValue
    $webSocketEndpoint = ($outputs | Where-Object { $_.OutputKey -eq "WebSocketEndpoint" }).OutputValue
    
    Write-Host "API Endpoint: $apiEndpoint" -ForegroundColor Yellow
    Write-Host "WebSocket Endpoint: $webSocketEndpoint" -ForegroundColor Yellow
}

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Build and deploy the frontend applications" -ForegroundColor Yellow
Write-Host "2. Test the system with the integration test script" -ForegroundColor Yellow
Write-Host "3. Monitor the system in AWS CloudWatch" -ForegroundColor Yellow
