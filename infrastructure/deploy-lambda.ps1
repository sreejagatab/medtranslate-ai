# MedTranslate AI Lambda Deployment Script

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "test", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

# Configuration
$OutputsFile = Join-Path $PSScriptRoot "outputs-$Environment.json"
$DeploymentBucket = "medtranslate-deployment-$Environment"

# Check if outputs file exists
if (-not (Test-Path $OutputsFile)) {
    Write-Host "Outputs file not found: $OutputsFile" -ForegroundColor Red
    Write-Host "Please run deploy.ps1 first to generate the outputs file." -ForegroundColor Red
    exit 1
}

# Load outputs
$outputs = Get-Content $OutputsFile | ConvertFrom-Json

# Get Lambda function names
$authFunctionName = "MedTranslate-Auth-$Environment"
$translationFunctionName = "MedTranslate-Translation-$Environment"
$storageFunctionName = "MedTranslate-Storage-$Environment"
$webSocketConnectFunctionName = "MedTranslate-WebSocket-Connect-$Environment"
$webSocketDisconnectFunctionName = "MedTranslate-WebSocket-Disconnect-$Environment"
$webSocketMessageFunctionName = "MedTranslate-WebSocket-Message-$Environment"

Write-Host "Deploying Lambda functions for $Environment environment..." -ForegroundColor Cyan

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

# Update Auth Lambda
Write-Host "Updating Auth Lambda function..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name $authFunctionName `
    --s3-bucket $DeploymentBucket `
    --s3-key "$Environment/lambda/auth.zip" `
    --region $Region

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

# Update Translation Lambda
Write-Host "Updating Translation Lambda function..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name $translationFunctionName `
    --s3-bucket $DeploymentBucket `
    --s3-key "$Environment/lambda/translation.zip" `
    --region $Region

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

# Update Storage Lambda
Write-Host "Updating Storage Lambda function..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name $storageFunctionName `
    --s3-bucket $DeploymentBucket `
    --s3-key "$Environment/lambda/storage.zip" `
    --region $Region

# WebSocket Lambda
Write-Host "Packaging WebSocket Lambda..." -ForegroundColor Yellow
$WebSocketDir = Join-Path $TempDir "websocket"
New-Item -ItemType Directory -Path $WebSocketDir | Out-Null

# Create connect.js
$connectCode = @"
/**
 * WebSocket Connect Handler for MedTranslate AI
 */

const { verifyToken } = require('./auth-service');

exports.handler = async (event) => {
  try {
    // Get session ID from path parameters
    const sessionId = event.pathParameters.sessionId;
    
    // Get token from query string parameters
    const token = event.queryStringParameters.token;
    
    if (!sessionId || !token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Missing session ID or token' })
      };
    }
    
    // Verify token
    const decodedToken = await verifyToken(token);
    if (!decodedToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid or expired token' })
      };
    }
    
    // Allow connection
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Connection authorized' })
    };
  } catch (error) {
    console.error('Error in WebSocket connect handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
"@

# Create disconnect.js
$disconnectCode = @"
/**
 * WebSocket Disconnect Handler for MedTranslate AI
 */

exports.handler = async (event) => {
  try {
    // Get connection ID
    const connectionId = event.requestContext.connectionId;
    
    // Log disconnection
    console.log(`WebSocket disconnected: \${connectionId}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnection processed' })
    };
  } catch (error) {
    console.error('Error in WebSocket disconnect handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
"@

# Create message.js
$messageCode = @"
/**
 * WebSocket Message Handler for MedTranslate AI
 */

exports.handler = async (event) => {
  try {
    // Get connection ID and session ID
    const connectionId = event.requestContext.connectionId;
    const sessionId = event.pathParameters.sessionId;
    
    // Parse message
    const message = JSON.parse(event.body);
    
    // Log message
    console.log(`WebSocket message received from \${connectionId} in session \${sessionId}:`, message);
    
    // Get API Gateway management API
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: `\${event.requestContext.domainName}/\${event.requestContext.stage}`
    });
    
    // Broadcast message to all connections in the session
    // In a real implementation, we would query DynamoDB for all connections in the session
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Message processed' })
    };
  } catch (error) {
    console.error('Error in WebSocket message handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
"@

# Write WebSocket handler files
Set-Content -Path (Join-Path $WebSocketDir "connect.js") -Value $connectCode
Set-Content -Path (Join-Path $WebSocketDir "disconnect.js") -Value $disconnectCode
Set-Content -Path (Join-Path $WebSocketDir "message.js") -Value $messageCode

# Copy auth-service.js
Copy-Item -Path "..\backend\lambda\auth\auth-service.js" -Destination $WebSocketDir
Copy-Item -Path "..\backend\node_modules" -Destination $WebSocketDir -Recurse

# Package WebSocket Connect Lambda
Set-Location -Path $WebSocketDir
Compress-Archive -Path .\* -DestinationPath .\websocket-connect.zip -Force
aws s3 cp websocket-connect.zip "s3://$DeploymentBucket/$Environment/lambda/websocket-connect.zip" --region $Region

# Update WebSocket Connect Lambda
Write-Host "Updating WebSocket Connect Lambda function..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name $webSocketConnectFunctionName `
    --s3-bucket $DeploymentBucket `
    --s3-key "$Environment/lambda/websocket-connect.zip" `
    --region $Region

# Package WebSocket Disconnect Lambda
Compress-Archive -Path .\* -DestinationPath .\websocket-disconnect.zip -Force
aws s3 cp websocket-disconnect.zip "s3://$DeploymentBucket/$Environment/lambda/websocket-disconnect.zip" --region $Region

# Update WebSocket Disconnect Lambda
Write-Host "Updating WebSocket Disconnect Lambda function..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name $webSocketDisconnectFunctionName `
    --s3-bucket $DeploymentBucket `
    --s3-key "$Environment/lambda/websocket-disconnect.zip" `
    --region $Region

# Package WebSocket Message Lambda
Compress-Archive -Path .\* -DestinationPath .\websocket-message.zip -Force
aws s3 cp websocket-message.zip "s3://$DeploymentBucket/$Environment/lambda/websocket-message.zip" --region $Region

# Update WebSocket Message Lambda
Write-Host "Updating WebSocket Message Lambda function..." -ForegroundColor Yellow
aws lambda update-function-code `
    --function-name $webSocketMessageFunctionName `
    --s3-bucket $DeploymentBucket `
    --s3-key "$Environment/lambda/websocket-message.zip" `
    --region $Region

Set-Location -Path $currentLocation

# Clean up temporary directory
Remove-Item -Path $TempDir -Recurse -Force

Write-Host "Lambda functions deployed successfully!" -ForegroundColor Green
