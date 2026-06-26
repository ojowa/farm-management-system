import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { store } from '../src/store/store';
import { useAppSelector } from '../src/hooks/useAuth';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, mfaRequired } = useAppSelector(
    (state) => state.auth
  );

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isAuthenticated ? (
        <>
          {mfaRequired ? (
            <Stack.Screen
              name="mfa"
              options={{
                animationEnabled: false,
              }}
            />
          ) : (
            <Stack.Screen
              name="(auth)"
              options={{
                animationEnabled: false,
              }}
            />
          )}
        </>
      ) : (
        <Stack.Screen
          name="(app)"
          options={{
            animationEnabled: false,
          }}
        />
      )}
    </Stack>
  );
}

function RootLayout() {
  useEffect(() => {
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Error hiding splash screen:', e);
      }
    };

    hideSplash();
  }, []);

  return <RootLayoutNav />;
}

export default function App() {
  return (
    <Provider store={store}>
      <RootLayout />
    </Provider>
  );
}
