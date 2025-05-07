@echo off
REM Run backend unit tests
echo Running backend unit tests...
cd backend
call npm test -- --testPathPattern=tests/unit/sync-analytics-controller.test.js

REM Run backend integration tests
echo Running backend integration tests...
call npm test -- --testPathPattern=tests/integration/sync-analytics-websocket.test.js

REM Run frontend component tests
echo Running frontend component tests...
cd ../frontend/admin-dashboard
call npm test -- --testPathPattern=src/components/__tests__/SyncAnalyticsDashboard.test.js

REM Run frontend end-to-end tests
echo Running frontend end-to-end tests...
call npm run test:e2e

REM Run frontend visual regression tests
echo Running frontend visual regression tests...
call npm run test:visual

REM Run frontend accessibility tests
echo Running frontend accessibility tests...
call npm run test:a11y

echo All tests completed!
