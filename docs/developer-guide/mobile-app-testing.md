# MedTranslate AI Mobile App Testing Guide

## Introduction

This guide provides detailed information for testing the MedTranslate AI mobile application. It covers the testing framework, test types, and best practices for ensuring the quality of the mobile app.

## Testing Framework

The MedTranslate AI mobile app uses the following testing tools:

- **Jest**: JavaScript testing framework
- **React Native Testing Library**: Testing utilities for React Native
- **Expo Testing Library**: Testing utilities for Expo
- **Mock Service Worker**: API mocking library

## Test Types

### Unit Tests

Unit tests verify that individual components and functions work as expected in isolation. They are located in `__tests__` directories adjacent to the code they test.

Example unit test for a component:

```javascript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../Button';

describe('Button', () => {
  test('renders correctly', () => {
    const { getByText } = render(<Button title="Press me" />);
    expect(getByText('Press me')).toBeTruthy();
  });

  test('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Press me" onPress={onPress} />);
    fireEvent.press(getByText('Press me'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### Integration Tests

Integration tests verify that multiple components work together correctly. They are located in the `src/components/__tests__` directory.

Example integration test:

```javascript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ConnectionProvider } from '../../contexts/ConnectionContext';
import OfflineQueueScreen from '../../screens/OfflineQueueScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('OfflineQueueScreen', () => {
  beforeEach(() => {
    AsyncStorage.getItem.mockClear();
  });

  test('displays offline queue items correctly', async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify([
      {
        id: '1',
        type: 'translation',
        data: { text: 'Hello' },
        status: 'pending',
        timestamp: new Date().toISOString()
      }
    ]));

    const { getByText } = render(
      <ConnectionProvider>
        <OfflineQueueScreen />
      </ConnectionProvider>
    );

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalled();
    });

    expect(getByText('Hello')).toBeTruthy();
  });
});
```

### End-to-End Tests

End-to-end tests verify that the entire app works correctly from the user's perspective. They are located in the `e2e` directory.

Example end-to-end test:

```javascript
import { device, element, by, waitFor } from 'detox';

describe('App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show the welcome screen', async () => {
    await expect(element(by.text('Welcome to MedTranslate AI'))).toBeVisible();
  });

  it('should navigate to the join session screen', async () => {
    await element(by.text('Join Session')).tap();
    await expect(element(by.text('Enter 6-digit code'))).toBeVisible();
  });
});
```

## Running Tests

### Unit and Integration Tests

To run unit and integration tests:

```bash
npm test
```

To run tests with coverage:

```bash
npm test -- --coverage
```

To run a specific test file:

```bash
npm test -- path/to/test.js
```

### End-to-End Tests

To run end-to-end tests:

```bash
npm run e2e:build
npm run e2e:test
```

## Mocking

### Mocking AsyncStorage

```javascript
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  clear: jest.fn()
}));
```

### Mocking API Calls

```javascript
jest.mock('../../services/api', () => ({
  translateText: jest.fn().mockResolvedValue({
    success: true,
    translation: 'Hola',
    sourceLanguage: 'en',
    targetLanguage: 'es'
  }),
  joinSession: jest.fn().mockResolvedValue({
    success: true,
    token: 'mock-token',
    sessionId: 'mock-session-id'
  })
}));
```

### Mocking Navigation

```javascript
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn()
  }),
  useRoute: () => ({
    params: {}
  }),
  useFocusEffect: jest.fn()
}));
```

## Test Coverage

The goal is to maintain at least 80% test coverage for the mobile app. Coverage reports are generated when running tests with the `--coverage` flag.

## Continuous Integration

Tests are automatically run on every pull request and push to the main branch using GitHub Actions. The workflow is defined in `.github/workflows/mobile-tests.yml`.

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on testing what the component does, not how it does it.
2. **Use Data-Testid Attributes**: Add `testID` props to components to make them easier to select in tests.
3. **Mock External Dependencies**: Mock API calls, AsyncStorage, and other external dependencies.
4. **Test Edge Cases**: Test error states, loading states, and edge cases.
5. **Keep Tests Fast**: Tests should run quickly to provide fast feedback.
6. **Isolate Tests**: Tests should not depend on each other.
7. **Use Setup and Teardown**: Use `beforeEach` and `afterEach` to set up and clean up test state.
8. **Test Accessibility**: Test that components are accessible.

## Troubleshooting

### Common Issues

1. **Tests Fail with "Cannot find module"**: Make sure all dependencies are installed and the module path is correct.
2. **Tests Timeout**: Increase the timeout value or check for infinite loops.
3. **Tests Fail with "Element not found"**: Check that the component is rendered and the selector is correct.
4. **Tests Fail with "TypeError: Cannot read property of undefined"**: Check that all props are provided to components.

### Debugging Tests

To debug tests, add `console.log` statements or use the `debug` function from React Native Testing Library:

```javascript
const { debug } = render(<MyComponent />);
debug();
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library Documentation](https://callstack.github.io/react-native-testing-library/)
- [Expo Testing Documentation](https://docs.expo.dev/guides/testing/)
- [Detox Documentation](https://github.com/wix/Detox/blob/master/docs/README.md)
