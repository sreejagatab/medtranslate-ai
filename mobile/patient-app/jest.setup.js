// Mock the Expo modules
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(),
  AndroidImportance: {
    MAX: 5
  },
  AndroidNotificationVisibility: {
    PUBLIC: 1
  }
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  manufacturer: 'Google',
  modelName: 'Pixel 6',
  osName: 'Android',
  osVersion: '12',
  platformApiLevel: 31
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://test-directory/',
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  cacheDirectory: 'file://test-cache-directory/',
  downloadAsync: jest.fn()
}));

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          playAsync: jest.fn(),
          unloadAsync: jest.fn(),
          setOnPlaybackStatusUpdate: jest.fn()
        },
        status: {}
      })
    },
    Recording: {
      createAsync: jest.fn().mockResolvedValue({
        recording: {
          prepareToRecordAsync: jest.fn(),
          startAsync: jest.fn(),
          stopAndUnloadAsync: jest.fn(),
          getStatusAsync: jest.fn().mockResolvedValue({
            isDoneRecording: true,
            uri: 'test-recording.m4a'
          })
        }
      })
    }
  }
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  clear: jest.fn()
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn()
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn()
    }),
    useRoute: () => ({
      params: {},
      name: 'MockedScreen'
    }),
    useIsFocused: () => true,
    useFocusEffect: jest.fn((callback) => {
      callback();
      return jest.fn();
    }),
    createNavigatorFactory: jest.fn(),
    NavigationContainer: ({ children }) => children
  };
});

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children
  }),
  CardStyleInterpolators: {
    forHorizontalIOS: 'forHorizontalIOS',
    forVerticalIOS: 'forVerticalIOS',
    forModalPresentationIOS: 'forModalPresentationIOS'
  }
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children
  })
}));

// Mock UUID
jest.mock('uuid', () => ({
  v4: () => 'test-uuid'
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn(() => 'formatted-date'),
  formatDistance: jest.fn(() => '5 minutes ago'),
  formatDistanceToNow: jest.fn(() => '5 minutes ago'),
  parseISO: jest.fn(() => new Date())
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
}));

// Mock React Native components
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  return {
    Card: 'Card',
    Button: 'Button',
    Title: 'Title',
    Paragraph: 'Paragraph',
    List: {
      Item: 'List.Item',
      Section: 'List.Section'
    },
    Avatar: {
      Icon: 'Avatar.Icon'
    },
    Divider: 'Divider',
    Chip: 'Chip',
    Badge: 'Badge',
    ActivityIndicator: 'ActivityIndicator',
    ProgressBar: 'ProgressBar',
    Appbar: {
      Header: 'Appbar.Header',
      Content: 'Appbar.Content',
      Action: 'Appbar.Action',
      BackAction: 'Appbar.BackAction'
    },
    Menu: 'Menu',
    Modal: 'Modal',
    Portal: 'Portal',
    Dialog: {
      Title: 'Dialog.Title',
      Content: 'Dialog.Content',
      Actions: 'Dialog.Actions'
    },
    TextInput: 'TextInput',
    Switch: 'Switch',
    Checkbox: 'Checkbox',
    RadioButton: 'RadioButton',
    Snackbar: 'Snackbar',
    Surface: 'Surface',
    TouchableRipple: 'TouchableRipple',
    useTheme: () => ({
      colors: {
        primary: '#6200ee',
        accent: '#03dac4',
        background: '#f6f6f6',
        surface: '#ffffff',
        error: '#B00020',
        text: '#000000',
        onSurface: '#000000',
        disabled: 'rgba(0, 0, 0, 0.26)',
        placeholder: 'rgba(0, 0, 0, 0.54)',
        backdrop: 'rgba(0, 0, 0, 0.5)',
        notification: '#f50057'
      },
      roundness: 4,
      animation: {
        scale: 1
      }
    })
  };
});

// Mock global objects
global.fetch = jest.fn();

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock the config
jest.mock('./src/utils/config', () => ({
  API_URL: 'https://api.test.com',
  WS_URL: 'wss://api.test.com/ws',
  STORAGE_KEYS: {
    SESSION_TOKEN: 'session_token',
    SESSION_ID: 'session_id',
    USER_LANGUAGE: 'user_language',
    OFFLINE_QUEUE: 'offline_queue',
    TRANSLATION_CACHE: 'translation_cache',
    NOTIFICATION_TOKEN: 'notification_token',
    NOTIFICATION_HISTORY: 'notification_history',
    NOTIFICATION_SETTINGS: 'notification_settings',
    USER_PREFERENCES: 'user_preferences',
    SETTINGS: 'app_settings',
    FIRST_LAUNCH: 'first_launch',
    OFFLINE_MODELS: 'offline_models',
    TRANSLATION_HISTORY: 'translation_history',
    SYNC_HISTORY: 'sync_history',
    EDGE_DEVICES: 'edge_devices',
    ENCRYPTION_KEY: 'encryption_key'
  }
}));
