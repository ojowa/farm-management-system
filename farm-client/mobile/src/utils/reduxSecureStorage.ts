import { Platform } from 'react-native';
import { StateStorage } from 'redux-persist';

/**
 * Platform-aware storage adapter for redux-persist.
 * - Native: expo-secure-store (encrypted)
 * - Web: localStorage (fallback)
 */

const webStorage: StateStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage full or unavailable
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};

function createNativeAdapter(): StateStorage {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SecureStore = require('expo-secure-store');
  return {
    getItem: async (key: string): Promise<string | null> => {
      return SecureStore.getItemAsync(key);
    },
    setItem: async (key: string, value: string): Promise<void> => {
      await SecureStore.setItemAsync(key, value);
    },
    removeItem: async (key: string): Promise<void> => {
      await SecureStore.deleteItemAsync(key);
    },
  };
}

export const secureStorageAdapter: StateStorage =
  Platform.OS === 'web' ? webStorage : createNativeAdapter();
