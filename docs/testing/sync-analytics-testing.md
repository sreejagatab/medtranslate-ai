# Sync Analytics Testing Documentation

This document provides information about the testing suite for the Sync Analytics features of the MedTranslate AI project.

## Overview

The testing suite for Sync Analytics consists of:

1. **Unit Tests** - Test individual components in isolation
2. **Integration Tests** - Test interactions between components
3. **UI Component Tests** - Test UI components
4. **End-to-End Tests** - Test the entire application flow from a user's perspective
5. **Visual Regression Tests** - Test for visual changes in the UI

## Test Files

### Backend Tests

- **Unit Tests**: `backend/tests/unit/sync-analytics-controller.test.js`
  - Tests the sync analytics controller functions
  - Verifies that API endpoints return the expected responses
  - Uses mock axios to simulate edge device responses

- **Integration Tests**: `backend/tests/integration/sync-analytics-websocket.test.js`
  - Tests the WebSocket events for sync analytics
  - Verifies that events are properly emitted and received
  - Uses a test WebSocket server and client

### Frontend Tests

- **UI Component Tests**: `frontend/admin-dashboard/src/components/__tests__/SyncAnalyticsDashboard.test.js`
  - Tests the SyncAnalyticsDashboard component
  - Verifies that the component renders correctly
  - Tests user interactions like button clicks
  - Tests WebSocket message handling

### End-to-End Tests

- **Cypress Tests**: `frontend/admin-dashboard/cypress/e2e/sync-analytics.cy.js`
  - Tests the entire application flow from a user's perspective
  - Verifies that the Sync Analytics Dashboard loads correctly
  - Tests user interactions like button clicks
  - Verifies that API responses are correctly displayed in the UI

### Visual Regression Tests

- **Cypress Visual Regression Tests**: `frontend/admin-dashboard/cypress/e2e/visual-regression.cy.js`
  - Tests for visual changes in the UI
  - Captures screenshots of UI components and compares them with baseline images
  - Detects visual regressions in the UI
  - Tests different states of the UI (normal, error, loading)

### Accessibility Tests

- **Cypress Accessibility Tests**: `frontend/admin-dashboard/cypress/e2e/accessibility.cy.js`
  - Tests for accessibility issues in the UI
  - Uses axe-core to check for WCAG 2.0 and 2.1 compliance
  - Tests different components of the UI
  - Tests different states of the UI (normal, error, loading)
  - Generates a detailed report of accessibility violations

## Running the Tests

### Running All Tests

To run all tests, use the provided batch file:

```
run-tests.bat
```

To run end-to-end tests:

```
cd frontend/admin-dashboard
npm run test:e2e
```

To run visual regression tests:

```
cd frontend/admin-dashboard
npm run test:visual
```

To update visual regression snapshots:

```
cd frontend/admin-dashboard
npm run test:visual:update
```

To run accessibility tests and generate a report:

```
cd frontend/admin-dashboard
run-a11y-tests.bat
```

The accessibility report will be generated at `frontend/admin-dashboard/reports/accessibility-report.html`.

Alternatively, you can use the provided batch file:

```
cd frontend/admin-dashboard
update-visual-snapshots.bat
```

To open Cypress in interactive mode:

```
cd frontend/admin-dashboard
npm run cypress:open
```

### Running Individual Tests

To run individual test files:

#### Backend Unit Tests

```
cd backend
npm test -- --testPathPattern=tests/unit/sync-analytics-controller.test.js
```

#### Backend Integration Tests

```
cd backend
npm test -- --testPathPattern=tests/integration/sync-analytics-websocket.test.js
```

#### Frontend Component Tests

```
cd frontend/admin-dashboard
npm test -- --testPathPattern=src/components/__tests__/SyncAnalyticsDashboard.test.js
```

## Test Coverage

The tests cover the following aspects of the Sync Analytics features:

### API Endpoints

- `GET /api/sync-analytics/status` - Get sync status from all connected edge devices
- `GET /api/sync-analytics/metrics` - Get detailed sync metrics from all connected edge devices
- `GET /api/sync-analytics/quality` - Get quality metrics from all connected edge devices
- `POST /api/sync-analytics/manual-sync/:deviceId` - Trigger a manual sync on a specific edge device

### WebSocket Events

- `sync_status_update` - Real-time updates of sync status
- `quality_metrics_update` - Real-time updates of quality metrics
- `anomaly_detection_update` - Real-time updates of anomaly detection

### UI Components

- Device status cards
- Sync queue chart
- Quality metrics chart
- Anomaly detection table
- Manual sync button

### End-to-End Testing

The end-to-end tests verify the following user flows:

1. **Dashboard Loading** - Verify that the Sync Analytics Dashboard loads correctly
2. **Device Status Display** - Verify that device status cards are displayed correctly
3. **Chart Rendering** - Verify that charts are rendered correctly
4. **Manual Sync** - Verify that the manual sync button works correctly
5. **Error Handling** - Verify that error states are displayed correctly
6. **Loading States** - Verify that loading states are displayed correctly

## Adding New Tests

When adding new features to the Sync Analytics module, follow these guidelines for adding tests:

1. **Unit Tests** - Add tests for new controller functions
2. **Integration Tests** - Add tests for new WebSocket events
3. **UI Component Tests** - Add tests for new UI components
4. **End-to-End Tests** - Add tests for new user flows
5. **Visual Regression Tests** - Add tests for new UI components and states
6. **Accessibility Tests** - Add tests for new UI components and states

## Mocking

The tests use the following mocking strategies:

- **axios-mock-adapter** - Mock HTTP requests to edge devices
- **jest.mock** - Mock React hooks and contexts
- **jest.spyOn** - Mock browser APIs like `window.alert`
- **Cypress intercepts** - Mock API responses in end-to-end tests
- **axe-core** - Accessibility testing engine

## Continuous Integration

These tests are designed to be run in a CI/CD pipeline. They can be integrated into GitHub Actions, Jenkins, or other CI systems.

## Troubleshooting

If tests are failing, check the following:

1. **Network Issues** - Make sure the mock axios responses are correctly configured
2. **WebSocket Issues** - Check that the WebSocket server and client are properly set up
3. **UI Rendering Issues** - Verify that the component is rendering correctly
4. **Cypress Issues** - Check that Cypress is properly installed and configured
5. **Browser Issues** - Try running Cypress tests in a different browser
6. **Accessibility Issues** - Check the accessibility report for details on violations

## Future Improvements

Future improvements to the testing suite could include:

1. **Performance Tests** - Add tests for performance benchmarking
2. **Load Tests** - Add tests for handling high loads of WebSocket connections
3. **Cross-Browser Tests** - Add tests for cross-browser compatibility
4. **Mobile Responsiveness Tests** - Add tests for mobile responsiveness
