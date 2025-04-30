# MedTranslate AI Integration Tests

This directory contains comprehensive integration tests for the MedTranslate AI system, testing how different components work together.

## Integration Test Framework

The integration test framework consists of several components:

1. **Full System Integration Test** (`full-system-integration.test.js`): Tests the entire system integration, including authentication, session management, WebSocket communication, translation, and edge computing.

2. **Test Scenario Generator** (`test-scenario-generator.js`): Generates test scenarios for different medical contexts, language pairs, and edge cases.

3. **Test Reporter** (`test-reporter.js`): Generates detailed test reports in both JSON and HTML formats.

4. **Test Scenario Runner** (`run-test-scenarios.js`): Runs test scenarios against the backend and edge components.

## Running Integration Tests

You can run the integration tests using the following npm scripts:

```bash
# Run all integration tests
npm run test:integration

# Run the full system integration test
npm run test:integration:full

# Run test scenarios
npm run test:integration:scenarios

# Generate detailed test reports
npm run test:integration:report
```

### Test Scenario Options

When running test scenarios, you can specify the test mode and target service:

```bash
# Run random scenarios
npm run test:integration:scenarios random

# Run comprehensive test suite
npm run test:integration:scenarios comprehensive

# Run edge case scenarios
npm run test:integration:scenarios edge-cases

# Target specific service
npm run test:integration:scenarios random backend
npm run test:integration:scenarios random edge
```

## Test Reports

Integration test reports are saved to the `test-reports` directory in both JSON and HTML formats. The HTML reports provide a visual representation of the test results, including:

- Overall test status
- Number of passed and failed tests
- Detailed test results
- System information

## Integration Test Checklist

### Backend-Edge Integration

- [x] Translation Flow
  - [x] Backend to edge translation requests
  - [x] Edge to backend result reporting
  - [x] Fallback mechanisms
  - [x] Error handling

- [x] Synchronization
  - [x] Model updates
  - [x] Configuration synchronization
  - [x] Offline operation
  - [x] Reconnection handling

### Backend-Frontend Integration

- [x] Authentication
  - [x] Provider login
  - [x] Patient token generation
  - [x] Session management

- [x] WebSocket Communication
  - [x] Connection establishment
  - [x] Message broadcasting
  - [x] Reconnection handling
  - [x] Session termination

### Edge-Frontend Integration

- [x] Local Translation
  - [x] Text translation
  - [x] Audio translation
  - [x] Offline operation
  - [x] Synchronization

### End-to-End Tests

- [x] Complete Translation Session
  - [x] Provider login
  - [x] Session creation
  - [x] Patient joining
  - [x] Text translation
  - [x] Audio translation
  - [x] Session termination
  - [x] Data retrieval

- [x] Edge Failover
  - [x] Edge device offline detection
  - [x] Automatic fallback to cloud
  - [x] Reconnection to edge
  - [x] Synchronization

## Writing New Integration Tests

When adding new integration tests, follow these guidelines:

1. Name test files with the pattern `[component1]-[component2]-[feature].test.js`
2. Use Jest's `describe` and `it` functions to organize tests
3. Mock external services when necessary
4. Test realistic user flows
5. Include both success and error cases

## Test Environment Setup

The integration tests require a running backend and edge server. You can start these using:

```bash
# Start backend server
npm run start:backend

# Start edge server
npm run start:edge
```

The tests use the following environment variables:

- `BACKEND_URL`: URL of the backend server (default: `http://localhost:3001`)
- `EDGE_URL`: URL of the edge server (default: `http://localhost:3002`)
- `WS_URL`: URL of the WebSocket server (default: `ws://localhost:3001/ws`)
- `TEST_REPORT_DIR`: Directory to save test reports (default: `test-reports`)
- `SCENARIO_COUNT`: Number of random scenarios to generate (default: `10`)

You can set these environment variables before running the tests:

```bash
BACKEND_URL=http://localhost:3001 EDGE_URL=http://localhost:3002 npm run test:integration:full
```
