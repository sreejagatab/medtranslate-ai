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
