# MedTranslate AI Testing Framework

This directory contains the comprehensive testing framework for the MedTranslate AI system, ensuring all components work correctly individually and together.

## Testing Philosophy

Our testing approach follows these principles:

1. **Comprehensive Coverage**: Test all components and their integrations
2. **Realistic Scenarios**: Test real-world use cases and edge cases
3. **Automation**: Automate tests for consistent, repeatable results
4. **Continuous Testing**: Run tests frequently during development
5. **Performance Monitoring**: Track performance metrics over time

## Test Structure

The tests are organized into the following directories:

- `unit/`: Unit tests for individual components
- `integration/`: Integration tests for testing interactions between components
- `performance/`: Performance tests for measuring system performance

## Test Categories

### Unit Tests

Unit tests verify that individual components work correctly in isolation. These tests mock external dependencies to focus on the component being tested.

### Integration Tests

Integration tests verify that different components work together correctly. These tests focus on the interactions between components.

### End-to-End Tests

End-to-End tests verify complete user flows from start to finish, simulating real user interactions with the system.

### Performance Tests

Performance tests measure system performance under various conditions and loads, ensuring the system meets performance requirements.

### Security Tests

Security tests verify that the application meets security requirements and follows best practices. These tests identify and address security vulnerabilities.

### Localization Tests

Localization tests verify that the application is properly localized for all supported languages. These tests ensure that the UI adapts to different languages and that all text is properly translated.

### App Store Submission Tests

App store submission tests verify that the application meets the requirements for submission to app stores. These tests ensure that all required assets are prepared and that the submission process is smooth.

## Component Tests

### Edge Component Tests

#### Unit Tests

The edge component unit tests are located in the following files:

- `unit/edge-translation.test.js`: Tests for the edge translation module
- `unit/edge-cache.test.js`: Tests for the edge cache module
- `unit/edge-sync.test.js`: Tests for the edge sync module
- `unit/edge-server.test.js`: Tests for the edge server module

#### Integration Tests

The edge component integration tests are located in the following files:

- `integration/edge-server-translation.test.js`: Tests for the edge server and translation module integration
- `integration/edge-server-cache.test.js`: Tests for the edge server and cache module integration
- `integration/edge-server-sync.test.js`: Tests for the edge server and sync module integration
- `integration/edge-application.test.js`: Tests for the complete edge application
- `integration/edge-offline-sync.test.js`: Tests for edge offline operation and synchronization

#### Performance Tests

The edge component performance tests are located in the following files:

- `performance/edge-translation.perf.js`: Performance tests for the edge translation module
- `performance/edge-cache.perf.js`: Performance tests for the edge cache module
- `performance/edge-sync.perf.js`: Performance tests for the edge sync module
- `performance/edge-application.perf.js`: Performance tests for the complete edge application

The performance tests measure the following metrics:
- Translation performance with different text lengths and language pairs
- Cache performance with different cache sizes and operations
- Sync performance with different network conditions and batch sizes
- Application performance with concurrent requests and WebSocket connections

### WebSocket Communication Tests

The WebSocket communication tests are located in the following files:

- `integration/websocket-communication.test.js`: Tests for WebSocket communication between backend and frontend

These tests verify:
- Connection establishment
- Message broadcasting
- Reconnection handling
- Session termination

### End-to-End Tests

The end-to-end tests are located in the following files:

- `integration/complete-translation-flow.test.js`: Tests for the complete translation flow

These tests verify the entire system workflow:
- Provider login
- Session creation
- Patient token generation
- WebSocket connections
- Text translation
- Edge translation
- Session storage and retrieval
- Session termination

## New Test Components

### Mobile App Tests

The mobile app tests are located in the following files:

- `unit/mobile-components.test.js`: Tests for mobile app components
- `unit/mobile-hooks.test.js`: Tests for mobile app hooks
- `unit/mobile-services.test.js`: Tests for mobile app services

These tests verify:
- Mobile system status dashboard
- Offline capabilities
- Push notifications
- Security features
- Edge device discovery
- Translation status indicator
- System status hooks
- Edge connection hooks
- Translation hooks
- Offline queue hooks
- API services
- Notification services
- Edge services
- Storage services

### Provider App Tests

The provider app tests are located in the following files:

- `unit/provider-components.test.js`: Tests for provider app components
- `unit/provider-hooks.test.js`: Tests for provider app hooks

These tests verify:
- Session management panel
- Patient history panel
- Translation monitor panel
- System status dashboard
- Session hooks
- Patient history hooks
- Translation monitor hooks

### Admin Dashboard Tests

The admin dashboard tests are located in the following files:

- `unit/admin-components.test.js`: Tests for admin dashboard components

These tests verify:
- Sync analytics dashboard
- System health dashboard
- User management panel
- Configuration panel

### Edge-Frontend Integration Tests

The edge-frontend integration tests are located in the following files:

- `integration/edge-frontend-connection.test.js`: Tests for edge device discovery and connection
- `integration/edge-frontend-translation.test.js`: Tests for translation via edge device
- `integration/edge-frontend-offline.test.js`: Tests for offline operation with edge device

These tests verify:
- Edge device discovery
- Edge device connection
- Edge device status monitoring
- Text translation via edge device
- Audio translation via edge device
- Fallback to cloud when needed
- Transition to offline mode
- Translation during offline mode
- Queue management during offline mode
- Synchronization after reconnection

### End-to-End Workflow Tests

The end-to-end workflow tests are located in the following files:

- `integration/offline-capability-flow.test.js`: Tests for the complete offline capability workflow
- `integration/administrative-workflow.test.js`: Tests for the complete administrative workflow

These tests verify:
- Edge device connection
- Network disconnection
- Offline translation
- Queue accumulation
- Network reconnection
- Synchronization
- Admin login
- System status monitoring
- Configuration changes
- User management
- Analytics review

### Security Testing

The security testing components are located in the following files:

- `security/security-audit-tool.js`: Tool for conducting security audits based on the security audit checklist

These tests verify:
- Authentication and authorization mechanisms
- Data protection measures
- Network security configuration
- Mobile application security
- Edge device security
- Logging and monitoring
- Compliance with security standards

### Localization Testing

The localization testing components are located in the following files:

- `localization/localization-test.js`: Tool for testing localization across all supported languages

These tests verify:
- Translation completeness for all supported languages
- UI adaptation to different languages
- RTL language support
- Language selection and persistence

### App Store Submission Testing

The app store submission testing components are located in the following files:

- `app-store/app-store-submission-tool.js`: Tool for preparing app store submissions

These tests verify:
- App metadata completeness and accuracy
- App asset preparation
- App binary validation
- Submission process documentation

### Test Implementation Tracker

The test implementation tracker is located in the following file:

- `test-implementation-tracker.js`: Script to track the implementation status of all tests

### Test Runner

The test runner is located in the following file:

- `run-all-tests.js`: Script to run all tests and generate comprehensive reports

## Running Tests

You can run the tests using the following npm scripts:

```bash
# Run all tests
npm test
node tests/run-all-tests.js

# Run specific test categories
npm run test:unit            # Run all unit tests
npm run test:integration     # Run all integration tests
npm run test:performance     # Run all performance tests
npm run test:e2e             # Run end-to-end tests
npm run test:security        # Run security tests
npm run test:localization    # Run localization tests
npm run test:app-store       # Run app store submission tests

# Run edge component tests
npm run test:edge            # Run all edge component tests
npm run test:edge:unit       # Run edge unit tests
npm run test:edge:integration # Run edge integration tests
npm run test:edge:performance # Run edge performance tests
npm run test:edge:offline    # Run edge offline operation test

# Run WebSocket tests
npm run test:websocket       # Run WebSocket communication tests

# Run specific tests
npm run test:complete-flow   # Run complete translation flow test
npm run test:translation     # Run translation-related tests
npm run test:offline:predictive  # Run predictive cache tests
npm run test:offline:performance # Run offline performance tests
npm run test:websocket:reconnection # Run WebSocket reconnection tests
npm run test:error-handling # Run error handling tests

# Run workflow tests
node tests/integration/offline-capability-flow.test.js  # Run offline capability flow test
node tests/integration/administrative-workflow.test.js  # Run administrative workflow test

# Run other tools
node tests/security/security-audit-tool.js  # Run security audit
node tests/localization/localization-test.js  # Run localization tests
node tests/app-store/app-store-submission-tool.js  # Run app store submission preparation
node tests/test-implementation-tracker.js  # Check test implementation status
```

## Adding New Tests

When adding new tests, follow these guidelines:

1. Place unit tests in the `unit/` directory
2. Place integration tests in the `integration/` directory
3. Place performance tests in the `performance/` directory
4. Name test files with the pattern `[component]-[module].test.js`
5. Use Jest's `describe` and `it` functions to organize tests
6. Mock external dependencies using Jest's mocking capabilities
7. Test both success and error cases
8. Include comments explaining the purpose of each test

## Test Coverage

Test coverage reports are generated in the `coverage/` directory when running tests. You can view the coverage report by opening `coverage/lcov-report/index.html` in a web browser.

## Test Environment

Tests run in a controlled environment with:

1. Backend server running on port 3005
2. Edge server running on port 3006 (for relevant tests)
3. Mock DynamoDB and S3 for local testing
4. Test user accounts and sessions

Environment variables are set automatically by the test runner.

## Continuous Integration

Tests are run automatically on:

1. Pull requests to main branch
2. Merges to main branch
3. Nightly builds

Test failures block merges to ensure code quality.

## Comprehensive Test Plan

For a detailed testing strategy, see the [Comprehensive Test Plan](./testplan.md) document, which outlines:

1. Test categories and coverage matrix
2. Test implementation plan for all components
3. Test execution strategy
4. Test monitoring and reporting
5. Test maintenance guidelines

The test implementation status can be checked by running:

```bash
node tests/test-implementation-tracker.js
```

This will display the current implementation status of all test modules defined in the test plan.
