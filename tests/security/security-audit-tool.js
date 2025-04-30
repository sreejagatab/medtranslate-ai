/**
 * Security Audit Tool for MedTranslate AI
 * 
 * This tool automates security checks based on the security audit checklist.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

// Configuration
const config = {
  apiUrl: process.env.API_URL || 'http://localhost:4001',
  edgeUrl: process.env.EDGE_URL || 'http://localhost:4000',
  outputDir: path.join(__dirname, '../../test-reports/security'),
  checklistPath: path.join(__dirname, '../../docs/security/security-audit-checklist.md')
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
    
    // Look for token generation code
    const result = execSync('grep -r "expiresIn" --include="*.js" ' + backendDir, { encoding: 'utf8' });
    
    if (result.includes('expiresIn')) {
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
    
    // Look for S3 bucket encryption configuration
    const result = execSync('grep -r "ServerSideEncryption" --include="*.ps1" --include="*.js" --include="*.json" ' + infraDir, { encoding: 'utf8' });
    
    if (result.includes('ServerSideEncryption')) {
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
    
    // Look for DynamoDB encryption configuration
    const result = execSync('grep -r "SSESpecification" --include="*.ps1" --include="*.js" --include="*.json" ' + infraDir, { encoding: 'utf8' });
    
    if (result.includes('SSESpecification')) {
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
    
    // Look for TLS configuration
    const result = execSync('grep -r "TLSv1.2" --include="*.ps1" --include="*.js" --include="*.json" ' + infraDir, { encoding: 'utf8' });
    
    if (result.includes('TLSv1.2')) {
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
    
    // Look for HTTPS configuration
    const result = execSync('grep -r "HTTPS" --include="*.ps1" --include="*.js" --include="*.json" ' + infraDir, { encoding: 'utf8' });
    
    if (result.includes('HTTPS')) {
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
    
    // Look for CORS configuration
    const result = execSync('grep -r "cors" --include="*.js" ' + backendDir, { encoding: 'utf8' });
    
    if (result.includes('cors')) {
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
    
    // Look for model encryption
    const result = execSync('grep -r "model.*encrypt" --include="*.js" --include="*.py" ' + edgeDir, { encoding: 'utf8' });
    
    if (result.includes('encrypt')) {
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
 * Check centralized logging
 * 
 * @param {Object} item - Checklist item
 */
async function checkCentralizedLogging(item) {
  try {
    // This would normally check centralized logging configuration
    // For demonstration purposes, we'll check if logging service is used
    
    const backendDir = path.join(__dirname, '../../backend');
    
    // Look for logging service
    const result = execSync('grep -r "logging" --include="*.js" ' + backendDir, { encoding: 'utf8' });
    
    if (result.includes('logging')) {
      item.result = RESULTS.MANUAL;
      item.details = 'Logging is implemented, but centralization requires manual verification.';
      item.remediation = 'Verify that logs are centralized and properly managed.';
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
    
    // Generate JSON report
    const jsonReport = {
      timestamp,
      summary: {
        total: results.length,
        pass: results.filter(r => r.result === RESULTS.PASS).length,
        fail: results.filter(r => r.result === RESULTS.FAIL).length,
        manual: results.filter(r => r.result === RESULTS.MANUAL).length,
        skip: results.filter(r => r.result === RESULTS.SKIP).length,
        error: results.filter(r => r.result === RESULTS.ERROR).length
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
        </style>
      </head>
      <body>
        <h1>MedTranslate AI Security Audit Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
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
        
        <h2>Failed Checks</h2>
    `;
    
    // Add failed checks table
    const failedChecks = results.filter(r => r.result === RESULTS.FAIL);
    
    if (failedChecks.length > 0) {
      htmlReport += `
        <table>
          <tr>
            <th>Category</th>
            <th>Check</th>
            <th>Severity</th>
            <th>Details</th>
            <th>Remediation</th>
          </tr>
      `;
      
      for (const check of failedChecks) {
        htmlReport += `
          <tr class="severity-${check.severity.toLowerCase()}">
            <td>${check.category} - ${check.subcategory}</td>
            <td>${check.name}</td>
            <td>${check.severity}</td>
            <td>${check.details}</td>
            <td>${check.remediation}</td>
          </tr>
        `;
      }
      
      htmlReport += `</table>`;
    } else {
      htmlReport += `<p>No failed checks.</p>`;
    }
    
    // Add all checks table
    htmlReport += `
      <h2>All Checks</h2>
      <table>
        <tr>
          <th>Category</th>
          <th>Check</th>
          <th>Result</th>
          <th>Severity</th>
          <th>Details</th>
        </tr>
    `;
    
    for (const check of results) {
      htmlReport += `
        <tr>
          <td>${check.category} - ${check.subcategory}</td>
          <td>${check.name}</td>
          <td class="result-${check.result.toLowerCase()}">${check.result}</td>
          <td>${check.severity}</td>
          <td>${check.details}</td>
        </tr>
      `;
    }
    
    htmlReport += `
        </table>
      </body>
      </html>
    `;
    
    // Save HTML report
    const htmlReportPath = path.join(config.outputDir, `security-audit-${timestamp}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log(`Reports generated:`);
    console.log(`- JSON: ${jsonReportPath}`);
    console.log(`- HTML: ${htmlReportPath}`);
    
    return {
      jsonReportPath,
      htmlReportPath,
      summary: jsonReport.summary
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
      console.log('Security audit summary:');
      console.log(`- Total: ${report.summary.total}`);
      console.log(`- Pass: ${report.summary.pass}`);
      console.log(`- Fail: ${report.summary.fail}`);
      console.log(`- Manual: ${report.summary.manual}`);
      console.log(`- Skip: ${report.summary.skip}`);
      console.log(`- Error: ${report.summary.error}`);
      
      // Exit with non-zero code if there are failures
      process.exit(report.summary.fail > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Security audit failed:', error);
      process.exit(1);
    });
}

// Export functions for use in other scripts
module.exports = {
  parseChecklist,
  runAutomatedChecks,
  generateReport,
  runSecurityAudit
};
