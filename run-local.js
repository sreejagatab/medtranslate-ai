/**
 * Local Development Runner for MedTranslate AI
 * 
 * This script helps run the project locally without Docker.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Define services to run
const services = [
  {
    name: 'Backend',
    command: 'npm',
    args: ['run', 'dev'],
    cwd: path.join(__dirname, 'backend'),
    env: {
      PORT: '3001',
      NODE_ENV: 'development',
      AWS_REGION: 'us-east-1',
      PROVIDERS_TABLE: 'MedTranslateProviders-local',
      SESSIONS_TABLE: 'MedTranslateSessions-local',
      MEDICAL_TERMINOLOGY_TABLE: 'MedicalTerminology-local',
      JWT_SECRET: 'local-development-secret'
    }
  },
  {
    name: 'Provider App',
    command: 'npm',
    args: ['start'],
    cwd: path.join(__dirname, 'frontend/provider-app'),
    env: {
      PORT: '3003',
      REACT_APP_API_URL: 'http://localhost:3001',
      REACT_APP_EDGE_URL: 'http://localhost:3002'
    }
  },
  {
    name: 'Patient App',
    command: 'npm',
    args: ['start'],
    cwd: path.join(__dirname, 'frontend/patient-app'),
    env: {
      PORT: '3004',
      REACT_APP_API_URL: 'http://localhost:3001',
      REACT_APP_EDGE_URL: 'http://localhost:3002'
    }
  }
];

// Check if required directories and files exist
function checkRequirements() {
  const requiredPaths = [
    'backend',
    'frontend/provider-app',
    'frontend/patient-app',
    'backend/package.json',
    'frontend/provider-app/package.json',
    'frontend/patient-app/package.json'
  ];

  for (const reqPath of requiredPaths) {
    const fullPath = path.join(__dirname, reqPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`Required path not found: ${reqPath}`);
      return false;
    }
  }

  return true;
}

// Run a service
function runService(service) {
  console.log(`Starting ${service.name}...`);

  const proc = spawn(service.command, service.args, {
    cwd: service.cwd,
    env: { ...process.env, ...service.env },
    shell: true,
    stdio: 'pipe'
  });

  // Handle output
  proc.stdout.on('data', (data) => {
    console.log(`[${service.name}] ${data.toString().trim()}`);
  });

  proc.stderr.on('data', (data) => {
    console.error(`[${service.name}] ${data.toString().trim()}`);
  });

  // Handle process exit
  proc.on('close', (code) => {
    console.log(`[${service.name}] Process exited with code ${code}`);
  });

  return proc;
}

// Main function
async function main() {
  console.log('MedTranslate AI Local Development Runner');
  console.log('---------------------------------------');

  // Check requirements
  if (!checkRequirements()) {
    console.error('Requirements check failed. Please make sure all required files and directories exist.');
    process.exit(1);
  }

  // Run services
  const processes = [];
  for (const service of services) {
    const proc = runService(service);
    processes.push(proc);
  }

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('Shutting down services...');
    for (const proc of processes) {
      proc.kill();
    }
    process.exit(0);
  });
}

// Run the script
main().catch((error) => {
  console.error('Error running local development environment:', error);
  process.exit(1);
});
