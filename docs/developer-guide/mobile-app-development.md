# MedTranslate AI Mobile App Developer Guide

## Introduction

This guide provides detailed information for developers working on the MedTranslate AI mobile application. It covers the architecture, key components, and development workflows for the React Native-based mobile app.

## Architecture Overview

The MedTranslate AI mobile app follows a modular architecture with the following key components:

### Core Components

- **React Native**: The app is built using React Native 0.72.10 and Expo SDK 49.
- **Navigation**: React Navigation is used for screen navigation.
- **State Management**: Context API is used for state management.
- **API Communication**: Axios is used for API requests.
- **Offline Support**: AsyncStorage and custom caching mechanisms are used for offline support.
- **Push Notifications**: Expo Notifications is used for push notifications.
- **Edge Device Integration**: Custom WebSocket implementation for edge device communication.

### Directory Structure

```
mobile/patient-app/
├── assets/                # Images, fonts, etc.
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── __tests__/     # Component tests
│   │   └── ...
│   ├── contexts/          # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── screens/           # Screen components
│   ├── services/          # API and service integrations
│   ├── utils/             # Utility functions
│   ├── App.js             # Main application component
│   └── ...
├── app.json               # Expo configuration
└── package.json           # Dependencies and scripts
```

## Key Features

### Offline Capabilities

The app includes comprehensive offline capabilities:

1. **Translation Caching**: Translations are cached for offline use.
2. **Offline Queue**: Actions performed offline are queued for later synchronization.
3. **Predictive Caching**: ML models predict which translations might be needed offline.
4. **Auto-Sync**: Automatic synchronization when connectivity is restored.

Implementation details:

```javascript
// Example of the offline queue implementation
export class OfflineQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async add(item) {
    this.queue.push({
      ...item,
      id: uuid.v4(),
      timestamp: new Date().toISOString(),
      status: 'pending'
    });
    await this.saveQueue();
    return this.queue;
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    try {
      // Process queue items
      for (const item of this.queue) {
        if (item.status === 'pending') {
          await this.processItem(item);
        }
      }
    } finally {
      this.isProcessing = false;
      await this.saveQueue();
    }
  }

  // ... other methods
}
```

### Edge Device Integration

The app can discover and connect to edge devices for enhanced performance:

1. **Device Discovery**: Uses network scanning to find edge devices.
2. **Secure Connection**: Establishes secure WebSocket connections.
3. **Model Synchronization**: Synchronizes ML models with edge devices.
4. **Offline Processing**: Uses edge devices for processing when offline.

Implementation details:

```javascript
// Example of edge device discovery
export async function discoverEdgeDevices() {
  try {
    // Scan local network for edge devices
    const devices = await scanNetwork();
    
    // Filter for MedTranslate edge devices
    const edgeDevices = await Promise.all(
      devices.map(async (device) => {
        try {
          const response = await fetch(`http://${device.ip}:4000/info`, {
            timeout: 2000
          });
          
          if (response.ok) {
            const info = await response.json();
            if (info.type === 'medtranslate-edge') {
              return {
                id: info.id,
                name: info.name,
                ipAddress: device.ip,
                status: 'online',
                ...info
              };
            }
          }
          return null;
        } catch (error) {
          return null;
        }
      })
    );
    
    return edgeDevices.filter(Boolean);
  } catch (error) {
    console.error('Error discovering edge devices:', error);
    return [];
  }
}
```

### Push Notifications

The app implements push notifications for real-time updates:

1. **Token Registration**: Registers device tokens with the backend.
2. **Notification Handling**: Processes incoming notifications.
3. **Background Notifications**: Handles notifications when the app is in the background.
4. **Action Buttons**: Implements actionable notifications.

Implementation details:

```javascript
// Example of push notification registration
export async function registerForPushNotifications() {
  let token;
  
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // Store token in AsyncStorage
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_TOKEN, token);
    
    // Register token with backend
    await api.registerPushToken(token);
  }
  
  return token;
}
```

### Security Features

The app implements several security features:

1. **Secure Storage**: Sensitive data is stored securely.
2. **Data Encryption**: All data is encrypted before storage.
3. **Secure Communication**: All API requests use HTTPS.
4. **Token Management**: JWT tokens are securely stored and managed.

Implementation details:

```javascript
// Example of data encryption
export async function encryptData(data, key) {
  try {
    // Generate initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Return encrypted data with IV and auth tag
    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}
```

## Development Workflow

### Setting Up the Development Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/medtranslate-ai/medtranslate-ai.git
   cd medtranslate-ai
   ```

2. Install dependencies:
   ```bash
   cd mobile/patient-app
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Running Tests

The app includes comprehensive tests:

1. Run all tests:
   ```bash
   npm test
   ```

2. Run specific tests:
   ```bash
   npm test -- -t "OfflineCapabilities"
   ```

3. Update snapshots:
   ```bash
   npm test -- -u
   ```

### Building for Production

1. Build for Android:
   ```bash
   npm run build:android
   ```

2. Build for iOS:
   ```bash
   npm run build:ios
   ```

## API Integration

The app integrates with the MedTranslate AI backend API:

### Authentication

```javascript
// Example of session authentication
export async function joinSession(sessionCode) {
  try {
    const response = await axios.post('/api/sessions/join', {
      sessionCode
    });
    
    if (response.data.success) {
      // Store session token
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, response.data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_ID, response.data.sessionId);
      
      return {
        success: true,
        token: response.data.token,
        sessionId: response.data.sessionId
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Failed to join session'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Network error'
    };
  }
}
```

### Translation API

```javascript
// Example of translation API integration
export async function translateText(text, sourceLanguage, targetLanguage, sessionId) {
  try {
    // Check cache first
    const cacheKey = `${sourceLanguage}-${targetLanguage}-${text.toLowerCase()}`;
    const cachedTranslation = await getCachedTranslation(cacheKey);
    
    if (cachedTranslation) {
      return {
        success: true,
        translation: cachedTranslation.translatedText,
        fromCache: true
      };
    }
    
    // If not in cache, call API
    const response = await axios.post('/api/translate', {
      text,
      sourceLanguage,
      targetLanguage,
      sessionId
    });
    
    if (response.data.success) {
      // Cache the translation
      await cacheTranslation(cacheKey, {
        sourceText: text,
        sourceLanguage,
        targetLanguage,
        translatedText: response.data.translation,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        translation: response.data.translation,
        fromCache: false
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'Translation failed'
      };
    }
  } catch (error) {
    // If offline, add to queue
    if (!navigator.onLine) {
      await offlineQueue.add({
        type: 'translation',
        data: {
          text,
          sourceLanguage,
          targetLanguage,
          sessionId
        }
      });
    }
    
    return {
      success: false,
      error: error.message || 'Network error',
      offline: !navigator.onLine
    };
  }
}
```

## Best Practices

### Performance Optimization

1. **Memoization**: Use React.memo and useMemo to prevent unnecessary re-renders.
2. **Virtualized Lists**: Use FlatList for long lists to improve performance.
3. **Image Optimization**: Optimize images for mobile devices.
4. **Lazy Loading**: Implement lazy loading for screens and components.

### Security Best Practices

1. **Secure Storage**: Use secure storage for sensitive data.
2. **Input Validation**: Validate all user inputs.
3. **Certificate Pinning**: Implement certificate pinning for API requests.
4. **Obfuscation**: Obfuscate the code for production builds.

### Offline-First Development

1. **Optimistic UI**: Update the UI immediately, then sync with the server.
2. **Background Sync**: Implement background synchronization.
3. **Conflict Resolution**: Implement strategies for resolving conflicts.
4. **Error Handling**: Implement robust error handling for offline scenarios.

## Troubleshooting

### Common Issues

1. **Build Errors**: Check the Expo and React Native versions compatibility.
2. **API Connection Issues**: Verify API endpoints and network connectivity.
3. **Push Notification Issues**: Check device registration and notification permissions.
4. **Edge Device Connection Issues**: Verify network configuration and device discovery.

### Debugging Tools

1. **React Native Debugger**: Use React Native Debugger for debugging.
2. **Flipper**: Use Flipper for network inspection and state debugging.
3. **Expo DevTools**: Use Expo DevTools for device management and logs.
4. **Chrome DevTools**: Use Chrome DevTools for JavaScript debugging.

## Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation Documentation](https://reactnavigation.org/docs/getting-started)
- [MedTranslate AI API Documentation](https://api.medtranslate.ai/docs)
