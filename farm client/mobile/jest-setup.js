// Global test setup — mocks for React Native / Expo globals
// This file is plain JS to avoid ts-jest type-checking on `global`/`jest` globals.

// Minimal AsyncStorage mock
var storage = new Map();

var AsyncStorageMock = {
  getItem: jest.fn(async function (key) { return storage.get(key) || null; }),
  setItem: jest.fn(async function (key, value) { storage.set(key, value); }),
  removeItem: jest.fn(async function (key) { storage.delete(key); }),
  multiRemove: jest.fn(async function (keys) { keys.forEach(function (k) { storage.delete(k); }); }),
  clear: jest.fn(async function () { storage.clear(); }),
  getAllKeys: jest.fn(async function () { return Array.from(storage.keys()); }),
};

// Replace the module mock
jest.mock('@react-native-async-storage/async-storage', function () { return AsyncStorageMock; });

// Expose the mock store so tests can inspect / seed it
globalThis.__DEV__ = true;
globalThis.__ASYNC_STORAGE_MOCK__ = storage;
