# MedTranslate AI

Real-time medical translation system using AWS Generative AI and Edge Computing

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
- **WebSocket Communication**: Real-time bidirectional communication between patients and providers

## Getting Started

### Prerequisites

- AWS Account with access to Amazon Bedrock
- Node.js 18+ and npm
- React Native development environment
- AWS CLI configured with appropriate permissions

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/medtranslate-ai.git
   cd medtranslate-ai
   ```

2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install edge dependencies
   cd ../edge
   npm install

   # Install provider app dependencies
   cd ../frontend/provider-app
   npm install

   # Install patient app dependencies
   cd ../frontend/patient-app
   npm install
   ```

3. Start the development environment:
   ```bash
   # From the project root
   ./start-dev-environment.ps1
   ```

   This will start:
   - Backend API server on http://localhost:3001
   - Edge computing server on http://localhost:3002
   - Provider app on http://localhost:3003
   - Patient app on http://localhost:3004

### AWS Deployment

1. Configure AWS CLI:
   ```bash
   aws configure
   ```

2. Deploy the infrastructure:
   ```bash
   cd infrastructure
   ./deploy.ps1 -Environment dev -Region us-east-1
   ```

3. Set up backend services:
   ```bash
   cd backend
   npm run deploy:dev
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

## Next Steps

To further improve the MedTranslate AI system:

1. **Enhance Edge Computing Capabilities**:
   - Complete offline capabilities with robust caching
   - Implement local inference engine for low-latency translation
   - Develop synchronization protocol for model updates
   - Add conflict resolution for offline operations

2. **Develop Native Mobile Applications with Push Notifications**:
   - Enhance mobile apps with push notifications
   - Improve offline capabilities
   - Add visual confidence indicators for translations

3. **Implement Monitoring and Analytics Systems**:
   - Complete comprehensive logging system
   - Implement performance metrics collection
   - Add usage analytics dashboard
   - Develop alerting system for issues

4. **Strengthen Security and Compliance**:
   - Complete end-to-end encryption for all communications
   - Set up comprehensive audit logging
   - Implement HIPAA-compliant data retention policies

5. **Implement Comprehensive Testing**:
   - Add unit, integration, and end-to-end tests
   - Implement performance testing
   - Test with real-world medical scenarios
