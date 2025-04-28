# MedTranslate AI: Implementation Guide (Continued)

## Performance Testing (Continued)

```javascript
// tests/performance/translation-latency.js (continued)
          results.cloud.push({
            audioType: audioSample.type,
            languagePair: `${languagePair.source}-${languagePair.target}`,
            networkCondition: networkCondition.name,
            avgLatencyMs: avgCloudLatency,
            avgConfidence: avgCloudConfidence,
            successRate: cloudResults.length / TEST_CONFIG.iterations
          });
          
          console.log(`\nCloud Average: ${avgCloudLatency.toFixed(2)}ms, Confidence: ${avgCloudConfidence.toFixed(2)}`);
        }
      }
    }
  }
  
  // Generate summary statistics
  generateSummaryStatistics();
  
  // Save results to file
  fs.writeFileSync(
    path.join(__dirname, 'results', `perf_test_${new Date().toISOString().replace(/:/g, '-')}.json`),
    JSON.stringify(results, null, 2)
  );
  
  console.log('\nPerformance tests completed.');
  console.log(`Results saved to file.`);
  
  return results;
}

// Generate summary statistics for the results
function generateSummaryStatistics() {
  // Compute average latency by network condition
  const networkStats = {};
  
  for (const condition of TEST_CONFIG.networkConditions) {
    const edgeResults = results.edge.filter(r => r.networkCondition === condition.name);
    const cloudResults = results.cloud.filter(r => r.networkCondition === condition.name);
    
    const edgeAvgLatency = edgeResults.length > 0 
      ? edgeResults.reduce((sum, r) => sum + r.avgLatencyMs, 0) / edgeResults.length 
      : null;
      
    const cloudAvgLatency = cloudResults.length > 0 
      ? cloudResults.reduce((sum, r) => sum + r.avgLatencyMs, 0) / cloudResults.length 
      : null;
    
    const edgeSuccessRate = edgeResults.length > 0 
      ? edgeResults.reduce((sum, r) => sum + r.successRate, 0) / edgeResults.length 
      : 0;
      
    const cloudSuccessRate = cloudResults.length > 0 
      ? cloudResults.reduce((sum, r) => sum + r.successRate, 0) / cloudResults.length 
      : 0;
    
    networkStats[condition.name] = {
      edgeAvgLatencyMs: edgeAvgLatency,
      cloudAvgLatencyMs: cloudAvgLatency,
      edgeSuccessRate,
      cloudSuccessRate,
      latencyDifferenceMs: edgeAvgLatency && cloudAvgLatency 
        ? cloudAvgLatency - edgeAvgLatency 
        : null
    };
  }
  
  // Add summary statistics to results
  results.summary = {
    networkConditions: networkStats,
    overall: {
      edgeAvgLatencyMs: results.edge.length > 0 
        ? results.edge.reduce((sum, r) => sum + r.avgLatencyMs, 0) / results.edge.length 
        : null,
      cloudAvgLatencyMs: results.cloud.length > 0 
        ? results.cloud.reduce((sum, r) => sum + r.avgLatencyMs, 0) / results.cloud.length 
        : null,
      edgeSuccessRate: results.edge.length > 0 
        ? results.edge.reduce((sum, r) => sum + r.successRate, 0) / results.edge.length 
        : 0,
      cloudSuccessRate: results.cloud.length > 0 
        ? results.cloud.reduce((sum, r) => sum + r.successRate, 0) / results.cloud.length 
        : 0
    }
  };
  
  // Print summary
  console.log('\n===== SUMMARY =====');
  console.log('Overall Statistics:');
  console.log(`- Edge Avg Latency: ${results.summary.overall.edgeAvgLatencyMs?.toFixed(2)}ms`);
  console.log(`- Cloud Avg Latency: ${results.summary.overall.cloudAvgLatencyMs?.toFixed(2)}ms`);
  console.log(`- Edge Success Rate: ${(results.summary.overall.edgeSuccessRate * 100).toFixed(1)}%`);
  console.log(`- Cloud Success Rate: ${(results.summary.overall.cloudSuccessRate * 100).toFixed(1)}%`);
  
  console.log('\nNetwork Condition Breakdown:');
  for (const [condition, stats] of Object.entries(results.summary.networkConditions)) {
    console.log(`\n${condition}:`);
    console.log(`- Edge Avg Latency: ${stats.edgeAvgLatencyMs?.toFixed(2)}ms`);
    console.log(`- Cloud Avg Latency: ${stats.cloudAvgLatencyMs?.toFixed(2)}ms`);
    console.log(`- Edge Success Rate: ${(stats.edgeSuccessRate * 100).toFixed(1)}%`);
    console.log(`- Cloud Success Rate: ${(stats.cloudSuccessRate * 100).toFixed(1)}%`);
    
    if (stats.latencyDifferenceMs !== null) {
      const advantage = stats.latencyDifferenceMs > 0 ? 'Edge' : 'Cloud';
      const diff = Math.abs(stats.latencyDifferenceMs);
      console.log(`- ${advantage} advantage: ${diff.toFixed(2)}ms (${(diff / (stats.cloudAvgLatencyMs || 1) * 100).toFixed(1)}%)`);
    }
  }
}

// Entry point
if (require.main === module) {
  runPerformanceTests()
    .catch(error => {
      console.error('Performance test error:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceTests };
```

## AWS CloudFormation Template for Core Infrastructure

Here's a CloudFormation template to create the core infrastructure needed for the MedTranslate AI application:

```yaml
# infrastructure/cloudformation/core-infrastructure.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'MedTranslate AI - Core Infrastructure'

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, test, prod]
    Description: Deployment environment

  RetentionDays:
    Type: Number
    Default: 30
    Description: Number of days to retain translation data

  EdgeDeviceBucketName:
    Type: String
    Default: medtranslate-edge-models
    Description: S3 bucket name for edge device models and configuration

Resources:
  # VPC and Networking Resources
  MedTranslateVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsSupport: true
      EnableDnsHostnames: true
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-vpc

  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MedTranslateVPC
      CidrBlock: 10.0.0.0/24
      AvailabilityZone: !Select [0, !GetAZs ""]
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-public-subnet-1

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MedTranslateVPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [1, !GetAZs ""]
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-public-subnet-2

  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MedTranslateVPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [0, !GetAZs ""]
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-private-subnet-1

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MedTranslateVPC
      CidrBlock: 10.0.3.0/24
      AvailabilityZone: !Select [1, !GetAZs ""]
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-private-subnet-2

  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-igw

  InternetGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref MedTranslateVPC
      InternetGatewayId: !Ref InternetGateway

  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref MedTranslateVPC
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-public-rt

  PublicRoute:
    Type: AWS::EC2::Route
    DependsOn: InternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet1
      RouteTableId: !Ref PublicRouteTable

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet2
      RouteTableId: !Ref PublicRouteTable

  # Security Groups
  ApiSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for API Gateway VPC Link
      VpcId: !Ref MedTranslateVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-api-sg

  # DynamoDB Tables
  TranslationMemoryTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub medtranslate-${Environment}-translation-memory
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: sourceText
          AttributeType: S
        - AttributeName: sourceLang
          AttributeType: S
        - AttributeName: targetLang
          AttributeType: S
      KeySchema:
        - AttributeName: sourceText
          KeyType: HASH
        - AttributeName: sourceLang
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: TargetLanguageIndex
          KeySchema:
            - AttributeName: targetLang
              KeyType: HASH
            - AttributeName: sourceText
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      TimeToLiveSpecification:
        AttributeName: expirationTime
        Enabled: true
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      SSESpecification:
        SSEEnabled: true

  MedicalTerminologyTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub medtranslate-${Environment}-medical-terminology
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: term_source
          AttributeType: S
        - AttributeName: category
          AttributeType: S
      KeySchema:
        - AttributeName: term_source
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: CategoryIndex
          KeySchema:
            - AttributeName: category
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      SSESpecification:
        SSEEnabled: true

  SessionsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub medtranslate-${Environment}-sessions
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: sessionId
          AttributeType: S
        - AttributeName: sessionCode
          AttributeType: S
      KeySchema:
        - AttributeName: sessionId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: SessionCodeIndex
          KeySchema:
            - AttributeName: sessionCode
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      TimeToLiveSpecification:
        AttributeName: expirationTime
        Enabled: true
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      SSESpecification:
        SSEEnabled: true

  # S3 Buckets
  SecureStorageBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub medtranslate-${Environment}-secure-storage
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      LifecycleConfiguration:
        Rules:
          - Id: DeleteAfterRetentionPeriod
            Status: Enabled
            ExpirationInDays: !Ref RetentionDays
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  EdgeDeviceModelsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref EdgeDeviceBucketName
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  # KMS Key for encryption
  EncryptionKey:
    Type: AWS::KMS::Key
    Properties:
      Description: KMS key for MedTranslate AI data encryption
      EnableKeyRotation: true
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Sub arn:aws:iam::${AWS::AccountId}:root
            Action: kms:*
            Resource: '*'
          - Sid: Allow use of the key
            Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action:
              - kms:Encrypt
              - kms:Decrypt
              - kms:ReEncrypt*
              - kms:GenerateDataKey*
              - kms:DescribeKey
            Resource: '*'

  EncryptionKeyAlias:
    Type: AWS::KMS::Alias
    Properties:
      AliasName: !Sub alias/medtranslate-${Environment}-key
      TargetKeyId: !Ref EncryptionKey

  # Lambda Execution Role
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
      Policies:
        - PolicyName: MedTranslatePermissions
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:GetItem
                  - dynamodb:PutItem
                  - dynamodb:UpdateItem
                  - dynamodb:Query
                  - dynamodb:Scan
                Resource:
                  - !GetAtt TranslationMemoryTable.Arn
                  - !GetAtt MedicalTerminologyTable.Arn
                  - !GetAtt SessionsTable.Arn
                  - !Sub ${TranslationMemoryTable.Arn}/index/*
                  - !Sub ${MedicalTerminologyTable.Arn}/index/*
                  - !Sub ${SessionsTable.Arn}/index/*
              - Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:PutObject
                  - s3:DeleteObject
                Resource:
                  - !Sub ${SecureStorageBucket.Arn}/*
                  - !Sub ${EdgeDeviceModelsBucket.Arn}/*
              - Effect: Allow
                Action:
                  - kms:Decrypt
                  - kms:GenerateDataKey
                Resource: !GetAtt EncryptionKey.Arn
              - Effect: Allow
                Action:
                  - bedrock:InvokeModel
                Resource: '*'

  # Edge Device Role
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
      Policies:
        - PolicyName: EdgeDevicePermissions
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - s3:GetObject
                Resource: !Sub ${EdgeDeviceModelsBucket.Arn}/*
              - Effect: Allow
                Action:
                  - dynamodb:GetItem
                  - dynamodb:Query
                Resource:
                  - !GetAtt TranslationMemoryTable.Arn
                  - !GetAtt MedicalTerminologyTable.Arn
                  - !Sub ${TranslationMemoryTable.Arn}/index/*
                  - !Sub ${MedicalTerminologyTable.Arn}/index/*

  # Secrets Manager for JWT Secret
  JwtSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub medtranslate-${Environment}-jwt-secret
      Description: JWT signing secret for MedTranslate authentication
      GenerateSecretString:
        SecretStringTemplate: '{"username": "medtranslate"}'
        GenerateStringKey: "secret"
        PasswordLength: 64
        ExcludeCharacters: '"@/\'

Outputs:
  VPCId:
    Description: VPC ID
    Value: !Ref MedTranslateVPC
    Export:
      Name: !Sub ${AWS::StackName}-VPCId

  PublicSubnets:
    Description: Public Subnets
    Value: !Join [",", [!Ref PublicSubnet1, !Ref PublicSubnet2]]
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnets

  PrivateSubnets:
    Description: Private Subnets
    Value: !Join [",", [!Ref PrivateSubnet1, !Ref PrivateSubnet2]]
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnets

  ApiSecurityGroupId:
    Description: Security Group ID for API Gateway
    Value: !GetAtt ApiSecurityGroup.GroupId
    Export:
      Name: !Sub ${AWS::StackName}-ApiSecurityGroupId

  TranslationMemoryTableName:
    Description: Translation Memory DynamoDB Table Name
    Value: !Ref TranslationMemoryTable
    Export:
      Name: !Sub ${AWS::StackName}-TranslationMemoryTableName

  MedicalTerminologyTableName:
    Description: Medical Terminology DynamoDB Table Name
    Value: !Ref MedicalTerminologyTable
    Export:
      Name: !Sub ${AWS::StackName}-MedicalTerminologyTableName

  SessionsTableName:
    Description: Sessions DynamoDB Table Name
    Value: !Ref SessionsTable
    Export:
      Name: !Sub ${AWS::StackName}-SessionsTableName

  SecureStorageBucketName:
    Description: Secure Storage S3 Bucket Name
    Value: !Ref SecureStorageBucket
    Export:
      Name: !Sub ${AWS::StackName}-SecureStorageBucketName

  EdgeDeviceModelsBucketName:
    Description: Edge Device Models S3 Bucket Name
    Value: !Ref EdgeDeviceModelsBucket
    Export:
      Name: !Sub ${AWS::StackName}-EdgeDeviceModelsBucketName

  KmsKeyId:
    Description: KMS Key ID for Encryption
    Value: !Ref EncryptionKey
    Export:
      Name: !Sub ${AWS::StackName}-KmsKeyId

  KmsKeyArn:
    Description: KMS Key ARN for Encryption
    Value: !GetAtt EncryptionKey.Arn
    Export:
      Name: !Sub ${AWS::StackName}-KmsKeyArn

  LambdaExecutionRoleArn:
    Description: Lambda Execution Role ARN
    Value: !GetAtt LambdaExecutionRole.Arn
    Export:
      Name: !Sub ${AWS::StackName}-LambdaExecutionRoleArn

  EdgeDeviceRoleArn:
    Description: Edge Device Role ARN
    Value: !GetAtt EdgeDeviceRole.Arn
    Export:
      Name: !Sub ${AWS::StackName}-EdgeDeviceRoleArn

  JwtSecretArn:
    Description: JWT Secret ARN
    Value: !Ref JwtSecret
    Export:
      Name: !Sub ${AWS::StackName}-JwtSecretArn
```

## React Native TranslationMessage Component

This component displays translation messages in the patient app:

```jsx
// frontend/patient-app/src/components/TranslationMessage.js
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TranslationMessage = ({ message, patientLanguage }) => {
  const { sender, text, isProcessing, isError, confidence, timestamp } = message;
  
  // Format timestamp
  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Determine message style based on sender
  const isPatient = sender === 'patient';
  const isProvider = sender === 'provider';
  const isSystem = sender === 'system';
  
  // Determine confidence indicator
  let confidenceIcon = null;
  if (confidence && !isProcessing && !isError) {
    if (confidence === 'high') {
      confidenceIcon = <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.confidenceIcon} />;
    } else if (confidence === 'medium') {
      confidenceIcon = <Ionicons name="alert-circle" size={16} color="#FFC107" style={styles.confidenceIcon} />;
    } else {
      confidenceIcon = <Ionicons name="warning" size={16} color="#FF5722" style={styles.confidenceIcon} />;
    }
  }
  
  return (
    <View style={[
      styles.container,
      isPatient && styles.patientContainer,
      isProvider && styles.providerContainer,
      isSystem && styles.systemContainer,
      isError && styles.errorContainer
    ]}>
      {/* Message header with sender and time */}
      <View style={styles.header}>
        <Text style={styles.sender}>
          {isPatient ? 'You' : isProvider ? 'Doctor' : 'System'}
        </Text>
        <Text style={styles.time}>{formattedTime}</Text>
      </View>
      
      {/* Message content */}
      <View style={styles.contentContainer}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="small" color="#0077CC" />
            <Text style={styles.processingText}>{text}</Text>
          </View>
        ) : (
          <Text style={[
            styles.text,
            isSystem && styles.systemText,
            isError && styles.errorText
          ]}>
            {text}
          </Text>
        )}
      </View>
      
      {/* Message footer with language and confidence */}
      {(isPatient || isProvider) && !isProcessing && !isError && (
        <View style={styles.footer}>
          <Text style={styles.language}>
            {isPatient ? patientLanguage : 'English'}
          </Text>
          {confidenceIcon}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#E8EAF6',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  patientContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#E3F2FD',
  },
  providerContainer: {
    backgroundColor: '#F5F5F5',
  },
  systemContainer: {
    alignSelf: 'center',
    backgroundColor: '#EEEEEE',
    maxWidth: '90%',
  },
  errorContainer: {
    alignSelf: 'center',
    backgroundColor: '#FFEBEE',
    maxWidth: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#424242',
  },
  time: {
    fontSize: 10,
    color: '#757575',
  },
  contentContainer: {
    marginVertical: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    color: '#212121',
  },
  systemText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#616161',
    textAlign: 'center',
  },
  errorText: {
    color: '#C62828',
    fontWeight: '500',
    textAlign: 'center',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  language: {
    fontSize: 10,
    color: '#757575',
    marginRight: 4,
  },
  confidenceIcon: {
    marginLeft: 4,
  },
});

export default TranslationMessage;
```

## EdgeConnectionContext for React Native App

This context handles communication with the edge device:

```jsx
// frontend/patient-app/src/context/EdgeConnectionContext.js
import React, { createContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

// Create context
export const EdgeConnectionContext = createContext();

// Configuration
const API_ENDPOINTS = {
  EDGE: 'http://192.168.1.1:3000', // Default edge device IP
  CLOUD: 'https://api.medtranslate.ai' // Cloud endpoint
};

// Provider component
export const EdgeConnectionProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [activeEndpoint, setActiveEndpoint] = useState(null);
  const [websocket, setWebsocket] = useState(null);
  const [pendingMessages, setPendingMessages] = useState([]);
  
  // Initialize connection settings
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        // Load saved edge device endpoint
        const savedEdgeEndpoint = await AsyncStorage.getItem('edgeDeviceEndpoint');
        if (savedEdgeEndpoint) {
          API_ENDPOINTS.EDGE = savedEdgeEndpoint;
        }
        
        // Check network connectivity
        const netInfoState = await NetInfo.fetch();
        setIsConnected(netInfoState.isConnected);
        
        // Start listening for connectivity changes
        const unsubscribe = NetInfo.addEventListener(state => {
          setIsConnected(state.isConnected);
          
          // If connectivity changes, try to reconnect
          if (state.isConnected && !activeEndpoint) {
            detectEndpoint();
          }
        });
        
        // Initial endpoint detection
        detectEndpoint();
        
        return () => {
          unsubscribe();
          if (websocket) {
            websocket.close();
          }
        };
      } catch (error) {
        console.error('Failed to initialize connection:', error);
      }
    };
    
    initializeConnection();
  }, []);
  
  // Detect available endpoint (edge or cloud)
  const detectEndpoint = async () => {
    try {
      // First try edge device
      const edgeResponse = await Promise.race([
        axios.get(`${API_ENDPOINTS.EDGE}/health`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);
      
      if (edgeResponse.status === 200) {
        setActiveEndpoint(API_ENDPOINTS.EDGE);
        return;
      }
      
      // Fall back to cloud endpoint
      const cloudResponse = await axios.get(`${API_ENDPOINTS.CLOUD}/health`);
      if (cloudResponse.status === 200) {
        setActiveEndpoint(API_ENDPOINTS.CLOUD);
        return;
      }
    } catch (error) {
      // If edge connection fails, try cloud
      try {
        const cloudResponse = await axios.get(`${API_ENDPOINTS.CLOUD}/health`);
        if (cloudResponse.status === 200) {
          setActiveEndpoint(API_ENDPOINTS.CLOUD);
          return;
        }
      } catch (cloudError) {
        console.error('Failed to connect to cloud endpoint:', cloudError);
      }
      
      // If both fail, set to null
      setActiveEndpoint(null);
      console.error('Failed to detect any available endpoint:', error);
    }
  };
  
  // Connect to a specific session
  const connect = async (sessionId) => {
    try {
      if (!activeEndpoint) {
        throw new Error('No active endpoint available');
      }
      
      // Close existing websocket if any
      if (websocket) {
        websocket.close();
      }
      
      // Connect to WebSocket
      const ws = new WebSocket(`${activeEndpoint.replace('http', 'ws')}/sessions/${sessionId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        
        // Send any pending messages
        if (pendingMessages.length > 0) {
          pendingMessages.forEach(message => {
            ws.send(JSON.stringify(message));
          });
          setPendingMessages([]);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };
      
      setWebsocket(ws);
      return true;
    } catch (error) {
      console.error('Failed to connect to session:', error);
      throw error;
    }
  };
  
  // Disconnect from session
  const disconnect = () => {
    if (websocket) {
      websocket.close();
      setWebsocket(null);
    }
  };
  
  // Translate audio
  const translateAudio = async (audioUri, sourceLanguage, targetLanguage, context) => {
    try {
      if (!activeEndpoint) {
        throw new Error('No active endpoint available');
      }
      
      // Convert audio URI to base64
      const audioData = await readAudioFileAsBase64(audioUri);
      
      // Prepare request data
      const requestData = {
        audioData,
        sourceLanguage,
        targetLanguage,
        context: context || 'general'
      };
      
      // Send to endpoint
      const response = await axios.post(`${activeEndpoint}/translate`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Translation failed:', error);
      throw error;
    }
  };
  
  // Helper to read audio file as base64
  const readAudioFileAsBase64 = async (uri) => {
    if (Platform.OS === 'web') {
      // Web implementation
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // React Native implementation
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1];
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  };
  
  // Provide context value
  const contextValue = {
    isConnected,
    activeEndpoint,
    edgeConnection: {
      connect,
      disconnect,
      translateAudio,
      isEdgeDevice: activeEndpoint === API_ENDPOINTS.EDGE
    }
  };
  
  return (
    <EdgeConnectionContext.Provider value={contextValue}>
      {children}
    </EdgeConnectionContext.Provider>
  );
};
```

## VoiceRecordButton Component for React Native

This component provides the user interface for recording voice:

```jsx
// frontend/patient-app/src/components/VoiceRecordButton.js
import React, { useState, useEffect } from 'react';
import { 
  TouchableOpacity, 
  View, 
  StyleSheet, 
  Animated, 
  Easing,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const VoiceRecordButton = ({ 
  recording, 
  translating, 
  disabled,
  onPressIn, 
  onPressOut 
}) => {
  const [animation] = useState(new Animated.Value(1));
  
  // Pulsing animation when recording
  useEffect(() => {
    let animationLoop;
    
    if (recording) {
      // Create a looping pulse animation
      animationLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1.2,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(animation, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      );
      
      animationLoop.start();
    } else {
      // Reset animation when not recording
      Animated.timing(animation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
    
    return () => {
      if (animationLoop) {
        animationLoop.stop();
      }
    };
  }, [recording, animation]);
  
  // Determine button appearance based on state
  const getButtonStyle = () => {
    if (disabled) {
      return styles.buttonDisabled;
    }
    if (recording) {
      return styles.buttonRecording;
    }
    if (translating) {
      return styles.buttonTranslating;
    }
    return styles.button;
  };
  
  // Get icon based on state
  const getIcon = () => {
    if (translating) {
      return <ActivityIndicator size="large" color="#ffffff" />;
    }
    if (recording) {
      return <Ionicons name="mic" size={32} color="#ffffff" />;
    }
    return <Ionicons name="mic-outline" size={32} color="#ffffff" />;
  };
  
  // Animated button scale
  const buttonScale = {
    transform: [{ scale: animation }]
  };
  
  return (
    <Animated.View style={buttonScale}>
      <TouchableOpacity
        style={[styles.buttonContainer, getButtonStyle()]}
        onPressIn={disabled ? null : onPressIn}
        onPressOut={disabled ? null : onPressOut}
        disabled={disabled || translating}
        activeOpacity={0.7}
      >
        {getIcon()}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  button: {
    backgroundColor: '#0077CC',
  },
  buttonRecording: {
    backgroundColor: '#E53935',
  },
  buttonTranslating: {
    backgroundColor: '#FFA000',
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
  },
});

export default VoiceRecordButton;
```

## Lambda Function for Handling Translation Requests

This Lambda function processes translation requests:

```javascript
// backend/lambda/translation/handler.js
const AWS = require('aws-sdk');
const { translateText } = require('./bedrock-client');
const { verifyMedicalTerms } = require('./medical-kb');
const { storeEncryptedData } = require('../storage/secure-storage');

// Initialize DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient();

/**
 * Main handler for translation requests
 */
exports.handler = async (event) => {
  try {
    console.log('Received translation request');
    
    // Parse request body
    const body = JSON.parse(event.body);
    const { 
      text, 
      sourceLanguage, 
      targetLanguage, 
      medicalContext = 'general',
      sessionId
    } = body;
    
    // Check required fields
    if (!text || !sourceLanguage || !targetLanguage) {
      return formatResponse(400, {
        message: 'Missing required fields: text, sourceLanguage, targetLanguage'
      });
    }
    
    // Check translation memory first
    const cachedTranslation = await checkTranslationMemory(
      text, sourceLanguage, targetLanguage, medicalContext
    );
    
    if (cachedTranslation) {
      console.log('Translation found in memory');
      
      // Log the request if session ID is provided
      if (sessionId) {
        await logTranslationRequest(
          sessionId, 
          text, 
          cachedTranslation.translatedText, 
          sourceLanguage, 
          targetLanguage, 
          'cache'
        );
      }
      
      return formatResponse(200, {
        originalText: text,
        translatedText: cachedTranslation.translatedText,
        confidence: cachedTranslation.confidence,
        source: 'cache'
      });
    }
    
    // Verify medical terms
    const medicalTerms = await verifyMedicalTerms(text, sourceLanguage, targetLanguage);
    
    // Perform translation
    const translationResult = await translateText(
      sourceLanguage, 
      targetLanguage, 
      text,
      medicalContext
    );
    
    // Store in translation memory
    await storeTranslationMemory(
      text, 
      translationResult.translatedText, 
      sourceLanguage, 
      targetLanguage, 
      medicalContext, 
      translationResult.confidence
    );
    
    // Log the request if session ID is provided
    if (sessionId) {
      await logTranslationRequest(
        sessionId, 
        text, 
        translationResult.translatedText, 
        sourceLanguage, 
        targetLanguage, 
        'bedrock'
      );
    }
    
    return formatResponse(200, {
      originalText: text,
      translatedText: translationResult.translatedText,
      confidence: translationResult.confidence,
      medicalTerms: medicalTerms.length > 0 ? medicalTerms : undefined,
      source: 'bedrock'
    });
  } catch (error) {
    console.error('Translation error:', error);
    return formatResponse(500, {
      message: 'Translation failed',
      error: error.message
    });
  }
};

/**
 * Check if translation exists in memory
 */
async function checkTranslationMemory(text, sourceLanguage, targetLanguage, context) {
  try {
    const normalizedText = text.toLowerCase().trim();
    
    const params = {
      TableName: process.env.TRANSLATION_MEMORY_TABLE,
      Key: {
        sourceText: normalizedText,
        sourceLang: sourceLanguage
      },
      ProjectionExpression: 'translations'
    };
    
    const result = await dynamoDB.get(params).promise();
    
    if (result.Item && result.Item.translations) {
      // Find translation for target language and context
      const translation = result.Item.translations.find(t => 
        t.targetLang === targetLanguage && 
        t.context === context
      );
      
      if (translation) {
        return {
          translatedText: translation.text,
          confidence: translation.confidence || 'medium'
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking translation memory:', error);
    return null;
  }
}

/**
 * Store translation in memory
 */
async function storeTranslationMemory(sourceText, translatedText, sourceLanguage, targetLanguage, context, confidence) {
  try {
    const normalizedSourceText = sourceText.toLowerCase().trim();
    
    // Calculate expiration time (30 days from now)
    const expirationTime = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
    
    const params = {
      TableName: process.env.TRANSLATION_MEMORY_TABLE,
      Key: {
        sourceText: normalizedSourceText,
        sourceLang: sourceLanguage
      },
      UpdateExpression: 'SET translations = list_append(if_not_exists(translations, :empty_list), :translation), expirationTime = :expiry',
      ExpressionAttributeValues: {
        ':translation': [{
          targetLang: targetLanguage,
          text: translatedText,
          context,
          confidence,
          timestamp: new Date().toISOString()
        }],
        ':empty_list': [],
        ':expiry': expirationTime
      }
    };
    
    await dynamoDB.update(params).promise();
    console.log('Translation stored in memory');
    
    return true;
  } catch (error) {
    console.error('Error storing translation memory:', error);
    return false;
  }
}

/**
 * Log translation request for analytics and auditing
 */
async function logTranslationRequest(sessionId, sourceText, translatedText, sourceLanguage, targetLanguage, source) {
  try {
    // Store the log securely
    await storeEncryptedData(
      sessionId,
      'translation-log',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        sourceText,
        translatedText,
        sourceLanguage,
        targetLanguage,
        source
      }),
      { type: 'translation-log' }
    );
    
    return true;
  } catch (error) {
    console.error('Error logging translation request:', error);
    return false;
  }
}

/**
 * Format API Gateway response
 */
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
    },
    body: JSON.stringify(body)
  };
}
```

## README.md for GitHub Repository

```markdown
# MedTranslate AI

Real-time medical translation system using AWS Generative AI and Edge Computing

![MedTranslate AI Logo](docs/images/medtranslate-logo.png)

## Overview

MedTranslate AI bridges language barriers in healthcare settings by providing accurate, real-time translation between healthcare providers and patients. The system combines AWS generative AI services with edge computing and 5G connectivity for reliable, low-latency operation.

### Key Features

- Real-time medical conversation translation
- Support for specialized medical terminology and context
- Edge computing for privacy and low latency
- Compatible with 5G and variable network conditions
- HIPAA-compliant security implementation
- Intuitive mobile interfaces for patients and providers

## Architecture

MedTranslate AI uses a hybrid cloud/edge architecture:

- **AWS Generative AI**: Amazon Bedrock powers the core translation with medical domain knowledge
- **Edge Computing**: Local inference for low-latency and offline operation
- **5G Connectivity**: Optimized for healthcare environments
- **Mobile Applications**: React Native apps for patients and providers

![Architecture Diagram](docs/images/architecture-diagram.png)

## Getting Started

### Prerequisites

- AWS Account with access to Amazon Bedrock
- Node.js 18+ and npm
- React Native development environment
- AWS CLI configured with appropriate permissions

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/medtranslate-ai.git
   cd medtranslate-ai
   ```

2. Deploy AWS infrastructure:
   ```bash
   cd infrastructure
   ./deploy.sh dev
   ```

3. Set up backend services:
   ```bash
   cd backend
   npm install
   npm run deploy
   ```

4. Build and run the provider application:
   ```bash
   cd frontend/provider-app
   npm install
   npm run start
   ```

5. Build and run the patient application:
   ```bash
   cd frontend/patient-app
   npm install
   npm run start
   ```

## Development

### Project Structure

- `/infrastructure`: Infrastructure as Code (CloudFormation/Terraform)
- `/backend`: AWS Lambda functions and API configurations
- `/edge`: Edge computing components
- `/frontend`: React Native applications
- `/docs`: Documentation
- `/tests`: Test suites

### Running Tests

```bash
# Run backend tests
cd backend
npm test

# Run edge runtime tests
cd edge
npm test

# Run frontend tests
cd frontend/provider-app
npm test
```

## Security and Compliance

MedTranslate AI is designed with healthcare security and privacy requirements in mind:

- End-to-end encryption for all communications
- HIPAA-compliant data handling
- Minimal cloud storage of sensitive data
- Comprehensive audit logging
- Role-based access control

See the [Security Documentation](docs/security/overview.md) for details.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Medical terminology resources provided by [Medical Source]
- Built with support from [Healthcare Partners]
```

## Edge Device Settings and Configuration

```yaml
# edge/config/edge-device-config.yaml
version: '1.0'

# Device identification
device:
  id: "medtranslate-edge-{id}"
  name: "MedTranslate Edge Device"
  type: "medical-translator"
  location: "Reception Area"

# AWS IoT Greengrass configuration
greengrass:
  core:
    certificatePath: "/greengrass/certs/device.pem.crt"
    privateKeyPath: "/greengrass/certs/private.pem.key"
    rootCAPath: "/greengrass/certs/AmazonRootCA1.pem"
    thingName: "MedTranslateEdge"
    iotDataEndpoint: "{aws-account-specific-endpoint}.iot.{region}.amazonaws.com"
    iotCredentialEndpoint: "{aws-account-specific-endpoint}.credentials.iot.{region}.amazonaws.com"
  components:
    - name: "com.medtranslate.TranslationService"
      version: "1.0.0"
    - name: "com.medtranslate.AudioProcessor"
      version: "1.0.0"
    - name: "com.medtranslate.NetworkManager"
      version: "1.0.0"

# Network settings
network:
  hostname: "medtranslate-edge"
  port: 3000
  api:
    basePath: "/api/v1"
  websocket:
    enabled: true
    path: "/ws"
  discovery:
    enabled: true
    broadcastInterval: 60  # seconds

# Translation models
models:
  basePath: "/models"
  defaultModels:
    - name: "medical-english-spanish"
      path: "en-es/model.bin"
      languages: ["en", "es"]
      size: "medium"
      priority: 1
    - name: "medical-english-french"
      path: "en-fr/model.bin"
      languages: ["en", "fr"]
      size: "medium"
      priority: 2
  autoUpdate: true
  updateSchedule: "0 2 * * *"  # 2 AM daily

# Caching configuration
cache:
  translation:
    enabled: true
    maxSize: 500  # MB
    ttl: 2592000  # 30 days in seconds
  audio:
    enabled: true
    maxSize: 200  # MB
    ttl: 86400  # 1 day in seconds

# Security settings
security:
  encryption:
    enabled: true
    algorithm: "AES-256-GCM"
  authentication:
    enabled: true
    method: "jwt"
    jwtSecret: "{from-aws-secrets}"
  auditing:
    enabled: true
    logLevel: "INFO"
    retentionDays: 30

# Resource limits
resources:
  memory:
    limit: 2048  # MB
  cpu:
    limit: 2  # cores
  storage:
    limit: 10  # GB

# Monitoring
monitoring:
  metrics:
    enabled: true
    interval: 60  # seconds
  healthCheck:
    enabled: true
    interval: 30  # seconds
    timeout: 5  # seconds
    endpoint: "/health"
```

This completes the additional implementation details for the MedTranslate AI project. The code and configuration files provided here, combined with the previous artifact, give you a comprehensive guide to implementing this solution.# MedTranslate AI: Implementation Guide (Continued)

## Performance Testing (Continued)

```javascript
// tests/performance/translation-latency.js (continued)
          results.cloud.push({
            audioType: audioSample.type,
            languagePair: `${languagePair.source}-${languagePair.target}`,
            networkCondition: networkCondition.name,
            avgLatencyMs: avgCloudLatency,
            avgConfidence: avgCloudConfidence,
            successRate: cloudResults.length / TEST_CONFIG.iterations
          });
          
          console.log(`\nCloud Average: ${avgCloudLatency.toFixed(2)}ms, Confidence: ${avgCloudConfidence.toFixed(2)}`);
        }
      }
    }
  }
  
  // Generate summary statistics
  generateSummaryStatistics();
  
  // Save results to file
  fs.writeFileSync(
    path.join(__dirname, 'results', `perf_test_${new Date().toISOString().replace(/:/g, '-')}.json`),
    JSON.stringify(results, null, 2)
  );
  
  console.log('\nPerformance tests completed.');
  console.log(`Results saved to file.`);
  
  return results;
}

// Generate summary statistics for the results
function generateSummaryStatistics() {
  // Compute average latency by network condition
  const networkStats = {};
  
  for (const condition of TEST_CONFIG.networkConditions) {
    const edgeResults = results.edge.filter(r => r.networkCondition === condition.name);
    const cloudResults = results.cloud.filter(r => r.networkCondition === condition.name);
    
    const edgeAvgLatency = edgeResults.length > 0 
      ? edgeResults.reduce((sum, r) => sum + r.avgLatencyMs, 0) / edgeResults.length 
      : null;
      
    const cloudAvgLatency = cloudResults.length > 0 
      ? cloudResults.reduce((sum, r) => sum + r.avgLatencyMs, 0) / cloudResults.length 
      : null;
    
    const edgeSuccessRate = edgeResults.length > 0 
      ? edgeResults.reduce((sum, r) => sum + r.successRate, 0) / edgeResults.length 
      : 0;
      
    const cloudSuccessRate = cloudResults.length > 0 
      ? cloudResults.reduce((sum, r) => sum + r.successRate, 0) / cloudResults.length 
      : 0;
    
    networkStats[condition.name] = {
      edgeAvgLatencyMs: edgeAvgLatency,
      cloudAvgLatencyMs: cloudAvgLatency,
      edgeSuccessRate,
      cloudSuccessRate,
      latencyDifferenceMs: edgeAvgLatency && cloudAvgLatency 
        ? cloudAvgLatency - edgeAvgLatency 
        : null
    };
  }
  
  // Add summary statistics to results
  results.summary = {
    networkConditions: networkStats,
    overall: {
      edgeAvgLatencyMs: results.edge.length > 0 
        ? results.edge.reduce((sum, r) => sum + r.avgLatencyMs, 0) / results.edge.length 
        : null,
      cloudAvgLatencyMs: results.cloud.length > 0 
        ? results.cloud.reduce((sum, r) => sum + r.avgLatencyMs, 0) / results.cloud.length 
        : null,
      edgeSuccessRate: results.edge.length > 0 
        ? results.edge.reduce((sum, r) => sum + r.successRate, 0) / results.edge.length 
        : 0,
      cloudSuccessRate: results.cloud.length > 0 
        ? results.cloud.reduce((sum, r) => sum + r.successRate, 0) / results.cloud.length 
        : 0
    }
  };
  
  // Print summary
  console.log('\n===== SUMMARY =====');
  console.log('Overall Statistics:');
  console.log(`- Edge Avg Latency: ${results.summary.overall.edgeAvgLatencyMs?.toFixed(2)}ms`);
  console.log(`- Cloud Avg Latency: ${results.summary.overall.cloudAvgLatencyMs?.toFixed(2)}ms`);
  console.log(`- Edge Success Rate: ${(results.summary.overall.edgeSuccessRate * 100).toFixed(1)}%`);
  console.log(`- Cloud Success Rate: ${(results.summary.overall.cloudSuccessRate * 100).toFixed(1)}%`);
  
  console.log('\nNetwork Condition Breakdown:');
  for (const [condition, stats] of Object.entries(results.summary.networkConditions)) {
    console.log(`\n${condition}:`);
    console.log(`- Edge Avg Latency: ${stats.edgeAvgLatencyMs?.toFixed(2)}ms`);
    console.log(`- Cloud Avg Latency: ${stats.cloudAvgLatencyMs?.toFixed(2)}ms`);
    console.log(`- Edge Success Rate: ${(stats.edgeSuccessRate * 100).toFixed(1)}%`);
    console.log(`- Cloud Success Rate: ${(stats.cloudSuccessRate * 100).toFixed(1)}%`);
    
    if (stats.latencyDifferenceMs !== null) {
      const advantage = stats.latencyDifferenceMs > 0 ? 'Edge' : 'Cloud';
      const diff = Math.abs(stats.latencyDifferenceMs);
      console.log(`- ${advantage} advantage: ${diff.toFixed(2)}ms (${(diff / (stats.cloudAvgLatencyMs || 1) * 100).toFixed(1)}%)`);
    }
  }
}

// Entry point
if (require.main === module) {
  runPerformanceTests()
    .catch(error => {
      console.error('Performance test error:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceTests };
```

## AWS CloudFormation Template for Core Infrastructure

Here's a CloudFormation template to create the core infrastructure needed for the MedTranslate AI application:

```yaml
# infrastructure/cloudformation/core-infrastructure.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'MedTranslate AI - Core Infrastructure'

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, test, prod]
    Description: Deployment environment

  RetentionDays:
    Type: Number
    Default: 30
    Description: Number of days to retain translation data

  EdgeDeviceBucketName:
    Type: String
    Default: medtranslate-edge-models
    Description: S3 bucket name for edge device models and configuration

Resources:
  # VPC and Networking Resources
  MedTranslateVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsSupport: true
      EnableDnsHostnames: true
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-vpc

  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MedTranslateVPC
      CidrBlock: 10.0.0.0/24
      AvailabilityZone: !Select [0, !GetAZs ""]
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-public-subnet-1

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MedTranslateVPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [1, !GetAZs ""]
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-public-subnet-2

  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MedTranslateVPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [0, !GetAZs ""]
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-private-subnet-1

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MedTranslateVPC
      CidrBlock: 10.0.3.0/24
      AvailabilityZone: !Select [1, !GetAZs ""]
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-private-subnet-2

  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-igw

  InternetGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref MedTranslateVPC
      InternetGatewayId: !Ref InternetGateway

  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref MedTranslateVPC
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-public-rt

  PublicRoute:
    Type: AWS::EC2::Route
    DependsOn: InternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet1
      RouteTableId: !Ref PublicRouteTable

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet2
      RouteTableId: !Ref PublicRouteTable

  # Security Groups
  ApiSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for API Gateway VPC Link
      VpcId: !Ref MedTranslateVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub medtranslate-${Environment}-api-sg

  # DynamoDB Tables
  TranslationMemoryTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub medtranslate-${Environment}-translation-memory
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: sourceText
          AttributeType: S
        - AttributeName: sourceLang
          AttributeType: S
        - AttributeName: targetLang
          AttributeType: S
      KeySchema:
        - AttributeName: sourceText
          KeyType: HASH
        - AttributeName: sourceLang
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: TargetLanguageIndex
          KeySchema:
            - AttributeName: targetLang
              KeyType: HASH
            - AttributeName: sourceText
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      TimeToLiveSpecification:
        AttributeName: expirationTime
        Enabled: true
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      SSESpecification:
        SSEEnabled: true

  MedicalTerminologyTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub medtranslate-${Environment}-medical-terminology
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: term_source
          AttributeType: S
        - AttributeName: category
          AttributeType: S
      KeySchema:
        - AttributeName: term_source
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: CategoryIndex
          KeySchema:
            - AttributeName: category
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      SSESpecification:
        SSEEnabled: true

  SessionsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub medtranslate-${Environment}-sessions
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: sessionId
          AttributeType: S
        - AttributeName: sessionCode
          AttributeType: S
      KeySchema:
        - AttributeName: sessionId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: SessionCodeIndex
          KeySchema:
            - AttributeName: sessionCode
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      TimeToLiveSpecification:
        AttributeName: expirationTime
        Enabled: true
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      SSESpecification:
        SSEEnabled: true

  # S3 Buckets
  SecureStorageBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub medtranslate-${Environment}-secure-storage
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      LifecycleConfiguration:
        Rules:
          - Id: DeleteAfterRetentionPeriod
            Status: Enabled
            ExpirationInDays: !Ref RetentionDays
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  EdgeDeviceModelsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref EdgeDeviceBucketName
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  # KMS Key for encryption
  EncryptionKey:
    Type: AWS::KMS::Key
    Properties:
      Description: KMS key for MedTranslate AI data encryption
      EnableKeyRotation: true
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Sub arn:aws:iam::${AWS::AccountId}:root
            Action: kms:*
            Resource: '*'
          - Sid: Allow use of the key
            Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action:
              - kms:Encrypt
              - kms:Decrypt
              - kms:ReEncrypt*
              - kms:GenerateDataKey*
              - kms:DescribeKey
            Resource: '*'

  EncryptionKeyAlias:
    Type: AWS::KMS::Alias
    Properties:
      AliasName: !Sub alias/medtranslate-${Environment}-key
      TargetKeyId: !Ref EncryptionKey

  # Lambda Execution Role
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
      Policies:
        - PolicyName: MedTranslatePermissions
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - dynamodb:GetItem
                  - dynamodb:PutItem
                  - dynamodb:UpdateItem
                  - dynamodb:Query
                  - dynamodb:Scan
                Resource:
                  - !GetAtt TranslationMemoryTable.Arn
                  - !GetAtt MedicalTerminologyTable.Arn
                  - !GetAtt SessionsTable.Arn
                  - !Sub ${TranslationMemoryTable.Arn}/index/*
                  - !Sub ${MedicalTerminologyTable.Arn}/index/*
                  - !Sub ${SessionsTable.Arn}/index/*
              - Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:PutObject
                  - s3:DeleteObject
                Resource:
                  - !Sub ${SecureStorageBucket.Arn}/*
                  - !Sub ${EdgeDeviceModelsBucket.Arn}/*
              - Effect: Allow
                Action:
                  - kms:Decrypt
                  - kms:GenerateDataKey
                Resource: !GetAtt EncryptionKey.Arn
              - Effect: Allow
                Action:
                  - bedrock:InvokeModel
                Resource: '*'

  # Edge Device Role
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
      Policies:
        - PolicyName: EdgeDevicePermissions
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - s3:GetObject
                Resource: !Sub ${EdgeDeviceModelsBucket.Arn}/*
              - Effect: Allow
                Action:
                  - dynamodb:GetItem
                  - dynamodb:Query
                Resource:
                  - !GetAtt TranslationMemoryTable.Arn
                  - !GetAtt MedicalTerminologyTable.Arn
                  - !Sub ${TranslationMemoryTable.Arn}/index/*
                  - !Sub ${MedicalTerminologyTable.Arn}/index/*

  # Secrets Manager for JWT Secret
  JwtSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub medtranslate-${Environment}-jwt-secret
      Description: JWT signing secret for MedTranslate authentication
      GenerateSecretString:
        SecretStringTemplate: '{"username": "medtranslate"}'
        GenerateStringKey: "secret"
        PasswordLength: 64
        ExcludeCharacters: '"@/\'

Outputs:
  VPCId:
    Description: VPC ID
    Value: !Ref MedTranslateVPC
    Export:
      Name: !Sub ${AWS::StackName}-VPCId

  PublicSubnets:
    Description: Public Subnets
    Value: !Join [",", [!Ref PublicSubnet1, !Ref PublicSubnet2]]
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnets

  PrivateSubnets:
    Description: Private Subnets
    Value: !Join [",", [!Ref PrivateSubnet1, !Ref PrivateSubnet2]]
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnets

  ApiSecurityGroupId:
    Description: Security Group ID for API Gateway
    Value: !GetAtt ApiSecurityGroup.GroupId
    Export:
      Name: !Sub ${AWS::StackName}-ApiSecurityGroupId

  TranslationMemoryTableName:
    Description: Translation Memory DynamoDB Table Name
    Value: !Ref TranslationMemoryTable
    Export:
      Name: !Sub ${AWS::StackName}-TranslationMemoryTableName

  MedicalTerminologyTableName:
    Description: Medical Terminology DynamoDB Table Name
    Value: !Ref MedicalTerminologyTable
    Export:
      Name: !Sub ${AWS::StackName}-MedicalTerminologyTableName

  SessionsTableName:
    Description: Sessions DynamoDB Table Name
    Value: !Ref SessionsTable
    Export:
      Name: !Sub ${AWS::StackName}-SessionsTableName

  SecureStorageBucketName:
    Description: Secure Storage S3 Bucket Name
    Value: !Ref SecureStorageBucket
    Export:
      Name: !Sub ${AWS::StackName}-SecureStorageBucketName

  EdgeDeviceModelsBucketName:
    Description: Edge Device Models S3 Bucket Name
    Value: !Ref EdgeDeviceModelsBucket
    Export:
      Name: !Sub ${AWS::StackName}-EdgeDeviceModelsBucketName

  KmsKeyId:
    Description: KMS Key ID for Encryption
    Value: !Ref EncryptionKey
    Export:
      Name: !Sub ${AWS::StackName}-KmsKeyId

  KmsKeyArn:
    Description: KMS Key ARN for Encryption
    Value: !GetAtt EncryptionKey.Arn
    Export:
      Name: !Sub ${AWS::StackName}-KmsKeyArn

  LambdaExecutionRoleArn:
    Description: Lambda Execution Role ARN
    Value: !GetAtt LambdaExecutionRole.Arn
    Export:
      Name: !Sub ${AWS::StackName}-LambdaExecutionRoleArn

  EdgeDeviceRoleArn:
    Description: Edge Device Role ARN
    Value: !GetAtt EdgeDeviceRole.Arn
    Export:
      Name: !Sub ${AWS::StackName}-EdgeDeviceRoleArn

  JwtSecretArn:
    Description: JWT Secret ARN
    Value: !Ref JwtSecret
    Export:
      Name: !Sub ${AWS::StackName}-JwtSecretArn
```

## React Native TranslationMessage Component

This component displays translation messages in the patient app:

```jsx
// frontend/patient-app/src/components/TranslationMessage.js
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TranslationMessage = ({ message, patientLanguage }) => {
  const { sender, text, isProcessing, isError, confidence, timestamp } = message;
  
  // Format timestamp
  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Determine message style based on sender
  const isPatient = sender === 'patient';
  const isProvider = sender === 'provider';
  const isSystem = sender === 'system';
  
  // Determine confidence indicator
  let confidenceIcon = null;
  if (confidence && !isProcessing && !isError) {
    if (confidence === 'high') {
      confidenceIcon = <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.confidenceIcon} />;
    } else if (confidence === 'medium') {
      confidenceIcon = <Ionicons name="alert-circle" size={16} color="#FFC107" style={styles.confidenceIcon} />;
    } else {
      confidenceIcon = <Ionicons name="warning" size={16} color="#FF5722" style={styles.confidenceIcon} />;
    }
  }
  
  return (
    <View style={[
      styles.container,
      isPatient && styles.patientContainer,
      isProvider && styles.providerContainer,
      isSystem && styles.systemContainer,
      isError && styles.errorContainer
    ]}>
      {/* Message header with sender and time */}
      <View style={styles.header}>
        <Text style={styles.sender}>
          {isPatient ? 'You' : isProvider ? 'Doctor' : 'System'}
        </Text>
        <Text style={styles.time}>{formattedTime}</Text>
      </View>
      
      {/* Message content */}
      <View style={styles.contentContainer}>
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="small" color="#0077CC" />
            <Text style={styles.processingText}>{text}</Text>
          </View>
        ) : (
          <Text style={[
            styles.text,
            isSystem && styles.systemText,
            isError && styles.errorText
          ]}>
            {text}
          </Text>
        )}
      </View>
      
      {/* Message footer with language and confidence */}
      {(isPatient || isProvider) && !isProcessing && !isError && (
        <View style={styles.footer}>
          <Text style={styles.language}>
            {isPatient ? patientLanguage : 'English'}
          </Text>
          {confidenceIcon}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#E8EAF6',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  patientContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#E3F2FD',
  },
  providerContainer: {
    backgroundColor: '#F5F5F5',
  },
  systemContainer: {
    alignSelf: 'center',
    backgroundColor: '#EEEEEE',
    maxWidth: '90%',
  },
  errorContainer: {
    alignSelf: 'center',
    backgroundColor: '#FFEBEE',
    maxWidth: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#424242',
  },
  time: {
    fontSize: 10,
    color: '#757575',
  },
  contentContainer: {
    marginVertical: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    color: '#212121',
  },
  systemText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#616161',
    textAlign: 'center',
  },
  errorText: {
    color: '#C62828',
    fontWeight: '500',
    textAlign: 'center',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  language: {
    fontSize: 10,
    color: '#757575',
    marginRight: 4,
  },
  confidenceIcon: {
    marginLeft: 4,
  },
});

export default TranslationMessage;
```

## EdgeConnectionContext for React Native App

This context handles communication with the edge device:

```jsx
// frontend/patient-app/src/context/EdgeConnectionContext.js
import React, { createContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

// Create context
export const EdgeConnectionContext = createContext();

// Configuration
const API_ENDPOINTS = {
  EDGE: 'http://192.168.1.1:3000', // Default edge device IP
  CLOUD: 'https://api.medtranslate.ai' // Cloud endpoint
};

// Provider component
export const EdgeConnectionProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [activeEndpoint, setActiveEndpoint] = useState(null);
  const [websocket, setWebsocket] = useState(null);
  const [pendingMessages, setPendingMessages] = useState([]);
  
  // Initialize connection settings
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        // Load saved edge device endpoint
        const savedEdgeEndpoint = await AsyncStorage.getItem('edgeDeviceEndpoint');
        if (savedEdgeEndpoint) {
          API_ENDPOINTS.EDGE = savedEdgeEndpoint;
        }
        
        // Check network connectivity
        const netInfoState = await NetInfo.fetch();
        setIsConnected(netInfoState.isConnected);
        
        // Start listening for connectivity changes
        const unsubscribe = NetInfo.addEventListener(state => {
          setIsConnected(state.isConnected);
          
          // If connectivity changes, try to reconnect
          if (state.isConnected && !activeEndpoint) {
            detectEndpoint();
          }
        });
        
        // Initial endpoint detection
        detectEndpoint();
        
        return () => {
          unsubscribe();
          if (websocket) {
            websocket.close();
          }
        };
      } catch (error) {
        console.error('Failed to initialize connection:', error);
      }
    };
    
    initializeConnection();
  }, []);
  
  // Detect available endpoint (edge or cloud)
  const detectEndpoint = async () => {
    try {
      // First try edge device
      const edgeResponse = await Promise.race([
        axios.get(`${API_ENDPOINTS.EDGE}/health`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);
      
      if (edgeResponse.status === 200) {
        setActiveEndpoint(API_ENDPOINTS.EDGE);
        return;