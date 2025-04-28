# MedTranslate AI Infrastructure Deployment Script for Windows

# Default parameters
param (
    [string]$Environment = "dev",
    [string]$Region = "us-east-1"
)

$StackName = "medtranslate-$Environment"
$DeploymentBucket = "medtranslate-deployment-$Environment"

Write-Host "Deploying MedTranslate AI infrastructure to $Environment environment in $Region region"

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version
    Write-Host "AWS CLI is installed: $awsVersion"
}
catch {
    Write-Host "AWS CLI is not installed. Please install it first."
    exit 1
}

# Check if deployment bucket exists, create if not
$bucketExists = $false
try {
    $bucketCheck = aws s3 ls "s3://$DeploymentBucket" --region $Region
    if ($bucketCheck) {
        $bucketExists = $true
        Write-Host "Deployment bucket exists: $DeploymentBucket"
    }
}
catch {
    $bucketExists = $false
}

if (-not $bucketExists) {
    Write-Host "Creating deployment bucket: $DeploymentBucket"
    aws s3 mb "s3://$DeploymentBucket" --region $Region
    
    # Enable versioning on the bucket
    aws s3api put-bucket-versioning `
        --bucket $DeploymentBucket `
        --versioning-configuration Status=Enabled `
        --region $Region
}

# Package Lambda functions
Write-Host "Packaging Lambda functions..."

# Create temporary directory for packaging
$TempDir = [System.IO.Path]::GetTempPath() + [System.Guid]::NewGuid().ToString()
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Auth Lambda
Write-Host "Packaging Auth Lambda..."
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
Write-Host "Packaging Translation Lambda..."
$TranslationDir = Join-Path $TempDir "translation"
New-Item -ItemType Directory -Path $TranslationDir | Out-Null
Copy-Item -Path "..\backend\lambda\translation\*" -Destination $TranslationDir -Recurse
Copy-Item -Path "..\backend\node_modules" -Destination $TranslationDir -Recurse
Set-Location -Path $TranslationDir
Compress-Archive -Path .\* -DestinationPath .\translation.zip -Force
aws s3 cp translation.zip "s3://$DeploymentBucket/$Environment/lambda/translation.zip" --region $Region
Set-Location -Path $currentLocation

# Storage Lambda
Write-Host "Packaging Storage Lambda..."
$StorageDir = Join-Path $TempDir "storage"
New-Item -ItemType Directory -Path $StorageDir | Out-Null
Copy-Item -Path "..\backend\lambda\storage\*" -Destination $StorageDir -Recurse
Copy-Item -Path "..\backend\lambda\auth\auth-service.js" -Destination $StorageDir
Copy-Item -Path "..\backend\node_modules" -Destination $StorageDir -Recurse
Set-Location -Path $StorageDir
Compress-Archive -Path .\* -DestinationPath .\storage.zip -Force
aws s3 cp storage.zip "s3://$DeploymentBucket/$Environment/lambda/storage.zip" --region $Region
Set-Location -Path $currentLocation

# Deploy CloudFormation stack
Write-Host "Deploying CloudFormation stack: $StackName"

# Deploy main infrastructure stack
aws cloudformation deploy `
    --template-file cloudformation/main.yaml `
    --stack-name $StackName `
    --parameter-overrides `
        Environment=$Environment `
        RetentionPeriodDays=30 `
        DeploymentBucket=$DeploymentBucket `
    --capabilities CAPABILITY_IAM `
    --region $Region

# Get Lambda function ARNs
$AuthFunctionArn = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='AuthFunctionArn'].OutputValue" --output text
$CreateSessionFunctionArn = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='CreateSessionFunctionArn'].OutputValue" --output text
$GeneratePatientTokenFunctionArn = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='GeneratePatientTokenFunctionArn'].OutputValue" --output text
$JoinSessionFunctionArn = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='JoinSessionFunctionArn'].OutputValue" --output text
$TranslateTextFunctionArn = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='TranslateTextFunctionArn'].OutputValue" --output text
$TranslateAudioFunctionArn = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='TranslateAudioFunctionArn'].OutputValue" --output text
$StoreTranscriptFunctionArn = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='StoreTranscriptFunctionArn'].OutputValue" --output text
$GetSessionDataFunctionArn = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs[?OutputKey=='GetSessionDataFunctionArn'].OutputValue" --output text

# Deploy API Gateway stack
aws cloudformation deploy `
    --template-file cloudformation/api-gateway.yaml `
    --stack-name "$StackName-api" `
    --parameter-overrides `
        Environment=$Environment `
        AuthFunctionArn=$AuthFunctionArn `
        CreateSessionFunctionArn=$CreateSessionFunctionArn `
        GeneratePatientTokenFunctionArn=$GeneratePatientTokenFunctionArn `
        JoinSessionFunctionArn=$JoinSessionFunctionArn `
        TranslateTextFunctionArn=$TranslateTextFunctionArn `
        TranslateAudioFunctionArn=$TranslateAudioFunctionArn `
        StoreTranscriptFunctionArn=$StoreTranscriptFunctionArn `
        GetSessionDataFunctionArn=$GetSessionDataFunctionArn `
    --capabilities CAPABILITY_IAM `
    --region $Region

# Get API Gateway endpoint
$ApiEndpoint = aws cloudformation describe-stacks --stack-name "$StackName-api" --region $Region --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text

Write-Host "Deployment completed successfully!"
Write-Host "API Endpoint: $ApiEndpoint"

# Clean up temporary directory
Remove-Item -Path $TempDir -Recurse -Force
