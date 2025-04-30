# MedTranslate AI Test Execution Guide

This guide provides instructions for executing the comprehensive test suite for the MedTranslate AI project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Test Environment Setup](#test-environment-setup)
- [Running Tests](#running-tests)
- [Test Reports](#test-reports)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before running the tests, ensure you have the following:

1. Node.js (v14 or later) installed
2. All dependencies installed (`npm install`)
3. Backend server running (for integration tests)
4. Edge server running (for edge integration tests)
5. Test data prepared (see [Test Data Setup](#test-data-setup))

## Test Environment Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the backend server:
   ```bash
   npm run server:start
   ```

### Edge Setup

1. Navigate to the edge directory:
   ```bash
   cd edge
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the edge server:
   ```bash
   npm start
   ```

### Test Data Setup

1. Create test users:
   ```bash
   node scripts/create-test-users.js
   ```

2. Prepare test data:
   ```bash
   node scripts/prepare-test-data.js
   ```

## Running Tests

### Running All Tests

To run all tests, use the following command:

```bash
npm run test:all
```

This will execute all test suites and generate a comprehensive test report in the `test-reports` directory.

### Running Specific Test Categories

#### Edge Device Integration Tests

```bash
npm run test:edge:integration
```

These tests verify the integration with real edge devices, including offline translation functionality, synchronization when coming back online, and performance metrics for edge vs. cloud translation.

#### Security Tests

```bash
npm run test:security
```

These tests verify that the application meets security requirements and follows best practices, including authentication and authorization, data protection, network security, mobile security, edge security, logging and monitoring, and compliance.

#### Localization Tests

```bash
npm run test:localization
```

These tests verify that the application is properly localized for all supported languages, including translation completeness, UI adaptation, RTL language support, and language selection.

#### App Store Submission Tests

```bash
npm run test:app-store
```

These tests verify that the application meets the requirements for submission to app stores, including app metadata, app assets, app binary, and submission process.

### Running Individual Tests

To run individual test files, use the following commands:

```bash
# Edge device integration test
node tests/integration/edge-device-integration.test.js

# Security audit tool
node tests/security/security-audit-tool.js

# Localization test
node tests/localization/localization-test.js

# App store submission tool
node tests/app-store/app-store-submission-tool.js
```

## Test Reports

Test reports are generated in the `test-reports` directory. Each test run creates:

- A JSON report with detailed test results
- An HTML report for easy viewing
- Test-specific reports in subdirectories

### Viewing Reports

To view the HTML reports, open the following files in a web browser:

- Main test report: `test-reports/test-report-[timestamp].html`
- Security audit report: `test-reports/security/security-audit-[timestamp].html`
- Localization test report: `test-reports/localization/localization-test-[timestamp].html`
- App store submission checklist: `test-reports/submission-checklist-[timestamp].md`

## Troubleshooting

### Common Issues

#### Tests Fail to Connect to Backend

If tests fail to connect to the backend, ensure:

1. The backend server is running
2. The correct port is being used (default: 4001)
3. No firewall is blocking the connection

#### Edge Device Tests Fail

If edge device tests fail, ensure:

1. The edge server is running
2. The correct port is being used (default: 4000)
3. The edge device has the necessary models installed

#### Security Tests Fail

If security tests fail, review:

1. The security audit report for specific issues
2. The security implementation in the codebase
3. The security audit checklist for requirements

#### Localization Tests Fail

If localization tests fail, check:

1. The localization test report for specific issues
2. The translation files for completeness
3. The UI implementation for language support

#### App Store Submission Tests Fail

If app store submission tests fail, verify:

1. The submission checklist for specific issues
2. The app metadata and assets
3. The app binary for signing and packaging

### Getting Help

If you encounter issues that are not covered in this guide, please:

1. Check the test logs for error messages
2. Review the test implementation for requirements
3. Contact the development team for assistance

## Conclusion

By following this guide, you can execute the comprehensive test suite for the MedTranslate AI project and ensure that all components are functioning correctly. Regular testing helps identify and address issues early in the development process, resulting in a high-quality product that meets user needs and expectations.
