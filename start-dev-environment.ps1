# MedTranslate AI Development Environment Startup Script

Write-Host "Starting MedTranslate AI Development Environment..." -ForegroundColor Green

# Create a function to start a service in a new PowerShell window
function Start-Service {
    param (
        [string]$Name,
        [string]$Directory,
        [string]$Command
    )
    
    Write-Host "Starting $Name..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Directory'; $Command"
}

# Start Backend Service
Start-Service -Name "Backend Service" -Directory "$PSScriptRoot\backend" -Command "npm run dev"

# Start Edge Service
Start-Service -Name "Edge Service" -Directory "$PSScriptRoot\edge" -Command "npm run dev"

# Start Provider App
Start-Service -Name "Provider App" -Directory "$PSScriptRoot\frontend\provider-app" -Command "npm start"

# Start Patient App
Start-Service -Name "Patient App" -Directory "$PSScriptRoot\frontend\patient-app" -Command "npm start"

Write-Host "All services started!" -ForegroundColor Green
Write-Host "Backend API: http://localhost:3001" -ForegroundColor Yellow
Write-Host "Edge Service: http://localhost:3002" -ForegroundColor Yellow
Write-Host "Provider App: http://localhost:3003" -ForegroundColor Yellow
Write-Host "Patient App: http://localhost:3004" -ForegroundColor Yellow
