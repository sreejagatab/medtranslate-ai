# MedTranslate AI Model Upload Script

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "test", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$ModelsDir = "..\models"
)

# Configuration
$OutputsFile = Join-Path $PSScriptRoot "outputs-$Environment.json"

# Check if outputs file exists
if (-not (Test-Path $OutputsFile)) {
    Write-Host "Outputs file not found: $OutputsFile" -ForegroundColor Red
    Write-Host "Please run deploy.ps1 first to generate the outputs file." -ForegroundColor Red
    exit 1
}

# Load outputs
$outputs = Get-Content $OutputsFile | ConvertFrom-Json
$modelsBucketName = ($outputs | Where-Object { $_.OutputKey -eq "ModelsBucketName" }).OutputValue

if (-not $modelsBucketName) {
    Write-Host "Models bucket name not found in outputs file." -ForegroundColor Red
    exit 1
}

Write-Host "Uploading translation models to S3 bucket: $modelsBucketName" -ForegroundColor Cyan

# Check if models directory exists
if (-not (Test-Path $ModelsDir)) {
    Write-Host "Models directory not found: $ModelsDir" -ForegroundColor Red
    
    # Create models directory
    Write-Host "Creating models directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $ModelsDir -Force | Out-Null
    
    # Create mock models for testing
    Write-Host "Creating mock models for testing..." -ForegroundColor Yellow
    
    $mockModels = @(
        "en-es.bin",
        "es-en.bin",
        "en-fr.bin",
        "fr-en.bin",
        "en-de.bin",
        "de-en.bin"
    )
    
    foreach ($model in $mockModels) {
        $modelPath = Join-Path $ModelsDir $model
        Write-Host "Creating mock model: $model" -ForegroundColor Yellow
        
        # Create a small binary file with random data
        $randomData = New-Object byte[] 1024
        $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
        $rng.GetBytes($randomData)
        [System.IO.File]::WriteAllBytes($modelPath, $randomData)
    }
    
    # Create model manifest
    $manifestPath = Join-Path $ModelsDir "model_manifest.json"
    $manifest = @{
        models = @{}
        lastUpdated = [int](Get-Date -UFormat %s)
    }
    
    foreach ($model in $mockModels) {
        $modelInfo = Get-Item (Join-Path $ModelsDir $model)
        $langPair = $model.Replace(".bin", "")
        
        $manifest.models[$langPair] = @{
            filename = $model
            size = $modelInfo.Length
            lastUsed = [int](Get-Date -UFormat %s)
        }
    }
    
    $manifest | ConvertTo-Json -Depth 10 | Set-Content -Path $manifestPath
}

# Upload models to S3
Write-Host "Uploading models to S3..." -ForegroundColor Cyan

$modelFiles = Get-ChildItem -Path $ModelsDir -File

foreach ($file in $modelFiles) {
    Write-Host "Uploading $($file.Name)..." -ForegroundColor Yellow
    aws s3 cp $file.FullName "s3://$modelsBucketName/$($file.Name)" --region $Region
}

Write-Host "Models uploaded successfully!" -ForegroundColor Green
Write-Host "Total models uploaded: $($modelFiles.Count)" -ForegroundColor Yellow
