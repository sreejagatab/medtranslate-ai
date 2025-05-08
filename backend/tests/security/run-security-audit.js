/**
 * Security Audit Test Runner for MedTranslate AI
 * 
 * This script runs the security audit and reports the results.
 */

const { runSecurityAudit } = require('./security-audit');

// Run the security audit
async function runAudit() {
  try {
    console.log('Running MedTranslate AI Security Audit...');
    
    const results = await runSecurityAudit();
    
    // Print summary
    console.log('\n=== Security Audit Summary ===\n');
    console.log(`Total checks: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);
    console.log(`Warnings: ${results.summary.warnings}\n`);
    
    // Exit with appropriate code
    if (results.failed.length > 0) {
      console.log('Security audit failed. Please fix the issues before proceeding.');
      process.exit(1);
    } else if (results.warnings.length > 0) {
      console.log('Security audit passed with warnings. Consider addressing the warnings.');
      process.exit(0);
    } else {
      console.log('Security audit passed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error running security audit:', error);
    process.exit(1);
  }
}

// Run the audit
runAudit();
