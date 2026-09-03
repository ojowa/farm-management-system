// Global test setup — mocks for React Native / Expo globals

var mockStorage = new Map();

jest.mock('@react-native-async-storage/async-storage', function () {
  return {
    getItem: jest.fn(async function (key) { return mockStorage.get(key) || null; }),
    setItem: jest.fn(async function (key, value) { mockStorage.set(key, value); }),
    removeItem: jest.fn(async function (key) { mockStorage.delete(key); }),
    multiRemove: jest.fn(async function (keys) { keys.forEach(function (k) { mockStorage.delete(k); }); }),
    clear: jest.fn(async function () { mockStorage.clear(); }),
    getAllKeys: jest.fn(async function () { return Array.from(mockStorage.keys()); }),
  };
});

var mockSecureStore = new Map();

jest.mock('expo-secure-store', function () {
  return {
    getItemAsync: jest.fn(async function (key) { return mockSecureStore.get(key) || null; }),
    setItemAsync: jest.fn(async function (key, value) { mockSecureStore.set(key, value); }),
    deleteItemAsync: jest.fn(async function (key) { mockSecureStore.delete(key); }),
  };
});

jest.mock('expo-constants', function () {
  return {
    default: {
      executionEnvironment: 'storeClient',
      expoConfig: { version: '1.0.0' },
    },
  };
});

jest.mock('expo-router', function () {
  return {
    useRouter: function () { return { push: jest.fn(), replace: jest.fn(), back: jest.fn() }; },
    useSegments: function () { return []; },
    Stack: { Screen: function () { return null; } },
  };
});

jest.mock('react-native', function () {
  var RN = jest.requireActual('react-native');
  RN.Alert.alert = jest.fn();
  return RN;
});

globalThis.__DEV__ = true;
