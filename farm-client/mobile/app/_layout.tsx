import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Provider } from 'react-redux';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { store, persistor } from '../src/store/store';
import { ToastHost } from '../src/core/ui/feedback';
import { ErrorBoundary } from '../src/core/ui/feedback/ErrorBoundary';
import { ConnectionBanner } from '../src/core/ui/layout/ConnectionBanner';
import { useNetworkSync } from '../src/services/useNetworkSync';
import { colors } from '../src/core/ui/UIComponents';
import { ThemeProvider, useAppTheme } from '../src/core/theme/ThemeContext';
import { ensurePushRegistration, setupNotificationListeners } from '../src/modules/notification';
import { useAppSelector, useAppDispatch } from '../src/modules/auth/hooks/useAuth';
import { fetchProfile, setBootstrapped, logout, refreshSocketToken } from '../src/modules/auth/services/authSlice';
import { startInactivityTracker } from '../src/core/utils/inactivity';
import { loadCurrencySymbol } from '../src/core/utils/currency';

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
  const { colors: themeColors } = useAppTheme();

  useEffect(() => {
    loadCurrencySymbol();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(refreshSocketToken());
      dispatch(fetchProfile()).unwrap().catch(() => {});
    } else {
      dispatch(setBootstrapped());
    }
  }, []);

  useEffect(() => {
    if (bootstrapped) {
      hideSplash();
    }
  }, [bootstrapped]);

  useEffect(() => {
    if (!bootstrapped) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
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

  if (!bootstrapped) {
    return (
      <View style={[styles.bootGate, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: themeColors.background }]}>
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
  const { colors: themeColors } = useAppTheme();

  return (
    <PersistGate
      persistor={persistor}
      loading={
        <View style={[styles.bootGate, { backgroundColor: themeColors.background }]}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      }
    >
      <RootLayoutNav />
    </PersistGate>
  );
}

function NotificationSetup() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!isAuthenticated) return;
    // Foreground push → toast + badge + central store; tap → deep link.
    const cleanup = setupNotificationListeners({
      onReceived: (data) => {
        try {
          const { showToast } = require('../src/store/slices/uiSlice');
          dispatch(showToast({
            id: `push-${Date.now()}`,
            // `title`/`body` are lifted off the Expo content by the listener —
            // they are siblings of `data`, not keys inside it, so reading
            // `data.title` directly always fell back to this placeholder.
            message: data?.title || data?.body || 'New notification',
            type: 'info',
          }));
        } catch {}
      },
    });
    // Permission → Expo token → POST /devices/tokens, then badge sync.
    ensurePushRegistration().then((result) => {
      try {
        const { setPushState, fetchUnreadCount } = require('../src/store/slices/notificationsSlice');
        const { store: appStore } = require('../src/store/store');
        dispatch(setPushState({ status: result.status, token: result.token }));
        const userId = appStore?.getState?.()?.auth?.user?.id;
        if (userId) dispatch(fetchUnreadCount(userId) as any);
      } catch {}
    }).catch(() => {});
    return cleanup;
  }, [isAuthenticated, dispatch]);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <SafeAreaProvider>
            <ThemedStatusBar />
            <RootLayoutWithSplash />
            <NotificationSetup />
          </SafeAreaProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}

function ThemedStatusBar() {
  const { isDark } = useAppTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default App;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bootGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
