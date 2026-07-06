import AsyncStorage from '@react-native-async-storage/async-storage';

// Re-export shared keys so existing imports still work
export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'user';
export const MFA_SESSION_KEY = 'mfa_session';

/**
 * Remove all persistent keys used by the mobile app.
 * Add any new keys here as the app grows. Keep this list in sync with
 * the redux-persist whitelist (ui slice) and the authSlice token keys.
 */
export async function clearAllStorage() {
  // No-op: auth removed
}