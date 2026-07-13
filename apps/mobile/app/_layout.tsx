import React, { useEffect, useState } from 'react';
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
import { ThemeProvider } from '../src/theme/ThemeContext';
import { registerForPushNotifications, sendTokenToServer, setupNotificationListeners } from '../src/services/notifications';
import { useAppSelector, useAppDispatch } from '../src/hooks/useAuth';
import { fetchProfile, setBootstrapped, logout } from '../src/store/slices/authSlice';
import { apiClient } from '../src/services/api';
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

  // Bootstrap: verify session on mount (cookie-based like web frontend)
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchProfile()).unwrap().catch(() => {});
    } else {
      dispatch(setBootstrapped());
    }
  }, []);

  useEffect(() => {
    if (!bootstrapped) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [isAuthenticated, bootstrapped, segments]);

  // Auto-logout after 10 minutes of inactivity
  useEffect(() => {
    if (!isAuthenticated) return;
    const cleanup = startInactivityTracker(() => {
      dispatch(logout());
    });
    return cleanup;
  }, [isAuthenticated, dispatch]);

  return (
    <View style={styles.root}>
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
      <ConnectionBanner />
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
