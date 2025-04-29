# MedTranslate AI Unit Tests

This directory contains unit tests for individual components of the MedTranslate AI system.

## Test Organization

Unit tests are organized by component:

- `backend-*.test.js`: Tests for backend components
- `edge-*.test.js`: Tests for edge computing components
- `frontend-*.test.js`: Tests for frontend components

## Running Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific unit tests
npm run test:unit -- backend-auth
```

## Writing New Unit Tests

When adding new unit tests, follow these guidelines:

1. Name test files with the pattern `[component]-[module].test.js`
2. Use Jest's `describe` and `it` functions to organize tests
3. Mock external dependencies using Jest's mocking capabilities
4. Test both success and error cases
5. Aim for high code coverage

## Unit Test Checklist

### Backend Components

- [ ] Authentication Service
  - [ ] Login functionality
  - [ ] Token generation
  - [ ] Token verification
  - [ ] Session management

- [ ] Translation Service
  - [ ] Text translation
  - [ ] Audio translation
  - [ ] Medical terminology handling
  - [ ] Error handling

- [ ] Storage Service
  - [ ] Transcript storage
  - [ ] Session data retrieval
  - [ ] Encryption/decryption
  - [ ] Error handling

- [ ] WebSocket Service
  - [ ] Connection handling
  - [ ] Message broadcasting
  - [ ] Session management
  - [ ] Error handling

### Edge Components

- [ ] Translation Module
  - [ ] Local translation
  - [ ] Model loading
  - [ ] Error handling

- [ ] Cache Module
  - [ ] Translation caching
  - [ ] Cache invalidation
  - [ ] Size management

- [ ] Sync Module
  - [ ] Cloud connectivity
  - [ ] Data synchronization
  - [ ] Offline handling

- [ ] Server Module
  - [ ] API endpoints
  - [ ] WebSocket handling
  - [ ] Error handling

### Frontend Components

- [ ] Authentication Module
  - [ ] Login/logout
  - [ ] Token management
  - [ ] Session handling

- [ ] Translation Module
  - [ ] Text translation
  - [ ] Audio recording/playback
  - [ ] Error handling

- [ ] WebSocket Module
  - [ ] Connection management
  - [ ] Message handling
  - [ ] Reconnection logic

- [ ] UI Components
  - [ ] Session creation
  - [ ] Translation display
  - [ ] Error handling
