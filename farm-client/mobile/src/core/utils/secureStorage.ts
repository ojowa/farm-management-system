import { Platform } from 'react-native';

const keys = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  mfaSession: 'mfa_session',
  expoPushToken: 'expo_push_token',
  // Explicit opt-out from Settings → Push Notifications. Without this the
  // app re-registered the Expo token on every authenticated launch and push
  // switched itself back on after the user turned it off.
  pushOptOut: 'push_opt_out',
} as const;

// Platform-aware storage helpers
async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  const SecureStore = require('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
    return;
  }
  const SecureStore = require('expo-secure-store');
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    return;
  }
  const SecureStore = require('expo-secure-store');
  await SecureStore.deleteItemAsync(key);
}

export async function setAccessToken(token: string): Promise<void> {
  await setItem(keys.accessToken, token);
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(keys.accessToken);
}

export async function deleteAccessToken(): Promise<void> {
  return removeItem(keys.accessToken);
}

export async function setRefreshToken(token: string): Promise<void> {
  await setItem(keys.refreshToken, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(keys.refreshToken);
}

export async function deleteRefreshToken(): Promise<void> {
  return removeItem(keys.refreshToken);
}

export async function setMfaSession(token: string): Promise<void> {
  await setItem(keys.mfaSession, token);
}

export async function getMfaSession(): Promise<string | null> {
  return getItem(keys.mfaSession);
}

export async function deleteMfaSession(): Promise<void> {
  return removeItem(keys.mfaSession);
}

// Push token is persisted so logout can unregister it even when
// getExpoPushTokenAsync() is unavailable (e.g. after permissions change).
export async function setExpoPushToken(token: string): Promise<void> {
  return setItem(keys.expoPushToken, token);
}

export async function getStoredExpoPushToken(): Promise<string | null> {
  return getItem(keys.expoPushToken);
}

export async function deleteExpoPushToken(): Promise<void> {
  return removeItem(keys.expoPushToken);
}

/**
 * Push opt-out survives restarts. `null` (never set) means "not opted out", so
 * existing users keep receiving push after this flag was introduced.
 */
export async function getPushOptOut(): Promise<boolean> {
  return (await getItem(keys.pushOptOut)) === 'true';
}

export async function setPushOptOut(optedOut: boolean): Promise<void> {
  if (optedOut) {
    await setItem(keys.pushOptOut, 'true');
  } else {
    await removeItem(keys.pushOptOut);
  }
}

export async function clearAllSecure(): Promise<void> {
  await Promise.allSettled([
    removeItem(keys.accessToken),
    removeItem(keys.refreshToken),
    removeItem(keys.mfaSession),
  ]);
}
