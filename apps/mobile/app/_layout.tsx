import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View, GestureResponderEvent } from 'react-native';
import { Provider } from 'react-redux';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { store, persistor } from '../src/store/store';
import { ToastHost } from '../src/components/feedback';
import { ErrorBoundary } from '../src/components/feedback/ErrorBoundary';
import { ConnectionBanner } from '../src/components/layout/ConnectionBanner';
import { useNetworkSync } from '../src/hooks/useNetworkSync';
import { colors } from '../src/components/common/UIComponents';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { registerForPushNotifications, sendTokenToServer, setupNotificationListeners } from '../src/services/notifications';
import { useAppSelector, useAppDispatch } from '../src/hooks/useAuth';
import { fetchProfile, setBootstrapped, logout, refreshSocketToken } from '../src/store/slices/authSlice';
import { startInactivityTracker } from '../src/utils/inactivity';

interface SplashShim {
  preventAutoHideAsync: () => Promise<void>;
  hideAsync: () => Promise<void>;
}
const SplashScreen: SplashShim = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const mod = require('expo-splash-screen');
    return (mod.default ?? mod) as SplashShim;
  } catch {
    return {
      preventAutoHideAsync: async () => undefined,
      hideAsync: async () => undefined,
    };
  }
})();

void SplashScreen.preventAutoHideAsync().catch(() => {});

function hideSplash() {
  try {
    void SplashScreen.hideAsync();
  } catch {}
}

function RootLayoutNav() {
  useNetworkSync();
  const router = useRouter();
  const segments = useSegments();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const bootstrapped = useAppSelector((state) => state.auth.bootstrapped);

  useEffect(() => {
    if (isAuthenticated) {
      if (__DEV__) console.log('[NAV] Authenticated - refreshing session');
      dispatch(refreshSocketToken());
      dispatch(fetchProfile()).unwrap().catch(() => {});
    } else {
      if (__DEV__) console.log('[NAV] Not authenticated - bootstrapping');
      dispatch(setBootstrapped());
    }
  }, []);

  useEffect(() => {
    if (!bootstrapped) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      if (__DEV__) console.log('[NAV] Redirecting to login (not authenticated)');
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      if (__DEV__) console.log('[NAV] Redirecting to app (authenticated)');
      router.replace('/(app)');
    }
  }, [isAuthenticated, bootstrapped, segments]);

  const inactivityTimerRef = useRef<(() => void) | null>(null);

  const resetInactivityTimer = useCallback(() => {
    // The inactivity tracker resets internally when we call the cleanup + re-arm.
    // For touch events, we simply restart the timer.
    if (inactivityTimerRef.current) {
      inactivityTimerRef.current();
    }
    inactivityTimerRef.current = startInactivityTracker(() => {
      dispatch(logout());
    });
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) return;
    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) {
        inactivityTimerRef.current();
        inactivityTimerRef.current = null;
      }
    };
  }, [isAuthenticated, resetInactivityTimer]);

  // Reset inactivity timer on any touch — captures actual user interaction
  const handleTouchStart = useCallback((_event: GestureResponderEvent) => {
    if (isAuthenticated && inactivityTimerRef.current) {
      resetInactivityTimer();
    }
  }, [isAuthenticated, resetInactivityTimer]);

  if (!bootstrapped) {
    return (
      <View style={styles.bootGate}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root} onTouchStart={handleTouchStart}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="(app)"
          options={{ animation: 'none' }}
        />
        <Stack.Screen
          name="(auth)"
          options={{ animation: 'none' }}
        />
      </Stack>
      {isAuthenticated && <ConnectionBanner />}
      <ToastHost />
    </View>
  );
}

function RootLayoutWithSplash() {
  const [splashDismissed, setSplashDismissed] = useState(false);

  useEffect(() => {
    if (splashDismissed) hideSplash();
  }, [splashDismissed]);

  return (
    <PersistGate
      persistor={persistor}
      loading={
        <View style={styles.bootGate}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      }
    >
      <RootLayoutNav />
    </PersistGate>
  );
}

function NotificationSetup() {
  useEffect(() => {
    const cleanup = setupNotificationListeners();
    registerForPushNotifications().then((token) => {
      if (token) sendTokenToServer(token);
    });
    return cleanup;
  }, []);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <RootLayoutWithSplash />
            <NotificationSetup />
          </SafeAreaProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bootGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
