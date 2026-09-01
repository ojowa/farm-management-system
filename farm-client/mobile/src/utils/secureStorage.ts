import * as SecureStore from 'expo-secure-store';

const keys = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  mfaSession: 'mfa_session',
} as const;

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(keys.accessToken, token);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(keys.accessToken);
}

export async function deleteAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(keys.accessToken);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(keys.refreshToken, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(keys.refreshToken);
}

export async function deleteRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(keys.refreshToken);
}

export async function setMfaSession(token: string): Promise<void> {
  await SecureStore.setItemAsync(keys.mfaSession, token);
}

export async function getMfaSession(): Promise<string | null> {
  return SecureStore.getItemAsync(keys.mfaSession);
}

export async function deleteMfaSession(): Promise<void> {
  await SecureStore.deleteItemAsync(keys.mfaSession);
}

export async function clearAllSecure(): Promise<void> {
  await Promise.allSettled([
    SecureStore.deleteItemAsync(keys.accessToken),
    SecureStore.deleteItemAsync(keys.refreshToken),
    SecureStore.deleteItemAsync(keys.mfaSession),
  ]);
}
