import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  MFA_SESSION_KEY,
} from '../store/slices/authSlice';

/**
 * Remove all persistent keys used by the mobile app.
 * Add any new keys here as the app grows. Keep this list in sync with
 * the redux-persist whitelist (ui slice) and the authSlice token keys.
 */
export async function clearAllStorage() {
  const keys = [
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    USER_KEY,
    MFA_SESSION_KEY,
    // redux-persist keys
    'persist:ui',
    'persist:auth',
    'persist:sync',
    // Legacy / unprefixed keys from before the persist migration.
    'selectedIds',
    'activeFilters',
  ];

  try {
    await AsyncStorage.multiRemove(keys);
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('Failed to clear AsyncStorage:', e);
    }
  }
}

export {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  MFA_SESSION_KEY,
};
