import { Platform } from 'react-native';

const keys = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  mfaSession: 'mfa_session',
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

export async function clearAllSecure(): Promise<void> {
  await Promise.allSettled([
    removeItem(keys.accessToken),
    removeItem(keys.refreshToken),
    removeItem(keys.mfaSession),
  ]);
}
