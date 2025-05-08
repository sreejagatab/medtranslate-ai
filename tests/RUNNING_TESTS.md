# Running MedTranslate AI Tests

This document provides detailed instructions on how to run the various tests for the MedTranslate AI system.

## Prerequisites

Before running the tests, make sure you have the following prerequisites installed:

1. Node.js (v18 or later)
2. npm (v8 or later)
3. Docker (for running DynamoDB locally)
4. AWS CLI (configured with appropriate credentials)

## Setting Up the Test Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/medtranslate-ai.git
   cd medtranslate-ai
   ```

2. Install dependencies:
   ```bash
   npm ci
   ```

3. Set up the test environment:
   ```bash
   npm run setup
   ```

4. Initialize the database:
   ```bash
   npm run db:init
   ```

## Running Tests

### Running All Tests

To run all tests:

```bash
npm test
```

This will run all tests in the following order:
1. Unit tests
2. Integration tests
3. End-to-end tests
4. Performance tests (if on main or develop branch)
5. Security tests (if on main or develop branch)

### Running Specific Test Types

#### Unit Tests

To run all unit tests:

```bash
npm run test:unit
```

To run specific unit tests:

```bash
# Mobile app unit tests
npm run test:unit:mobile

# Provider app unit tests
npm run test:unit:provider

# Admin dashboard unit tests
npm run test:unit:admin

# Edge component unit tests
npm run test:edge:unit

# Backend unit tests
npm run test:backend:unit
```

#### Integration Tests

To run all integration tests:

```bash
npm run test:integration
```

To run specific integration tests:

```bash
# Backend-Edge integration tests
npm run test:integration:backend-edge

# Backend-Frontend integration tests
npm run test:integration:backend-frontend

# Edge-Frontend integration tests
npm run test:integration:edge-frontend

# Full system integration tests
npm run test:integration:full

# WebSocket reconnection tests
npm run test:websocket:reconnection

# Error handling tests
npm run test:error-handling
```

#### End-to-End Tests

To run all end-to-end tests:

```bash
npm run test:e2e
```

To run specific end-to-end tests:

```bash
# Complete translation flow test
npm run test:e2e:translation-flow

# Offline capability flow test
npm run test:e2e:offline-flow

# Administrative workflow test
npm run test:e2e:admin-flow
```

#### Performance Tests

To run all performance tests:

```bash
npm run test:performance
```

To run specific performance tests:

```bash
# Backend performance tests
npm run test:performance:backend

# Edge device performance tests
npm run test:performance:edge

# Mobile app performance tests
npm run test:performance:mobile

# Translation performance tests
npm run test:performance:translation

# Cache performance tests
npm run test:performance:cache

# Offline performance tests
npm run test:performance:offline

# WebSocket performance tests
npm run test:performance:websocket
```

#### Other Tests

```bash
# Security tests
npm run test:security

# Localization tests
npm run test:localization

# App store submission tests
npm run test:app-store
```

## Running Tests in CI/CD

The tests are automatically run in the CI/CD pipeline when code is pushed to the main or develop branch, or when a pull request is created against these branches.

The CI/CD pipeline runs the tests in the following order:
1. Unit tests
2. Integration tests
3. End-to-end tests
4. Performance tests (only on main and develop branches)
5. Security tests (only on main and develop branches)

## Generating Test Reports

To generate a comprehensive test report:

```bash
npm run test:report
```

This will generate the following reports:
- HTML report: `test-report/report.html`
- Markdown report: `test-report/report.md`
- Summary report: `test-report/summary.md`

## Test Directory Structure

The tests are organized in the following directory structure:

```
tests/
├── unit/                  # Unit tests
│   ├── mobile-*.test.js   # Mobile app unit tests
│   ├── provider-*.test.js # Provider app unit tests
│   ├── admin-*.test.js    # Admin dashboard unit tests
│   └── edge-*.test.js     # Edge component unit tests
├── integration/           # Integration tests
│   ├── edge-*.test.js     # Edge-related integration tests
│   ├── backend-*.test.js  # Backend-related integration tests
│   └── *-flow.test.js     # End-to-end workflow tests
├── performance/           # Performance tests
│   ├── backend-*.test.js  # Backend performance tests
│   ├── edge-*.test.js     # Edge performance tests
│   └── mobile-*.test.js   # Mobile performance tests
├── security/              # Security tests
├── localization/          # Localization tests
├── app-store/             # App store submission tests
├── test-data/             # Test data
└── utils/                 # Test utilities
```

## Troubleshooting

### Common Issues

1. **Tests fail to connect to DynamoDB**
   - Make sure DynamoDB Local is running: `docker ps`
   - Check if the DynamoDB port (8000) is accessible

2. **WebSocket tests fail**
   - Ensure the backend server is running
   - Check if the WebSocket port is accessible

3. **Edge device tests fail**
   - Ensure the edge server is running
   - Check if the edge server port is accessible

4. **Performance tests timeout**
   - Increase the timeout value in the test configuration
   - Check if the system has enough resources

### Getting Help

If you encounter any issues running the tests, please:

1. Check the test logs for error messages
2. Consult the troubleshooting section in this document
3. Check the GitHub issues for similar problems
4. Create a new issue if the problem persists

## Best Practices

1. **Run tests locally before pushing**
   - Run at least the unit and integration tests locally before pushing changes

2. **Keep tests independent**
   - Each test should be independent and not rely on the state from other tests

3. **Clean up after tests**
   - Tests should clean up any resources they create

4. **Use meaningful test names**
   - Test names should clearly describe what is being tested

5. **Keep tests fast**
   - Tests should run quickly to provide fast feedback

6. **Use test data generators**
   - Use the test data generators in `tests/utils` to create test data

7. **Mock external dependencies**
   - Use mocks for external dependencies to make tests more reliable

## Contributing New Tests

When adding new tests:

1. Follow the existing directory structure
2. Use the same naming conventions
3. Add appropriate npm scripts to run the tests
4. Update the test documentation
5. Run the tests locally to ensure they pass
6. Submit a pull request with the new tests

## Test Coverage

To generate a test coverage report:

```bash
npm run test:coverage
```

This will generate a coverage report in the `coverage` directory.

## Continuous Improvement

The test suite is continuously improved. If you have suggestions for improving the tests, please:

1. Create a GitHub issue with your suggestion
2. Submit a pull request with the proposed changes
3. Update the test documentation
