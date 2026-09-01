import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearAllSecure,
  setAccessToken as secureSetAccess,
  getAccessToken as secureGetAccess,
  deleteAccessToken as secureDeleteAccess,
  setRefreshToken as secureSetRefresh,
  getRefreshToken as secureGetRefresh,
  deleteRefreshToken as secureDeleteRefresh,
  setMfaSession as secureSetMfa,
  getMfaSession as secureGetMfa,
  deleteMfaSession as secureDeleteMfa,
} from './secureStorage';

export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_KEY = 'user';
export const MFA_SESSION_KEY = 'mfa_session';

export async function setAccessToken(token: string) {
  await secureSetAccess(token);
}

export async function getAccessToken() {
  return secureGetAccess();
}

export async function deleteAccessToken() {
  return secureDeleteAccess();
}

export async function setRefreshToken(token: string) {
  await secureSetRefresh(token);
}

export async function getRefreshToken() {
  return secureGetRefresh();
}

export async function deleteRefreshToken() {
  return secureDeleteRefresh();
}

export async function setMfaSession(token: string) {
  await secureSetMfa(token);
}

export async function getMfaSession() {
  return secureGetMfa();
}

export async function deleteMfaSession() {
  return secureDeleteMfa();
}

export async function clearAllStorage() {
  try {
    await Promise.allSettled([
      clearAllSecure(),
      AsyncStorage.multiRemove([USER_KEY]),
    ]);
  } catch {
    // Silent fail
  }
}
