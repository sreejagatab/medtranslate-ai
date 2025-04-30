# Test Edge Computing Capabilities
# This script tests the enhanced edge computing capabilities

# Set environment variables
$env:NODE_ENV = "development"
$env:USE_OPTIMIZED_INFERENCE = "true"

# Create necessary directories
Write-Host "Creating necessary directories..." -ForegroundColor Cyan
$configDir = "../edge/config"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    Write-Host "Created config directory: $configDir" -ForegroundColor Green
}

$cacheDir = "../edge/cache"
if (-not (Test-Path $cacheDir)) {
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    Write-Host "Created cache directory: $cacheDir" -ForegroundColor Green
}

$modelsDir = "../edge/models"
if (-not (Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Path $modelsDir -Force | Out-Null
    Write-Host "Created models directory: $modelsDir" -ForegroundColor Green
}

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Cyan
try {
    $pythonVersion = python --version
    Write-Host "Python is installed: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.7+ and add it to your PATH" -ForegroundColor Yellow
    exit 1
}

# Check for required Python packages
Write-Host "Checking required Python packages..." -ForegroundColor Cyan
$requiredPackages = @("torch", "transformers", "onnx", "onnxruntime")
$missingPackages = @()

foreach ($package in $requiredPackages) {
    try {
        python -c "import $package"
        Write-Host "Package $package is installed" -ForegroundColor Green
    } catch {
        Write-Host "Package $package is not installed" -ForegroundColor Yellow
        $missingPackages += $package
    }
}

if ($missingPackages.Count -gt 0) {
    Write-Host "Some required packages are missing. Install them? (y/n)" -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "Installing missing packages..." -ForegroundColor Cyan
        foreach ($package in $missingPackages) {
            Write-Host "Installing $package..." -ForegroundColor Cyan
            python -m pip install $package
        }
    } else {
        Write-Host "Skipping package installation. Some tests may fail." -ForegroundColor Yellow
    }
}

# Run the edge computing tests
Write-Host "Running edge computing tests..." -ForegroundColor Cyan
Set-Location -Path "../edge"
node test/test-edge-computing.js

# Return to original directory
Set-Location -Path "../scripts"

Write-Host "Tests completed!" -ForegroundColor Green
