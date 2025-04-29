/**
 * Run Medical Knowledge Base Population Script
 * 
 * This script runs the medical knowledge base population script
 * and provides a command-line interface for it.
 */

const path = require('path');
const { spawn } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  help: args.includes('--help') || args.includes('-h'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  createTable: args.includes('--create-table') || args.includes('-c'),
  skipConfirmation: args.includes('--yes') || args.includes('-y')
};

// Show help
if (options.help) {
  console.log(`
Medical Knowledge Base Population Script

Usage: node run-medical-kb-population.js [options]

Options:
  -h, --help          Show this help message
  -v, --verbose       Show verbose output
  -c, --create-table  Create the DynamoDB table if it doesn't exist
  -y, --yes           Skip confirmation prompt

Description:
  This script populates the DynamoDB medical terminology database with
  sample medical terms across multiple languages and specialties.
  `);
  process.exit(0);
}

// Confirm before running
if (!options.skipConfirmation) {
  console.log('This script will populate the medical terminology database.');
  console.log('Make sure you have set up the AWS credentials and DynamoDB endpoint.');
  console.log('');
  console.log('Do you want to continue? (y/n)');
  
  // Read from stdin
  process.stdin.setEncoding('utf8');
  process.stdin.once('data', (data) => {
    const input = data.trim().toLowerCase();
    if (input === 'y' || input === 'yes') {
      runPopulationScript();
    } else {
      console.log('Aborted.');
      process.exit(0);
    }
  });
} else {
  runPopulationScript();
}

// Run the population script
function runPopulationScript() {
  console.log('Running medical knowledge base population script...');
  
  // Set environment variables
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    DYNAMODB_ENDPOINT: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    MEDICAL_TERMINOLOGY_TABLE: process.env.MEDICAL_TERMINOLOGY_TABLE || 'MedicalTerminology',
    CREATE_TABLE: options.createTable ? 'true' : 'false',
    VERBOSE: options.verbose ? 'true' : 'false'
  };
  
  // Spawn the process
  const scriptPath = path.join(__dirname, 'populate-medical-kb.js');
  const child = spawn('node', [scriptPath], { env, stdio: 'inherit' });
  
  // Handle process exit
  child.on('close', (code) => {
    if (code === 0) {
      console.log('Medical knowledge base population completed successfully.');
    } else {
      console.error(`Medical knowledge base population failed with code ${code}.`);
    }
    process.exit(code);
  });
}
