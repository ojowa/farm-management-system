import { Platform } from 'react-native';

interface StateStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

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
  const secureStoreKey = (key: string): string =>
    `redux_persist_${Array.from(key, (character) =>
      character.codePointAt(0)?.toString(16),
    ).join('_')}`;

  return {
    getItem: async (key: string): Promise<string | null> => {
      return SecureStore.getItemAsync(secureStoreKey(key));
    },
    setItem: async (key: string, value: string): Promise<void> => {
      await SecureStore.setItemAsync(secureStoreKey(key), value);
    },
    removeItem: async (key: string): Promise<void> => {
      await SecureStore.deleteItemAsync(secureStoreKey(key));
    },
  };
}

export const secureStorageAdapter: StateStorage =
  Platform.OS === 'web' ? webStorage : createNativeAdapter();
