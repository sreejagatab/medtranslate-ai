# MedTranslate AI Lambda Optimization Script
# This script optimizes Lambda functions for performance

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "test", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

# Configuration
$OutputsFile = Join-Path $PSScriptRoot "outputs-$Environment.json"

# Check if outputs file exists
if (-not (Test-Path $OutputsFile)) {
    Write-Host "Outputs file not found: $OutputsFile" -ForegroundColor Red
    Write-Host "Please run deploy.ps1 first to generate the outputs file." -ForegroundColor Red
    exit 1
}

# Lambda function configurations
$lambdaConfigs = @{
    "MedTranslate-Auth-$Environment" = @{
        MemorySize = 256
        Timeout = 30
        ProvisionedConcurrency = if ($Environment -eq "prod") { 5 } else { 0 }
    }
    "MedTranslate-Translation-$Environment" = @{
        MemorySize = 1024
        Timeout = 60
        ProvisionedConcurrency = if ($Environment -eq "prod") { 10 } else { 0 }
    }
    "MedTranslate-Storage-$Environment" = @{
        MemorySize = 512
        Timeout = 30
        ProvisionedConcurrency = if ($Environment -eq "prod") { 5 } else { 0 }
    }
    "MedTranslate-WebSocket-Connect-$Environment" = @{
        MemorySize = 256
        Timeout = 30
        ProvisionedConcurrency = if ($Environment -eq "prod") { 5 } else { 0 }
    }
    "MedTranslate-WebSocket-Disconnect-$Environment" = @{
        MemorySize = 256
        Timeout = 30
        ProvisionedConcurrency = if ($Environment -eq "prod") { 5 } else { 0 }
    }
    "MedTranslate-WebSocket-Message-$Environment" = @{
        MemorySize = 512
        Timeout = 30
        ProvisionedConcurrency = if ($Environment -eq "prod") { 10 } else { 0 }
    }
}

Write-Host "Optimizing Lambda functions for $Environment environment..." -ForegroundColor Cyan

# Update Lambda function configurations
foreach ($function in $lambdaConfigs.Keys) {
    $config = $lambdaConfigs[$function]
    
    Write-Host "Optimizing $function..." -ForegroundColor Yellow
    Write-Host "  Memory: $($config.MemorySize) MB" -ForegroundColor Yellow
    Write-Host "  Timeout: $($config.Timeout) seconds" -ForegroundColor Yellow
    
    # Update function configuration
    aws lambda update-function-configuration `
        --function-name $function `
        --memory-size $config.MemorySize `
        --timeout $config.Timeout `
        --region $Region
    
    # Configure provisioned concurrency if needed
    if ($config.ProvisionedConcurrency -gt 0) {
        Write-Host "  Provisioned Concurrency: $($config.ProvisionedConcurrency)" -ForegroundColor Yellow
        
        # Get function qualifier (version)
        $functionInfo = aws lambda get-function --function-name $function --region $Region | ConvertFrom-Json
        $version = $functionInfo.Configuration.Version
        
        # Check if version is $LATEST
        if ($version -eq '$LATEST') {
            # Publish a new version
            $publishResult = aws lambda publish-version --function-name $function --region $Region | ConvertFrom-Json
            $version = $publishResult.Version
        }
        
        # Configure provisioned concurrency
        aws lambda put-provisioned-concurrency-config `
            --function-name $function `
            --qualifier $version `
            --provisioned-concurrent-executions $config.ProvisionedConcurrency `
            --region $Region
    }
}

# Configure Lambda function environment variables
Write-Host "Configuring Lambda function environment variables..." -ForegroundColor Yellow

# Auth Lambda
Write-Host "Configuring environment variables for MedTranslate-Auth-$Environment..." -ForegroundColor Yellow
aws lambda update-function-configuration `
    --function-name "MedTranslate-Auth-$Environment" `
    --environment "Variables={ENVIRONMENT=$Environment,LOG_LEVEL=INFO}" `
    --region $Region

# Translation Lambda
Write-Host "Configuring environment variables for MedTranslate-Translation-$Environment..." -ForegroundColor Yellow
aws lambda update-function-configuration `
    --function-name "MedTranslate-Translation-$Environment" `
    --environment "Variables={ENVIRONMENT=$Environment,LOG_LEVEL=INFO,ENABLE_CACHING=true,CACHE_TTL=3600}" `
    --region $Region

# Storage Lambda
Write-Host "Configuring environment variables for MedTranslate-Storage-$Environment..." -ForegroundColor Yellow
aws lambda update-function-configuration `
    --function-name "MedTranslate-Storage-$Environment" `
    --environment "Variables={ENVIRONMENT=$Environment,LOG_LEVEL=INFO,ENABLE_COMPRESSION=true}" `
    --region $Region

# WebSocket Connect Lambda
Write-Host "Configuring environment variables for MedTranslate-WebSocket-Connect-$Environment..." -ForegroundColor Yellow
aws lambda update-function-configuration `
    --function-name "MedTranslate-WebSocket-Connect-$Environment" `
    --environment "Variables={ENVIRONMENT=$Environment,LOG_LEVEL=INFO}" `
    --region $Region

# WebSocket Disconnect Lambda
Write-Host "Configuring environment variables for MedTranslate-WebSocket-Disconnect-$Environment..." -ForegroundColor Yellow
aws lambda update-function-configuration `
    --function-name "MedTranslate-WebSocket-Disconnect-$Environment" `
    --environment "Variables={ENVIRONMENT=$Environment,LOG_LEVEL=INFO}" `
    --region $Region

# WebSocket Message Lambda
Write-Host "Configuring environment variables for MedTranslate-WebSocket-Message-$Environment..." -ForegroundColor Yellow
aws lambda update-function-configuration `
    --function-name "MedTranslate-WebSocket-Message-$Environment" `
    --environment "Variables={ENVIRONMENT=$Environment,LOG_LEVEL=INFO}" `
    --region $Region

# Configure Lambda function concurrency
if ($Environment -eq "prod") {
    Write-Host "Configuring Lambda function concurrency limits..." -ForegroundColor Yellow
    
    # Translation Lambda (higher concurrency limit)
    Write-Host "Setting concurrency limit for MedTranslate-Translation-$Environment..." -ForegroundColor Yellow
    aws lambda put-function-concurrency `
        --function-name "MedTranslate-Translation-$Environment" `
        --reserved-concurrent-executions 50 `
        --region $Region
    
    # WebSocket Message Lambda (higher concurrency limit)
    Write-Host "Setting concurrency limit for MedTranslate-WebSocket-Message-$Environment..." -ForegroundColor Yellow
    aws lambda put-function-concurrency `
        --function-name "MedTranslate-WebSocket-Message-$Environment" `
        --reserved-concurrent-executions 50 `
        --region $Region
}

# Configure Lambda function X-Ray tracing
Write-Host "Configuring Lambda function X-Ray tracing..." -ForegroundColor Yellow

foreach ($function in $lambdaConfigs.Keys) {
    Write-Host "Enabling X-Ray tracing for $function..." -ForegroundColor Yellow
    
    aws lambda update-function-configuration `
        --function-name $function `
        --tracing-config Mode=Active `
        --region $Region
}

Write-Host "Lambda function optimization completed successfully!" -ForegroundColor Green
Write-Host "The following optimizations have been applied:" -ForegroundColor Cyan
Write-Host "1. Memory and timeout configurations" -ForegroundColor Yellow
Write-Host "2. Provisioned concurrency (for production)" -ForegroundColor Yellow
Write-Host "3. Environment variables" -ForegroundColor Yellow
Write-Host "4. Concurrency limits (for production)" -ForegroundColor Yellow
Write-Host "5. X-Ray tracing" -ForegroundColor Yellow
