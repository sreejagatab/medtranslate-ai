/**
 * Generate self-signed certificates for development
 * 
 * This script generates self-signed SSL certificates for local development.
 * DO NOT use these certificates in production.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Certificate directory
const CERT_DIR = path.join(__dirname, 'certs');

// Ensure certificate directory exists
if (!fs.existsSync(CERT_DIR)) {
  fs.mkdirSync(CERT_DIR, { recursive: true });
}

// Certificate paths
const KEY_PATH = path.join(CERT_DIR, 'server.key');
const CERT_PATH = path.join(CERT_DIR, 'server.cert');

// Check if certificates already exist
if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
  console.log('Certificates already exist. Skipping generation.');
  process.exit(0);
}

// Generate certificates
try {
  console.log('Generating self-signed certificates for development...');
  
  // Generate private key
  execSync(`openssl genrsa -out "${KEY_PATH}" 2048`);
  
  // Generate certificate signing request
  execSync(`openssl req -new -key "${KEY_PATH}" -out "${CERT_DIR}/server.csr" -subj "/C=US/ST=State/L=City/O=MedTranslate AI/CN=localhost"`);
  
  // Generate self-signed certificate
  execSync(`openssl x509 -req -days 365 -in "${CERT_DIR}/server.csr" -signkey "${KEY_PATH}" -out "${CERT_PATH}"`);
  
  // Remove certificate signing request
  fs.unlinkSync(path.join(CERT_DIR, 'server.csr'));
  
  console.log('Certificates generated successfully.');
  console.log(`Private key: ${KEY_PATH}`);
  console.log(`Certificate: ${CERT_PATH}`);
  
  console.log('\nWARNING: These are self-signed certificates for development only.');
  console.log('DO NOT use these certificates in production.');
} catch (error) {
  console.error('Error generating certificates:', error.message);
  process.exit(1);
}
