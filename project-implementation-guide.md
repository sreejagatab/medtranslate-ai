# MedTranslate AI: Implementation Guide

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       Client Devices                            │
│  ┌───────────────┐              ┌──────────────────────┐        │
│  │ Patient Mobile │              │ Healthcare Provider  │        │
│  │ Application    │              │ Application/Dashboard │        │
│  └───────┬───────┘              └──────────┬───────────┘        │
└─────────┼──────────────────────────────────┼─────────────────────┘
          │                                  │
          │       5G / Wi-Fi / LTE           │
          │                                  │
┌─────────┼──────────────────────────────────┼─────────────────────┐
│         │        Edge Computing Layer      │                     │
│  ┌──────▼──────────────────────────────────▼──────┐              │
│  │                                                │              │
│  │  ┌──────────────┐        ┌────────────────┐    │              │
│  │  │ Local Model  │        │ Audio/Video    │    │              │
│  │  │ Inference    │        │ Processing     │    │              │
│  │  └──────┬───────┘        └────────┬───────┘    │              │
│  │         │                         │            │              │
│  │  ┌──────▼─────────────────────────▼──────┐     │              │
│  │  │         Local Cache & Storage         │     │              │
│  │  └──────────────────┬───────────────────┬┘     │              │
│  │                     │                   │      │              │
│  └─────────────────────┼───────────────────┼──────┘              │
│                        │                   │                     │
└────────────────────────┼───────────────────┼─────────────────────┘
                         │                   │
                  Secure │                   │ Sync
                Connection│                   │ & Updates
                         │                   │
┌────────────────────────┼───────────────────┼─────────────────────┐
│                        │    AWS Cloud      │                     │
│  ┌────────────────┐    │    ┌─────────────────────────┐          │
│  │ API Gateway    ◄────┘    │                         │          │
│  └───────┬────────┘         │  ┌─────────────────┐    │          │
│          │                  │  │  AWS Lambda     │    │          │
│  ┌───────▼────────┐         │  │  Functions      │    │          │
│  │ Authentication │         │  └────────┬────────┘    │          │
│  │ & Authorization│         │           │             │          │
│  └───────┬────────┘         │  ┌────────▼────────┐    │          │
│          │                  │  │  Amazon Bedrock │    │          │
│  ┌───────▼────────┐         │  │  LLMs & Services│    │          │
│  │ Load Balancing │         │  └────────┬────────┘    │          │
│  └───────┬────────┘         │           │             │          │
│          │                  │  ┌────────▼────────┐    │          │
│  ┌───────▼────────┐         │  │  Medical        │    │          │
│  │ Application    │         │  │  Knowledge Base │    │          │
│  │ Services       ├─────────┘  └────────┬────────┘    │          │
│  └───────┬────────┘                     │             │          │
│          │                      ┌───────▼─────────┐   │          │
│  ┌───────▼────────┐            │                 │   │          │
│  │ Data Storage   │◄───────────┤  Amazon         │   │          │
│  │ & Analytics    │            │  SageMaker      │   │          │
│  └───────┬────────┘            │                 │   │          │
│          │                     └─────────────────┘   │          │
│  ┌───────▼────────┐                                  │          │
│  │ IoT Greengrass │                                  │          │
│  │ Management     ├──────────────────────────────────┘          │
│  └────────────────┘                                             │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
medtranslate-ai/
├── .github/
│   └── workflows/         # CI/CD pipeline configurations
├── infrastructure/        # IaC (Terraform/CloudFormation)
│   ├── bedrock/          # Amazon Bedrock configuration
│   ├── sagemaker/        # SageMaker deployment templates
│   ├── lambda/           # Lambda function infrastructure
│   ├── dynamodb/         # Database tables definition
│   ├── iot/              # IoT Greengrass configuration
│   └── networking/       # VPC, security groups, etc.
├── backend/
│   ├── api/              # API Gateway definitions
│   ├── lambda/           # Lambda functions code
│   │   ├── translation/  # Translation service
│   │   ├── auth/         # Authentication service
│   │   └── analytics/    # Usage analytics service
│   ├── models/           # AI model configuration
│   │   ├── prompts/      # Prompt engineering templates
│   │   ├── fine-tuning/  # Fine-tuning scripts for medical domain
│   │   └── validation/   # Translation quality validation
│   └── database/         # Database access layer
├── edge/
│   ├── runtime/          # Edge runtime environment
│   ├── models/           # Optimized models for edge
│   ├── cache/            # Local caching implementation
│   └── sync/             # Cloud synchronization logic
├── frontend/
│   ├── provider-app/     # Healthcare provider application
│   │   ├── src/          # React Native source code
│   │   ├── assets/       # Images, fonts, etc.
│   │   └── tests/        # Frontend tests
│   ├── patient-app/      # Patient mobile application
│   │   ├── src/          # React Native source code
│   │   ├── assets/       # Images, fonts, etc.
│   │   └── tests/        # Frontend tests
│   └── shared/           # Shared UI components
├── docs/
│   ├── architecture/     # Architecture documentation
│   ├── api/              # API documentation
│   ├── deployment/       # Deployment guides
│   └── user-guides/      # User manuals
├── scripts/              # Utility scripts
├── tests/                # Integration and end-to-end tests
├── .gitignore            # Git ignore file
├── README.md             # Project overview
└── package.json          # Project dependencies
```

## Development Timeline & Milestones

| Phase | Key Deliverables |
|------|-------|------------------|
| | Project Setup | Repository structure, AWS account setup, Architecture diagram |
| 1 | Core AI Integration | Basic Amazon Bedrock integration, Translation pipeline prototype |
| 1  | Medical Knowledge Base | Initial medical terminology dataset, Basic RAG implementation |
| 2  | Edge Computing | Edge runtime environment, Basic local inference |
| 2  | Network Implementation | 5G/network configuration, Audio streaming prototype |
| 3 | User Interface | Basic mobile interfaces for patients and providers |
| 3  | Security & Compliance | Authentication system, Basic encryption implementation |
| 4  | Testing & Optimization | Performance testing, User testing with sample scenarios |
| 4  | Documentation & Demo | Technical documentation completion, Demo video production |

## Technical Specifications

### AWS Services Configuration

#### Amazon Bedrock

```json
{
  "modelId": "amazon.titan-text-express-v1",
  "contentType": "application/json",
  "accept": "application/json",
  "inferenceConfig": {
    "temperature": 0.2,
    "topP": 0.9,
    "maxTokens": 1024
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0077CC',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  connectionText: {
    color: '#ffffff',
    fontSize: 12,
  },
  contextBanner: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  contextText: {
    color: '#0D47A1',
    fontSize: 14,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    opacity: 0.7,
  },
  emptyStateText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#757575',
    fontSize: 16,
    paddingHorizontal: 24,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  endButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e53935',
  },
  endButtonText: {
    color: '#e53935',
    fontWeight: '500',
  },
  helpButton: {
    padding: 8,
  },
});,
  "customizations": {
    "promptTemplate": "Translate the following medical conversation from {source_language} to {target_language}. Maintain medical accuracy and appropriate tone: {text}",
    "knowledgeBase": "medical-terminology-kb"
  }
}
```

#### AWS Lambda Function Configuration

```yaml
TranslationFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: translation/handler.processTranslation
    Runtime: nodejs18.x
    MemorySize: 1024
    Timeout: 10
    Environment:
      Variables:
        BEDROCK_MODEL_ID: amazon.titan-text-express-v1
        MEDICAL_KB_ID: medical-terminology-kb
        LOG_LEVEL: INFO
    Policies:
      - AWSLambdaBasicExecutionRole
      - BedrockInvokePolicy
      - DynamoDBCrudPolicy:
          TableName: !Ref TranslationMemoryTable
```

#### AWS IoT Greengrass Configuration

```yaml
CoreDefinition:
  Type: AWS::Greengrass::CoreDefinition
  Properties:
    Name: MedTranslateEdgeCore
    InitialVersion:
      Cores:
        - Id: MedicalEdgeCore
          CertificateArn: !Ref EdgeDeviceCertificate
          ThingArn: !Ref EdgeDeviceThing
          Connectivity:
            MaximumMessageSize: 262144
            MQTTConfiguration:
              MaximumQOS: 1

FunctionDefinition:
  Type: AWS::Greengrass::FunctionDefinition
  Properties:
    Name: MedTranslateEdgeFunctions
    InitialVersion:
      Functions:
        - Id: TranslationInference
          FunctionArn: !GetAtt TranslationInferenceFunction.Arn
          FunctionConfiguration:
            Pinned: true
            Timeout: 5
            MemorySize: 512
            Environment:
              Variables:
                MODEL_PATH: /models/medical_translation_model.bin
                CACHE_PATH: /cache/translation_memory
```

### Edge Device Specifications

**Recommended Hardware:**
- Processor: Quad-core ARM Cortex-A72 or better
- RAM: 4GB minimum (8GB recommended)
- Storage: 32GB minimum (64GB recommended) with high-speed flash storage
- Connectivity: 5G modem, Wi-Fi 6, Bluetooth 5.0
- Power: Battery backup with at least 4 hours runtime

**Software Stack:**
- OS: Linux-based (Ubuntu 22.04 LTS or specialized edge OS)
- Runtime: AWS IoT Greengrass Core
- Container Engine: Docker or containerd
- Edge AI Framework: TensorFlow Lite or ONNX Runtime
- Security: TPM for secure boot and key storage

## Implementation Guide

### Phase 1: Project Setup and AWS Configuration

#### Step 1: Set up GitHub repository
```bash
# Initialize the repository
git init medtranslate-ai
cd medtranslate-ai

# Create basic structure
mkdir -p .github/workflows infrastructure/bedrock infrastructure/sagemaker backend/api backend/lambda frontend/provider-app frontend/patient-app docs/architecture edge/runtime

# Create initial README
cat > README.md << 'EOF'
# MedTranslate AI

Real-time medical translation system using AWS Generative AI and Edge Computing

## Overview
MedTranslate AI bridges language barriers in healthcare settings by providing accurate, real-time translation between healthcare providers and patients. The system combines AWS generative AI services with edge computing and 5G connectivity for reliable, low-latency operation.

## Key Features
- Real-time medical conversation translation
- Support for medical terminology and context
- Edge computing for privacy and low latency
- Compatible with 5G and variable network conditions
- HIPAA-compliant security implementation

## Getting Started
Instructions for setting up and deploying MedTranslate AI...
EOF

# Create initial .gitignore
cat > .gitignore << 'EOF'
# Node.js
node_modules/
npm-debug.log
yarn-error.log
yarn-debug.log
.pnpm-debug.log

# Python
__pycache__/
*.py[cod]
*$py.class
.pytest_cache/
.coverage
htmlcov/
.tox/
.venv/
venv/
ENV/

# React Native
.expo/
dist/
web-build/
.gradle/
local.properties
*.iml
*.hprof

# AWS
.aws-sam/
samconfig.toml
packaged.yaml
.terraform/
terraform.tfstate*
.terragrunt-cache/

# MacOS
.DS_Store

# IDE
.idea/
.vscode/
*.swp
*.swo

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
EOF

# Initial commit
git add .
git commit -m "Initial project structure"
```

#### Step 2: Set up AWS environment

```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Create an S3 bucket for deployment artifacts
aws s3 mb s3://medtranslate-ai-artifacts --region us-east-1

# Create IAM roles for deployment
cat > infrastructure/iam-roles.yaml << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        - arn:aws:iam::aws:policy/AmazonBedrockFullAccess
        - arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

  EdgeDeviceRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: greengrass.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/GreengrassServiceRole
        - arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

Outputs:
  LambdaRoleArn:
    Description: ARN of Lambda execution role
    Value: !GetAtt LambdaExecutionRole.Arn
  EdgeDeviceRoleArn:
    Description: ARN of Edge device role
    Value: !GetAtt EdgeDeviceRole.Arn
EOF

# Deploy IAM roles
aws cloudformation deploy --template-file infrastructure/iam-roles.yaml --stack-name medtranslate-ai-iam-roles --capabilities CAPABILITY_NAMED_IAM
```

### Phase 2: Core AI Development

#### Step 1: Set up Amazon Bedrock client

Create a Lambda function to interact with Amazon Bedrock:

```javascript
// backend/lambda/translation/bedrock-client.js
const AWS = require('aws-sdk');

// Initialize Bedrock client
const bedrock = new AWS.BedrockRuntime();

async function translateText(sourceLanguage, targetLanguage, text, medicalContext = 'general') {
  // Prepare prompt for the model
  const prompt = `You are an expert medical translator specializing in healthcare communications.
Translate the following text from ${sourceLanguage} to ${targetLanguage}.
Maintain medical accuracy and appropriate tone.
Medical context: ${medicalContext}
Text to translate: ${text}`;

  const params = {
    modelId: process.env.BEDROCK_MODEL_ID || 'amazon.titan-text-express-v1',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      inputText: prompt,
      textGenerationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxTokenCount: 1024
      }
    })
  };

  try {
    const response = await bedrock.invokeModel(params).promise();
    const result = JSON.parse(response.body.toString());
    return {
      translatedText: result.results[0].outputText.trim(),
      confidence: result.results[0].completionReason === 'FINISH' ? 'high' : 'medium'
    };
  } catch (error) {
    console.error('Error calling Bedrock:', error);
    throw new Error(`Translation failed: ${error.message}`);
  }
}

module.exports = { translateText };
```

#### Step 2: Create medical knowledge base integration

```javascript
// backend/lambda/translation/medical-kb.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Medical terminology verification
async function verifyMedicalTerms(text, sourceLanguage, targetLanguage) {
  // Extract potential medical terms from the text
  const medicalTerms = extractMedicalTerms(text);
  
  // Check each term against the medical knowledge base
  const verifiedTerms = [];
  for (const term of medicalTerms) {
    const verified = await lookupTermInKB(term, sourceLanguage, targetLanguage);
    if (verified) {
      verifiedTerms.push(verified);
    }
  }
  
  return verifiedTerms;
}

// Extract potential medical terms using regex patterns
function extractMedicalTerms(text) {
  // This is a simplified example - real implementation would be more sophisticated
  const medicalPatterns = [
    /\b[A-Z][a-z]+ (disease|syndrome|disorder)\b/g,
    /\b[A-Z][a-z]+ (test|scan|procedure)\b/g,
    /\b[A-Z][a-z]+ (medication|drug|therapy)\b/g
  ];
  
  let terms = [];
  for (const pattern of medicalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      terms = [...terms, ...matches];
    }
  }
  
  return [...new Set(terms)]; // Remove duplicates
}

// Look up a term in the medical knowledge base
async function lookupTermInKB(term, sourceLanguage, targetLanguage) {
  try {
    const params = {
      TableName: process.env.MEDICAL_TERMINOLOGY_TABLE,
      Key: {
        term_source: `${term.toLowerCase()}:${sourceLanguage}`
      }
    };
    
    const result = await dynamoDB.get(params).promise();
    if (result.Item && result.Item.translations) {
      const targetTranslation = result.Item.translations.find(t => 
        t.language === targetLanguage
      );
      
      if (targetTranslation) {
        return {
          sourceTerm: term,
          targetTerm: targetTranslation.term,
          confidence: targetTranslation.confidence || 'high'
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error looking up medical term:', error);
    return null;
  }
}

module.exports = { verifyMedicalTerms };
```

### Phase 3: Edge Computing Implementation

#### Step 1: Set up edge runtime environment

Create a Dockerfile for the edge device:

```dockerfile
# edge/runtime/Dockerfile
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    nodejs \
    npm \
    curl \
    wget \
    unzip \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install AWS IoT Greengrass
RUN curl -s https://d2s8p88vqu9w66.cloudfront.net/releases/greengrass-nucleus-latest.zip > greengrass-nucleus-latest.zip \
    && unzip greengrass-nucleus-latest.zip -d GreengrassInstaller \
    && rm greengrass-nucleus-latest.zip

# Create directories for models and cache
RUN mkdir -p /models /cache /config /logs

# Copy the edge application code
COPY edge/app /app
WORKDIR /app

# Install Node.js dependencies
RUN npm install

# Install Python dependencies
RUN pip3 install -r requirements.txt

# Set up entrypoint script
COPY edge/runtime/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

#### Step 2: Create edge application entry point

```bash
# edge/runtime/entrypoint.sh
#!/bin/bash
set -e

# Initialize AWS IoT Greengrass
echo "Initializing AWS IoT Greengrass..."
java -Droot=/greengrass/v2 -Dlog.store=FILE \
  -jar /GreengrassInstaller/lib/Greengrass.jar \
  --init-config /config/config.yaml \
  --component-default-user ggc_user:ggc_group \
  --setup-system-service true

# Start the edge application
echo "Starting MedTranslate Edge Application..."
cd /app
node server.js
```

#### Step 3: Create edge application server

```javascript
// edge/app/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { translateLocally } = require('./translation');
const { syncWithCloud } = require('./sync');
const { cacheManager } = require('./cache');

// Initialize express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3000;

// Initialize components
let isOnline = false;
const connectionCheckInterval = setInterval(checkCloudConnection, 30000);

// API endpoints
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    onlineStatus: isOnline ? 'connected' : 'offline',
    modelStatus: 'loaded',
    version: '1.0.0'
  });
});

### Phase 5: Security and Compliance Implementation

#### Step 1: Set up Authentication Service

```javascript
// backend/lambda/auth/auth-service.js
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const secretsManager = new AWS.SecretsManager();

// Constants
const TOKEN_EXPIRY = '24h'; // Provider session token expiry
const TEMP_TOKEN_EXPIRY = '4h'; // Patient temporary token expiry

// Get JWT secret from AWS Secrets Manager
async function getJwtSecret() {
  try {
    const data = await secretsManager.getSecretValue({
      SecretId: process.env.JWT_SECRET_ARN
    }).promise();
    
    return JSON.parse(data.SecretString).secret;
  } catch (error) {
    console.error('Error retrieving JWT secret:', error);
    throw new Error('Authentication configuration error');
  }
}

// Generate a provider JWT token
async function generateProviderToken(providerId, name, role) {
  const secret = await getJwtSecret();
  
  const payload = {
    sub: providerId,
    name,
    role,
    type: 'provider'
  };
  
  return jwt.sign(payload, secret, { expiresIn: TOKEN_EXPIRY });
}

// Generate a temporary patient session token
async function generatePatientSessionToken(sessionId, language) {
  const secret = await getJwtSecret();
  
  // Generate a random session code for easy joining
  const sessionCode = crypto.randomInt(100000, 999999).toString();
  
  const payload = {
    sub: `patient-${crypto.randomUUID()}`,
    sessionId,
    sessionCode,
    language,
    type: 'patient'
  };
  
  const token = jwt.sign(payload, secret, { expiresIn: TEMP_TOKEN_EXPIRY });
  
  // Store the session information
  await dynamoDB.put({
    TableName: process.env.SESSIONS_TABLE,
    Item: {
      sessionId,
      sessionCode,
      patientToken: token,
      language,
      createdAt: new Date().toISOString(),
      status: 'active'
    }
  }).promise();
  
  return { token, sessionCode };
}

// Verify and decode a JWT token
async function verifyToken(token) {
  try {
    const secret = await getJwtSecret();
    return jwt.verify(token, secret);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Join a session with session code
async function joinSessionWithCode(sessionCode) {
  try {
    // Query for the session
    const result = await dynamoDB.query({
      TableName: process.env.SESSIONS_TABLE,
      IndexName: 'SessionCodeIndex',
      KeyConditionExpression: 'sessionCode = :code',
      ExpressionAttributeValues: {
        ':code': sessionCode,
        ':status': 'active'
      },
      FilterExpression: 'status = :status'
    }).promise();
    
    if (!result.Items || result.Items.length === 0) {
      return { success: false, error: 'Invalid session code or expired session' };
    }
    
    const session = result.Items[0];
    
    // Check if the token is still valid by trying to verify it
    const decodedToken = await verifyToken(session.patientToken);
    if (!decodedToken) {
      return { success: false, error: 'Session has expired' };
    }
    
    return {
      success: true,
      token: session.patientToken,
      sessionId: session.sessionId,
      language: session.language
    };
  } catch (error) {
    console.error('Error joining session:', error);
    return { success: false, error: 'Session join failed' };
  }
}

module.exports = {
  generateProviderToken,
  generatePatientSessionToken,
  verifyToken,
  joinSessionWithCode
};
```

#### Step 2: Create HIPAA-compliant secure storage service

```javascript
// backend/lambda/storage/secure-storage.js
const AWS = require('aws-sdk');
const crypto = require('crypto');

// Initialize AWS services
const s3 = new AWS.S3();
const kms = new AWS.KMS();

// Constants
const RETENTION_PERIOD_DAYS = 30; // Default retention period

// Generate a data encryption key (DEK) using AWS KMS
async function generateDataKey() {
  try {
    const result = await kms.generateDataKey({
      KeyId: process.env.KMS_KEY_ID,
      KeySpec: 'AES_256'
    }).promise();
    
    return {
      plaintextKey: result.Plaintext,
      encryptedKey: result.CiphertextBlob
    };
  } catch (error) {
    console.error('Error generating data key:', error);
    throw new Error('Encryption key generation failed');
  }
}

// Encrypt data using the data encryption key
function encryptData(data, key) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return {
      iv: iv.toString('base64'),
      encryptedData: encrypted
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Data encryption failed');
  }
}

// Store encrypted data in S3
async function storeEncryptedData(sessionId, dataType, data, metadata = {}) {
  try {
    // Generate a data key for this file
    const { plaintextKey, encryptedKey } = await generateDataKey();
    
    // Encrypt the data
    const { iv, encryptedData } = encryptData(data, plaintextKey);
    
    // Create the encryption envelope
    const encryptionEnvelope = {
      encryptedData,
      iv,
      encryptedKey: encryptedKey.toString('base64')
    };
    
    // Generate a unique key for this data
    const objectKey = `sessions/${sessionId}/${dataType}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    // Calculate expiration date based on retention period
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + RETENTION_PERIOD_DAYS);
    
    // Store in S3 with metadata
    await s3.putObject({
      Bucket: process.env.SECURE_STORAGE_BUCKET,
      Key: objectKey,
      Body: JSON.stringify(encryptionEnvelope),
      Metadata: {
        'session-id': sessionId,
        'data-type': dataType,
        'encrypted': 'true',
        'expiration-date': expirationDate.toISOString(),
        ...metadata
      },
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256' // Additional S3 server-side encryption
    }).promise();
    
    return { objectKey };
  } catch (error) {
    console.error('Error storing encrypted data:', error);
    throw new Error('Secure storage failed');
  }
}

// Retrieve and decrypt data from S3
async function retrieveEncryptedData(objectKey) {
  try {
    // Get the encrypted object from S3
    const result = await s3.getObject({
      Bucket: process.env.SECURE_STORAGE_BUCKET,
      Key: objectKey
    }).promise();
    
    const encryptionEnvelope = JSON.parse(result.Body.toString());
    
    // Decrypt the data key using KMS
    const decryptResult = await kms.decrypt({
      CiphertextBlob: Buffer.from(encryptionEnvelope.encryptedKey, 'base64'),
      KeyId: process.env.KMS_KEY_ID
    }).promise();
    
    const plaintextKey = decryptResult.Plaintext;
    
    // Decrypt the data
    const iv = Buffer.from(encryptionEnvelope.iv, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', plaintextKey, iv);
    
    let decrypted = decipher.update(encryptionEnvelope.encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return {
      data: decrypted,
      metadata: result.Metadata
    };
  } catch (error) {
    console.error('Error retrieving encrypted data:', error);
    throw new Error('Data retrieval failed');
  }
}

// Delete data based on retention policy
async function deleteExpiredData() {
  const now = new Date().toISOString();
  
  try {
    // List objects in the bucket
    const listParams = {
      Bucket: process.env.SECURE_STORAGE_BUCKET,
      Prefix: 'sessions/'
    };
    
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    
    if (listedObjects.Contents.length === 0) return;
    
    // Find objects that have expired
    const objectsToDelete = [];
    
    for (const object of listedObjects.Contents) {
      const metadata = await s3.headObject({
        Bucket: process.env.SECURE_STORAGE_BUCKET,
        Key: object.Key
      }).promise();
      
      if (metadata.Metadata['expiration-date'] && metadata.Metadata['expiration-date'] < now) {
        objectsToDelete.push({ Key: object.Key });
      }
    }
    
    // Delete expired objects
    if (objectsToDelete.length > 0) {
      await s3.deleteObjects({
        Bucket: process.env.SECURE_STORAGE_BUCKET,
        Delete: { Objects: objectsToDelete }
      }).promise();
      
      console.log(`Deleted ${objectsToDelete.length} expired objects`);
    }
  } catch (error) {
    console.error('Error in retention cleanup:', error);
    throw new Error('Retention cleanup failed');
  }
}

module.exports = {
  storeEncryptedData,
  retrieveEncryptedData,
  deleteExpiredData
};
```

### Phase 6: Testing and Optimization

#### Step 1: Create performance test suite

```javascript
// tests/performance/translation-latency.js
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { performance } = require('perf_hooks');

// Configure AWS SDK
AWS.config.update({ region: 'us-east-1' });

// Test configuration
const TEST_CONFIG = {
  iterations: 10,
  audioSamples: [
    { path: 'samples/short_sentence.wav', type: 'short' },
    { path: 'samples/medium_dialogue.wav', type: 'medium' },
    { path: 'samples/long_explanation.wav', type: 'long' }
  ],
  languagePairs: [
    { source: 'en', target: 'es', name: 'English to Spanish' },
    { source: 'en', target: 'zh', name: 'English to Chinese' },
    { source: 'es', target: 'en', name: 'Spanish to English' }
  ],
  networkConditions: [
    { name: 'optimal', latencyMs: 0, packetLoss: 0 },
    { name: 'good', latencyMs: 50, packetLoss: 0 },
    { name: 'average', latencyMs: 100, packetLoss: 0.01 },
    { name: 'poor', latencyMs: 200, packetLoss: 0.05 }
  ],
  edgeApiEndpoint: process.env.EDGE_API_ENDPOINT,
  cloudApiEndpoint: process.env.CLOUD_API_ENDPOINT
};

// Results storage
const results = {
  edge: [],
  cloud: [],
  summary: {}
};

// Helper to simulate network conditions
async function withNetworkCondition(condition, callback) {
  if (condition.latencyMs > 0) {
    await new Promise(resolve => setTimeout(resolve, condition.latencyMs));
  }
  
  // Simple packet loss simulation
  if (condition.packetLoss > 0 && Math.random() < condition.packetLoss) {
    throw new Error('Simulated packet loss');
  }
  
  return callback();
}

// Test edge translation
async function testEdgeTranslation(audioFile, sourceLanguage, targetLanguage, networkCondition) {
  const audioData = fs.readFileSync(path.join(__dirname, audioFile));
  const startTime = performance.now();
  
  try {
    const result = await withNetworkCondition(networkCondition, async () => {
      const response = await axios.post(`${TEST_CONFIG.edgeApiEndpoint}/translate`, {
        audioData: audioData.toString('base64'),
        sourceLanguage,
        targetLanguage,
        context: 'general'
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      return response.data;
    });
    
    const endTime = performance.now();
    
    return {
      success: true,
      latencyMs: endTime - startTime,
      translationLength: result.translatedText.length,
      confidence: result.confidence
    };
  } catch (error) {
    console.error('Edge translation error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test cloud translation
async function testCloudTranslation(audioFile, sourceLanguage, targetLanguage, networkCondition) {
  const audioData = fs.readFileSync(path.join(__dirname, audioFile));
  const startTime = performance.now();
  
  try {
    const result = await withNetworkCondition(networkCondition, async () => {
      const response = await axios.post(`${TEST_CONFIG.cloudApiEndpoint}/translate`, {
        audioData: audioData.toString('base64'),
        sourceLanguage,
        targetLanguage,
        context: 'general'
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      return response.data;
    });
    
    const endTime = performance.now();
    
    return {
      success: true,
      latencyMs: endTime - startTime,
      translationLength: result.translatedText.length,
      confidence: result.confidence
    };
  } catch (error) {
    console.error('Cloud translation error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the performance tests
async function runPerformanceTests() {
  console.log('Starting translation performance tests...');
  
  for (const audioSample of TEST_CONFIG.audioSamples) {
    console.log(`\nTesting with ${audioSample.type} audio sample: ${audioSample.path}`);
    
    for (const languagePair of TEST_CONFIG.languagePairs) {
      console.log(`\n${languagePair.name} (${languagePair.source} -> ${languagePair.target})`);
      
      for (const networkCondition of TEST_CONFIG.networkConditions) {
        console.log(`\nNetwork condition: ${networkCondition.name}`);
        console.log(`- Latency: ${networkCondition.latencyMs}ms, Packet Loss: ${networkCondition.packetLoss * 100}%`);
        
        // Run multiple iterations and collect results
        const edgeResults = [];
        const cloudResults = [];
        
        for (let i = 1; i <= TEST_CONFIG.iterations; i++) {
          console.log(`\nIteration ${i} of ${TEST_CONFIG.iterations}`);
          
          // Test edge translation
          console.log('Testing edge translation...');
          const edgeResult = await testEdgeTranslation(
            audioSample.path,
            languagePair.source,
            languagePair.target,
            networkCondition
          );
          
          if (edgeResult.success) {
            console.log(`Edge: ${edgeResult.latencyMs.toFixed(2)}ms, Confidence: ${edgeResult.confidence}`);
            edgeResults.push(edgeResult);
          } else {
            console.log(`Edge: Failed - ${edgeResult.error}`);
          }
          
          // Test cloud translation
          console.log('Testing cloud translation...');
          const cloudResult = await testCloudTranslation(
            audioSample.path,
            languagePair.source,
            languagePair.target,
            networkCondition
          );
          
          if (cloudResult.success) {
            console.log(`Cloud: ${cloudResult.latencyMs.toFixed(2)}ms, Confidence: ${cloudResult.confidence}`);
            cloudResults.push(cloudResult);
          } else {
            console.log(`Cloud: Failed - ${cloudResult.error}`);
          }
        }
        
        // Compute averages and store results
        if (edgeResults.length > 0) {
          const avgEdgeLatency = edgeResults.reduce((sum, r) => sum + r.latencyMs, 0) / edgeResults.length;
          const avgEdgeConfidence = edgeResults.reduce((sum, r) => sum + parseFloat(r.confidence), 0) / edgeResults.length;
          
          results.edge.push({
            audioType: audioSample.type,
            languagePair: `${languagePair.source}-${languagePair.target}`,
            networkCondition: networkCondition.name,
            avgLatencyMs: avgEdgeLatency,
            avgConfidence: avgEdgeConfidence,
            successRate: edgeResults.length / TEST_CONFIG.iterations
          });
          
          console.log(`\nEdge Average: ${avgEdgeLatency.toFixed(2)}ms, Confidence: ${avgEdgeConfidence.toFixed(2)}`);
        }
        
        if (cloudResults.length > 0) {
          const avgCloudLatency = cloudResults.reduce((sum, r) => sum + r.latencyMs, 0) / cloudResults.length;
          const avgCloudConfidence = cloudResults.reduce((sum, r) => sum + parseFloat(r.confidence), 0) / cloudResults.length;
          

// Translation endpoint
app.post('/translate', async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage, context } = req.body;
    
    // Check cache first
    const cachedTranslation = cacheManager.getCachedTranslation(
      text, sourceLanguage, targetLanguage, context
    );
    
    if (cachedTranslation) {
      return res.json({
        translatedText: cachedTranslation.translatedText,
        confidence: cachedTranslation.confidence,
        source: 'cache'
      });
    }
    
    // Perform local translation
    const result = await translateLocally(text, sourceLanguage, targetLanguage, context);
    
    // Cache the result
    cacheManager.cacheTranslation(
      text, sourceLanguage, targetLanguage, context, result
    );
    
    // Try to sync with cloud if online
    if (isOnline) {
      syncWithCloud.queueTranslation(text, sourceLanguage, targetLanguage, context, result);
    }
    
    res.json({
      ...result,
      source: 'local'
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for real-time translation
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'translate') {
        const result = await translateLocally(
          data.text, 
          data.sourceLanguage, 
          data.targetLanguage, 
          data.context
        );
        
        ws.send(JSON.stringify({
          type: 'translation',
          requestId: data.requestId,
          result
        }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Edge application server running on port ${PORT}`);
  
  // Initial cloud connection check
  checkCloudConnection();
});

// Check cloud connectivity
async function checkCloudConnection() {
  try {
    const result = await syncWithCloud.testConnection();
    isOnline = result.connected;
    
    if (isOnline) {
      // If we're online, sync cached data
      syncWithCloud.syncCachedData();
    }
    
    console.log(`Cloud connection status: ${isOnline ? 'online' : 'offline'}`);
  } catch (error) {
    isOnline = false;
    console.error('Error checking cloud connection:', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  clearInterval(connectionCheckInterval);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

### Phase 4: Mobile UI Development

#### Step 1: Set up React Native patient application

```jsx
// frontend/patient-app/src/App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import LanguageSelectionScreen from './screens/LanguageSelectionScreen';
import TranslationSessionScreen from './screens/TranslationSessionScreen';
import SessionSummaryScreen from './screens/SessionSummaryScreen';
import WelcomeScreen from './screens/WelcomeScreen';

// Import context
import { TranslationContext } from './context/TranslationContext';
import { EdgeConnectionProvider } from './context/EdgeConnectionContext';

const Stack = createStackNavigator();

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  // Check if first launch
  useEffect(() => {
    async function checkFirstLaunch() {
      try {
        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        if (hasLaunched === null) {
          setIsFirstLaunch(true);
          await AsyncStorage.setItem('hasLaunched', 'true');
        } else {
          setIsFirstLaunch(false);
        }
      } catch (error) {
        console.error('Error checking first launch:', error);
      }
    }
    
    checkFirstLaunch();
    loadSavedLanguage();
  }, []);

  // Load saved language preference
  const loadSavedLanguage = async () => {
    try {
      const language = await AsyncStorage.getItem('selectedLanguage');
      if (language !== null) {
        setSelectedLanguage(JSON.parse(language));
      }
    } catch (error) {
      console.error('Error loading saved language:', error);
    }
  };

  // Save language preference
  const saveLanguagePreference = async (language) => {
    try {
      await AsyncStorage.setItem('selectedLanguage', JSON.stringify(language));
      setSelectedLanguage(language);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  // Add new session to history
  const addSessionToHistory = (session) => {
    setSessionHistory(prevHistory => [...prevHistory, session]);
  };

  return (
    <EdgeConnectionProvider>
      <TranslationContext.Provider 
        value={{ 
          selectedLanguage, 
          setSelectedLanguage: saveLanguagePreference,
          sessionHistory, 
          addSessionToHistory 
        }}
      >
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator>
            {isFirstLaunch ? (
              <Stack.Screen 
                name="Welcome" 
                component={WelcomeScreen} 
                options={{ headerShown: false }}
              />
            ) : null}
            <Stack.Screen 
              name="LanguageSelection" 
              component={LanguageSelectionScreen} 
              options={{ title: 'Select Your Language' }}
            />
            <Stack.Screen 
              name="TranslationSession" 
              component={TranslationSessionScreen}
              options={{ title: 'Medical Translation', headerShown: false }}
            />
            <Stack.Screen 
              name="SessionSummary" 
              component={SessionSummaryScreen}
              options={{ title: 'Session Summary' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </TranslationContext.Provider>
    </EdgeConnectionProvider>
  );
}
```

#### Step 2: Create translation session screen

```jsx
// frontend/patient-app/src/screens/TranslationSessionScreen.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

import { TranslationContext } from '../context/TranslationContext';
import { EdgeConnectionContext } from '../context/EdgeConnectionContext';
import TranslationMessage from '../components/TranslationMessage';
import VoiceRecordButton from '../components/VoiceRecordButton';

export default function TranslationSessionScreen({ navigation, route }) {
  const { sessionId, providerName, medicalContext } = route.params;
  const insets = useSafeAreaInsets();
  
  const { selectedLanguage } = useContext(TranslationContext);
  const { edgeConnection } = useContext(EdgeConnectionContext);
  
  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const [translating, setTranslating] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [audioPermission, setAudioPermission] = useState(null);
  
  const scrollViewRef = useRef(null);
  const recordingRef = useRef(null);
  
  // Request audio permission on component mount
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setAudioPermission(status === 'granted');
    })();
    
    // Connect to edge device or cloud service
    connectToTranslationService();
    
    return () => {
      // Cleanup when component unmounts
      disconnectFromTranslationService();
    };
  }, []);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);
  
  // Connect to edge device or cloud service
  const connectToTranslationService = async () => {
    try {
      await edgeConnection.connect(sessionId);
      setIsConnected(true);
      
      // Add system message
      addMessage({
        id: 'system-1',
        text: `Connected to medical translation service. Speaking ${selectedLanguage.name}.`,
        sender: 'system',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to connect to translation service:', error);
      setIsConnected(false);
      
      // Add error message
      addMessage({
        id: 'error-1',
        text: 'Failed to connect to translation service. Please try again.',
        sender: 'system',
        timestamp: new Date(),
        isError: true
      });
    }
  };
  
  // Disconnect from translation service
  const disconnectFromTranslationService = () => {
    edgeConnection.disconnect();
  };
  
  // Start recording audio
  const startRecording = async () => {
    try {
      if (!audioPermission) {
        console.error('No audio permission');
        return;
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.startAsync();
      
      recordingRef.current = recording;
      setRecording(true);
      
      // Visual feedback that recording has started
      addMessage({
        id: `recording-${Date.now()}`,
        text: 'Recording...',
        sender: 'patient',
        timestamp: new Date(),
        isRecording: true
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };
  
  // Stop recording and translate
  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;
      
      setRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      
      // Remove the "Recording..." message
      setMessages(prev => prev.filter(msg => !msg.isRecording));
      
      // Process the audio for translation
      await processAudioForTranslation(uri);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };
  
  // Process audio for translation
  const processAudioForTranslation = async (audioUri) => {
    try {
      setTranslating(true);
      
      // Create patient message placeholder
      const patientMessageId = `patient-${Date.now()}`;
      addMessage({
        id: patientMessageId,
        text: 'Processing your message...',
        sender: 'patient',
        timestamp: new Date(),
        isProcessing: true
      });
      
      // Send audio to edge device for processing
      const translationResult = await edgeConnection.translateAudio(
        audioUri,
        selectedLanguage.code,
        'en', // Provider language (English)
        medicalContext
      );
      
      // Update patient message with transcription
      updateMessage(patientMessageId, {
        text: translationResult.originalText,
        isProcessing: false
      });
      
      // Add provider message with translation
      addMessage({
        id: `provider-${Date.now()}`,
        text: translationResult.translatedText,
        originalText: translationResult.originalText,
        sender: 'provider',
        timestamp: new Date(),
        confidence: translationResult.confidence
      });
      
      // Speak the translation if needed
      if (translationResult.audioResponse) {
        await playTranslationAudio(translationResult.audioResponse);
      }
    } catch (error) {
      console.error('Translation failed:', error);
      
      // Add error message
      addMessage({
        id: `error-${Date.now()}`,
        text: 'Translation failed. Please try again.',
        sender: 'system',
        timestamp: new Date(),
        isError: true
      });
    } finally {
      setTranslating(false);
    }
  };
  
  // Add a new message to the conversation
  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };
  
  // Update an existing message
  const updateMessage = (messageId, updates) => {
    setMessages(prev => 
      prev.map(msg => msg.id === messageId ? { ...msg, ...updates } : msg)
    );
  };
  
  // Play audio response
  const playTranslationAudio = async (audioUri) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };
  
  // End the session and go to summary
  const endSession = () => {
    navigation.navigate('SessionSummary', {
      sessionId,
      messages,
      providerName,
      duration: calculateSessionDuration(),
      medicalContext
    });
  };
  
  // Calculate session duration
  const calculateSessionDuration = () => {
    if (messages.length < 2) return 0;
    
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    
    return (lastMessage.timestamp - firstMessage.timestamp) / 1000; // in seconds
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {providerName ? `Dr. ${providerName}` : 'Medical Translation'}
        </Text>
        <View style={styles.connectionIndicator}>
          <View style={[
            styles.connectionDot, 
            { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
          ]} />
          <Text style={styles.connectionText}>
            {isConnected ? 'Connected' : 'Offline'}
          </Text>
        </View>
      </View>
      
      {/* Medical context indicator */}
      {medicalContext && (
        <View style={styles.contextBanner}>
          <Text style={styles.contextText}>
            {medicalContext} consultation
          </Text>
        </View>
      )}
      
      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map(message => (
          <TranslationMessage
            key={message.id}
            message={message}
            patientLanguage={selectedLanguage.name}
          />
        ))}
        
        {messages.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="mic-outline" size={48} color="#757575" />
            <Text style={styles.emptyStateText}>
              Tap and hold the microphone button to start speaking in your language
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.endButton}
          onPress={endSession}
        >
          <Text style={styles.endButtonText}>End Session</Text>
        </TouchableOpacity>
        
        <VoiceRecordButton
          recording={recording}
          translating={translating}
          disabled={!isConnected || translating}
          onPressIn={startRecording}
          onPressOut={stopRecording}
        />
        
        <TouchableOpacity 
          style={styles.helpButton}
          onPress={() => {/* Show help modal */}}
        >
          <Ionicons name="help-circle-outline" size={28} color="#0077CC" />
        </TouchableOpacity>
      </View>
    </View>
  );
}