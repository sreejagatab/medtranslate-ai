# Setup Medical Translation Components
# This script sets up the medical knowledge base and translation components

# Create necessary directories
Write-Host "Creating necessary directories..." -ForegroundColor Cyan
$promptsDir = "../backend/models/prompts"
if (-not (Test-Path $promptsDir)) {
    New-Item -ItemType Directory -Path $promptsDir -Force | Out-Null
    Write-Host "Created prompts directory: $promptsDir" -ForegroundColor Green
}

# Copy prompt files if they don't exist
Write-Host "Copying prompt files..." -ForegroundColor Cyan
$promptFiles = @(
    "general-prompt.txt",
    "cardiology-prompt.txt",
    "neurology-prompt.txt"
)

foreach ($file in $promptFiles) {
    $sourcePath = $file
    $destPath = Join-Path $promptsDir $file
    
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "Copied $file to $destPath" -ForegroundColor Green
    } else {
        Write-Host "Warning: Source file $sourcePath not found" -ForegroundColor Yellow
    }
}

# Create terminology verification prompt
$verificationPromptPath = Join-Path $promptsDir "terminology-verification-prompt.txt"
if (-not (Test-Path $verificationPromptPath)) {
    @"
You are an expert in medical terminology and translation.
Review the following medical text translation and verify if all medical terms have been translated correctly.
Focus only on specialized medical terminology, not general language.

Format your response as a JSON array of objects with the following structure:
[
  {
    "sourceTerm": "term in source language",
    "translatedTerm": "term in target language",
    "isAccurate": true/false,
    "suggestion": "suggested correction if needed"
  }
]

If no medical terms are found or all terms are correctly translated, return an empty array: []
"@ | Out-File -FilePath $verificationPromptPath -Encoding utf8
    Write-Host "Created terminology verification prompt" -ForegroundColor Green
}

# Check if DynamoDB is running locally
Write-Host "Checking if DynamoDB Local is running..." -ForegroundColor Cyan
$dynamoDbRunning = $false

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000" -Method GET -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $dynamoDbRunning = $true
        Write-Host "DynamoDB Local is running" -ForegroundColor Green
    }
} catch {
    Write-Host "DynamoDB Local is not running" -ForegroundColor Yellow
}

# Populate the medical knowledge base
Write-Host "Setting up the medical knowledge base..." -ForegroundColor Cyan

if ($dynamoDbRunning) {
    Write-Host "Would you like to populate the medical knowledge base? (y/n)" -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "Running medical knowledge base population script..." -ForegroundColor Cyan
        node populate-medical-kb.js
    } else {
        Write-Host "Skipping medical knowledge base population" -ForegroundColor Yellow
    }
} else {
    Write-Host "DynamoDB Local is not running. Cannot populate the medical knowledge base." -ForegroundColor Red
    Write-Host "To start DynamoDB Local, run:" -ForegroundColor Yellow
    Write-Host "java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb" -ForegroundColor Yellow
}

# Test the medical translation system
Write-Host "Would you like to test the medical translation system? (y/n)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "Running medical translation test script..." -ForegroundColor Cyan
    node test-medical-translation.js
} else {
    Write-Host "Skipping medical translation test" -ForegroundColor Yellow
}

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "For more information, see docs/medical-kb-translation.md" -ForegroundColor Cyan
