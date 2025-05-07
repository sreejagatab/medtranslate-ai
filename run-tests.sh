#!/bin/bash

# Run backend unit tests
echo "Running backend unit tests..."
cd backend
npm test -- --testPathPattern=tests/unit/sync-analytics-controller.test.js

# Run backend integration tests
echo "Running backend integration tests..."
npm test -- --testPathPattern=tests/integration/sync-analytics-websocket.test.js

# Run frontend component tests
echo "Running frontend component tests..."
cd ../frontend/admin-dashboard
npm test -- --testPathPattern=src/components/__tests__/SyncAnalyticsDashboard.test.js

echo "All tests completed!"
