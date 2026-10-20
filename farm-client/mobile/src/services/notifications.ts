import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { apiClient, notificationsAPI } from './api';
import {
  deleteExpoPushToken,
  getStoredExpoPushToken,
  getPushOptOut,
  setExpoPushToken,
  setPushOptOut,
} from '../core/utils/secureStorage';

/**
 * Full notification stack for the mobile app:
 *
 *   1. `ensurePushRegistration()` — permission → Expo push token → POST
 *      `/devices/tokens`. Called after login (see `app/_layout.tsx`
 *      `NotificationSetup`) and from Settings when the user toggles push.
 *   2. `setupNotificationListeners()` — foreground banner/toast, tap →
 *      deep-link, badge sync, and cold-start handling.
 *   3. `syncBadgeFromServer()` — keeps the OS app badge in step with the
 *      server unread count (called after list/mark-read/socket events).
 *
 * Notes:
 * - Push only works on a physical device inside a dev-client / EAS build.
 *   Expo Go (SDK 53+) ignores `getExpoPushTokenAsync`; in-app + socket
 *   notifications still work there.
 * - Web has no native push module — everything no-ops and returns null.
 * - `Platform.OS` from `Platform` is `'ios' | 'android' | 'web' | ...`; the
 *   server Zod schema only accepts `'web' | 'ios' | 'android'`, so map
 *   anything else to `'android'` before POSTing.
 */

const isExpoGo =
  Constants.executionEnvironment === 'storeClient';

let Notifications: typeof import('expo-notifications') | null = null;

if (!isExpoGo && Platform.OS !== 'web') {
  const N = require('expo-notifications');
  Notifications = N;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export const isPushSupported = (): boolean => Notifications !== null;

export interface NotificationData {
  /** Server notification type, e.g. `leave-approved`, `new-message`, `task`. */
  type?: string;
  moduleId?: string;
  module?: string;
  screen?: string;
  /** Server-generated deep link (e.g. `/hr/leave`, `/messages`). */
  link?: string;
  notificationId?: string;
  entityType?: string;
  entityId?: string;
  unreadCount?: number;
  /**
   * Expo keeps `title`/`body` as SIBLINGS of `data`, not inside it. The
   * foreground handler copies them onto the object it hands to `onReceived`,
   * so a toast can read `data.title` instead of always rendering the
   * "New notification" fallback.
   */
  title?: string;
  body?: string;
}

export interface PushRegistrationResult {
  status: 'registered' | 'denied' | 'unsupported' | 'no-device' | 'failed' | 'opted-out';
  token: string | null;
}

/**
 * User turned push off in Settings. Persisted locally AND mirrored to the
 * server's `notificationPreferences.pushNotifications`, so the choice survives
 * restarts and applies to the server-side fan-out.
 */
export async function isPushOptedOut(): Promise<boolean> {
  return getPushOptOut();
}

export async function setPushNotificationsEnabled(enabled: boolean): Promise<void> {
  await setPushOptOut(!enabled);
}

function resolveProjectId(): string | undefined {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId ||
    undefined
  );
}

function toServerPlatform(): 'web' | 'ios' | 'android' {
  if (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web') {
    return Platform.OS;
  }
  return 'android';
}

/**
 * Full registration flow: permission → Expo push token → persist locally →
 * POST `/devices/tokens`. Returns a status so callers can show the right UI
 * instead of guessing why push is off.
 *
 * Honors an explicit opt-out from Settings — this used to run unconditionally
 * on every authenticated launch, so turning push off only lasted until the
 * next app start.
 */
export async function ensurePushRegistration(
  options: { force?: boolean } = {}
): Promise<PushRegistrationResult> {
  if (!Notifications) {
    return { status: 'unsupported', token: null };
  }
  // Simulators cannot receive remote push — skip before hitting Expo's API.
  if (!Device.isDevice) {
    return { status: 'no-device', token: null };
  }
  // The Settings toggle is a deliberate choice; re-enabling there passes
  // `force: true`.
  if (!options.force && (await isPushOptedOut())) {
    return { status: 'opted-out', token: null };
  }
  try {
    const perms = (await Notifications.getPermissionsAsync()) as { status: string };
    let finalStatus = perms.status;

    if (perms.status !== 'granted') {
      const reqPerms = (await Notifications.requestPermissionsAsync()) as { status: string };
      finalStatus = reqPerms.status;
    }

    if (finalStatus !== 'granted') {
      return { status: 'denied', token: null };
    }

    const projectId = resolveProjectId();
    let token: { data: string };
    try {
      token = await Notifications.getExpoPushTokenAsync({ projectId });
    } catch {
      // Retry without an explicit projectId — getExpoPushTokenAsync throws
      // when EAS config is missing but still works in some environments.
      token = await Notifications.getExpoPushTokenAsync();
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    // Persist so unregisterFromNotifications() can still find the token on
    // logout even if getExpoPushTokenAsync() fails (revoked permissions).
    await setExpoPushToken(token.data);

    await sendTokenToServer(token.data);

    return { status: 'registered', token: token.data };
  } catch {
    return { status: 'failed', token: null };
  }
}

/** Legacy alias — returns just the token (or null) for existing callers. */
export async function registerForPushNotifications(): Promise<string | null> {
  const result = await ensurePushRegistration();
  return result.token;
}

export async function sendTokenToServer(expoPushToken: string): Promise<void> {
  try {
    await notificationsAPI.registerDevice({
      token: expoPushToken,
      platform: toServerPlatform(),
    });
  } catch {
    // Silent fail — will retry on next app launch
  }
}

export async function unregisterFromNotifications(): Promise<void> {
  try {
    // Prefer the persisted token — getExpoPushTokenAsync() may fail after
    // permissions are revoked or on logout paths.
    let token = await getStoredExpoPushToken();

    if (!token && Notifications) {
      const remote = await Notifications.getExpoPushTokenAsync({
        projectId: resolveProjectId(),
      });
      token = remote.data || null;
    }

    if (token) {
      await apiClient.client.delete('/devices/tokens', {
        data: { token },
      });
      await deleteExpoPushToken();
    }
  } catch {
    // Silent fail
  }
}

export async function getNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  const perms = (await Notifications.getPermissionsAsync()) as { status: string };
  return perms.status === 'granted';
}

function handleNotificationResponse(response: any, hooks: NotificationListenerHooks = {}) {
  const data = response?.notification?.request?.content?.data as NotificationData;

  if (!data) return;

  // Mark the tapped notification read so the badge/list converge even if the
  // user backs out before the Notifications screen mounts.
  if (data.notificationId) {
    void notificationsAPI.markAsRead(data.notificationId).catch(() => {});
    void syncBadgeFromServer().catch(() => {});
  }

  const route = resolveRoute(data);
  if (route) {
    router.push(route as any);
    hooks.onNavigate?.(route, data);
  }
}

// Only routes that actually exist under app/(app)/ — a miss here silently
// drops the deep link, so keep this in sync with the file-based routes.
const ALLOWED_SCREENS = new Set([
  '/(app)',
  '/(app)/farms',
  '/(app)/crops',
  '/(app)/livestock',
  '/(app)/finance',
  '/(app)/aquaculture',
  '/(app)/tasks',
  '/(app)/messages',
  '/(app)/notifications',
  '/(app)/leave',
  '/(app)/settings',
  '/(app)/settings/edit-profile',
  '/(app)/subscription',
  '/(app)/inventory/low-stock',
  '/(app)/reports/scheduled',
]);

// Server-generated links (data.link) mapped to mobile routes.
const LINK_ROUTES: Record<string, string> = {
  '/': '/(app)',
  '/hr/leave': '/(app)/leave',
  '/hr/leave/approvals': '/(app)/leave',
  '/leave': '/(app)/leave',
  '/messages': '/(app)/messages',
  '/tasks': '/(app)/tasks',
  '/notifications': '/(app)/notifications',
  '/farms': '/(app)/farms',
  '/crops': '/(app)/crops',
  '/livestock': '/(app)/livestock',
  '/finance': '/(app)/finance',
  '/aquaculture': '/(app)/aquaculture',
};

function isAllowedRoute(route: string): boolean {
  if (ALLOWED_SCREENS.has(route)) return true;
  // Group routes are literal "(app)" — escape the parens in the regex.
  if (/^\/\((app|auth)\)\/[\w-]+\/[a-f0-9-]+$/i.test(route)) return true;
  return false;
}

/**
 * Map a server-generated link (e.g. "/hr/leave") to a mobile route.
 * Returns null when the link has no mobile equivalent.
 */
export function resolveNotificationRoute(link?: string | null): string | null {
  if (!link) return null;
  const path = link.split('?')[0].replace(/\/$/, '') || '/';
  return LINK_ROUTES[path] ?? null;
}

function resolveRoute(data: NotificationData): string | null {
  if (data.screen && isAllowedRoute(data.screen)) return data.screen;

  // Server-side notifications carry a canonical link (e.g. "/hr/leave").
  const linked = resolveNotificationRoute(data.link);
  if (linked) return linked;

  if (data.module && data.moduleId) {
    // Sanitize moduleId — only allow UUIDs and alphanumeric IDs
    const safeId = /^[a-f0-9-]+$/i.test(data.moduleId) ? data.moduleId : null;
    if (!safeId) return null;

    switch (data.module) {
      case 'farm':
        return `/(app)/farms/${safeId}`;
      case 'crop':
        return `/(app)/crops/${safeId}`;
      case 'livestock':
      case 'poultry':
        return `/(app)/livestock/${safeId}`;
      case 'finance':
        return `/(app)/finance/${safeId}`;
    }
  }

  if (data.type) {
    // HR / messaging notification types produced by the server.
    if (data.type.startsWith('leave')) return '/(app)/leave';
    if (data.type === 'new-message' || data.type.startsWith('message')) {
      return '/(app)/messages';
    }
    if (data.type.startsWith('task')) return '/(app)/tasks';
    if (data.type === 'notification') return '/(app)/notifications';

    if (data.type.startsWith('farm')) return '/(app)/farms';
    if (data.type.startsWith('crop')) return '/(app)/crops';
    if (data.type.startsWith('livestock') || data.type.startsWith('poultry')) return '/(app)/livestock';
    if (data.type.startsWith('finance')) return '/(app)/finance';
  }

  return null;
}

let responseListener: any = null;
let receivedListener: any = null;

export interface NotificationListenerHooks {
  /** Called with the raw push/notification data when one arrives in foreground. */
  onReceived?: (data: NotificationData) => void;
  /** Called with the resolved route after a tap navigates. */
  onNavigate?: (route: string, data: NotificationData) => void;
}

/**
 * Full listener setup:
 * - tap (push or in-app) → resolve `screen`/`link`/`module` → `router.push`
 * - foreground arrival → optional toast hook + app-badge sync
 * - cold start (app killed → opened from push) → same tap navigation
 *
 * Returns a cleanup function. Safe to call on web/Expo Go (no-op).
 */
export function setupNotificationListeners(hooks: NotificationListenerHooks = {}) {
  if (!Notifications) return () => {};
  teardownNotificationListeners();

  responseListener = Notifications.addNotificationResponseReceivedListener(
    (response: any) => handleNotificationResponse(response, hooks)
  );

  receivedListener = Notifications.addNotificationReceivedListener(
    (notification: any) => handleNotificationReceived(notification, hooks)
  );

  // Cold start: the OS delivers the tap response before React mounts.
  // `getLastNotificationResponseAsync` replays it so the deep link still fires.
  void Notifications.getLastNotificationResponseAsync().then((response: any) => {
    if (response) handleNotificationResponse(response, hooks);
  }).catch(() => {});

  return () => teardownNotificationListeners();
}

/** Remove every listener this module installed (logout / unmount). */
export function teardownNotificationListeners() {
  if (responseListener) {
    try { responseListener.remove(); } catch {}
    responseListener = null;
  }
  if (receivedListener) {
    try { receivedListener.remove(); } catch {}
    receivedListener = null;
  }
}

async function handleNotificationReceived(notification: any, hooks: NotificationListenerHooks) {
  try {
    const content = notification?.request?.content ?? {};
    const data: NotificationData = {
      ...(content.data ?? {}),
      // Lift the display fields Expo keeps alongside `data` so consumers can
      // render the real title instead of the generic fallback.
      title: content.title ?? undefined,
      body: content.body ?? undefined,
    };
    hooks.onReceived?.(data);
    // Foreground push carries no server unread count, so reconcile against
    // the source of truth instead of incrementing blindly.
    await syncBadgeFromServer().catch(() => {});
  } catch {}
}

/**
 * Keep the OS app badge in step with the server unread count.
 * Pass `userId` explicitly when calling outside an authenticated context;
 * otherwise it is read from the redux store.
 */
export async function syncBadgeFromServer(userId?: string): Promise<number> {
  if (!Notifications) return 0;
  try {
    let uid = userId;
    if (!uid) {
      try {
        const { store } = require('../store/store');
        uid = store?.getState?.()?.auth?.user?.id ?? undefined;
      } catch {}
    }
    if (!uid) {
      await Notifications.setBadgeCountAsync(0).catch(() => {});
      return 0;
    }
    const res = await notificationsAPI.unreadCount(uid);
    const count = Number((res.data as any)?.count ?? 0) || 0;
    await Notifications.setBadgeCountAsync(count).catch(() => {});
    return count;
  } catch {
    return 0;
  }
}

/** Clear the OS badge (logout / mark-all-read paths). */
export async function clearBadge(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {}
}
