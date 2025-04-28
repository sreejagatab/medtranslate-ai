# MedTranslate AI Security Configuration Script
# This script configures security settings for HIPAA compliance

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "test", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

# Configuration
$OutputsFile = Join-Path $PSScriptRoot "outputs-$Environment.json"
$StackName = "MedTranslate-$Environment"

# Check if outputs file exists
if (-not (Test-Path $OutputsFile)) {
    Write-Host "Outputs file not found: $OutputsFile" -ForegroundColor Red
    Write-Host "Please run deploy.ps1 first to generate the outputs file." -ForegroundColor Red
    exit 1
}

# Load outputs
$outputs = Get-Content $OutputsFile | ConvertFrom-Json
$secureStorageBucketName = ($outputs | Where-Object { $_.OutputKey -eq "SecureStorageBucketName" }).OutputValue
$modelsBucketName = ($outputs | Where-Object { $_.OutputKey -eq "ModelsBucketName" }).OutputValue
$sessionsTableName = ($outputs | Where-Object { $_.OutputKey -eq "SessionsTableName" }).OutputValue
$usersTableName = ($outputs | Where-Object { $_.OutputKey -eq "UsersTableName" }).OutputValue

if (-not $secureStorageBucketName -or -not $modelsBucketName -or -not $sessionsTableName -or -not $usersTableName) {
    Write-Host "Required resource names not found in outputs file." -ForegroundColor Red
    exit 1
}

Write-Host "Configuring security settings for $Environment environment..." -ForegroundColor Cyan

# 1. Configure S3 bucket encryption
Write-Host "Configuring S3 bucket encryption..." -ForegroundColor Yellow

# Secure Storage Bucket
Write-Host "Configuring encryption for $secureStorageBucketName..." -ForegroundColor Yellow
aws s3api put-bucket-encryption `
    --bucket $secureStorageBucketName `
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                },
                "BucketKeyEnabled": true
            }
        ]
    }' `
    --region $Region

# Models Bucket
Write-Host "Configuring encryption for $modelsBucketName..." -ForegroundColor Yellow
aws s3api put-bucket-encryption `
    --bucket $modelsBucketName `
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                },
                "BucketKeyEnabled": true
            }
        ]
    }' `
    --region $Region

# 2. Configure S3 bucket logging
Write-Host "Configuring S3 bucket logging..." -ForegroundColor Yellow

# Create logging bucket if it doesn't exist
$loggingBucketName = "medtranslate-logs-$Environment-$((aws sts get-caller-identity --query "Account" --output text).Trim())"
$bucketExists = $false
try {
    $bucketCheck = aws s3 ls "s3://$loggingBucketName" --region $Region 2>$null
    if ($bucketCheck) {
        $bucketExists = $true
        Write-Host "Logging bucket exists: $loggingBucketName" -ForegroundColor Green
    }
} catch {
    $bucketExists = $false
}

if (-not $bucketExists) {
    Write-Host "Creating logging bucket: $loggingBucketName" -ForegroundColor Yellow
    aws s3 mb "s3://$loggingBucketName" --region $Region
    
    # Configure logging bucket encryption
    aws s3api put-bucket-encryption `
        --bucket $loggingBucketName `
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    },
                    "BucketKeyEnabled": true
                }
            ]
        }' `
        --region $Region
    
    # Configure logging bucket lifecycle policy
    aws s3api put-bucket-lifecycle-configuration `
        --bucket $loggingBucketName `
        --lifecycle-configuration '{
            "Rules": [
                {
                    "ID": "LogRetention",
                    "Status": "Enabled",
                    "Prefix": "",
                    "Expiration": {
                        "Days": 90
                    }
                }
            ]
        }' `
        --region $Region
}

# Configure logging for secure storage bucket
aws s3api put-bucket-logging `
    --bucket $secureStorageBucketName `
    --bucket-logging-status '{
        "LoggingEnabled": {
            "TargetBucket": "'$loggingBucketName'",
            "TargetPrefix": "s3-logs/'$secureStorageBucketName'/"
        }
    }' `
    --region $Region

# Configure logging for models bucket
aws s3api put-bucket-logging `
    --bucket $modelsBucketName `
    --bucket-logging-status '{
        "LoggingEnabled": {
            "TargetBucket": "'$loggingBucketName'",
            "TargetPrefix": "s3-logs/'$modelsBucketName'/"
        }
    }' `
    --region $Region

# 3. Configure DynamoDB encryption
Write-Host "Configuring DynamoDB encryption..." -ForegroundColor Yellow

# Sessions Table
Write-Host "Configuring encryption for $sessionsTableName..." -ForegroundColor Yellow
aws dynamodb update-table `
    --table-name $sessionsTableName `
    --sse-specification '{
        "Enabled": true,
        "SSEType": "KMS"
    }' `
    --region $Region

# Users Table
Write-Host "Configuring encryption for $usersTableName..." -ForegroundColor Yellow
aws dynamodb update-table `
    --table-name $usersTableName `
    --sse-specification '{
        "Enabled": true,
        "SSEType": "KMS"
    }' `
    --region $Region

# 4. Configure CloudTrail for API logging
Write-Host "Configuring CloudTrail for API logging..." -ForegroundColor Yellow

# Check if CloudTrail is already configured
$cloudTrailName = "MedTranslate-$Environment-Trail"
$cloudTrailExists = $false
try {
    $cloudTrailCheck = aws cloudtrail describe-trails --trail-name-list $cloudTrailName --region $Region 2>$null
    if ($cloudTrailCheck) {
        $cloudTrailExists = $true
        Write-Host "CloudTrail already exists: $cloudTrailName" -ForegroundColor Green
    }
} catch {
    $cloudTrailExists = $false
}

if (-not $cloudTrailExists) {
    Write-Host "Creating CloudTrail: $cloudTrailName" -ForegroundColor Yellow
    
    # Create CloudTrail
    aws cloudtrail create-trail `
        --name $cloudTrailName `
        --s3-bucket-name $loggingBucketName `
        --s3-key-prefix "cloudtrail" `
        --is-multi-region-trail `
        --enable-log-file-validation `
        --kms-key-id "alias/aws/s3" `
        --region $Region
    
    # Start logging
    aws cloudtrail start-logging --name $cloudTrailName --region $Region
    
    # Enable data events for S3 buckets
    aws cloudtrail put-event-selectors `
        --trail-name $cloudTrailName `
        --event-selectors '[
            {
                "ReadWriteType": "All",
                "IncludeManagementEvents": true,
                "DataResources": [
                    {
                        "Type": "AWS::S3::Object",
                        "Values": [
                            "arn:aws:s3:::'$secureStorageBucketName'/",
                            "arn:aws:s3:::'$modelsBucketName'/"
                        ]
                    }
                ]
            }
        ]' `
        --region $Region
}

# 5. Configure AWS Config for compliance monitoring
Write-Host "Configuring AWS Config for compliance monitoring..." -ForegroundColor Yellow

# Check if AWS Config is already configured
$configExists = $false
try {
    $configCheck = aws configservice describe-configuration-recorders --region $Region 2>$null
    if ($configCheck) {
        $configExists = $true
        Write-Host "AWS Config already configured" -ForegroundColor Green
    }
} catch {
    $configExists = $false
}

if (-not $configExists) {
    Write-Host "Configuring AWS Config..." -ForegroundColor Yellow
    
    # Create configuration recorder
    aws configservice put-configuration-recorder `
        --configuration-recorder '{
            "name": "default",
            "recordingGroup": {
                "allSupported": true,
                "includeGlobalResourceTypes": true
            },
            "roleARN": "arn:aws:iam::'$((aws sts get-caller-identity --query "Account" --output text).Trim())':role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig"
        }' `
        --region $Region
    
    # Create delivery channel
    aws configservice put-delivery-channel `
        --delivery-channel '{
            "name": "default",
            "s3BucketName": "'$loggingBucketName'",
            "s3KeyPrefix": "config",
            "configSnapshotDeliveryProperties": {
                "deliveryFrequency": "One_Hour"
            }
        }' `
        --region $Region
    
    # Start configuration recorder
    aws configservice start-configuration-recorder --configuration-recorder-name default --region $Region
}

# 6. Configure AWS Security Hub
Write-Host "Configuring AWS Security Hub..." -ForegroundColor Yellow

# Check if Security Hub is already enabled
$securityHubEnabled = $false
try {
    $securityHubCheck = aws securityhub get-enabled-standards --region $Region 2>$null
    if ($securityHubCheck) {
        $securityHubEnabled = $true
        Write-Host "AWS Security Hub already enabled" -ForegroundColor Green
    }
} catch {
    $securityHubEnabled = $false
}

if (-not $securityHubEnabled) {
    Write-Host "Enabling AWS Security Hub..." -ForegroundColor Yellow
    
    # Enable Security Hub
    aws securityhub enable-security-hub --region $Region
    
    # Enable CIS AWS Foundations Benchmark
    aws securityhub batch-enable-standards `
        --standards-subscription-requests '[
            {
                "StandardsArn": "arn:aws:securityhub:'$Region'::'$((aws sts get-caller-identity --query "Account" --output text).Trim())':standard/cis-aws-foundations-benchmark/v/1.2.0"
            }
        ]' `
        --region $Region
}

# 7. Configure AWS GuardDuty
Write-Host "Configuring AWS GuardDuty..." -ForegroundColor Yellow

# Check if GuardDuty is already enabled
$guardDutyEnabled = $false
try {
    $guardDutyCheck = aws guardduty list-detectors --region $Region 2>$null
    if ($guardDutyCheck) {
        $guardDutyEnabled = $true
        Write-Host "AWS GuardDuty already enabled" -ForegroundColor Green
    }
} catch {
    $guardDutyEnabled = $false
}

if (-not $guardDutyEnabled) {
    Write-Host "Enabling AWS GuardDuty..." -ForegroundColor Yellow
    
    # Enable GuardDuty
    aws guardduty create-detector `
        --enable `
        --finding-publishing-frequency FIFTEEN_MINUTES `
        --region $Region
}

Write-Host "Security configuration completed successfully!" -ForegroundColor Green
Write-Host "The following security measures have been implemented:" -ForegroundColor Cyan
Write-Host "1. S3 bucket encryption" -ForegroundColor Yellow
Write-Host "2. S3 bucket logging" -ForegroundColor Yellow
Write-Host "3. DynamoDB encryption" -ForegroundColor Yellow
Write-Host "4. CloudTrail for API logging" -ForegroundColor Yellow
Write-Host "5. AWS Config for compliance monitoring" -ForegroundColor Yellow
Write-Host "6. AWS Security Hub for security standards" -ForegroundColor Yellow
Write-Host "7. AWS GuardDuty for threat detection" -ForegroundColor Yellow
