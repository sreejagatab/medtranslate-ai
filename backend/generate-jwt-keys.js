/**
 * Generate RSA keys for JWT signing
 * 
 * This script generates RSA key pairs for JWT signing and verification.
 * The keys are stored in the certs/jwt directory.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Key directory
const KEY_DIR = path.join(__dirname, 'certs', 'jwt');

// Ensure key directory exists
if (!fs.existsSync(KEY_DIR)) {
  fs.mkdirSync(KEY_DIR, { recursive: true });
}

// Key paths
const PRIVATE_KEY_PATH = path.join(KEY_DIR, 'private.key');
const PUBLIC_KEY_PATH = path.join(KEY_DIR, 'public.key');

// Check if keys already exist
if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
  console.log('JWT keys already exist. Skipping generation.');
  process.exit(0);
}

// Generate RSA key pair
try {
  console.log('Generating RSA key pair for JWT signing...');
  
  // Generate key pair
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  // Write keys to files
  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
  fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
  
  console.log('RSA key pair generated successfully.');
  console.log(`Private key: ${PRIVATE_KEY_PATH}`);
  console.log(`Public key: ${PUBLIC_KEY_PATH}`);
} catch (error) {
  console.error('Error generating RSA key pair:', error.message);
  process.exit(1);
}
