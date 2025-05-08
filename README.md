# MedTranslate AI

Real-time medical translation system using AWS Generative AI and Edge Computing

![MedTranslate AI](docs/images/medtranslate-logo.png)

## Overview

MedTranslate AI bridges language barriers in healthcare settings by providing accurate, real-time translation between healthcare providers and patients. The system combines AWS generative AI services with edge computing and 5G connectivity for reliable, low-latency operation, even in environments with limited connectivity.

### Key Features

- **Real-time Medical Translation**: Accurate translation of medical conversations with specialized terminology support
- **Comprehensive Medical Knowledge Base**: Integration with UMLS, SNOMED, ICD10, and other medical terminology databases
- **Multi-Model AI Translation**: Leveraging Amazon Bedrock models (Claude, Titan, Llama, Mistral) with context-aware selection
- **Edge Computing**: Local inference for privacy, low latency, and offline operation
- **Multi-Factor Authentication**: Secure access with TOTP-based two-factor authentication
- **Role-Based Access Control**: Fine-grained permission system for healthcare providers and administrators
- **WebSocket Communication**: Real-time bidirectional communication with reconnection handling
- **Cross-Platform Mobile Applications**: React Native apps for patients and providers
- **System Health Monitoring**: Real-time monitoring of all system components
- **HIPAA-Compliant Design**: Security and privacy features designed for healthcare environments

## Architecture

MedTranslate AI uses a hybrid cloud/edge architecture designed for reliability, performance, and security in healthcare environments.

![Architecture Diagram](docs/images/architecture-diagram.png)

### Cloud Components

- **AWS Bedrock**: Powers the core translation with specialized medical prompts and models
- **Amazon DynamoDB**: Stores medical terminology, user data, and session information
- **Amazon Cognito**: Manages user authentication and authorization
- **AWS Lambda**: Handles serverless processing for translation and verification
- **Amazon S3**: Stores audio recordings and translation artifacts
- **Amazon CloudWatch**: Monitors system performance and logs

### Edge Components

- **Edge Runtime**: Optimized environment for local model execution
- **Local Models**: Compressed models for offline translation
- **Caching Layer**: Stores recent translations and terminology
- **Sync Manager**: Handles synchronization with cloud services
- **WebSocket Server**: Manages real-time communication
- **Health Monitor**: Tracks system status and performance

### Client Applications

- **Provider Application**: React Native app for healthcare providers
- **Patient Application**: React Native app for patients
- **Admin Dashboard**: Web application for system administration
- **Mobile Edge Application**: Deployable on dedicated edge devices

## Getting Started

### Prerequisites

- **AWS Account** with access to:
  - Amazon Bedrock (Claude, Titan, Llama, and Mistral models)
  - DynamoDB, S3, Lambda, Cognito, and CloudWatch
- **Development Environment**:
  - Node.js 18+ and npm
  - Python 3.9+ (for edge ML components)
  - React Native development environment
  - AWS CLI v2+ configured with appropriate permissions
- **Hardware** (for edge deployment):
  - Edge device with 4GB+ RAM, quad-core processor
  - 5G or reliable Wi-Fi connectivity

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/medtranslate-ai.git
   cd medtranslate-ai
   ```

2. Set up environment variables:
   ```bash
   # Copy example environment files
   cp backend/.env.example backend/.env.development
   cp edge/.env.example edge/.env.development

   # Edit the environment files with your configuration
   # You'll need to set AWS credentials, region, and service endpoints
   ```

3. Install dependencies and set up the project:
   ```bash
   # Run the setup script (installs all dependencies)
   npm run setup

   # Or install dependencies manually
   cd backend && npm install
   cd ../edge && npm install
   cd ../frontend/provider-app && npm install
   cd ../patient-app && npm install
   cd ../admin-dashboard && npm install
   ```

### Local Development

1. Start the development environment:
   ```bash
   # From the project root
   npm start
   ```

   This will start all components:
   - Backend API server on http://localhost:4001
   - Edge computing server on http://localhost:4000
   - Provider app on http://localhost:4003
   - Patient app on http://localhost:4004
   - Admin dashboard on http://localhost:4002

2. Access the applications:
   - Provider Application: http://localhost:4003
   - Patient Application: http://localhost:4004
   - Admin Dashboard: http://localhost:4002
   - API Documentation: http://localhost:4001/api-docs

### AWS Deployment

1. Configure AWS resources:
   ```bash
   # Deploy infrastructure using CloudFormation
   cd infrastructure
   ./deploy.ps1 -Environment dev -Region us-east-1

   # This creates:
   # - DynamoDB tables for users, sessions, and medical terminology
   # - S3 buckets for storage
   # - Cognito user pools
   # - IAM roles and policies
   # - API Gateway endpoints
   ```

2. Deploy backend services:
   ```bash
   cd backend
   npm run deploy:dev

   # This deploys Lambda functions and configures API Gateway
   ```

3. Configure frontend applications:
   ```bash
   # Configure frontend to use deployed backend
   cd infrastructure
   ./configure-frontend.ps1 -Environment dev

   # Build and deploy web applications
   cd ../frontend/admin-dashboard
   npm run build
   # Deploy the build directory to your hosting service (S3, Amplify, etc.)
   ```

4. Build mobile applications:
   ```bash
   # For Android
   cd mobile/patient-app
   npm run build:android

   # For iOS
   cd mobile/patient-app
   npm run build:ios

   # Repeat for provider app
   ```

### Edge Device Deployment

1. Prepare the edge device:
   ```bash
   # Install dependencies on the edge device
   ssh user@edge-device "sudo apt-get update && sudo apt-get install -y nodejs npm python3 python3-pip"

   # Copy edge application to the device
   scp -r edge user@edge-device:/home/user/medtranslate-edge
   ```

2. Configure and start the edge application:
   ```bash
   ssh user@edge-device "cd /home/user/medtranslate-edge && npm install && npm start"
   ```

3. Set up as a service (optional):
   ```bash
   # Create a systemd service for automatic startup
   scp deployment/edge-service.service user@edge-device:/tmp/
   ssh user@edge-device "sudo mv /tmp/edge-service.service /etc/systemd/system/ && sudo systemctl enable edge-service && sudo systemctl start edge-service"
   ```

## Development

### Project Structure

```
medtranslate-ai/
├── backend/                  # Backend services
│   ├── src/                  # Source code
│   │   ├── api/              # API endpoints
│   │   ├── auth/             # Authentication services
│   │   ├── models/           # Data models
│   │   ├── services/         # Business logic
│   │   └── utils/            # Utility functions
│   ├── tests/                # Backend tests
│   └── serverless.yml        # Serverless configuration
├── edge/                     # Edge computing components
│   ├── app/                  # Edge application
│   │   ├── server.js         # Main server
│   │   ├── translation.js    # Translation module
│   │   ├── model_manager.js  # Model management
│   │   └── sync.js           # Cloud synchronization
│   ├── runtime/              # Edge runtime environment
│   └── models/               # Optimized models for edge
├── frontend/                 # Frontend applications
│   ├── provider-app/         # Provider application
│   ├── patient-app/          # Patient application
│   ├── admin-dashboard/      # Admin dashboard
│   └── shared/               # Shared components
├── mobile/                   # Native mobile applications
│   ├── provider-app/         # Provider mobile app
│   └── patient-app/          # Patient mobile app
├── infrastructure/           # Infrastructure as Code
│   ├── cloudformation/       # CloudFormation templates
│   ├── terraform/            # Terraform configurations
│   └── scripts/              # Deployment scripts
├── scripts/                  # Utility scripts
├── tests/                    # Integration and E2E tests
└── docs/                     # Documentation
```

### Key Components

#### Backend Services

The backend is built with Node.js and Express, deployed as serverless functions on AWS Lambda:

- **Authentication Service**: Handles user authentication, MFA, and session management
- **Translation Service**: Manages translation requests and integrates with Bedrock
- **Medical Knowledge Base**: Provides medical terminology verification and context
- **WebSocket Server**: Manages real-time communication between clients
- **Storage Service**: Handles secure storage of session data and transcripts

#### Edge Application

The edge application runs on dedicated edge devices or as a local service:

- **Local Inference Engine**: Runs optimized models for offline translation
- **Caching System**: Stores recent translations and terminology
- **Synchronization Module**: Manages data synchronization with cloud
- **Health Monitoring**: Tracks system performance and status

#### Frontend Applications

The frontend applications are built with React Native for cross-platform compatibility:

- **Provider Application**: Used by healthcare providers to manage translation sessions
- **Patient Application**: Used by patients to participate in translation sessions
- **Admin Dashboard**: Web application for system administration and monitoring

### Development Workflow

1. **Feature Development**:
   - Create a feature branch from `develop`
   - Implement the feature with tests
   - Submit a pull request to `develop`

2. **Testing**:
   - Run unit tests: `npm test`
   - Run integration tests: `npm run test:integration`
   - Run end-to-end tests: `npm run test:e2e`

3. **Deployment**:
   - Merge to `develop` for development deployment
   - Merge to `staging` for staging deployment
   - Merge to `main` for production deployment

## Recent Updates

### Added ApiStatus Component for System Health Monitoring

A new ApiStatus component has been added to monitor the health of various system components:

- **ApiStatus**: A reusable component for displaying API health status
- **ApiStatusIndicator**: A lightweight version for headers and navigation bars
- **SystemHealthPanel**: A comprehensive panel for displaying multiple system components
- **ConnectionStatus**: A component for displaying network connection status

These components are now integrated into the Admin Dashboard and Provider Application to provide real-time visibility into system health.

### Implemented Real Translation Models and Medical Terminology Database

Enhanced the translation capabilities with real models and comprehensive medical terminology:

- **Enhanced Bedrock Client**: Advanced integration with Amazon Bedrock for medical translation
- **Medical Terminology Database**: Comprehensive database with terms from UMLS, SNOMED, ICD10, and more
- **Specialized Prompt Templates**: Custom prompts for different model families to improve medical translation accuracy
- **Context-Aware Model Selection**: Intelligent selection of the best model based on language pair and medical context
- **Fallback Mechanisms**: Robust handling of translation failures with multiple fallback options
- **Terminology Verification**: Validation of medical term translations for accuracy

To set up and test the medical knowledge base and translation system:

```bash
# Run the setup script
cd scripts
./setup-medical-translation.ps1

# Test the translation system
node test-medical-translation.js
```

For more information, see [Medical Knowledge Base and Translation](docs/medical-kb-translation.md).

### Implemented Multi-Factor Authentication and Role-Based Access Control

Enhanced security with comprehensive authentication and authorization features:

- **Multi-Factor Authentication**: TOTP-based two-factor authentication with QR code setup and backup codes
- **Role-Based Access Control**: Fine-grained permission system with predefined roles and custom permissions
- **Security Middleware**: Permission-based middleware for API endpoint protection
- **User Profile Management**: Enhanced user profile with security settings management

## Testing

MedTranslate AI includes comprehensive testing to ensure reliability, performance, and security.

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit                    # All unit tests
npm run test:unit:mobile             # Mobile app unit tests
npm run test:unit:provider           # Provider app unit tests
npm run test:unit:admin              # Admin dashboard unit tests
npm run test:edge:unit               # Edge component unit tests
npm run test:backend:unit            # Backend unit tests

# Run integration tests
npm run test:integration             # All integration tests
npm run test:integration:backend-edge    # Backend-Edge integration tests
npm run test:integration:backend-frontend # Backend-Frontend integration tests
npm run test:integration:edge-frontend   # Edge-Frontend integration tests
npm run test:websocket:reconnection  # WebSocket reconnection tests
npm run test:error-handling          # Error handling tests

# Run end-to-end tests
npm run test:e2e                     # All end-to-end tests
npm run test:e2e:translation-flow    # Complete translation flow test
npm run test:e2e:offline-flow        # Offline capability flow test
npm run test:e2e:admin-flow          # Administrative workflow test

# Run performance tests
npm run test:performance             # All performance tests
npm run test:performance:backend     # Backend performance tests
npm run test:performance:edge        # Edge device performance tests
npm run test:performance:mobile      # Mobile app performance tests
npm run test:performance:translation # Translation performance tests
npm run test:performance:cache       # Cache performance tests
npm run test:performance:offline     # Offline performance tests

# Run other tests
npm run test:security                # Security tests
npm run test:localization            # Localization tests
npm run test:app-store               # App store submission tests

# Generate test report
npm run test:report                  # Generate comprehensive test report
```

For detailed instructions on running tests, see [RUNNING_TESTS.md](tests/RUNNING_TESTS.md).

### Test Categories

- **Unit Tests**: Test individual components and functions in isolation
  - Mobile app components, hooks, and services
  - Provider app components and hooks
  - Admin dashboard components
  - Edge components (translation, cache, sync, server)
  - Backend services (authentication, translation, storage, WebSocket)

- **Integration Tests**: Test interactions between components
  - Backend-Edge integration (device discovery, translation sync, offline mode)
  - Backend-Frontend integration (authentication flow, translation flow)
  - Edge-Frontend integration (device connection, local translation, offline operation)
  - WebSocket communication (real-time updates, reconnection handling)

- **End-to-End Tests**: Test complete user workflows
  - Complete translation flow (provider-patient translation session)
  - Offline capability flow (edge device operation during network outage)
  - Administrative workflow (system monitoring, configuration, user management)

- **Performance Tests**: Measure system performance under various conditions
  - Backend performance (response time, concurrent sessions, database queries)
  - Edge device performance (translation speed, memory usage, battery consumption)
  - Mobile app performance (startup time, UI responsiveness, memory usage)

- **Security Tests**: Verify security implementations
  - Authentication security (token security, password policies, MFA)
  - Data security (encryption, secure storage, access control)
  - API security (input validation, rate limiting, CSRF protection)

- **Localization Tests**: Verify translation accuracy and UI adaptation
  - Medical terminology translation accuracy
  - UI adaptation to different languages
  - RTL language support

### Continuous Integration

The project uses GitHub Actions for continuous integration, automatically running tests on code changes. The CI pipeline runs:

1. Unit tests on every commit
2. Integration tests on pull requests and merges to main branch
3. End-to-end tests on merges to main branch
4. Performance tests on a schedule (nightly)
5. Security tests on a schedule (weekly)

Test reports are automatically generated and available in the GitHub Actions artifacts.

## Security and Compliance

MedTranslate AI is designed with healthcare security and privacy requirements in mind.

### Security Features

- **Authentication**: Multi-factor authentication with TOTP
- **Authorization**: Role-based access control with fine-grained permissions
- **Data Protection**: Encryption for data in transit and at rest
- **Audit Logging**: Comprehensive logging of all system activities
- **Session Management**: Secure session handling with timeout and inactivity detection

### HIPAA Compliance

The system is designed to meet HIPAA requirements:

- **Privacy**: Minimizes collection and storage of PHI
- **Security**: Implements required technical safeguards
- **Audit Controls**: Tracks access to protected information
- **Integrity**: Ensures data is not altered inappropriately
- **Transmission Security**: Protects data during transmission

## Troubleshooting

### Common Issues

#### Backend Connection Issues

- Ensure AWS credentials are correctly configured
- Check that the required AWS services are available in your region
- Verify network connectivity to AWS endpoints

#### Edge Device Issues

- Ensure the edge device meets minimum hardware requirements
- Check network connectivity for synchronization
- Verify that required models are downloaded and available

#### Mobile Application Issues

- For React Native version mismatches, run the dependency fix script:
  ```bash
  node scripts/fix-dependencies.js
  ```
- If you encounter specific React Native version issues:
  ```bash
  # Check current versions across all applications
  grep -r "\"react-native\":" --include="package.json" .

  # Standardize to version 0.72.10 (recommended)
  cd scripts
  node fix-dependencies.js

  # Test applications after updates
  node test-react-native-updates.js
  ```
- Ensure the correct API endpoints are configured
- Check for missing assets and add placeholders if needed

### Logging and Debugging

- Backend logs are available in CloudWatch Logs
- Edge application logs are stored in `edge/logs`
- Mobile application logs can be viewed using React Native Debugger

## Next Steps

Based on the current implementation status, the following enhancements are planned:

1. **Edge Computing Enhancements**:
   - Complete offline capabilities with robust caching
   - Optimize models for edge deployment with size constraints
   - Implement resource utilization monitoring
   - Add network quality assessment

2. **User Interface Improvements**:
   - Standardize React Native versions across applications
   - Add visual confidence indicators for translations
   - Implement offline mode UI indicators
   - Enhance accessibility features

3. **Security Enhancements**:
   - Implement end-to-end encryption for all communications
   - Set up comprehensive audit logging
   - Implement HIPAA-compliant data retention policies

4. **Integration Improvements**:
   - Improve WebSocket reconnection handling
   - Implement message queuing for offline mode
   - Enhance network status monitoring
   - Develop comprehensive error handling

5. **Monitoring and Analytics**:
   - Configure proper CloudWatch integration for production
   - Implement translation quality monitoring
   - Add system health visualization
   - Develop error trend analysis

## Contributing

We welcome contributions to the MedTranslate AI project! Please follow these steps to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Medical terminology resources provided by UMLS, SNOMED, and ICD10
- AWS for providing the Bedrock generative AI services
- Healthcare partners for domain expertise and testing
- Open source community for various libraries and tools used in this project
