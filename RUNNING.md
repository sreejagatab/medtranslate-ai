# Running MedTranslate AI Locally

This document provides instructions for running the MedTranslate AI project locally for development.

## Prerequisites

- Node.js 18.x or later
- Python 3.9 or later (for edge service)
- Docker and Docker Compose (optional, for full environment)

## Option 1: Using Docker Compose (Recommended)

If you have Docker and Docker Compose installed, you can run the entire project with a single command:

```bash
docker-compose up
```

This will start all services:
- Backend API: http://localhost:3001
- Provider App: http://localhost:3003
- Patient App: http://localhost:3004
- Edge Service: http://localhost:3002
- DynamoDB Local: http://localhost:8000
- LocalStack (S3): http://localhost:4566

## Option 2: Running Services Individually

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Provider App
cd frontend/provider-app
npm install

# Patient App
cd frontend/patient-app
npm install

# Edge Service
cd edge/app
pip install -r requirements.txt
```

### 2. Start Services

#### Backend

```bash
cd backend
npm run dev
```

#### Provider App

```bash
cd frontend/provider-app
npm start
```

#### Patient App

```bash
cd frontend/patient-app
npm start
```

#### Edge Service

```bash
cd edge/app
python app.py
```

## Option 3: Using the Local Development Runner

We've provided a simple Node.js script to run the backend and frontend services:

```bash
node run-local.js
```

This will start:
- Backend API: http://localhost:3001
- Provider App: http://localhost:3003
- Patient App: http://localhost:3004

## Testing the Application

1. Open the Provider App at http://localhost:3003
2. Log in with the demo credentials:
   - Username: demo
   - Password: demo123
3. Create a new translation session
4. Open the Patient App at http://localhost:3004
5. Join the session using the session code displayed in the Provider App

## Troubleshooting

### Port Conflicts

If you encounter port conflicts, you can change the ports in the environment variables:

- Backend: PORT environment variable
- Provider App: PORT environment variable
- Patient App: PORT environment variable
- Edge Service: --port command line argument

### Missing Dependencies

If you encounter errors about missing dependencies, make sure you've installed all required packages:

```bash
# Backend
cd backend
npm install

# Provider App
cd frontend/provider-app
npm install

# Patient App
cd frontend/patient-app
npm install
```

### API Connection Issues

Make sure the frontend apps are configured to connect to the correct API URL. Check the environment variables:

- REACT_APP_API_URL: Should point to the backend API (default: http://localhost:3001)
- REACT_APP_EDGE_URL: Should point to the edge service (default: http://localhost:3002)
