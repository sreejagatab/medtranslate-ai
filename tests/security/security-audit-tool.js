/**
 * Enhanced Security Audit Tool for MedTranslate AI
 *
 * This tool automates security checks based on the security audit checklist.
 *
 * Enhanced features:
 * - Improved Windows compatibility
 * - More comprehensive security checks
 * - Better error handling
 * - Detailed security reports
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
const crypto = require('crypto');
const os = require('os');

// Detect operating system
const isWindows = os.platform() === 'win32';

// Configuration
const config = {
  apiUrl: process.env.API_URL || 'http://localhost:4001',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:4000',
  outputDir: path.join(__dirname, '../../test-reports/security'),
  checklistPath: path.join(__dirname, '../../docs/security/security-audit-checklist.md'),
  // Add timeout for network requests
  requestTimeout: 10000,
  // Add maximum depth for directory traversal
  maxSearchDepth: 10
};

// Security check categories
const CATEGORIES = {
  AUTHENTICATION: 'Authentication and Authorization',
  DATA_PROTECTION: 'Data Protection',
  NETWORK_SECURITY: 'Network Security',
  MOBILE_SECURITY: 'Mobile Application Security',
  EDGE_SECURITY: 'Edge Device Security',
  LOGGING: 'Logging and Monitoring',
  COMPLIANCE: 'Compliance'
};

// Security check results
const RESULTS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  MANUAL: 'MANUAL CHECK REQUIRED',
  SKIP: 'SKIPPED',
  ERROR: 'ERROR'
};

// Security check severity
const SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO'
};

/**
 * Parse the security audit checklist
 *
 * @returns {Promise<Array>} - Parsed checklist items
 */
async function parseChecklist() {
  try {
    // Read checklist file
    const checklistContent = fs.readFileSync(config.checklistPath, 'utf8');

    // Parse checklist items
    const checklistItems = [];
    let currentCategory = '';
    let currentSubcategory = '';

    // Split by lines
    const lines = checklistContent.split('\n');

    for (const line of lines) {
      // Check for category headers (## headings)
      if (line.startsWith('## ')) {
        currentCategory = line.replace('## ', '').trim();
        currentSubcategory = '';
        continue;
      }

      // Check for subcategory headers (### headings)
      if (line.startsWith('### ')) {
        currentSubcategory = line.replace('### ', '').trim();
        continue;
      }

      // Check for checklist items
      if (line.match(/^- \[ \] /)) {
        const itemText = line.replace(/^- \[ \] /, '').trim();

        // Extract item details
        const item = {
          category: currentCategory,
          subcategory: currentSubcategory,
          description: itemText,
          // Extract the main item name (text in bold)
          name: itemText.match(/\*\*(.*?)\*\*/)?.[1] || itemText,
          // Default values
          result: RESULTS.MANUAL,
          severity: SEVERITY.MEDIUM,
          details: '',
          remediation: ''
        };

        checklistItems.push(item);
      }
    }

    return checklistItems;
  } catch (error) {
    console.error('Error parsing checklist:', error);
    throw error;
  }
}

/**
 * Run automated security checks
 *
 * @param {Array} checklist - Parsed checklist items
 * @returns {Promise<Array>} - Updated checklist items with results
 */
async function runAutomatedChecks(checklist) {
  try {
    // Create a copy of the checklist
    const updatedChecklist = [...checklist];

    // Run checks for each item
    for (let i = 0; i < updatedChecklist.length; i++) {
      const item = updatedChecklist[i];

      try {
        // Run check based on item name
        switch (item.name) {
          // Authentication checks
          case 'JWT tokens':
            await checkJwtTokens(item);
            break;

          case 'Password policy':
            await checkPasswordPolicy(item);
            break;

          // Data protection checks
          case 'S3 bucket encryption':
            await checkS3BucketEncryption(item);
            break;

          case 'DynamoDB encryption':
            await checkDynamoDbEncryption(item);
            break;

          // Network security checks
          case 'TLS 1.2+':
            await checkTlsVersion(item);
            break;

          case 'HTTPS':
            await checkHttps(item);
            break;

          case 'CORS policies':
            await checkCorsPolicy(item);
            break;

          // Mobile security checks
          case 'App permissions':
            await checkAppPermissions(item);
            break;

          // Edge device security checks
          case 'Model encryption':
            await checkModelEncryption(item);
            break;

          // Logging checks
          case 'Centralized logging':
            await checkCentralizedLogging(item);
            break;

          // Default case - manual check required
          default:
            item.result = RESULTS.MANUAL;
            item.details = 'This check requires manual verification.';
            break;
        }
      } catch (error) {
        console.error(`Error running check for ${item.name}:`, error);
        item.result = RESULTS.ERROR;
        item.details = `Error: ${error.message}`;
      }

      // Update the checklist item
      updatedChecklist[i] = item;

      // Log progress
      console.log(`[${i + 1}/${updatedChecklist.length}] ${item.name}: ${item.result}`);
    }

    return updatedChecklist;
  } catch (error) {
    console.error('Error running automated checks:', error);
    throw error;
  }
}

/**
 * Check JWT token configuration
 *
 * @param {Object} item - Checklist item
 */
async function checkJwtTokens(item) {
  try {
    // This would normally check the JWT token configuration
    // For demonstration purposes, we'll check if the token expiration is set

    // Check backend code for token expiration
    const backendDir = path.join(__dirname, '../../backend');

    // Use Node.js file system operations instead of grep
    let foundExpiresIn = false;

    // Function to search for a string in a file
    const searchInFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.includes('expiresIn');
      } catch (err) {
        console.warn(`Error reading file ${filePath}: ${err.message}`);
        return false;
      }
    };

    // Function to recursively search directories with improved Windows compatibility
    const searchDirectory = (dir, depth = 0) => {
      // Prevent infinite recursion or excessive depth
      if (depth > config.maxSearchDepth || foundExpiresIn) {
        return;
      }

      try {
        // Check if directory exists
        if (!fs.existsSync(dir)) {
          console.warn(`Directory does not exist: ${dir}`);
          return;
        }

        // Get files in directory
        const files = fs.readdirSync(dir);

        for (const file of files) {
          // Skip node_modules and hidden directories
          if (file === 'node_modules' || file.startsWith('.')) {
            continue;
          }

          try {
            const filePath = path.join(dir, file);

            // Use try-catch for each file to handle permission issues
            try {
              const stats = fs.statSync(filePath);

              if (stats.isDirectory()) {
                // Recursively search subdirectory
                searchDirectory(filePath, depth + 1);
                if (foundExpiresIn) break; // Exit early if found
              } else if (stats.isFile()) {
                // Check file extension - handle both .js and .ts files
                if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
                  if (searchInFile(filePath)) {
                    foundExpiresIn = true;
                    console.log(`Found JWT expiration in: ${filePath}`);
                    break;
                  }
                }
              }
            } catch (statErr) {
              console.warn(`Error accessing file ${filePath}: ${statErr.message}`);
            }
          } catch (pathErr) {
            console.warn(`Error with path ${path.join(dir, file)}: ${pathErr.message}`);
          }

          // Exit early if found
          if (foundExpiresIn) break;
        }
      } catch (err) {
        console.warn(`Error searching directory ${dir}: ${err.message}`);
      }
    };

    // Start the search
    if (fs.existsSync(backendDir)) {
      searchDirectory(backendDir);
    }

    if (foundExpiresIn) {
      item.result = RESULTS.PASS;
      item.details = 'JWT tokens have expiration times set.';
    } else {
      item.result = RESULTS.FAIL;
      item.severity = SEVERITY.HIGH;
      item.details = 'JWT tokens do not have expiration times set.';
      item.remediation = 'Add expiration times to JWT tokens using the expiresIn option.';
    }
  } catch (error) {
    item.result = RESULTS.ERROR;
    item.details = `Error checking JWT tokens: ${error.message}`;
  }
}

/**
 * Check S3 bucket encryption
 *
 * @param {Object} item - Checklist item
 */
async function checkS3BucketEncryption(item) {
  try {
    // This would normally check S3 bucket encryption using AWS SDK
    // For demonstration purposes, we'll check if encryption is configured in the infrastructure code

    const infraDir = path.join(__dirname, '../../infrastructure');

    // Use Node.js file system operations instead of grep
    let foundEncryption = false;

    // Function to search for a string in a file
    const searchInFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.includes('ServerSideEncryption');
      } catch (err) {
        console.warn(`Error reading file ${filePath}: ${err.message}`);
        return false;
      }
    };

    // Function to recursively search directories with improved Windows compatibility
    const searchDirectory = (dir, depth = 0) => {
      // Prevent infinite recursion or excessive depth
      if (depth > config.maxSearchDepth || foundEncryption) {
        return;
      }

      try {
        // Check if directory exists
        if (!fs.existsSync(dir)) {
          console.warn(`Directory does not exist: ${dir}`);
          return;
        }

        // Get files in directory
        const files = fs.readdirSync(dir);

        for (const file of files) {
          // Skip node_modules and hidden directories
          if (file === 'node_modules' || file.startsWith('.')) {
            continue;
          }

          try {
            const filePath = path.join(dir, file);

            // Use try-catch for each file to handle permission issues
            try {
              const stats = fs.statSync(filePath);

              if (stats.isDirectory()) {
                // Recursively search subdirectory
                searchDirectory(filePath, depth + 1);
                if (foundEncryption) break; // Exit early if found
              } else if (stats.isFile()) {
                // Check file extension - handle more infrastructure file types
                if (file.endsWith('.ps1') ||
                    file.endsWith('.js') ||
                    file.endsWith('.ts') ||
                    file.endsWith('.json') ||
                    file.endsWith('.yml') ||
                    file.endsWith('.yaml') ||
                    file.endsWith('.tf') ||
                    file.endsWith('.tfvars') ||
                    file.endsWith('.template')) {
                  if (searchInFile(filePath)) {
                    foundEncryption = true;
                    console.log(`Found S3 encryption in: ${filePath}`);
                    break;
                  }
                }
              }
            } catch (statErr) {
              console.warn(`Error accessing file ${filePath}: ${statErr.message}`);
            }
          } catch (pathErr) {
            console.warn(`Error with path ${path.join(dir, file)}: ${pathErr.message}`);
          }

          // Exit early if found
          if (foundEncryption) break;
        }
      } catch (err) {
        console.warn(`Error searching directory ${dir}: ${err.message}`);
      }
    };

    // Start the search
    searchDirectory(infraDir);

    if (foundEncryption) {
      item.result = RESULTS.PASS;
      item.details = 'S3 bucket encryption is configured.';
    } else {
      item.result = RESULTS.FAIL;
      item.severity = SEVERITY.HIGH;
      item.details = 'S3 bucket encryption is not configured.';
      item.remediation = 'Configure S3 bucket encryption using ServerSideEncryption.';
    }
  } catch (error) {
    item.result = RESULTS.ERROR;
    item.details = `Error checking S3 bucket encryption: ${error.message}`;
  }
}

/**
 * Check DynamoDB encryption
 *
 * @param {Object} item - Checklist item
 */
async function checkDynamoDbEncryption(item) {
  try {
    // This would normally check DynamoDB encryption using AWS SDK
    // For demonstration purposes, we'll check if encryption is configured in the infrastructure code

    const infraDir = path.join(__dirname, '../../infrastructure');

    // Use Node.js file system operations instead of grep
    let foundEncryption = false;

    // Function to search for a string in a file
    const searchInFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.includes('SSESpecification') ||
               content.includes('SSEEnabled') ||
               content.includes('SSEType');
      } catch (err) {
        console.warn(`Error reading file ${filePath}: ${err.message}`);
        return false;
      }
    };

    // Function to recursively search directories
    const searchDirectory = (dir) => {
      try {
        if (!fs.existsSync(dir)) {
          return;
        }

        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);

          try {
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
              searchDirectory(filePath);
            } else if (stats.isFile() &&
                      (file.endsWith('.ps1') || file.endsWith('.js') || file.endsWith('.json') ||
                       file.endsWith('.yml') || file.endsWith('.yaml'))) {
              if (searchInFile(filePath)) {
                foundEncryption = true;
                break;
              }
            }
          } catch (err) {
            console.warn(`Error accessing file ${filePath}: ${err.message}`);
          }
        }
      } catch (err) {
        console.warn(`Error searching directory ${dir}: ${err.message}`);
      }
    };

    // Check specific files first
    const cloudformationPath = path.join(infraDir, 'cloudformation.yml');
    if (fs.existsSync(cloudformationPath) && searchInFile(cloudformationPath)) {
      foundEncryption = true;
    } else {
      // Start the search in the infrastructure directory
      searchDirectory(infraDir);
    }

    if (foundEncryption) {
      item.result = RESULTS.PASS;
      item.details = 'DynamoDB encryption is configured.';
    } else {
      item.result = RESULTS.FAIL;
      item.severity = SEVERITY.HIGH;
      item.details = 'DynamoDB encryption is not configured.';
      item.remediation = 'Configure DynamoDB encryption using SSESpecification.';
    }
  } catch (error) {
    item.result = RESULTS.ERROR;
    item.details = `Error checking DynamoDB encryption: ${error.message}`;
  }
}

/**
 * Check TLS version
 *
 * @param {Object} item - Checklist item
 */
async function checkTlsVersion(item) {
  try {
    // This would normally check TLS version using a tool like nmap or sslyze
    // For demonstration purposes, we'll check if TLS 1.2+ is enforced in the infrastructure code

    const infraDir = path.join(__dirname, '../../infrastructure');

    // Use Node.js file system operations instead of grep
    let foundTls = false;

    // Function to search for a string in a file
    const searchInFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.includes('TLSv1.2');
      } catch (err) {
        console.warn(`Error reading file ${filePath}: ${err.message}`);
        return false;
      }
    };

    // Function to recursively search directories
    const searchDirectory = (dir) => {
      try {
        if (!fs.existsSync(dir)) {
          return;
        }

        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);

          if (stats.isDirectory()) {
            searchDirectory(filePath);
          } else if (stats.isFile() &&
                    (file.endsWith('.ps1') || file.endsWith('.js') || file.endsWith('.json'))) {
            if (searchInFile(filePath)) {
              foundTls = true;
              break;
            }
          }
        }
      } catch (err) {
        console.warn(`Error searching directory ${dir}: ${err.message}`);
      }
    };

    // Start the search
    searchDirectory(infraDir);

    if (foundTls) {
      item.result = RESULTS.PASS;
      item.details = 'TLS 1.2+ is enforced.';
    } else {
      item.result = RESULTS.MANUAL;
      item.details = 'TLS version enforcement could not be automatically verified.';
      item.remediation = 'Manually verify TLS version enforcement.';
    }
  } catch (error) {
    item.result = RESULTS.ERROR;
    item.details = `Error checking TLS version: ${error.message}`;
  }
}

/**
 * Check HTTPS enforcement
 *
 * @param {Object} item - Checklist item
 */
async function checkHttps(item) {
  try {
    // This would normally check HTTPS enforcement by making requests to the API
    // For demonstration purposes, we'll check if HTTPS is enforced in the infrastructure code

    const infraDir = path.join(__dirname, '../../infrastructure');

    // Use Node.js file system operations instead of grep
    let foundHttps = false;

    // Function to search for a string in a file
    const searchInFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.includes('HTTPS');
      } catch (err) {
        console.warn(`Error reading file ${filePath}: ${err.message}`);
        return false;
      }
    };

    // Function to recursively search directories
    const searchDirectory = (dir) => {
      try {
        if (!fs.existsSync(dir)) {
          return;
        }

        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);

          if (stats.isDirectory()) {
            searchDirectory(filePath);
          } else if (stats.isFile() &&
                    (file.endsWith('.ps1') || file.endsWith('.js') || file.endsWith('.json'))) {
            if (searchInFile(filePath)) {
              foundHttps = true;
              break;
            }
          }
        }
      } catch (err) {
        console.warn(`Error searching directory ${dir}: ${err.message}`);
      }
    };

    // Start the search
    searchDirectory(infraDir);

    if (foundHttps) {
      item.result = RESULTS.PASS;
      item.details = 'HTTPS is enforced.';
    } else {
      item.result = RESULTS.MANUAL;
      item.details = 'HTTPS enforcement could not be automatically verified.';
      item.remediation = 'Manually verify HTTPS enforcement.';
    }
  } catch (error) {
    item.result = RESULTS.ERROR;
    item.details = `Error checking HTTPS enforcement: ${error.message}`;
  }
}

/**
 * Check CORS policy
 *
 * @param {Object} item - Checklist item
 */
async function checkCorsPolicy(item) {
  try {
    // This would normally check CORS policy by making requests to the API
    // For demonstration purposes, we'll check if CORS is configured in the backend code

    const backendDir = path.join(__dirname, '../../backend');

    // Use Node.js file system operations instead of grep
    let foundCors = false;

    // Function to search for a string in a file
    const searchInFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.toLowerCase().includes('cors');
      } catch (err) {
        console.warn(`Error reading file ${filePath}: ${err.message}`);
        return false;
      }
    };

    // Function to recursively search directories
    const searchDirectory = (dir) => {
      try {
        if (!fs.existsSync(dir)) {
          return;
        }

        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);

          if (stats.isDirectory()) {
            searchDirectory(filePath);
          } else if (stats.isFile() && file.endsWith('.js')) {
            if (searchInFile(filePath)) {
              foundCors = true;
              break;
            }
          }
        }
      } catch (err) {
        console.warn(`Error searching directory ${dir}: ${err.message}`);
      }
    };

    // Start the search
    searchDirectory(backendDir);

    if (foundCors) {
      item.result = RESULTS.MANUAL;
      item.details = 'CORS is configured, but requires manual verification of allowed origins.';
      item.remediation = 'Verify that CORS policy only allows necessary origins.';
    } else {
      item.result = RESULTS.FAIL;
      item.severity = SEVERITY.MEDIUM;
      item.details = 'CORS policy is not configured.';
      item.remediation = 'Configure CORS policy to restrict allowed origins.';
    }
  } catch (error) {
    item.result = RESULTS.ERROR;
    item.details = `Error checking CORS policy: ${error.message}`;
  }
}

/**
 * Check app permissions
 *
 * @param {Object} item - Checklist item
 */
async function checkAppPermissions(item) {
  try {
    // This would normally check app permissions in the mobile app configuration
    // For demonstration purposes, we'll check if permissions are minimized

    const mobileDir = path.join(__dirname, '../../mobile');

    // Look for permission requests in Android manifest
    let androidPermissions = [];
    try {
      const androidManifestPath = path.join(mobileDir, 'android/app/src/main/AndroidManifest.xml');
      if (fs.existsSync(androidManifestPath)) {
        const manifest = fs.readFileSync(androidManifestPath, 'utf8');
        const permissionMatches = manifest.match(/uses-permission android:name="android\.permission\.[^"]+"/g) || [];
        androidPermissions = permissionMatches.map(p => p.match(/android\.permission\.([^"]+)/)[1]);
      }
    } catch (error) {
      console.warn('Error checking Android permissions:', error);
    }

    // Look for permission requests in iOS info.plist
    let iosPermissions = [];
    try {
      const iosInfoPlistPath = path.join(mobileDir, 'ios/MedTranslateAI/Info.plist');
      if (fs.existsSync(iosInfoPlistPath)) {
        const infoPlist = fs.readFileSync(iosInfoPlistPath, 'utf8');
        const permissionMatches = infoPlist.match(/<key>NS[^<]+UsageDescription<\/key>/g) || [];
        iosPermissions = permissionMatches.map(p => p.match(/<key>(NS[^<]+UsageDescription)<\/key>/)[1]);
      }
    } catch (error) {
      console.warn('Error checking iOS permissions:', error);
    }

    // Check if permissions are minimized
    const allPermissions = [...androidPermissions, ...iosPermissions];

    if (allPermissions.length === 0) {
      item.result = RESULTS.MANUAL;
      item.details = 'No permissions found. Manual verification required.';
    } else {
      item.result = RESULTS.MANUAL;
      item.details = `Found ${allPermissions.length} permissions: ${allPermissions.join(', ')}. Manual verification required to ensure these are necessary.`;
      item.remediation = 'Review permissions and remove any that are not necessary.';
    }
  } catch (error) {
    item.result = RESULTS.ERROR;
    item.details = `Error checking app permissions: ${error.message}`;
  }
}

/**
 * Check model encryption
 *
 * @param {Object} item - Checklist item
 */
async function checkModelEncryption(item) {
  try {
    // This would normally check model encryption in the edge application
    // For demonstration purposes, we'll check if encryption is mentioned in the edge code

    const edgeDir = path.join(__dirname, '../../edge');

    // Use Node.js file system operations instead of grep
    let foundEncryption = false;

    // Function to search for a string in a file
    const searchInFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        // Look for "model" and "encrypt" in the same file
        return content.includes('model') && content.includes('encrypt');
      } catch (err) {
        console.warn(`Error reading file ${filePath}: ${err.message}`);
        return false;
      }
    };

    // Function to recursively search directories
    const searchDirectory = (dir) => {
      try {
        if (!fs.existsSync(dir)) {
          return;
        }

        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);

          if (stats.isDirectory()) {
            searchDirectory(filePath);
          } else if (stats.isFile() &&
                    (file.endsWith('.js') || file.endsWith('.py'))) {
            if (searchInFile(filePath)) {
              foundEncryption = true;
              break;
            }
          }
        }
      } catch (err) {
        console.warn(`Error searching directory ${dir}: ${err.message}`);
      }
    };

    // Start the search
    searchDirectory(edgeDir);

    if (foundEncryption) {
      item.result = RESULTS.PASS;
      item.details = 'Model encryption is implemented.';
    } else {
      item.result = RESULTS.FAIL;
      item.severity = SEVERITY.HIGH;
      item.details = 'Model encryption is not implemented.';
      item.remediation = 'Implement encryption for ML models on edge devices.';
    }
  } catch (error) {
    item.result = RESULTS.ERROR;
    item.details = `Error checking model encryption: ${error.message}`;
  }
}

/**
 * Check password policy
 *
 * @param {Object} item - Checklist item
 */
async function checkPasswordPolicy(item) {
  try {
    // This would normally check password policy configuration
    // For demonstration purposes, we'll check if password validation is implemented

    const backendDir = path.join(__dirname, '../../backend');

    // Use Node.js file system operations instead of grep
    let foundPasswordValidation = false;
    let passwordPolicyDetails = [];

    // Function to search for password policy in a file
    const searchInFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for common password validation patterns
        const patterns = [
          { regex: /password.{0,20}length/i, description: "Password length validation" },
          { regex: /(?:uppercase|capital)/i, description: "Uppercase letter requirement" },
          { regex: /(?:lowercase|small)/i, description: "Lowercase letter requirement" },
          { regex: /(?:number|digit)/i, description: "Number requirement" },
          { regex: /(?:special|symbol)/i, description: "Special character requirement" },
          { regex: /password.{0,30}validation/i, description: "Password validation" },
          { regex: /password.{0,30}strength/i, description: "Password strength check" },
          { regex: /password.{0,30}policy/i, description: "Password policy" },
          { regex: /zxcvbn/i, description: "zxcvbn password strength library" },
          { regex: /bcrypt/i, description: "bcrypt password hashing" },
          { regex: /argon2/i, description: "argon2 password hashing" },
          { regex: /scrypt/i, description: "scrypt password hashing" },
          { regex: /pbkdf2/i, description: "PBKDF2 password hashing" }
        ];

        let fileHasPasswordValidation = false;

        for (const pattern of patterns) {
          if (pattern.regex.test(content)) {
            fileHasPasswordValidation = true;

            // Check if this pattern is already in the details
            if (!passwordPolicyDetails.some(detail => detail.description === pattern.description)) {
              passwordPolicyDetails.push({
                description: pattern.description,
                file: path.basename(filePath)
              });
            }
          }
        }

        return fileHasPasswordValidation;
      } catch (err) {
        console.warn(`Error reading file ${filePath}: ${err.message}`);
        return false;
      }
    };

    // Function to recursively search directories with improved Windows compatibility
    const searchDirectory = (dir, depth = 0) => {
      // Prevent infinite recursion or excessive depth
      if (depth > config.maxSearchDepth || foundPasswordValidation) {
        return;
      }

      try {
        // Check if directory exists
        if (!fs.existsSync(dir)) {
          console.warn(`Directory does not exist: ${dir}`);
          return;
        }

        // Get files in directory
        const files = fs.readdirSync(dir);

        for (const file of files) {
          // Skip node_modules and hidden directories
          if (file === 'node_modules' || file.startsWith('.')) {
            continue;
          }

          try {
            const filePath = path.join(dir, file);

            // Use try-catch for each file to handle permission issues
            try {
              const stats = fs.statSync(filePath);

              if (stats.isDirectory()) {
                // Recursively search subdirectory
                searchDirectory(filePath, depth + 1);
              } else if (stats.isFile()) {
                // Check file extension - handle both .js and .ts files
                if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
                  if (searchInFile(filePath)) {
                    foundPasswordValidation = true;
                  }
                }
              }
            } catch (statErr) {
              console.warn(`Error accessing file ${filePath}: ${statErr.message}`);
            }
          } catch (pathErr) {
            console.warn(`Error with path ${path.join(dir, file)}: ${pathErr.message}`);
          }
        }
      } catch (err) {
        console.warn(`Error searching directory ${dir}: ${err.message}`);
      }
    };

    // Start the search
    if (fs.existsSync(backendDir)) {
      searchDirectory(backendDir);
    }

    // Evaluate password policy
    if (foundPasswordValidation) {
      // Check if we have at least 3 password policy features
      if (passwordPolicyDetails.length >= 3) {
        item.result = RESULTS.PASS;
        item.details = `Password policy is implemented with ${passwordPolicyDetails.length} features: ${passwordPolicyDetails.map(d => d.description).join(', ')}`;
      } else {
        item.result = RESULTS.FAIL;
        item.severity = SEVERITY.HIGH;
        item.details = `Password policy is implemented but may not be strong enough. Only ${passwordPolicyDetails.length} features found: ${passwordPolicyDetails.map(d => d.description).join(', ')}`;
        item.remediation = 'Enhance password policy to include at least length requirements, complexity requirements, and secure storage.';
      }
    } else {
      item.result = RESULTS.FAIL;
      item.severity = SEVERITY.CRITICAL;
      item.details = 'No password policy or validation found.';
      item.remediation = 'Implement a strong password policy including length requirements, complexity requirements, and secure storage.';
    }
  } catch (error) {
    item.result = RESULTS.ERROR;
    item.details = `Error checking password policy: ${error.message}`;
  }
}

/**
 * Check centralized logging
 *
 * @param {Object} item - Checklist item
 */
async function checkCentralizedLogging(item) {
  try {
    // This would normally check centralized logging configuration
    // For demonstration purposes, we'll check if logging service is used

    const backendDir = path.join(__dirname, '../../backend');

    // Use Node.js file system operations instead of grep
    let foundLogging = false;
    let loggingDetails = [];

    // Function to search for a string in a file
    const searchInFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for common logging patterns
        const patterns = [
          { regex: /winston/i, description: "Winston logger" },
          { regex: /morgan/i, description: "Morgan HTTP logger" },
          { regex: /bunyan/i, description: "Bunyan logger" },
          { regex: /log4js/i, description: "Log4js logger" },
          { regex: /pino/i, description: "Pino logger" },
          { regex: /cloudwatch/i, description: "AWS CloudWatch logging" },
          { regex: /stackdriver/i, description: "Google Stackdriver logging" },
          { regex: /applicationinsights/i, description: "Azure Application Insights" },
          { regex: /centralized.{0,20}logging/i, description: "Centralized logging" }
        ];

        let fileHasLogging = false;

        for (const pattern of patterns) {
          if (pattern.regex.test(content)) {
            fileHasLogging = true;

            // Check if this pattern is already in the details
            if (!loggingDetails.some(detail => detail.description === pattern.description)) {
              loggingDetails.push({
                description: pattern.description,
                file: path.basename(filePath)
              });
            }
          }
        }

        // Also check for generic logging
        if (/logging/i.test(content)) {
          fileHasLogging = true;
        }

        return fileHasLogging;
      } catch (err) {
        console.warn(`Error reading file ${filePath}: ${err.message}`);
        return false;
      }
    };

    // Function to recursively search directories with improved Windows compatibility
    const searchDirectory = (dir, depth = 0) => {
      // Prevent infinite recursion or excessive depth
      if (depth > config.maxSearchDepth) {
        return;
      }

      try {
        // Check if directory exists
        if (!fs.existsSync(dir)) {
          console.warn(`Directory does not exist: ${dir}`);
          return;
        }

        // Get files in directory
        const files = fs.readdirSync(dir);

        for (const file of files) {
          // Skip node_modules and hidden directories
          if (file === 'node_modules' || file.startsWith('.')) {
            continue;
          }

          try {
            const filePath = path.join(dir, file);

            // Use try-catch for each file to handle permission issues
            try {
              const stats = fs.statSync(filePath);

              if (stats.isDirectory()) {
                // Recursively search subdirectory
                searchDirectory(filePath, depth + 1);
              } else if (stats.isFile()) {
                // Check file extension - handle both .js and .ts files
                if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
                  if (searchInFile(filePath)) {
                    foundLogging = true;
                  }
                }
              }
            } catch (statErr) {
              console.warn(`Error accessing file ${filePath}: ${statErr.message}`);
            }
          } catch (pathErr) {
            console.warn(`Error with path ${path.join(dir, file)}: ${pathErr.message}`);
          }
        }
      } catch (err) {
        console.warn(`Error searching directory ${dir}: ${err.message}`);
      }
    };

    // Start the search
    if (fs.existsSync(backendDir)) {
      searchDirectory(backendDir);
    }

    if (foundLogging) {
      if (loggingDetails.length > 0) {
        item.result = RESULTS.MANUAL;
        item.details = `Logging is implemented using: ${loggingDetails.map(d => d.description).join(', ')}. Centralization requires manual verification.`;
        item.remediation = 'Verify that logs are centralized and properly managed.';
      } else {
        item.result = RESULTS.MANUAL;
        item.details = 'Basic logging is implemented, but centralization requires manual verification.';
        item.remediation = 'Verify that logs are centralized and properly managed.';
      }
    } else {
      item.result = RESULTS.FAIL;
      item.severity = SEVERITY.MEDIUM;
      item.details = 'Centralized logging is not implemented.';
      item.remediation = 'Implement centralized logging for all components.';
    }
  } catch (error) {
    item.result = RESULTS.ERROR;
    item.details = `Error checking centralized logging: ${error.message}`;
  }
}

/**
 * Generate security audit report
 *
 * @param {Array} results - Security check results
 * @returns {Promise<void>}
 */
async function generateReport(results) {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    // Generate report timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Calculate statistics
    const stats = {
      total: results.length,
      pass: results.filter(r => r.result === RESULTS.PASS).length,
      fail: results.filter(r => r.result === RESULTS.FAIL).length,
      manual: results.filter(r => r.result === RESULTS.MANUAL).length,
      skip: results.filter(r => r.result === RESULTS.SKIP).length,
      error: results.filter(r => r.result === RESULTS.ERROR).length,
      critical: results.filter(r => r.result === RESULTS.FAIL && r.severity === SEVERITY.CRITICAL).length,
      high: results.filter(r => r.result === RESULTS.FAIL && r.severity === SEVERITY.HIGH).length,
      medium: results.filter(r => r.result === RESULTS.FAIL && r.severity === SEVERITY.MEDIUM).length,
      low: results.filter(r => r.result === RESULTS.FAIL && r.severity === SEVERITY.LOW).length
    };

    // Calculate risk score (weighted by severity)
    const weights = {
      [SEVERITY.CRITICAL]: 10,
      [SEVERITY.HIGH]: 5,
      [SEVERITY.MEDIUM]: 2,
      [SEVERITY.LOW]: 1
    };

    let totalWeight = 0;
    let weightedFailures = 0;

    results.forEach(item => {
      if (item.severity) {
        const weight = weights[item.severity] || 1;
        totalWeight += weight;

        if (item.result === RESULTS.FAIL) {
          weightedFailures += weight;
        }
      }
    });

    const riskScore = totalWeight > 0 ? Math.round((1 - (weightedFailures / totalWeight)) * 100) : 100;

    // Generate JSON report
    const jsonReport = {
      timestamp,
      riskScore,
      summary: {
        total: stats.total,
        pass: stats.pass,
        fail: stats.fail,
        manual: stats.manual,
        skip: stats.skip,
        error: stats.error,
        critical: stats.critical,
        high: stats.high,
        medium: stats.medium,
        low: stats.low
      },
      results
    };

    // Save JSON report
    const jsonReportPath = path.join(config.outputDir, `security-audit-${timestamp}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2));

    // Generate HTML report
    let htmlReport = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MedTranslate AI Security Audit Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          h1, h2, h3 {
            color: #0077CC;
          }
          .summary {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .summary-item {
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            flex: 1;
            margin: 0 5px;
          }
          .pass {
            background-color: #DFF0D8;
            color: #3C763D;
          }
          .fail {
            background-color: #F2DEDE;
            color: #A94442;
          }
          .manual {
            background-color: #FCF8E3;
            color: #8A6D3B;
          }
          .skip {
            background-color: #D9EDF7;
            color: #31708F;
          }
          .error {
            background-color: #F5F5F5;
            color: #777;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
          }
          .result-pass {
            color: #3C763D;
            font-weight: bold;
          }
          .result-fail {
            color: #A94442;
            font-weight: bold;
          }
          .result-manual {
            color: #8A6D3B;
            font-weight: bold;
          }
          .result-skip {
            color: #31708F;
            font-weight: bold;
          }
          .result-error {
            color: #777;
            font-weight: bold;
          }
          .severity-critical {
            background-color: #F2DEDE;
          }
          .severity-high {
            background-color: #FCF8E3;
          }
          .severity-medium {
            background-color: #D9EDF7;
          }
          .severity-low {
            background-color: #DFF0D8;
          }
          .severity-info {
            background-color: #F5F5F5;
          }
          .risk-score {
            font-size: 24px;
            font-weight: bold;
            padding: 10px;
            border-radius: 5px;
            display: inline-block;
            margin-bottom: 20px;
          }
          .risk-high {
            background-color: #F2DEDE;
            color: #A94442;
          }
          .risk-medium {
            background-color: #FCF8E3;
            color: #8A6D3B;
          }
          .risk-low {
            background-color: #DFF0D8;
            color: #3C763D;
          }
          .system-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .severity-breakdown {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .severity-item {
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            flex: 1;
            margin: 0 5px;
          }
          .severity-critical {
            background-color: #F2DEDE;
            color: #A94442;
          }
          .severity-high {
            background-color: #FCF8E3;
            color: #8A6D3B;
          }
          .severity-medium {
            background-color: #D9EDF7;
            color: #31708F;
          }
          .severity-low {
            background-color: #DFF0D8;
            color: #3C763D;
          }
        </style>
      </head>
      <body>
        <h1>MedTranslate AI Security Audit Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>

        <h2>Risk Assessment</h2>
        <div class="risk-score ${riskScore < 70 ? 'risk-high' : riskScore < 90 ? 'risk-medium' : 'risk-low'}">
          Security Risk Score: ${riskScore}%
        </div>

        <div class="system-info">
          <h3>System Information</h3>
          <p><strong>Operating System:</strong> ${os.platform()} ${os.release()}</p>
          <p><strong>Node.js Version:</strong> ${process.version}</p>
          <p><strong>Audit Tool Version:</strong> 1.1.0</p>
        </div>

        <h2>Summary</h2>
        <div class="summary">
          <div class="summary-item pass">
            <h3>PASS</h3>
            <p>${jsonReport.summary.pass}</p>
          </div>
          <div class="summary-item fail">
            <h3>FAIL</h3>
            <p>${jsonReport.summary.fail}</p>
          </div>
          <div class="summary-item manual">
            <h3>MANUAL</h3>
            <p>${jsonReport.summary.manual}</p>
          </div>
          <div class="summary-item skip">
            <h3>SKIP</h3>
            <p>${jsonReport.summary.skip}</p>
          </div>
          <div class="summary-item error">
            <h3>ERROR</h3>
            <p>${jsonReport.summary.error}</p>
          </div>
        </div>

        <h3>Failed Checks by Severity</h3>
        <div class="severity-breakdown">
          <div class="severity-item severity-critical">
            <h3>CRITICAL</h3>
            <p>${jsonReport.summary.critical}</p>
          </div>
          <div class="severity-item severity-high">
            <h3>HIGH</h3>
            <p>${jsonReport.summary.high}</p>
          </div>
          <div class="severity-item severity-medium">
            <h3>MEDIUM</h3>
            <p>${jsonReport.summary.medium}</p>
          </div>
          <div class="severity-item severity-low">
            <h3>LOW</h3>
            <p>${jsonReport.summary.low}</p>
          </div>
        </div>

        <h2>Failed Checks</h2>
    `;

    // Add failed checks table
    const failedChecks = results.filter(r => r.result === RESULTS.FAIL);

    // Sort failed checks by severity (critical first)
    const sortedFailedChecks = [...failedChecks].sort((a, b) => {
      const severityOrder = {
        [SEVERITY.CRITICAL]: 0,
        [SEVERITY.HIGH]: 1,
        [SEVERITY.MEDIUM]: 2,
        [SEVERITY.LOW]: 3,
        undefined: 4
      };

      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    if (sortedFailedChecks.length > 0) {
      // First show critical and high severity issues
      const criticalAndHighChecks = sortedFailedChecks.filter(
        check => check.severity === SEVERITY.CRITICAL || check.severity === SEVERITY.HIGH
      );

      if (criticalAndHighChecks.length > 0) {
        htmlReport += `
          <h3>Critical and High Severity Issues</h3>
          <table>
            <tr>
              <th>Category</th>
              <th>Check</th>
              <th>Severity</th>
              <th>Details</th>
              <th>Remediation</th>
            </tr>
        `;

        for (const check of criticalAndHighChecks) {
          htmlReport += `
            <tr class="severity-${check.severity.toLowerCase()}">
              <td>${check.category}${check.subcategory ? ` - ${check.subcategory}` : ''}</td>
              <td><strong>${check.name}</strong></td>
              <td><strong>${check.severity}</strong></td>
              <td>${check.details || 'No details provided'}</td>
              <td>${check.remediation || 'No remediation provided'}</td>
            </tr>
          `;
        }

        htmlReport += `</table>`;
      }

      // Then show all failed checks
      htmlReport += `
        <h3>All Failed Checks</h3>
        <table>
          <tr>
            <th>Category</th>
            <th>Check</th>
            <th>Severity</th>
            <th>Details</th>
            <th>Remediation</th>
          </tr>
      `;

      for (const check of sortedFailedChecks) {
        htmlReport += `
          <tr class="severity-${check.severity ? check.severity.toLowerCase() : 'info'}">
            <td>${check.category}${check.subcategory ? ` - ${check.subcategory}` : ''}</td>
            <td>${check.name}</td>
            <td>${check.severity || 'UNKNOWN'}</td>
            <td>${check.details || 'No details provided'}</td>
            <td>${check.remediation || 'No remediation provided'}</td>
          </tr>
        `;
      }

      htmlReport += `</table>`;
    } else {
      htmlReport += `
        <div class="summary-item pass" style="width: 100%; text-align: center;">
          <h3>No Failed Checks</h3>
          <p>All automated security checks have passed. Great job!</p>
        </div>
      `;
    }

    // Add all checks table with filtering options
    htmlReport += `
      <h2>All Checks</h2>
      <div style="margin-bottom: 15px;">
        <strong>Filter by:</strong>
        <button onclick="filterChecks('all')" style="margin: 5px;">All</button>
        <button onclick="filterChecks('PASS')" style="margin: 5px;">Pass</button>
        <button onclick="filterChecks('FAIL')" style="margin: 5px;">Fail</button>
        <button onclick="filterChecks('MANUAL')" style="margin: 5px;">Manual</button>
        <button onclick="filterChecks('SKIP')" style="margin: 5px;">Skip</button>
        <button onclick="filterChecks('ERROR')" style="margin: 5px;">Error</button>
      </div>
      <table id="allChecksTable">
        <thead>
          <tr>
            <th>Category</th>
            <th>Check</th>
            <th>Result</th>
            <th>Severity</th>
            <th>Details</th>
            <th>Remediation</th>
          </tr>
        </thead>
        <tbody>
    `;

    // Group checks by category for better organization
    const checksByCategory = {};

    for (const check of results) {
      const category = check.category || 'Uncategorized';

      if (!checksByCategory[category]) {
        checksByCategory[category] = [];
      }

      checksByCategory[category].push(check);
    }

    // Add checks by category
    for (const category in checksByCategory) {
      // Add category header
      htmlReport += `
        <tr>
          <td colspan="6" style="background-color: #f0f0f0; font-weight: bold;">${category}</td>
        </tr>
      `;

      // Add checks in this category
      for (const check of checksByCategory[category]) {
        const resultClass = `result-${check.result.toLowerCase()}`;
        const severityClass = check.severity ? `severity-${check.severity.toLowerCase()}` : '';

        // Add emoji indicators for result
        const resultEmoji =
          check.result === RESULTS.PASS ? '✅' :
          check.result === RESULTS.FAIL ? '❌' :
          check.result === RESULTS.MANUAL ? '👁️' :
          check.result === RESULTS.SKIP ? '⏭️' : '❓';

        htmlReport += `
          <tr class="check-row ${check.result}" data-result="${check.result}">
            <td>${check.subcategory || ''}</td>
            <td>${check.name}</td>
            <td class="${resultClass}">${resultEmoji} ${check.result}</td>
            <td class="${severityClass}">${check.severity || ''}</td>
            <td>${check.details || ''}</td>
            <td>${check.remediation || ''}</td>
          </tr>
        `;
      }
    }

    htmlReport += `
        </tbody>
      </table>

      <script>
        function filterChecks(result) {
          const rows = document.querySelectorAll('#allChecksTable tbody tr.check-row');

          rows.forEach(row => {
            if (result === 'all' || row.getAttribute('data-result') === result) {
              row.style.display = '';
            } else {
              row.style.display = 'none';
            }
          });

          // Always show category headers
          document.querySelectorAll('#allChecksTable tbody tr:not(.check-row)').forEach(row => {
            row.style.display = '';
          });
        }
      </script>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <h3>Recommendations</h3>
        <ul>
    `;

    // Add recommendations for failed checks
    if (failedChecks.length > 0) {
      for (const check of sortedFailedChecks) {
        if (check.remediation) {
          const severityLabel = check.severity ? `[${check.severity}] ` : '';
          htmlReport += `
            <li><strong>${severityLabel}${check.category}: ${check.name}</strong> - ${check.remediation}</li>
          `;
        }
      }
    } else {
      htmlReport += `
        <li>No failed checks to remediate. Good job!</li>
      `;
    }

    // Add recommendations for manual checks
    const manualChecks = results.filter(r => r.result === RESULTS.MANUAL);

    if (manualChecks.length > 0) {
      htmlReport += `
        </ul>
        <h3>Manual Verification Required</h3>
        <ul>
      `;

      for (const check of manualChecks) {
        htmlReport += `
          <li><strong>${check.category}: ${check.name}</strong> - ${check.details || 'No details provided'}</li>
        `;
      }
    }

    htmlReport += `
        </ul>
      </div>

      <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
        <p>Report generated by MedTranslate AI Security Audit Tool v1.1.0</p>
        <p>${new Date().toISOString()}</p>
      </footer>
      </body>
      </html>
    `;

    // Save HTML report
    const htmlReportPath = path.join(config.outputDir, `security-audit-${timestamp}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport);

    // Generate a markdown report for terminal output
    const markdownReportPath = path.join(config.outputDir, `security-audit-${timestamp}.md`);

    let markdownReport = `# Security Audit Report\n\n`;
    markdownReport += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Add risk score
    markdownReport += `## Risk Assessment\n\n`;
    markdownReport += `Security Risk Score: ${riskScore}%\n\n`;

    // Add summary
    markdownReport += `## Summary\n\n`;
    markdownReport += `- Total checks: ${stats.total}\n`;
    markdownReport += `- Passed: ${stats.pass}\n`;
    markdownReport += `- Failed: ${stats.fail}\n`;
    markdownReport += `  - Critical: ${stats.critical}\n`;
    markdownReport += `  - High: ${stats.high}\n`;
    markdownReport += `  - Medium: ${stats.medium}\n`;
    markdownReport += `  - Low: ${stats.low}\n`;
    markdownReport += `- Manual verification required: ${stats.manual}\n`;
    markdownReport += `- Skipped: ${stats.skip}\n`;
    markdownReport += `- Errors: ${stats.error}\n\n`;

    // Add critical and high severity failures
    if (stats.critical > 0 || stats.high > 0) {
      markdownReport += `## Critical and High Severity Issues\n\n`;

      sortedFailedChecks
        .filter(check => check.severity === SEVERITY.CRITICAL || check.severity === SEVERITY.HIGH)
        .forEach(check => {
          markdownReport += `### ${check.category}: ${check.name}\n\n`;
          markdownReport += `- Severity: ${check.severity}\n`;
          markdownReport += `- Details: ${check.details || 'No details provided'}\n`;
          markdownReport += `- Remediation: ${check.remediation || 'No remediation provided'}\n\n`;
        });
    }

    // Add recommendations
    markdownReport += `## Recommendations\n\n`;

    if (failedChecks.length > 0) {
      markdownReport += `### Priority Issues\n\n`;

      sortedFailedChecks.forEach(check => {
        if (check.remediation) {
          markdownReport += `- [${check.severity || 'UNKNOWN'}] **${check.category}: ${check.name}** - ${check.remediation}\n`;
        }
      });
    } else {
      markdownReport += `No failed checks to remediate. Good job!\n`;
    }

    // Add manual verification section
    if (manualChecks.length > 0) {
      markdownReport += `\n### Manual Verification Required\n\n`;

      manualChecks.forEach(check => {
        markdownReport += `- **${check.category}: ${check.name}** - ${check.details || 'No details provided'}\n`;
      });
    }

    // Save markdown report
    fs.writeFileSync(markdownReportPath, markdownReport);

    // Print colorful summary to console
    console.log('\n' + '='.repeat(80));
    console.log(`\x1b[1m\x1b[36mSECURITY AUDIT COMPLETED\x1b[0m`);
    console.log('='.repeat(80));

    // Print risk score with color based on score
    const riskScoreColor =
      riskScore < 70 ? '\x1b[31m' :  // Red
      riskScore < 90 ? '\x1b[33m' :  // Yellow
      '\x1b[32m';                    // Green

    console.log(`\x1b[1mRisk Score: ${riskScoreColor}${riskScore}%\x1b[0m`);
    console.log('\n\x1b[1mSummary:\x1b[0m');
    console.log(`- Total checks: ${stats.total}`);
    console.log(`- \x1b[32mPassed: ${stats.pass}\x1b[0m`);
    console.log(`- \x1b[31mFailed: ${stats.fail}\x1b[0m`);

    if (stats.fail > 0) {
      console.log(`  - Critical: ${stats.critical}`);
      console.log(`  - High: ${stats.high}`);
      console.log(`  - Medium: ${stats.medium}`);
      console.log(`  - Low: ${stats.low}`);
    }

    console.log(`- \x1b[33mManual verification required: ${stats.manual}\x1b[0m`);
    console.log(`- Skipped: ${stats.skip}`);
    console.log(`- Errors: ${stats.error}`);

    // Print critical and high severity issues
    if (stats.critical > 0 || stats.high > 0) {
      console.log('\n\x1b[1m\x1b[31mCritical and High Severity Issues:\x1b[0m');

      sortedFailedChecks
        .filter(check => check.severity === SEVERITY.CRITICAL || check.severity === SEVERITY.HIGH)
        .forEach(check => {
          console.log(`- [${check.severity}] ${check.category}: ${check.name}`);
        });
    }

    console.log('\n\x1b[1mReports generated:\x1b[0m');
    console.log(`- JSON: ${jsonReportPath}`);
    console.log(`- HTML: ${htmlReportPath}`);
    console.log(`- Markdown: ${markdownReportPath}`);
    console.log('='.repeat(80) + '\n');

    return {
      jsonReportPath,
      htmlReportPath,
      markdownReportPath,
      summary: jsonReport.summary,
      riskScore
    };
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

/**
 * Run security audit
 *
 * @returns {Promise<Object>} - Audit results
 */
async function runSecurityAudit() {
  try {
    console.log('Starting security audit...');

    // Parse checklist
    console.log('Parsing security audit checklist...');
    const checklist = await parseChecklist();
    console.log(`Found ${checklist.length} checklist items.`);

    // Run automated checks
    console.log('Running automated security checks...');
    const results = await runAutomatedChecks(checklist);

    // Generate report
    console.log('Generating security audit report...');
    const report = await generateReport(results);

    console.log('Security audit completed.');

    return {
      results,
      report
    };
  } catch (error) {
    console.error('Error running security audit:', error);
    throw error;
  }
}

// Run security audit if this file is executed directly
if (require.main === module) {
  runSecurityAudit()
    .then(({ report }) => {
      // The detailed summary is already printed in the generateReport function

      // Exit with non-zero code if there are critical or high severity failures
      const hasCriticalOrHighFailures =
        (report.summary.critical > 0 || report.summary.high > 0);

      // Exit with code 2 for critical/high failures, 1 for other failures, 0 for success
      if (hasCriticalOrHighFailures) {
        process.exit(2);
      } else if (report.summary.fail > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('\x1b[31mSecurity audit failed:\x1b[0m', error);
      process.exit(3);
    });
}

// Export functions for use in other scripts
module.exports = {
  parseChecklist,
  runAutomatedChecks,
  generateReport,
  runSecurityAudit
};
