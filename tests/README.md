# MedTranslate AI Tests

This directory contains tests for the MedTranslate AI application.

## Test Structure

The tests are organized into the following directories:

- `unit/`: Unit tests for individual components
- `integration/`: Integration tests for testing interactions between components
- `performance/`: Performance tests for measuring system performance

## Edge Component Tests

### Unit Tests

The edge component unit tests are located in the following files:

- `unit/edge-translation.test.js`: Tests for the edge translation module
- `unit/edge-cache.test.js`: Tests for the edge cache module
- `unit/edge-sync.test.js`: Tests for the edge sync module
- `unit/edge-server.test.js`: Tests for the edge server module

### Integration Tests

The edge component integration tests are located in the following files:

- `integration/edge-server-translation.test.js`: Tests for the edge server and translation module integration
- `integration/edge-server-cache.test.js`: Tests for the edge server and cache module integration
- `integration/edge-server-sync.test.js`: Tests for the edge server and sync module integration
- `integration/edge-application.test.js`: Tests for the complete edge application

### Performance Tests

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

## Running Tests

You can run the tests using the following npm scripts:

```bash
# Run all tests
npm test

# Run all edge component tests
npm run test:edge

# Run only edge unit tests
npm run test:edge:unit

# Run only edge integration tests
npm run test:edge:integration

# Run only edge performance tests
npm run test:edge:performance

# Run all unit tests
npm run test:unit

# Run all integration tests
npm run test:integration

# Run all performance tests
npm run test:performance
```

## Adding New Tests

When adding new tests, follow these guidelines:

1. Place unit tests in the `unit/` directory
2. Place integration tests in the `integration/` directory
3. Place performance tests in the `performance/` directory
4. Name test files with the pattern `[component]-[module].test.js`
5. Use Jest's `describe` and `it` functions to organize tests
6. Mock external dependencies using Jest's mocking capabilities

## Test Coverage

Test coverage reports are generated in the `coverage/` directory when running tests. You can view the coverage report by opening `coverage/lcov-report/index.html` in a web browser.
