# MedTranslate AI Monitoring Configuration Script
# This script configures CloudWatch monitoring and alarms

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "test", "prod")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$NotificationEmail = ""
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
$apiEndpoint = ($outputs | Where-Object { $_.OutputKey -eq "ApiEndpoint" }).OutputValue
$webSocketEndpoint = ($outputs | Where-Object { $_.OutputKey -eq "WebSocketEndpoint" }).OutputValue
$secureStorageBucketName = ($outputs | Where-Object { $_.OutputKey -eq "SecureStorageBucketName" }).OutputValue
$modelsBucketName = ($outputs | Where-Object { $_.OutputKey -eq "ModelsBucketName" }).OutputValue
$sessionsTableName = ($outputs | Where-Object { $_.OutputKey -eq "SessionsTableName" }).OutputValue
$usersTableName = ($outputs | Where-Object { $_.OutputKey -eq "UsersTableName" }).OutputValue

if (-not $apiEndpoint -or -not $webSocketEndpoint) {
    Write-Host "API endpoints not found in outputs file." -ForegroundColor Red
    exit 1
}

Write-Host "Configuring monitoring for $Environment environment..." -ForegroundColor Cyan

# 1. Create SNS topic for alarms
Write-Host "Creating SNS topic for alarms..." -ForegroundColor Yellow

$snsTopicName = "MedTranslate-$Environment-Alarms"
$snsTopicArn = ""

# Check if SNS topic already exists
$snsTopicExists = $false
try {
    $snsTopics = aws sns list-topics --region $Region | ConvertFrom-Json
    foreach ($topic in $snsTopics.Topics) {
        if ($topic.TopicArn -like "*:$snsTopicName") {
            $snsTopicExists = $true
            $snsTopicArn = $topic.TopicArn
            Write-Host "SNS topic already exists: $snsTopicArn" -ForegroundColor Green
            break
        }
    }
} catch {
    $snsTopicExists = $false
}

if (-not $snsTopicExists) {
    Write-Host "Creating SNS topic: $snsTopicName" -ForegroundColor Yellow
    $snsTopicArn = (aws sns create-topic --name $snsTopicName --region $Region | ConvertFrom-Json).TopicArn
    Write-Host "SNS topic created: $snsTopicArn" -ForegroundColor Green
}

# Subscribe email to SNS topic if provided
if ($NotificationEmail) {
    Write-Host "Subscribing $NotificationEmail to SNS topic..." -ForegroundColor Yellow
    aws sns subscribe `
        --topic-arn $snsTopicArn `
        --protocol email `
        --notification-endpoint $NotificationEmail `
        --region $Region
    
    Write-Host "Subscription request sent to $NotificationEmail. Please check your email to confirm the subscription." -ForegroundColor Yellow
}

# 2. Create CloudWatch dashboard
Write-Host "Creating CloudWatch dashboard..." -ForegroundColor Yellow

$dashboardName = "MedTranslate-$Environment"
$dashboardBody = @"
{
    "widgets": [
        {
            "type": "text",
            "x": 0,
            "y": 0,
            "width": 24,
            "height": 1,
            "properties": {
                "markdown": "# MedTranslate AI - $Environment Environment"
            }
        },
        {
            "type": "metric",
            "x": 0,
            "y": 1,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/Lambda", "Invocations", "FunctionName", "MedTranslate-Auth-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-Translation-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-Storage-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-WebSocket-Connect-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-WebSocket-Disconnect-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-WebSocket-Message-$Environment" ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "$Region",
                "title": "Lambda Invocations",
                "period": 300,
                "stat": "Sum"
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 1,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/Lambda", "Errors", "FunctionName", "MedTranslate-Auth-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-Translation-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-Storage-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-WebSocket-Connect-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-WebSocket-Disconnect-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-WebSocket-Message-$Environment" ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "$Region",
                "title": "Lambda Errors",
                "period": 300,
                "stat": "Sum"
            }
        },
        {
            "type": "metric",
            "x": 0,
            "y": 7,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/Lambda", "Duration", "FunctionName", "MedTranslate-Auth-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-Translation-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-Storage-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-WebSocket-Connect-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-WebSocket-Disconnect-$Environment" ],
                    [ ".", ".", ".", "MedTranslate-WebSocket-Message-$Environment" ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "$Region",
                "title": "Lambda Duration",
                "period": 300,
                "stat": "Average"
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 7,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/ApiGateway", "Count", "ApiName", "MedTranslate-API-$Environment" ],
                    [ ".", "4XXError", ".", "." ],
                    [ ".", "5XXError", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "$Region",
                "title": "API Gateway Requests",
                "period": 300,
                "stat": "Sum"
            }
        },
        {
            "type": "metric",
            "x": 0,
            "y": 13,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "$sessionsTableName" ],
                    [ ".", "ConsumedWriteCapacityUnits", ".", "." ],
                    [ ".", "ConsumedReadCapacityUnits", ".", "$usersTableName" ],
                    [ ".", "ConsumedWriteCapacityUnits", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "$Region",
                "title": "DynamoDB Capacity",
                "period": 300,
                "stat": "Sum"
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 13,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/S3", "BucketSizeBytes", "BucketName", "$secureStorageBucketName", "StorageType", "StandardStorage" ],
                    [ ".", ".", ".", "$modelsBucketName", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "$Region",
                "title": "S3 Bucket Size",
                "period": 86400,
                "stat": "Average"
            }
        }
    ]
}
"@

# Create or update dashboard
aws cloudwatch put-dashboard `
    --dashboard-name $dashboardName `
    --dashboard-body $dashboardBody `
    --region $Region

Write-Host "CloudWatch dashboard created: $dashboardName" -ForegroundColor Green

# 3. Create CloudWatch alarms
Write-Host "Creating CloudWatch alarms..." -ForegroundColor Yellow

# Lambda error alarms
$lambdaFunctions = @(
    "MedTranslate-Auth-$Environment",
    "MedTranslate-Translation-$Environment",
    "MedTranslate-Storage-$Environment",
    "MedTranslate-WebSocket-Connect-$Environment",
    "MedTranslate-WebSocket-Disconnect-$Environment",
    "MedTranslate-WebSocket-Message-$Environment"
)

foreach ($function in $lambdaFunctions) {
    Write-Host "Creating error alarm for $function..." -ForegroundColor Yellow
    
    # Create error alarm
    aws cloudwatch put-metric-alarm `
        --alarm-name "$function-Errors" `
        --alarm-description "Alarm when $function has errors" `
        --metric-name Errors `
        --namespace AWS/Lambda `
        --statistic Sum `
        --dimensions Name=FunctionName,Value=$function `
        --period 300 `
        --evaluation-periods 1 `
        --threshold 1 `
        --comparison-operator GreaterThanOrEqualToThreshold `
        --alarm-actions $snsTopicArn `
        --region $Region
    
    # Create duration alarm
    aws cloudwatch put-metric-alarm `
        --alarm-name "$function-Duration" `
        --alarm-description "Alarm when $function duration is high" `
        --metric-name Duration `
        --namespace AWS/Lambda `
        --statistic Average `
        --dimensions Name=FunctionName,Value=$function `
        --period 300 `
        --evaluation-periods 3 `
        --threshold 5000 `
        --comparison-operator GreaterThanOrEqualToThreshold `
        --alarm-actions $snsTopicArn `
        --region $Region
}

# API Gateway 4XX error alarm
Write-Host "Creating API Gateway 4XX error alarm..." -ForegroundColor Yellow
aws cloudwatch put-metric-alarm `
    --alarm-name "MedTranslate-API-$Environment-4XXErrors" `
    --alarm-description "Alarm when API Gateway has 4XX errors" `
    --metric-name 4XXError `
    --namespace AWS/ApiGateway `
    --statistic Sum `
    --dimensions Name=ApiName,Value="MedTranslate-API-$Environment" `
    --period 300 `
    --evaluation-periods 1 `
    --threshold 10 `
    --comparison-operator GreaterThanOrEqualToThreshold `
    --alarm-actions $snsTopicArn `
    --region $Region

# API Gateway 5XX error alarm
Write-Host "Creating API Gateway 5XX error alarm..." -ForegroundColor Yellow
aws cloudwatch put-metric-alarm `
    --alarm-name "MedTranslate-API-$Environment-5XXErrors" `
    --alarm-description "Alarm when API Gateway has 5XX errors" `
    --metric-name 5XXError `
    --namespace AWS/ApiGateway `
    --statistic Sum `
    --dimensions Name=ApiName,Value="MedTranslate-API-$Environment" `
    --period 300 `
    --evaluation-periods 1 `
    --threshold 1 `
    --comparison-operator GreaterThanOrEqualToThreshold `
    --alarm-actions $snsTopicArn `
    --region $Region

# DynamoDB throttling alarms
foreach ($table in @($sessionsTableName, $usersTableName)) {
    Write-Host "Creating DynamoDB throttling alarm for $table..." -ForegroundColor Yellow
    aws cloudwatch put-metric-alarm `
        --alarm-name "$table-ReadThrottleEvents" `
        --alarm-description "Alarm when $table has read throttle events" `
        --metric-name ReadThrottleEvents `
        --namespace AWS/DynamoDB `
        --statistic Sum `
        --dimensions Name=TableName,Value=$table `
        --period 300 `
        --evaluation-periods 1 `
        --threshold 1 `
        --comparison-operator GreaterThanOrEqualToThreshold `
        --alarm-actions $snsTopicArn `
        --region $Region
    
    aws cloudwatch put-metric-alarm `
        --alarm-name "$table-WriteThrottleEvents" `
        --alarm-description "Alarm when $table has write throttle events" `
        --metric-name WriteThrottleEvents `
        --namespace AWS/DynamoDB `
        --statistic Sum `
        --dimensions Name=TableName,Value=$table `
        --period 300 `
        --evaluation-periods 1 `
        --threshold 1 `
        --comparison-operator GreaterThanOrEqualToThreshold `
        --alarm-actions $snsTopicArn `
        --region $Region
}

# 4. Create custom metrics for application monitoring
Write-Host "Creating custom metrics for application monitoring..." -ForegroundColor Yellow

# Create CloudWatch Logs metric filters
$logGroups = @(
    "/aws/lambda/MedTranslate-Auth-$Environment",
    "/aws/lambda/MedTranslate-Translation-$Environment",
    "/aws/lambda/MedTranslate-Storage-$Environment",
    "/aws/lambda/MedTranslate-WebSocket-Connect-$Environment",
    "/aws/lambda/MedTranslate-WebSocket-Disconnect-$Environment",
    "/aws/lambda/MedTranslate-WebSocket-Message-$Environment"
)

foreach ($logGroup in $logGroups) {
    # Check if log group exists
    $logGroupExists = $false
    try {
        $logGroupCheck = aws logs describe-log-groups --log-group-name-prefix $logGroup --region $Region | ConvertFrom-Json
        foreach ($group in $logGroupCheck.logGroups) {
            if ($group.logGroupName -eq $logGroup) {
                $logGroupExists = $true
                break
            }
        }
    } catch {
        $logGroupExists = $false
    }
    
    if ($logGroupExists) {
        Write-Host "Creating metric filter for $logGroup..." -ForegroundColor Yellow
        
        # Create metric filter for errors
        aws logs put-metric-filter `
            --log-group-name $logGroup `
            --filter-name "ErrorFilter" `
            --filter-pattern "ERROR" `
            --metric-transformations `
                metricName="ErrorCount",metricNamespace="MedTranslate/$Environment",metricValue="1" `
            --region $Region
        
        # Create metric filter for warnings
        aws logs put-metric-filter `
            --log-group-name $logGroup `
            --filter-name "WarningFilter" `
            --filter-pattern "WARN" `
            --metric-transformations `
                metricName="WarningCount",metricNamespace="MedTranslate/$Environment",metricValue="1" `
            --region $Region
    } else {
        Write-Host "Log group $logGroup does not exist. Skipping metric filter creation." -ForegroundColor Yellow
    }
}

# 5. Create CloudWatch Logs Insights queries
Write-Host "Creating CloudWatch Logs Insights queries..." -ForegroundColor Yellow

$queriesJson = @"
[
    {
        "queryName": "MedTranslate-$Environment-Errors",
        "queryString": "fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 100"
    },
    {
        "queryName": "MedTranslate-$Environment-Warnings",
        "queryString": "fields @timestamp, @message | filter @message like /WARN/ | sort @timestamp desc | limit 100"
    },
    {
        "queryName": "MedTranslate-$Environment-APILatency",
        "queryString": "fields @timestamp, @message | filter @message like /API request completed/ | parse @message /API request completed in (?<latency>\\d+)ms/ | stats avg(latency), max(latency), min(latency) by bin(30m)"
    },
    {
        "queryName": "MedTranslate-$Environment-TranslationRequests",
        "queryString": "fields @timestamp, @message | filter @message like /Translation request/ | stats count() by bin(1h)"
    },
    {
        "queryName": "MedTranslate-$Environment-SessionActivity",
        "queryString": "fields @timestamp, @message | filter @message like /Session/ | parse @message /Session (?<sessionId>[a-zA-Z0-9-]+) (?<action>.*)/ | stats count() by sessionId, action"
    }
]
"@

$queriesFile = Join-Path $env:TEMP "cloudwatch-queries.json"
$queriesJson | Out-File -FilePath $queriesFile -Encoding utf8

# Save queries
foreach ($query in (Get-Content $queriesFile | ConvertFrom-Json)) {
    Write-Host "Saving query: $($query.queryName)..." -ForegroundColor Yellow
    
    aws logs put-query-definition `
        --name $query.queryName `
        --query-string $query.queryString `
        --region $Region
}

# Clean up temporary file
Remove-Item -Path $queriesFile -Force

Write-Host "Monitoring configuration completed successfully!" -ForegroundColor Green
Write-Host "The following monitoring components have been set up:" -ForegroundColor Cyan
Write-Host "1. SNS topic for alarms: $snsTopicArn" -ForegroundColor Yellow
Write-Host "2. CloudWatch dashboard: $dashboardName" -ForegroundColor Yellow
Write-Host "3. CloudWatch alarms for Lambda functions, API Gateway, and DynamoDB" -ForegroundColor Yellow
Write-Host "4. Custom metrics for application monitoring" -ForegroundColor Yellow
Write-Host "5. CloudWatch Logs Insights queries" -ForegroundColor Yellow

Write-Host "To view the dashboard, go to:" -ForegroundColor Cyan
Write-Host "https://$Region.console.aws.amazon.com/cloudwatch/home?region=$Region#dashboards:name=$dashboardName" -ForegroundColor Yellow
