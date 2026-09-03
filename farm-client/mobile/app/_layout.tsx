import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
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
import { ThemeProvider, useAppTheme } from '../src/theme/ThemeContext';
import { registerForPushNotifications, sendTokenToServer, setupNotificationListeners } from '../src/services/notifications';
import { useAppSelector, useAppDispatch } from '../src/hooks/useAuth';
import { fetchProfile, setBootstrapped, logout, refreshSocketToken } from '../src/store/slices/authSlice';
import { startInactivityTracker } from '../src/utils/inactivity';
import { loadCurrencySymbol } from '../src/utils/currency';

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
  useEffect(() => {
    if (!isAuthenticated) return;
    const cleanup = setupNotificationListeners();
    registerForPushNotifications().then((token) => {
      if (token) sendTokenToServer(token);
    });
    return cleanup;
  }, [isAuthenticated]);
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
