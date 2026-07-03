import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, View } from 'react-native';
import { Provider } from 'react-redux';
import { Stack } from 'expo-router';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initRNStorage } from '@farm/auth/rn';
import { store, persistor } from '../src/store/store';
import { useAppDispatch, useAppSelector } from '../src/hooks/useAuth';
import { restoreSession } from '../src/store/slices/authSlice';
import { ToastHost } from '../src/components/feedback';
import { ErrorBoundary } from '../src/components/feedback/ErrorBoundary';
import { ConnectionBanner } from '../src/components/layout/ConnectionBanner';
import { useNetworkSync } from '../src/hooks/useNetworkSync';
import { colors } from '../src/components/common/UIComponents';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { registerForPushNotifications, sendTokenToServer, setupNotificationListeners } from '../src/services/notifications';

// Initialize the shared auth storage adapter with AsyncStorage
initRNStorage(AsyncStorage);

// expo-splash-screen ships as a separate package. It isn't always present
// in `node_modules` during type-check, so we shim it with a no-op. At
// runtime we still call SplashScreen.hideAsync() if the module is wired up
// by the host app; otherwise the splash remains as configured in app.json.
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

void SplashScreen.preventAutoHideAsync().catch(() => {
  /* older SDK may not support the promise variant */
});

function hideSplash() {
  try {
    void SplashScreen.hideAsync();
  } catch {
    /* environment without native splash */
  }
}

function BootstrapGate({
  children,
  onReady,
}: {
  children: React.ReactNode;
  onReady: () => void;
}) {
  const dispatch = useAppDispatch();
  const bootstrapped = useAppSelector((state) => state.auth.bootstrapped);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootError, setBootError] = useState(false);

  const doRestore = async () => {
    setBootstrapping(true);
    setBootError(false);
    try {
      await dispatch(restoreSession());
    } catch {
      setBootError(true);
    } finally {
      setBootstrapping(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await doRestore();
      if (cancelled) setBootstrapping(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (!bootstrapped || bootstrapping) {
    if (bootError) {
      return (
        <View style={styles.bootGate}>
          <Text style={{ fontSize: 16, color: colors.text, marginBottom: 16 }}>
            Failed to load session
          </Text>
          <Button title="Retry" onPress={doRestore} />
        </View>
      );
    }
    return (
      <View style={styles.bootGate}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  useEffect(() => {
    onReady();
  }, [onReady]);

  return <>{children}</>;
}

function RootLayoutNav() {
  const { isAuthenticated, mfaRequired } = useAppSelector(
    (state) => state.auth
  );

  useNetworkSync();

  return (
    <View style={styles.root}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          mfaRequired ? (
            <Stack.Screen
              name="mfa"
              options={{
                animation: 'none',
              }}
            />
          ) : (
            <Stack.Screen
              name="(auth)"
              options={{
                animation: 'none',
              }}
            />
          )
        ) : (
          <Stack.Screen
            name="(app)"
            options={{
              animation: 'none',
            }}
          />
        )}
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
      <BootstrapGate onReady={() => setSplashDismissed(true)}>
        <RootLayoutNav />
      </BootstrapGate>
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
