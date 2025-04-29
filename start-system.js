/**
 * MedTranslate AI System Starter
 *
 * This script starts all components of the MedTranslate AI system:
 * - Backend server
 * - Edge application
 * - Provider application
 * - Patient application
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Define colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Define services to start
const services = [
  {
    name: 'Backend',
    color: colors.cyan,
    command: 'node',
    args: ['dev-server.js'],
    cwd: path.join(__dirname, 'backend'),
    env: {
      PORT: '4001',
      NODE_ENV: 'development',
      ...process.env
    }
  },
  {
    name: 'Edge',
    color: colors.green,
    command: 'node',
    args: ['app/server.js'],
    cwd: path.join(__dirname, 'edge'),
    env: {
      PORT: '4000',
      NODE_ENV: 'development',
      ...process.env
    }
  },
  {
    name: 'Provider App',
    color: colors.magenta,
    command: 'node',
    args: ['web-server.js'],
    cwd: path.join(__dirname, 'frontend/provider-app'),
    env: {
      PORT: '4003',
      REACT_APP_API_URL: 'http://localhost:4001',
      REACT_APP_EDGE_URL: 'http://localhost:4000',
      ...process.env
    }
  },
  {
    name: 'Patient App',
    color: colors.yellow,
    command: 'node',
    args: ['web-server.js'],
    cwd: path.join(__dirname, 'frontend/patient-app'),
    env: {
      PORT: '4004',
      REACT_APP_API_URL: 'http://localhost:4001',
      REACT_APP_EDGE_URL: 'http://localhost:4000',
      ...process.env
    }
  }
];

// Check if required directories and files exist
function checkRequirements() {
  const requiredPaths = [
    'backend',
    'edge',
    'frontend/provider-app',
    'frontend/patient-app',
    'backend/dev-server.js',
    'edge/app/server.js',
    'frontend/provider-app/web-server.js',
    'frontend/patient-app/web-server.js'
  ];

  for (const reqPath of requiredPaths) {
    const fullPath = path.join(__dirname, reqPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`${colors.red}Required path not found: ${reqPath}${colors.reset}`);
      return false;
    }
  }

  return true;
}

// Start a service
function startService(service) {
  console.log(`${service.color}${colors.bright}Starting ${service.name}...${colors.reset}`);

  const proc = spawn(service.command, service.args, {
    cwd: service.cwd,
    env: { ...process.env, ...service.env },
    shell: true,
    stdio: 'pipe'
  });

  // Handle output
  proc.stdout.on('data', (data) => {
    console.log(`${service.color}[${service.name}] ${data.toString().trim()}${colors.reset}`);
  });

  proc.stderr.on('data', (data) => {
    console.error(`${service.color}[${service.name} ERROR] ${data.toString().trim()}${colors.reset}`);
  });

  // Handle process exit
  proc.on('close', (code) => {
    if (code === 0) {
      console.log(`${service.color}[${service.name}] Process exited successfully${colors.reset}`);
    } else {
      console.error(`${service.color}[${service.name}] Process exited with code ${code}${colors.reset}`);
    }
  });

  return proc;
}

// Main function
async function main() {
  console.log(`${colors.bright}${colors.blue}
  __  __          _ _____                    _       _         _    ___
 |  \\/  | ___  __| |_   _| __ __ _ _ __  ___| | __ _| |_ ___  / \\  |_ _|
 | |\\/| |/ _ \\/ _\` | | || '__/ _\` | '_ \\/ __| |/ _\` | __/ _ \\/ _ \\  | |
 | |  | |  __/ (_| | | || | | (_| | | | \\__ \\ | (_| | ||  __/ ___ \\ | |
 |_|  |_|\\___|\\__,_| |_||_|  \\__,_|_| |_|___/_|\\__,_|\\__\\___|_/   \\_\\___|

  ${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}Starting MedTranslate AI System...${colors.reset}`);
  console.log(`${colors.dim}---------------------------------------${colors.reset}`);

  // Check requirements
  if (!checkRequirements()) {
    console.error(`${colors.red}${colors.bright}Requirements check failed. Please make sure all required files and directories exist.${colors.reset}`);
    process.exit(1);
  }

  // Start services
  const processes = [];
  for (const service of services) {
    const proc = startService(service);
    processes.push(proc);

    // Add a small delay between starting services
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`${colors.bright}${colors.green}All services started successfully!${colors.reset}`);
  console.log(`
${colors.bright}Access the applications at:${colors.reset}
- ${colors.cyan}Backend API:     ${colors.bright}http://localhost:4001${colors.reset}
- ${colors.green}Edge API:       ${colors.bright}http://localhost:4000${colors.reset}
- ${colors.magenta}Provider App:   ${colors.bright}http://localhost:4003${colors.reset}
- ${colors.yellow}Patient App:    ${colors.bright}http://localhost:4004${colors.reset}
  `);

  // Handle process termination
  process.on('SIGINT', () => {
    console.log(`\n${colors.bright}${colors.red}Shutting down services...${colors.reset}`);
    for (const proc of processes) {
      proc.kill();
    }
    process.exit(0);
  });
}

// Run the script
main().catch((error) => {
  console.error(`${colors.red}${colors.bright}Error starting MedTranslate AI system:${colors.reset}`, error);
  process.exit(1);
});
