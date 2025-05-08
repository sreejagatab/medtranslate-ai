/**
 * Security Audit Tool for MedTranslate AI
 *
 * This tool performs automated security checks on the MedTranslate AI system
 * to identify potential security vulnerabilities and compliance issues.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Configuration
const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  authToken: process.env.AUTH_TOKEN || '',
  scanDirectories: [
    'auth',
    'api',
    'controllers',
    'routes',
    'services',
    'utils',
    'middleware'
  ],
  excludePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage'
  ],
  securityChecks: {
    jwt: true,
    encryption: true,
    inputValidation: true,
    authenticationChecks: true,
    tlsConfiguration: true,
    dataProtection: true,
    modelSecurity: true
  }
};

// Results storage
const auditResults = {
  passed: [],
  failed: [],
  warnings: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

/**
 * Main audit function
 */
async function runSecurityAudit() {
  console.log('Starting MedTranslate AI Security Audit...');

  try {
    // Run all security checks
    await checkJwtConfiguration();
    await checkEncryptionImplementation();
    await checkInputValidation();
    await checkAuthenticationMechanisms();
    await checkTlsConfiguration();
    await checkDataProtection();
    await checkModelSecurity();

    // Generate summary
    auditResults.summary.total = auditResults.passed.length + auditResults.failed.length + auditResults.warnings.length;
    auditResults.summary.passed = auditResults.passed.length;
    auditResults.summary.failed = auditResults.failed.length;
    auditResults.summary.warnings = auditResults.warnings.length;

    // Print results
    printResults();

    // Return results
    return auditResults;
  } catch (error) {
    console.error('Error running security audit:', error);
    throw error;
  }
}

/**
 * Check JWT configuration
 */
async function checkJwtConfiguration() {
  console.log('Checking JWT configuration...');

  try {
    // Check JWT secret length
    const authServicePath = path.join(process.cwd(), 'auth', 'auth-service.js');
    const authService = fs.readFileSync(authServicePath, 'utf8');

    // Check for hardcoded secrets
    if (authService.includes('JWT_SECRET') && authService.match(/['"]([a-zA-Z0-9]{1,20})['"]/) && !authService.includes('process.env')) {
      auditResults.failed.push({
        check: 'JWT Configuration',
        issue: 'Hardcoded JWT secret found in auth-service.js',
        severity: 'High',
        recommendation: 'Use environment variables for JWT secrets'
      });
    } else {
      auditResults.passed.push({
        check: 'JWT Configuration',
        details: 'No hardcoded JWT secrets found'
      });
    }

    // Check JWT algorithm
    if (authService.includes('algorithm') && !authService.includes('RS256') && !authService.includes('ES256')) {
      auditResults.warnings.push({
        check: 'JWT Algorithm',
        issue: 'Potentially weak JWT algorithm in use',
        severity: 'Medium',
        recommendation: 'Use RS256 or ES256 algorithms for JWT'
      });
    } else {
      auditResults.passed.push({
        check: 'JWT Algorithm',
        details: 'Strong JWT algorithm in use'
      });
    }

    // Check JWT expiration
    if (!authService.includes('expiresIn') || authService.includes('expiresIn: 0') || authService.includes('expiresIn: null')) {
      auditResults.failed.push({
        check: 'JWT Expiration',
        issue: 'JWT tokens do not have expiration',
        severity: 'High',
        recommendation: 'Set appropriate expiration for JWT tokens'
      });
    } else {
      auditResults.passed.push({
        check: 'JWT Expiration',
        details: 'JWT tokens have expiration set'
      });
    }
  } catch (error) {
    console.error('Error checking JWT configuration:', error);
    auditResults.failed.push({
      check: 'JWT Configuration',
      issue: 'Error checking JWT configuration: ' + error.message,
      severity: 'High',
      recommendation: 'Fix JWT configuration issues'
    });
  }
}

/**
 * Check encryption implementation
 */
async function checkEncryptionImplementation() {
  console.log('Checking encryption implementation...');

  try {
    // Check for weak encryption algorithms
    const scanDirs = config.scanDirectories.map(dir => path.join(process.cwd(), dir));

    for (const dir of scanDirs) {
      if (fs.existsSync(dir)) {
        const files = walkSync(dir);

        for (const file of files) {
          if (file.endsWith('.js')) {
            const content = fs.readFileSync(file, 'utf8');

            // Check for weak crypto
            if (content.includes('createCipher(') || content.includes('createDecipher(')) {
              auditResults.failed.push({
                check: 'Encryption Implementation',
                issue: `Deprecated crypto methods found in ${path.relative(process.cwd(), file)}`,
                severity: 'High',
                recommendation: 'Use createCipheriv and createDecipheriv instead'
              });
            }

            // Check for weak algorithms
            if (content.includes('md5') || content.includes('sha1') ||
                content.includes('MD5') || content.includes('SHA1')) {
              auditResults.warnings.push({
                check: 'Encryption Algorithms',
                issue: `Potentially weak hash algorithms found in ${path.relative(process.cwd(), file)}`,
                severity: 'Medium',
                recommendation: 'Use SHA-256 or stronger hash algorithms'
              });
            }
          }
        }
      }
    }

    // Check DynamoDB encryption
    const dbConfigPath = path.join(process.cwd(), 'config', 'database.js');
    if (fs.existsSync(dbConfigPath)) {
      const dbConfig = fs.readFileSync(dbConfigPath, 'utf8');

      if (!dbConfig.includes('encryption') || !dbConfig.includes('true')) {
        auditResults.failed.push({
          check: 'DynamoDB Encryption',
          issue: 'DynamoDB encryption not enabled',
          severity: 'High',
          recommendation: 'Enable encryption for DynamoDB tables'
        });
      } else {
        auditResults.passed.push({
          check: 'DynamoDB Encryption',
          details: 'DynamoDB encryption is enabled'
        });
      }
    }
  } catch (error) {
    console.error('Error checking encryption implementation:', error);
    auditResults.failed.push({
      check: 'Encryption Implementation',
      issue: 'Error checking encryption implementation: ' + error.message,
      severity: 'High',
      recommendation: 'Fix encryption implementation issues'
    });
  }
}

/**
 * Check input validation
 */
async function checkInputValidation() {
  console.log('Checking input validation...');

  try {
    // Check for input validation in routes and controllers
    const routesDir = path.join(process.cwd(), 'routes');
    const controllersDir = path.join(process.cwd(), 'controllers');

    let validationFound = false;

    if (fs.existsSync(routesDir)) {
      const routeFiles = walkSync(routesDir);

      for (const file of routeFiles) {
        if (file.endsWith('.js')) {
          const content = fs.readFileSync(file, 'utf8');

          if (content.includes('validate(') || content.includes('validator') ||
              content.includes('sanitize(') || content.includes('joi')) {
            validationFound = true;
          }
        }
      }
    }

    if (fs.existsSync(controllersDir)) {
      const controllerFiles = walkSync(controllersDir);

      for (const file of controllerFiles) {
        if (file.endsWith('.js')) {
          const content = fs.readFileSync(file, 'utf8');

          if (content.includes('validate(') || content.includes('validator') ||
              content.includes('sanitize(') || content.includes('joi')) {
            validationFound = true;
          }
        }
      }
    }

    if (validationFound) {
      auditResults.passed.push({
        check: 'Input Validation',
        details: 'Input validation found in routes or controllers'
      });
    } else {
      auditResults.warnings.push({
        check: 'Input Validation',
        issue: 'No input validation found in routes or controllers',
        severity: 'Medium',
        recommendation: 'Implement input validation for all user inputs'
      });
    }
  } catch (error) {
    console.error('Error checking input validation:', error);
    auditResults.failed.push({
      check: 'Input Validation',
      issue: 'Error checking input validation: ' + error.message,
      severity: 'Medium',
      recommendation: 'Fix input validation issues'
    });
  }
}

/**
 * Check authentication mechanisms
 */
async function checkAuthenticationMechanisms() {
  console.log('Checking authentication mechanisms...');

  try {
    // Check for MFA implementation
    const mfaPath = path.join(process.cwd(), 'auth', 'enhanced-mfa.js');

    if (fs.existsSync(mfaPath)) {
      const mfaContent = fs.readFileSync(mfaPath, 'utf8');

      if (mfaContent.includes('generateTOTP') || mfaContent.includes('verifyTOTP')) {
        auditResults.passed.push({
          check: 'Multi-Factor Authentication',
          details: 'MFA implementation found'
        });
      } else {
        auditResults.warnings.push({
          check: 'Multi-Factor Authentication',
          issue: 'MFA file exists but may not be fully implemented',
          severity: 'Medium',
          recommendation: 'Implement TOTP-based MFA'
        });
      }
    } else {
      auditResults.warnings.push({
        check: 'Multi-Factor Authentication',
        issue: 'No MFA implementation found',
        severity: 'Medium',
        recommendation: 'Implement multi-factor authentication'
      });
    }

    // Check for session management
    const sessionPath = path.join(process.cwd(), 'auth', 'session-manager.js');

    if (fs.existsSync(sessionPath)) {
      const sessionContent = fs.readFileSync(sessionPath, 'utf8');

      if (!sessionContent.includes('maxAge') || !sessionContent.includes('secure: true')) {
        auditResults.warnings.push({
          check: 'Session Management',
          issue: 'Session configuration may not be secure',
          severity: 'Medium',
          recommendation: 'Set secure flags and appropriate timeout for sessions'
        });
      } else {
        auditResults.passed.push({
          check: 'Session Management',
          details: 'Secure session management found'
        });
      }
    }
  } catch (error) {
    console.error('Error checking authentication mechanisms:', error);
    auditResults.failed.push({
      check: 'Authentication Mechanisms',
      issue: 'Error checking authentication mechanisms: ' + error.message,
      severity: 'High',
      recommendation: 'Fix authentication mechanism issues'
    });
  }
}

/**
 * Check TLS configuration
 */
async function checkTlsConfiguration() {
  console.log('Checking TLS configuration...');

  try {
    // Check server configuration
    const serverPath = path.join(process.cwd(), 'server.js');

    if (fs.existsSync(serverPath)) {
      const serverContent = fs.readFileSync(serverPath, 'utf8');

      if (!serverContent.includes('https') && !serverContent.includes('createServer')) {
        auditResults.warnings.push({
          check: 'HTTPS Configuration',
          issue: 'HTTPS may not be configured',
          severity: 'Medium',
          recommendation: 'Configure HTTPS for production'
        });
      } else {
        auditResults.passed.push({
          check: 'HTTPS Configuration',
          details: 'HTTPS configuration found'
        });
      }

      // Check for TLS version
      if (serverContent.includes('TLSv1.0') || serverContent.includes('TLSv1.1')) {
        auditResults.failed.push({
          check: 'TLS Version',
          issue: 'Outdated TLS version in use',
          severity: 'High',
          recommendation: 'Use TLS 1.2 or higher'
        });
      } else if (serverContent.includes('TLSv1.2') || serverContent.includes('TLSv1.3')) {
        auditResults.passed.push({
          check: 'TLS Version',
          details: 'Modern TLS version in use'
        });
      } else {
        auditResults.warnings.push({
          check: 'TLS Version',
          issue: 'TLS version not explicitly set',
          severity: 'Medium',
          recommendation: 'Explicitly set TLS version to 1.2 or higher'
        });
      }
    }
  } catch (error) {
    console.error('Error checking TLS configuration:', error);
    auditResults.failed.push({
      check: 'TLS Configuration',
      issue: 'Error checking TLS configuration: ' + error.message,
      severity: 'High',
      recommendation: 'Fix TLS configuration issues'
    });
  }
}

/**
 * Check data protection
 */
async function checkDataProtection() {
  console.log('Checking data protection...');

  try {
    // Check for PII handling
    const scanDirs = config.scanDirectories.map(dir => path.join(process.cwd(), dir));
    let piiProtectionFound = false;

    for (const dir of scanDirs) {
      if (fs.existsSync(dir)) {
        const files = walkSync(dir);

        for (const file of files) {
          if (file.endsWith('.js')) {
            const content = fs.readFileSync(file, 'utf8');

            if (content.includes('PII') || content.includes('personally identifiable information') ||
                content.includes('anonymize') || content.includes('mask') ||
                content.includes('encrypt') || content.includes('redact')) {
              piiProtectionFound = true;
              break;
            }
          }
        }

        if (piiProtectionFound) break;
      }
    }

    if (piiProtectionFound) {
      auditResults.passed.push({
        check: 'PII Protection',
        details: 'PII protection measures found'
      });
    } else {
      auditResults.warnings.push({
        check: 'PII Protection',
        issue: 'No explicit PII protection found',
        severity: 'Medium',
        recommendation: 'Implement PII protection measures'
      });
    }

    // Check for data retention policies
    let dataRetentionFound = false;

    for (const dir of scanDirs) {
      if (fs.existsSync(dir)) {
        const files = walkSync(dir);

        for (const file of files) {
          if (file.endsWith('.js')) {
            const content = fs.readFileSync(file, 'utf8');

            if (content.includes('retention') || content.includes('expiry') ||
                content.includes('delete after') || content.includes('purge')) {
              dataRetentionFound = true;
              break;
            }
          }
        }

        if (dataRetentionFound) break;
      }
    }

    if (dataRetentionFound) {
      auditResults.passed.push({
        check: 'Data Retention',
        details: 'Data retention policies found'
      });
    } else {
      auditResults.warnings.push({
        check: 'Data Retention',
        issue: 'No explicit data retention policies found',
        severity: 'Medium',
        recommendation: 'Implement data retention policies'
      });
    }
  } catch (error) {
    console.error('Error checking data protection:', error);
    auditResults.failed.push({
      check: 'Data Protection',
      issue: 'Error checking data protection: ' + error.message,
      severity: 'Medium',
      recommendation: 'Fix data protection issues'
    });
  }
}

/**
 * Check model security
 */
async function checkModelSecurity() {
  console.log('Checking model security...');

  try {
    // Check for model encryption
    const edgeServicePath = path.join(process.cwd(), 'services', 'edge-service-client.js');

    if (fs.existsSync(edgeServicePath)) {
      const edgeServiceContent = fs.readFileSync(edgeServicePath, 'utf8');

      if (!edgeServiceContent.includes('encryptModel') && !edgeServiceContent.includes('model encryption')) {
        auditResults.failed.push({
          check: 'Model Encryption',
          issue: 'No model encryption found for edge devices',
          severity: 'High',
          recommendation: 'Implement encryption for models on edge devices'
        });
      } else {
        auditResults.passed.push({
          check: 'Model Encryption',
          details: 'Model encryption for edge devices found'
        });
      }
    }

    // Check for model integrity verification
    const translationDir = path.join(process.cwd(), 'translation');
    let integrityCheckFound = false;

    if (fs.existsSync(translationDir)) {
      const files = walkSync(translationDir);

      for (const file of files) {
        if (file.endsWith('.js')) {
          const content = fs.readFileSync(file, 'utf8');

          if (content.includes('checksum') || content.includes('integrity') ||
              content.includes('verify model') || content.includes('hash')) {
            integrityCheckFound = true;
            break;
          }
        }
      }
    }

    if (integrityCheckFound) {
      auditResults.passed.push({
        check: 'Model Integrity',
        details: 'Model integrity verification found'
      });
    } else {
      auditResults.warnings.push({
        check: 'Model Integrity',
        issue: 'No model integrity verification found',
        severity: 'Medium',
        recommendation: 'Implement integrity checks for models'
      });
    }
  } catch (error) {
    console.error('Error checking model security:', error);
    auditResults.failed.push({
      check: 'Model Security',
      issue: 'Error checking model security: ' + error.message,
      severity: 'High',
      recommendation: 'Fix model security issues'
    });
  }
}

/**
 * Print audit results
 */
function printResults() {
  console.log('\n=== MedTranslate AI Security Audit Results ===\n');

  console.log(`Total checks: ${auditResults.summary.total}`);
  console.log(`Passed: ${auditResults.summary.passed}`);
  console.log(`Failed: ${auditResults.summary.failed}`);
  console.log(`Warnings: ${auditResults.summary.warnings}\n`);

  if (auditResults.failed.length > 0) {
    console.log('=== Failed Checks ===');
    auditResults.failed.forEach((result, index) => {
      console.log(`${index + 1}. ${result.check}`);
      console.log(`   Issue: ${result.issue}`);
      console.log(`   Severity: ${result.severity}`);
      console.log(`   Recommendation: ${result.recommendation}\n`);
    });
  }

  if (auditResults.warnings.length > 0) {
    console.log('=== Warnings ===');
    auditResults.warnings.forEach((result, index) => {
      console.log(`${index + 1}. ${result.check}`);
      console.log(`   Issue: ${result.issue}`);
      console.log(`   Severity: ${result.severity}`);
      console.log(`   Recommendation: ${result.recommendation}\n`);
    });
  }

  if (auditResults.passed.length > 0) {
    console.log('=== Passed Checks ===');
    auditResults.passed.forEach((result, index) => {
      console.log(`${index + 1}. ${result.check}`);
      console.log(`   Details: ${result.details}\n`);
    });
  }
}

/**
 * Recursively walk a directory and return all files
 */
function walkSync(dir, filelist = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filepath = path.join(dir, file);

    // Skip excluded patterns
    if (config.excludePatterns.some(pattern => filepath.includes(pattern))) {
      return;
    }

    if (fs.statSync(filepath).isDirectory()) {
      filelist = walkSync(filepath, filelist);
    } else {
      filelist.push(filepath);
    }
  });

  return filelist;
}

// Export functions for testing
module.exports = {
  runSecurityAudit,
  checkJwtConfiguration,
  checkEncryptionImplementation,
  checkInputValidation,
  checkAuthenticationMechanisms,
  checkTlsConfiguration,
  checkDataProtection,
  checkModelSecurity
};

// Run audit if called directly
if (require.main === module) {
  runSecurityAudit()
    .then(() => {
      process.exit(auditResults.failed.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Audit failed with error:', error);
      process.exit(1);
    });
}
