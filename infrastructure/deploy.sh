#!/bin/bash
# MedTranslate AI Infrastructure Deployment Script

set -e

# Default environment
ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
STACK_NAME="medtranslate-$ENVIRONMENT"
DEPLOYMENT_BUCKET="medtranslate-deployment-$ENVIRONMENT"

echo "Deploying MedTranslate AI infrastructure to $ENVIRONMENT environment in $REGION region"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if deployment bucket exists, create if not
if ! aws s3 ls "s3://$DEPLOYMENT_BUCKET" --region $REGION &> /dev/null; then
    echo "Creating deployment bucket: $DEPLOYMENT_BUCKET"
    aws s3 mb "s3://$DEPLOYMENT_BUCKET" --region $REGION
    
    # Enable versioning on the bucket
    aws s3api put-bucket-versioning \
        --bucket $DEPLOYMENT_BUCKET \
        --versioning-configuration Status=Enabled \
        --region $REGION
fi

# Package Lambda functions
echo "Packaging Lambda functions..."

# Create temporary directory for packaging
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Auth Lambda
echo "Packaging Auth Lambda..."
mkdir -p $TEMP_DIR/auth
cp -r ../backend/lambda/auth/* $TEMP_DIR/auth/
cp -r ../backend/node_modules $TEMP_DIR/auth/
cd $TEMP_DIR/auth
zip -r auth.zip .
aws s3 cp auth.zip "s3://$DEPLOYMENT_BUCKET/$ENVIRONMENT/lambda/auth.zip" --region $REGION
cd -

# Translation Lambda
echo "Packaging Translation Lambda..."
mkdir -p $TEMP_DIR/translation
cp -r ../backend/lambda/translation/* $TEMP_DIR/translation/
cp -r ../backend/node_modules $TEMP_DIR/translation/
cd $TEMP_DIR/translation
zip -r translation.zip .
aws s3 cp translation.zip "s3://$DEPLOYMENT_BUCKET/$ENVIRONMENT/lambda/translation.zip" --region $REGION
cd -

# Storage Lambda
echo "Packaging Storage Lambda..."
mkdir -p $TEMP_DIR/storage
cp -r ../backend/lambda/storage/* $TEMP_DIR/storage/
cp -r ../backend/lambda/auth/auth-service.js $TEMP_DIR/storage/
cp -r ../backend/node_modules $TEMP_DIR/storage/
cd $TEMP_DIR/storage
zip -r storage.zip .
aws s3 cp storage.zip "s3://$DEPLOYMENT_BUCKET/$ENVIRONMENT/lambda/storage.zip" --region $REGION
cd -

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack: $STACK_NAME"

# Deploy main infrastructure stack
aws cloudformation deploy \
    --template-file cloudformation/main.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        Environment=$ENVIRONMENT \
        RetentionPeriodDays=30 \
        DeploymentBucket=$DEPLOYMENT_BUCKET \
    --capabilities CAPABILITY_IAM \
    --region $REGION

# Get Lambda function ARNs
AUTH_FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='AuthFunctionArn'].OutputValue" --output text)
CREATE_SESSION_FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='CreateSessionFunctionArn'].OutputValue" --output text)
GENERATE_PATIENT_TOKEN_FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='GeneratePatientTokenFunctionArn'].OutputValue" --output text)
JOIN_SESSION_FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='JoinSessionFunctionArn'].OutputValue" --output text)
TRANSLATE_TEXT_FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='TranslateTextFunctionArn'].OutputValue" --output text)
TRANSLATE_AUDIO_FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='TranslateAudioFunctionArn'].OutputValue" --output text)
STORE_TRANSCRIPT_FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='StoreTranscriptFunctionArn'].OutputValue" --output text)
GET_SESSION_DATA_FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='GetSessionDataFunctionArn'].OutputValue" --output text)

# Deploy API Gateway stack
aws cloudformation deploy \
    --template-file cloudformation/api-gateway.yaml \
    --stack-name "$STACK_NAME-api" \
    --parameter-overrides \
        Environment=$ENVIRONMENT \
        AuthFunctionArn=$AUTH_FUNCTION_ARN \
        CreateSessionFunctionArn=$CREATE_SESSION_FUNCTION_ARN \
        GeneratePatientTokenFunctionArn=$GENERATE_PATIENT_TOKEN_FUNCTION_ARN \
        JoinSessionFunctionArn=$JOIN_SESSION_FUNCTION_ARN \
        TranslateTextFunctionArn=$TRANSLATE_TEXT_FUNCTION_ARN \
        TranslateAudioFunctionArn=$TRANSLATE_AUDIO_FUNCTION_ARN \
        StoreTranscriptFunctionArn=$STORE_TRANSCRIPT_FUNCTION_ARN \
        GetSessionDataFunctionArn=$GET_SESSION_DATA_FUNCTION_ARN \
    --capabilities CAPABILITY_IAM \
    --region $REGION

# Get API Gateway endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME-api" --region $REGION --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text)

echo "Deployment completed successfully!"
echo "API Endpoint: $API_ENDPOINT"
