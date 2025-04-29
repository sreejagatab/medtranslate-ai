# MedTranslate AI Integration Tests

This directory contains integration tests for the MedTranslate AI system, testing how different components work together.

## Test Organization

Integration tests are organized by integration point:

- `backend-edge-*.test.js`: Tests for backend and edge component integration
- `backend-frontend-*.test.js`: Tests for backend and frontend integration
- `edge-frontend-*.test.js`: Tests for edge and frontend integration
- `end-to-end-*.test.js`: Complete end-to-end tests

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration tests
npm run test:integration -- backend-edge
```

## Writing New Integration Tests

When adding new integration tests, follow these guidelines:

1. Name test files with the pattern `[component1]-[component2]-[feature].test.js`
2. Use Jest's `describe` and `it` functions to organize tests
3. Mock external services when necessary
4. Test realistic user flows
5. Include both success and error cases

## Integration Test Checklist

### Backend-Edge Integration

- [ ] Translation Flow
  - [ ] Backend to edge translation requests
  - [ ] Edge to backend result reporting
  - [ ] Fallback mechanisms
  - [ ] Error handling

- [ ] Synchronization
  - [ ] Model updates
  - [ ] Configuration synchronization
  - [ ] Offline operation
  - [ ] Reconnection handling

### Backend-Frontend Integration

- [ ] Authentication Flow
  - [ ] Provider login
  - [ ] Session creation
  - [ ] Patient token generation
  - [ ] Error handling

- [ ] WebSocket Communication
  - [ ] Connection establishment
  - [ ] Message broadcasting
  - [ ] Reconnection handling
  - [ ] Error handling

- [ ] Translation Flow
  - [ ] Text translation requests
  - [ ] Audio translation requests
  - [ ] Result display
  - [ ] Error handling

### Edge-Frontend Integration

- [ ] Direct Communication
  - [ ] Edge discovery
  - [ ] Connection establishment
  - [ ] Translation requests
  - [ ] Error handling

- [ ] Offline Operation
  - [ ] Offline detection
  - [ ] Local translation
  - [ ] Synchronization upon reconnection
  - [ ] Error handling

### End-to-End Tests

- [ ] Complete Translation Session
  - [ ] Provider login
  - [ ] Session creation
  - [ ] Patient joining
  - [ ] Text translation
  - [ ] Audio translation
  - [ ] Session termination
  - [ ] Data retrieval

- [ ] Edge Failover
  - [ ] Edge device offline detection
  - [ ] Automatic fallback to cloud
  - [ ] Reconnection to edge
  - [ ] Synchronization

- [ ] Multi-Device Session
  - [ ] Multiple patients joining
  - [ ] Message broadcasting
  - [ ] Session management
  - [ ] Error handling
